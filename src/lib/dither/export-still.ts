import {
  applyDither,
  getIntrinsicSize,
  prepareSource,
  type DitherSettings,
  type PixelBuffer,
  type SourceImage,
} from '@/lib/dither/core'

/** Menu order. Adding a format here makes `STILL_FORMATS` a compile error until it is wired. */
export const STILL_FORMAT_ORDER = ['png', 'jpeg', 'webp'] as const

export type StillFormat = (typeof STILL_FORMAT_ORDER)[number]

type StillFormatSpec = {
  mimeType: string
  extension: string
  label: string
  supportsQuality: boolean
}

export const STILL_FORMATS: Record<StillFormat, StillFormatSpec> = {
  png: { mimeType: 'image/png', extension: 'png', label: 'PNG', supportsQuality: false },
  jpeg: { mimeType: 'image/jpeg', extension: 'jpg', label: 'JPEG', supportsQuality: true },
  webp: { mimeType: 'image/webp', extension: 'webp', label: 'WebP', supportsQuality: true },
}

function renderToCanvas(frame: PixelBuffer) {
  const canvas = document.createElement('canvas')
  canvas.width = frame.width
  canvas.height = frame.height

  const context = canvas.getContext('2d')
  if (!context) throw new Error('This browser could not provide a 2D canvas context.')

  context.putImageData(new ImageData(frame.data, frame.width, frame.height), 0, 0)
  return canvas
}

function canvasToBlob(canvas: HTMLCanvasElement, format: StillFormat, quality: number) {
  const { mimeType, supportsQuality } = STILL_FORMATS[format]

  return new Promise<Blob>(function toBlob(resolve, reject) {
    canvas.toBlob(
      function onBlob(blob) {
        if (blob) {
          resolve(blob)
          return
        }
        reject(new Error(`This browser could not encode the image as ${format}.`))
      },
      mimeType,
      supportsQuality ? quality : undefined,
    )
  })
}

/**
 * Dithers at the source's native resolution, not the preview size, so a download is as
 * detailed as the upload allows. Runs on the calling thread: keep it off the interaction
 * path for large images.
 */
export async function exportStill(
  image: SourceImage,
  settings: DitherSettings,
  format: StillFormat,
  quality = 0.92,
) {
  const { width, height } = getIntrinsicSize(image)
  const source = prepareSource(image, width, height)
  const frame = applyDither(source, settings, 0)
  const canvas = renderToCanvas(frame)

  return { blob: await canvasToBlob(canvas, format, quality), width, height }
}
