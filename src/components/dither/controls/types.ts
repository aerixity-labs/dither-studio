import type { DitherSettings } from '@/lib/dither/core'

export type ControlsProps = {
  settings: DitherSettings
  onPatch: (patch: Partial<DitherSettings>) => void
}
