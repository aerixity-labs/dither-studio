import { useId } from 'react'

import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import type { SliderRange } from '@/constants/dither'
import { cn } from '@/lib/utils'

type Props = {
  label: string
  value: number
  range: SliderRange
  onChange: (value: number) => void
  /** Digits shown in the mono readout. Defaults to the step's precision. */
  precision?: number
  suffix?: string
  disabled?: boolean
  hint?: string
}

function getPrecision(step: number) {
  if (step >= 1) return 0
  return String(step).split('.')[1]?.length ?? 2
}

export function LabeledSlider(props: Props) {
  const { label, value, range, onChange, precision, suffix, disabled, hint } = props
  const labelId = useId()
  const digits = precision ?? getPrecision(range.step)
  const readout = `${value.toFixed(digits)}${suffix ?? ''}`

  return (
    <div className={cn('space-y-2', { 'opacity-50': disabled })}>
      <div className="flex items-baseline justify-between gap-3">
        <Label id={labelId} className="text-xs font-medium">
          {label}
        </Label>
        <span className="text-muted-foreground text-xs tabular-nums">{readout}</span>
      </div>

      <Slider
        aria-labelledby={labelId}
        aria-valuetext={readout}
        min={range.min}
        max={range.max}
        step={range.step}
        disabled={disabled}
        value={[value]}
        onValueChange={function onValueChange(next) {
          onChange(next[0])
        }}
      />

      {hint ? <p className="text-muted-foreground text-[11px] leading-snug">{hint}</p> : null}
    </div>
  )
}
