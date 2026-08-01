import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import type { DitherSettings } from '@/lib/dither/core'
import { buildFileName, downloadBlob } from '@/lib/dither/download-blob'
import { exportGif } from '@/lib/dither/export-gif'
import { isExportAborted } from '@/lib/dither/export-shared'
import { STILL_FORMATS, exportStill, type StillFormat } from '@/lib/dither/export-still'
import { exportVideo, getSupportedVideoType } from '@/lib/dither/export-video'

type ExportJob = {
  label: string
  /** `null` for stills, which finish in one pass and report no fraction. */
  progress: { completed: number; total: number } | null
  /** Stills run one uninterruptible pass, so they offer no cancel. */
  isCancellable: boolean
}

type Options = {
  image: HTMLImageElement | null
  fileName: string
  settings: DitherSettings
}

export function useExportJob(options: Options) {
  const { image, fileName, settings } = options
  const [job, setJob] = useState<ExportJob | null>(null)
  const [canRecordVideo, setCanRecordVideo] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  /** Probed after mount: `MediaRecorder` support is a client fact the server cannot know. */
  useEffect(function probeVideoSupport() {
    setCanRecordVideo(getSupportedVideoType() !== null)
  }, [])

  const run = useCallback(async function run(
    initial: ExportJob,
    task: (signal: AbortSignal) => Promise<{ blob: Blob; name: string }>,
  ) {
    const controller = new AbortController()
    abortRef.current = controller
    setJob(initial)

    try {
      const { blob, name } = await task(controller.signal)
      downloadBlob(blob, name)
      toast.success(`Saved ${name}`, {
        description: `${Math.round(blob.size / 1024).toLocaleString()} KB`,
      })
    } catch (error: unknown) {
      if (isExportAborted(error)) {
        toast.info('Export cancelled', { description: 'Nothing was saved.' })
      } else {
        const message = error instanceof Error ? error.message : 'The export failed.'
        console.error('Dither export failed.', error)
        toast.error('Export failed', { description: message })
      }
    } finally {
      abortRef.current = null
      setJob(null)
    }
  }, [])

  const cancel = useCallback(function cancel() {
    abortRef.current?.abort()
  }, [])

  const exportStillAs = useCallback(
    function exportStillAs(format: StillFormat) {
      if (!image) return
      const { extension, label } = STILL_FORMATS[format]

      void run(
        { label: `Rendering ${label}`, progress: null, isCancellable: false },
        async function task() {
          const { blob, width, height } = await exportStill(image, settings, format)
          toast.info(`Rendered at ${width} × ${height}`)
          return { blob, name: buildFileName(fileName, extension) }
        },
      )
    },
    [image, fileName, settings, run],
  )

  const exportAsVideo = useCallback(
    function exportAsVideo() {
      if (!image) return
      const label = 'Recording video'

      void run(
        { label, progress: { completed: 0, total: 1 }, isCancellable: true },
        async function task(signal) {
          const { blob, extension } = await exportVideo(
            image,
            settings,
            undefined,
            function onProgress(completed, total) {
              setJob({ label, progress: { completed, total }, isCancellable: true })
            },
            signal,
          )
          return { blob, name: buildFileName(fileName, extension) }
        },
      )
    },
    [image, fileName, settings, run],
  )

  const exportAsGif = useCallback(
    function exportAsGif() {
      if (!image) return
      const label = 'Encoding GIF'

      void run(
        { label, progress: { completed: 0, total: 1 }, isCancellable: true },
        async function task(signal) {
          const { blob } = await exportGif(
            image,
            settings,
            function onProgress(completed, total) {
              setJob({ label, progress: { completed, total }, isCancellable: true })
            },
            signal,
          )
          return { blob, name: buildFileName(fileName, 'gif') }
        },
      )
    },
    [image, fileName, settings, run],
  )

  return { job, canRecordVideo, cancel, exportStillAs, exportAsVideo, exportAsGif }
}
