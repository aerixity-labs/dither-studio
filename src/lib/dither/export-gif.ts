import { applyPalette, GIFEncoder, quantize, type GifPalette } from 'gifenc'

import {
  ColorMode,
  applyDither,
  getRenderSize,
  prepareSource,
  resolvePalette,
  type DitherSettings,
  type SourceImage,
} from '@/lib/dither/core'

import { assertAnimatable, throwIfAborted, type ExportProgress } from './export-shared'

const GIF_MAX_SIZE = 800
const GIF_FRAME_COUNT = 24
const GIF_FRAMES_PER_SECOND = 20

/**
 * A single global palette is reused for every frame. In the palette, duotone and
 * grayscale modes the exact output colours are already known, so the palette is
 * taken from the settings and the encode is lossless; only `original` mode needs
 * the quantizer.
 */
function buildGlobalPalette(settings: DitherSettings, firstFrame: Uint8ClampedArray): GifPalette {
  if (settings.colorMode === ColorMode.original) {
    return quantize(firstFrame, 256, { format: 'rgb565' })
  }

  const resolved = resolvePalette(settings)
  const colors = resolved.colors.map(function toEntry(color) {
    return [color[0], color[1], color[2]]
  })

  if (settings.invert) {
    return colors.map(function invertEntry(color) {
      return [255 - color[0], 255 - color[1], 255 - color[2]]
    })
  }

  return colors
}

/**
 * Encodes the dithered animation to a looping GIF.
 *
 * GIFs are capped at `GIF_MAX_SIZE` and a fixed frame count because the format
 * stores every frame as a full indexed bitmap – a full-resolution export would
 * run to hundreds of megabytes.
 */
export async function exportGif(
  image: SourceImage,
  settings: DitherSettings,
  onProgress?: ExportProgress,
  signal?: AbortSignal,
) {
  assertAnimatable(settings, 'GIF')

  const target = getRenderSize(image, GIF_MAX_SIZE)
  const source = prepareSource(image, target.width, target.height)
  const encoder = GIFEncoder()
  const delay = Math.round(1000 / GIF_FRAMES_PER_SECOND)
  const animated: DitherSettings = { ...settings, animated: true }

  let palette: GifPalette | null = null

  for (let frame = 0; frame < GIF_FRAME_COUNT; frame += 1) {
    throwIfAborted(signal)
    const time = frame / GIF_FRAMES_PER_SECOND
    const dithered = applyDither(source, animated, time)

    palette ??= buildGlobalPalette(animated, dithered.data)
    const indexed = applyPalette(dithered.data, palette, 'rgb565')

    encoder.writeFrame(indexed, dithered.width, dithered.height, {
      palette: frame === 0 ? palette : undefined,
      delay,
      repeat: 0,
    })

    onProgress?.(frame + 1, GIF_FRAME_COUNT)

    /** Yields to the event loop so the progress indicator can actually paint. */
    await new Promise(function yieldToBrowser(resolve) {
      setTimeout(resolve, 0)
    })
  }

  encoder.finish()

  return {
    blob: new Blob([encoder.bytes()], { type: 'image/gif' }),
    width: target.width,
    height: target.height,
  }
}
