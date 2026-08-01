import {
  applyDither,
  getRenderSize,
  prepareSource,
  type DitherSettings,
  type SourceImage,
} from '@/lib/dither/core'

import { ExportAbortedError, assertAnimatable, type ExportProgress } from './export-shared'

const VIDEO_MAX_SIZE = 1080
const VIDEO_FRAMES_PER_SECOND = 30
const VIDEO_DEFAULT_SECONDS = 4

/**
 * Ordered by preference. Safari cannot mux WebM, so MP4 is offered as a
 * fallback rather than failing the export outright.
 */
const CANDIDATE_TYPES = [
  { mimeType: 'video/webm;codecs=vp9', extension: 'webm' },
  { mimeType: 'video/webm;codecs=vp8', extension: 'webm' },
  { mimeType: 'video/webm', extension: 'webm' },
  { mimeType: 'video/mp4;codecs=avc1.42E01E', extension: 'mp4' },
  { mimeType: 'video/mp4', extension: 'mp4' },
] as const

export function getSupportedVideoType() {
  if (typeof MediaRecorder === 'undefined') return null

  for (const candidate of CANDIDATE_TYPES) {
    if (MediaRecorder.isTypeSupported(candidate.mimeType)) return candidate
  }

  return null
}

/**
 * Records the dithered animation by driving a canvas frame by frame and pushing
 * each one into a `MediaRecorder` capture stream.
 *
 * Frames are requested explicitly rather than letting the stream sample in real
 * time, so the output holds a steady frame rate even when a frame takes longer
 * than its slot to dither.
 */
export async function exportVideo(
  image: SourceImage,
  settings: DitherSettings,
  seconds = VIDEO_DEFAULT_SECONDS,
  onProgress?: ExportProgress,
  signal?: AbortSignal,
) {
  assertAnimatable(settings, 'video')

  const type = getSupportedVideoType()
  if (!type) throw new Error('This browser cannot record video from a canvas.')

  const target = getRenderSize(image, VIDEO_MAX_SIZE)
  const source = prepareSource(image, target.width, target.height)
  const animated: DitherSettings = { ...settings, animated: true }

  const canvas = document.createElement('canvas')
  canvas.width = target.width
  canvas.height = target.height

  const context = canvas.getContext('2d')
  if (!context) throw new Error('This browser could not provide a 2D canvas context.')

  const stream = canvas.captureStream(0)
  const [track] = stream.getVideoTracks()
  const recorder = new MediaRecorder(stream, {
    mimeType: type.mimeType,
    videoBitsPerSecond: 8_000_000,
  })

  const chunks: Blob[] = []
  recorder.addEventListener('dataavailable', function onData(event) {
    if (event.data.size > 0) chunks.push(event.data)
  })

  const finished = new Promise<Blob>(function waitForStop(resolve, reject) {
    recorder.addEventListener('stop', function onStop() {
      resolve(new Blob(chunks, { type: type.mimeType }))
    })
    recorder.addEventListener('error', function onError() {
      reject(new Error('Recording failed part way through.'))
    })
  })

  recorder.start()

  const totalFrames = Math.max(1, Math.round(seconds * VIDEO_FRAMES_PER_SECOND))
  const frameDuration = 1000 / VIDEO_FRAMES_PER_SECOND
  const startedAt = performance.now()

  for (let frame = 0; frame < totalFrames; frame += 1) {
    if (signal?.aborted) {
      /** Tear the recorder down before bailing so the stream is not left live. */
      recorder.stop()
      track.stop()
      throw new ExportAbortedError()
    }
    const time = frame / VIDEO_FRAMES_PER_SECOND
    const dithered = applyDither(source, animated, time)
    context.putImageData(new ImageData(dithered.data, dithered.width, dithered.height), 0, 0)

    if ('requestFrame' in track && typeof track.requestFrame === 'function') {
      track.requestFrame()
    }

    onProgress?.(frame + 1, totalFrames)

    /**
     * MediaRecorder timestamps frames by wall clock, not by the intended frame
     * rate, so the loop is paced to real time. Emitting as fast as the display
     * refreshes would compress the recording and play it back too fast.
     */
    const nextFrameAt = startedAt + (frame + 1) * frameDuration
    const remaining = nextFrameAt - performance.now()
    if (remaining > 0) {
      await new Promise(function waitForSlot(resolve) {
        setTimeout(resolve, remaining)
      })
    }
  }

  recorder.stop()

  /**
   * The track has to outlive the recorder. Stopping it before the final
   * `dataavailable` has been delivered tears down the source mid-flush and
   * yields an empty container with no frames in it.
   */
  const blob = await finished
  track.stop()

  return {
    blob,
    extension: type.extension,
    width: target.width,
    height: target.height,
  }
}
