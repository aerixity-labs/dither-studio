/**
 * Position is the identity of a palette stop: the list is ordered and may hold duplicate
 * colours. Keying a stop by its colour would remount the hex field on every keystroke and
 * take focus away mid-edit.
 */
/* oxlint-disable react/no-array-index-key -- position is the stop's identity */

import { PlusSignIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useId } from 'react'

import { ColorSwatchInput } from '@/components/dither/color-swatch-input'
import type { ControlsProps } from '@/components/dither/controls/types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { COLOR_MODE_OPTIONS, findOption } from '@/constants/dither'
import { MAX_PALETTE_COLORS, MIN_PALETTE_COLORS, PALETTE_PRESETS } from '@/constants/palettes'
import { ColorMode } from '@/lib/dither/core'

const NEW_STOP_COLOR = '#ffffff'

export function PaletteControls(props: ControlsProps) {
  const { settings, onPatch } = props
  const modeLabelId = useId()
  const activeMode = findOption(COLOR_MODE_OPTIONS, settings.colorMode)

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label id={modeLabelId} className="text-xs font-medium">
          Colour mode
        </Label>
        <Select
          value={settings.colorMode}
          onValueChange={function onValueChange(value) {
            const option = findOption(COLOR_MODE_OPTIONS, value)
            if (option) onPatch({ colorMode: option.value })
          }}
        >
          <SelectTrigger className="h-9 w-full text-xs" aria-labelledby={modeLabelId}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COLOR_MODE_OPTIONS.map(function renderOption(option) {
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

      {settings.colorMode === ColorMode.duotone ? (
        <>
          <Separator />
          <div className="grid grid-cols-2 gap-3">
            <ColorSwatchInput
              label="Ink"
              value={settings.primaryColor}
              onChange={function onChange(primaryColor) {
                onPatch({ primaryColor })
              }}
            />
            <ColorSwatchInput
              label="Paper"
              value={settings.secondaryColor}
              onChange={function onChange(secondaryColor) {
                onPatch({ secondaryColor })
              }}
            />
          </div>
        </>
      ) : null}

      {settings.colorMode === ColorMode.palette ? (
        <>
          <Separator />
          <PaletteEditor palette={settings.palette} onPatch={onPatch} />
        </>
      ) : null}
    </div>
  )
}

type PaletteEditorProps = {
  palette: string[]
  onPatch: ControlsProps['onPatch']
}

function PaletteEditor(props: PaletteEditorProps) {
  const { palette, onPatch } = props
  const presetLabelId = useId()
  const canRemove = palette.length > MIN_PALETTE_COLORS
  const canAdd = palette.length < MAX_PALETTE_COLORS

  function replaceColor(index: number, color: string) {
    onPatch({
      palette: palette.map(function swap(existing, position) {
        return position === index ? color : existing
      }),
    })
  }

  function removeColor(index: number) {
    onPatch({
      palette: palette.filter(function keep(_color, position) {
        return position !== index
      }),
    })
  }

  function applyPreset(presetId: string) {
    const preset = PALETTE_PRESETS.find(function byId(candidate) {
      return candidate.id === presetId
    })
    if (preset) onPatch({ palette: [...preset.colors] })
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label id={presetLabelId} className="text-xs font-medium">
          Palette preset
        </Label>
        <Select value={matchPresetId(palette)} onValueChange={applyPreset}>
          <SelectTrigger className="h-9 w-full text-xs" aria-labelledby={presetLabelId}>
            <SelectValue placeholder="Custom" />
          </SelectTrigger>
          <SelectContent>
            {PALETTE_PRESETS.map(function renderPreset(preset) {
              return (
                <SelectItem key={preset.id} value={preset.id} className="text-xs">
                  <span className="flex items-center gap-2">
                    <span className="flex gap-0.5">
                      {preset.colors.map(function renderChip(color) {
                        return (
                          <span
                            key={color}
                            className="size-2.5 rounded-xs"
                            style={{ backgroundColor: color }}
                          />
                        )
                      })}
                    </span>
                    {preset.label}
                  </span>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {palette.map(function renderSwatch(color, index) {
          return (
            <ColorSwatchInput
              key={index}
              label={getStopLabel(index, palette.length)}
              value={color}
              onChange={function onChange(next) {
                replaceColor(index, next)
              }}
              onRemove={
                canRemove
                  ? function onRemove() {
                      removeColor(index)
                    }
                  : undefined
              }
            />
          )
        })}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        disabled={!canAdd}
        onClick={function onAdd() {
          onPatch({ palette: [...palette, NEW_STOP_COLOR] })
        }}
      >
        <HugeiconsIcon icon={PlusSignIcon} strokeWidth={1.5} className="size-3.5" aria-hidden />
        Add stop
      </Button>

      <p className="text-muted-foreground text-[11px] leading-snug">
        Stops are sorted by brightness automatically, so the order you enter them does not matter.
      </p>
    </div>
  )
}

function getStopLabel(index: number, total: number) {
  if (index === 0) return 'Darkest'
  if (index === total - 1) return 'Lightest'
  return `Stop ${index + 1}`
}

function matchPresetId(palette: string[]) {
  const joined = palette.join(',').toLowerCase()
  const match = PALETTE_PRESETS.find(function byColors(preset) {
    return preset.colors.join(',').toLowerCase() === joined
  })
  return match?.id ?? ''
}
