import { isErrorDiffusion, type DitherSettings } from '@/lib/dither/core'

export type ExportProgress = (completed: number, total: number) => void

export class ExportAbortedError extends Error {
  constructor() {
    super('The export was cancelled.')
    this.name = 'ExportAbortedError'
  }
}

export function isExportAborted(error: unknown) {
  return error instanceof ExportAbortedError
}

/** Called once per frame by the animated exporters, so cancelling lands within a frame. */
export function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new ExportAbortedError()
}

/** Error diffusion cannot be recomputed from a timestamp, so it has no animated export. */
export function assertAnimatable(settings: DitherSettings, format: string) {
  if (isErrorDiffusion(settings.pattern)) {
    throw new Error(
      `Error-diffusion patterns cannot be animated, so they cannot export as ${format}.`,
    )
  }
}
