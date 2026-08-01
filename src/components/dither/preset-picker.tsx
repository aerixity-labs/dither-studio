import { Tick02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Button } from '@/components/ui/button'
import { LOOK_PRESETS, type LookPreset } from '@/constants/dither'
import { ColorMode } from '@/lib/dither/core'
import { cn } from '@/lib/utils'

type Props = {
  activePresetId: string | null
  onSelect: (presetId: string) => void
}

/** The swatch is a fixed width with proportional chips, so every label starts at the same x. */
export function PresetPicker(props: Props) {
  const { activePresetId, onSelect } = props

  return (
    <div className="grid gap-1.5">
      {LOOK_PRESETS.map(function renderPreset(preset) {
        const isActive = preset.id === activePresetId

        return (
          <Button
            key={preset.id}
            type="button"
            variant="ghost"
            aria-pressed={isActive}
            onClick={function onClick() {
              onSelect(preset.id)
            }}
            className={cn('h-auto w-full justify-start gap-3 px-2.5 py-2 text-left', {
              'bg-accent text-accent-foreground': isActive,
            })}
          >
            <span className="border-border flex h-4 w-12 shrink-0 overflow-hidden rounded-[3px] border">
              {getSwatchColors(preset).map(function renderChip(color) {
                return <span key={color} className="flex-1" style={{ backgroundColor: color }} />
              })}
            </span>

            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium">{preset.label}</span>
              <span className="text-muted-foreground block truncate text-[11px] font-normal">
                {preset.description}
              </span>
            </span>

            {isActive ? (
              <HugeiconsIcon
                icon={Tick02Icon}
                strokeWidth={1.5}
                className="size-3.5 shrink-0"
                aria-hidden
              />
            ) : null}
          </Button>
        )
      })}
    </div>
  )
}

function getSwatchColors(preset: LookPreset) {
  const { colorMode, palette, primaryColor, secondaryColor } = preset.settings
  if (colorMode === ColorMode.palette) return palette
  if (colorMode === ColorMode.duotone) return [primaryColor, secondaryColor]
  return ['#000000', '#ffffff']
}
