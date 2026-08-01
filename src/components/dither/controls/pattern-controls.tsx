import { useId } from 'react'

import type { ControlsProps } from '@/components/dither/controls/types'
import { LabeledSlider } from '@/components/dither/labeled-slider'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { PATTERN_OPTIONS, SLIDER_RANGES, findOption } from '@/constants/dither'
import { isErrorDiffusion } from '@/lib/dither/core'

export function PatternControls(props: ControlsProps) {
  const { settings, onPatch } = props
  const patternLabelId = useId()
  const invertId = useId()
  const usesErrorDiffusion = isErrorDiffusion(settings.pattern)

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label id={patternLabelId} className="text-xs font-medium">
          Pattern
        </Label>
        <ToggleGroup
          type="single"
          variant="outline"
          value={settings.pattern}
          aria-labelledby={patternLabelId}
          onValueChange={function onValueChange(value: string) {
            const option = findOption(PATTERN_OPTIONS, value)
            if (option) onPatch({ pattern: option.value })
          }}
          /** `w-full` is required: the ToggleGroup primitive ships `w-fit`. */
          className="grid w-full grid-cols-2 gap-1.5"
        >
          {PATTERN_OPTIONS.map(function renderOption(option) {
            return (
              <ToggleGroupItem
                key={option.value}
                value={option.value}
                className="h-8 w-full rounded-md! border! text-xs"
              >
                {option.label}
              </ToggleGroupItem>
            )
          })}
        </ToggleGroup>
        <p className="text-muted-foreground text-[11px] leading-snug">
          {usesErrorDiffusion
            ? 'Error diffusion spreads each cell’s rounding error into its neighbours. Highest detail, but it cannot animate.'
            : 'Ordered screens compare every cell against a fixed threshold pattern. Fast and animatable.'}
        </p>
      </div>

      <Separator />

      <LabeledSlider
        label="Cell size"
        value={settings.cellSize}
        range={SLIDER_RANGES.cellSize}
        suffix="px"
        onChange={function onChange(cellSize) {
          onPatch({ cellSize })
        }}
        hint="Edge length of one dither cell. Smaller is finer."
      />

      <LabeledSlider
        label="Threshold"
        value={settings.threshold}
        range={SLIDER_RANGES.threshold}
        onChange={function onChange(threshold) {
          onPatch({ threshold })
        }}
        hint="Bias towards light or dark. Neutral at 0.50."
      />

      <Separator />

      <div className="flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <Label htmlFor={invertId} className="text-xs font-medium">
            Invert
          </Label>
          <p className="text-muted-foreground text-[11px]">Swap light and dark output</p>
        </div>
        <Switch
          id={invertId}
          checked={settings.invert}
          onCheckedChange={function onCheckedChange(invert) {
            onPatch({ invert })
          }}
        />
      </div>
    </div>
  )
}
