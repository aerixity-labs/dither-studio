import { useId } from 'react'

import type { ControlsProps } from '@/components/dither/controls/types'
import { LabeledSlider } from '@/components/dither/labeled-slider'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { ANIMATION_MODE_OPTIONS, SLIDER_RANGES, findOption } from '@/constants/dither'
import { isErrorDiffusion } from '@/lib/dither/core'

export function AnimationControls(props: ControlsProps) {
  const { settings, onPatch } = props
  const animateId = useId()
  const modeLabelId = useId()
  const isBlocked = isErrorDiffusion(settings.pattern)
  const activeMode = findOption(ANIMATION_MODE_OPTIONS, settings.animationMode)

  return (
    <div className="space-y-5">
      {isBlocked ? (
        <Alert>
          <AlertDescription className="text-[11px] leading-snug">
            Floyd–Steinberg and Atkinson carry each cell&rsquo;s error into the next, so a frame
            cannot be recomputed from a timestamp alone. Pick an ordered pattern to animate.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <Label htmlFor={animateId} className="text-xs font-medium">
            Animate
          </Label>
          <p className="text-muted-foreground text-[11px]">Redraw the screen every frame</p>
        </div>
        <Switch
          id={animateId}
          checked={settings.animated && !isBlocked}
          disabled={isBlocked}
          onCheckedChange={function onCheckedChange(animated) {
            onPatch({ animated })
          }}
        />
      </div>

      <Separator />

      <div className="space-y-2">
        <Label id={modeLabelId} className="text-xs font-medium">
          Motion
        </Label>
        <Select
          value={settings.animationMode}
          disabled={isBlocked || !settings.animated}
          onValueChange={function onValueChange(value) {
            const option = findOption(ANIMATION_MODE_OPTIONS, value)
            if (option) onPatch({ animationMode: option.value })
          }}
        >
          <SelectTrigger className="h-9 w-full text-xs" aria-labelledby={modeLabelId}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ANIMATION_MODE_OPTIONS.map(function renderOption(option) {
              return (
                <SelectItem key={option.value} value={option.value} className="text-xs">
                  {option.label}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
        {activeMode ? (
          <p className="text-muted-foreground text-[11px] leading-snug">{activeMode.hint}</p>
        ) : null}
      </div>

      <LabeledSlider
        label="Speed"
        value={settings.animationSpeed}
        range={SLIDER_RANGES.animationSpeed}
        disabled={isBlocked || !settings.animated}
        suffix="×"
        onChange={function onChange(animationSpeed) {
          onPatch({ animationSpeed })
        }}
      />
    </div>
  )
}
