import type { ControlsProps } from '@/components/dither/controls/types'
import { LabeledSlider } from '@/components/dither/labeled-slider'
import { Separator } from '@/components/ui/separator'
import { SLIDER_RANGES } from '@/constants/dither'
import { ColorMode } from '@/lib/dither/core'

export function ToneControls(props: ControlsProps) {
  const { settings, onPatch } = props
  const isOriginalMode = settings.colorMode === ColorMode.original

  return (
    <div className="space-y-5">
      <LabeledSlider
        label="Brightness"
        value={settings.brightness}
        range={SLIDER_RANGES.brightness}
        onChange={function onChange(brightness) {
          onPatch({ brightness })
        }}
      />

      <LabeledSlider
        label="Contrast"
        value={settings.contrast}
        range={SLIDER_RANGES.contrast}
        onChange={function onChange(contrast) {
          onPatch({ contrast })
        }}
        hint="Pushes tones apart before the screen is applied."
      />

      <LabeledSlider
        label="Gamma"
        value={settings.gamma}
        range={SLIDER_RANGES.gamma}
        onChange={function onChange(gamma) {
          onPatch({ gamma })
        }}
        hint="Redistributes midtones without clipping the ends."
      />

      <Separator />

      <LabeledSlider
        label="Tone levels"
        value={settings.levels}
        range={SLIDER_RANGES.levels}
        disabled={!isOriginalMode}
        onChange={function onChange(levels) {
          onPatch({ levels })
        }}
        hint={
          isOriginalMode
            ? 'Steps per colour channel before dithering.'
            : 'Only applies in the Original colour mode.'
        }
      />
    </div>
  )
}
