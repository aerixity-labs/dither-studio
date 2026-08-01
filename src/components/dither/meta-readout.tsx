import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'

import type { LoadedImage } from '@/hooks/use-source-image'
import {
  ColorMode,
  canAnimate,
  resolvePalette,
  toHex,
  type DitherSettings,
  type Rgb,
} from '@/lib/dither/core'
import { cn } from '@/lib/utils'

type FieldProps = {
  label: string
  value: string
  /** Monospace suits figures, where digit alignment carries meaning. Prose opts out. */
  isValueNumeric?: boolean
  /** Prefixes the value with a pinging indicator and sets it in the status colour. */
  isLive?: boolean
  /** Optional mark before the label, for fields that are a note rather than a reading. */
  icon?: IconSvgElement
  className?: string
}

/**
 * One label/value pair from the readout. Exported so the same notation can be reused
 * outside the strip, which keeps the app's technical voice consistent.
 */
export function ReadoutField(props: FieldProps) {
  const { label, value, isValueNumeric = true, isLive, icon, className } = props

  return (
    <span className={cn('flex items-center gap-2 px-2.5', className)}>
      {icon ? (
        <HugeiconsIcon
          icon={icon}
          strokeWidth={1.5}
          className="text-muted-foreground/70 size-3.5 shrink-0"
          aria-hidden
        />
      ) : null}
      <span className="text-muted-foreground/70 text-[10px] font-medium tracking-widest uppercase">
        {label}
      </span>
      <span className="flex items-center gap-1.5">
        {isLive ? (
          /**
           * Two stacked dots: the outer one only scales and fades, so the halo reads as a
           * pulse without the solid centre losing definition. `animate-ping` paints
           * outside the wrapper without affecting layout.
           */
          <span className="relative flex size-2" aria-hidden>
            <span className="bg-success absolute inline-flex size-full rounded-full opacity-75 motion-safe:animate-ping" />
            <span className="bg-success relative inline-flex size-2 rounded-full" />
          </span>
        ) : null}
        <span
          className={cn('text-[11px]', {
            'font-mono tabular-nums': isValueNumeric,
            'text-success font-medium tracking-[0.08em] uppercase': isLive,
            'text-foreground': !isLive,
          })}
        >
          {value}
        </span>
      </span>
    </span>
  )
}

function buildGreySteps(levels: number): Rgb[] {
  /** Two is the floor `applyDither` also enforces; below it the ramp has no span. */
  const steps = Math.max(2, levels)

  return Array.from({ length: steps }, function toStep(_unused, index) {
    const value = Math.round((index / (steps - 1)) * 255)
    return [value, value, value]
  })
}

/**
 * The colours the current settings will actually print, ordered dark to light. Duplicates
 * are collapsed because a wedge showing the same tone twice would misreport how many steps
 * are available – which also keeps the hex usable as a React key.
 */
function getWedgeColors(settings: DitherSettings) {
  const swatches =
    settings.colorMode === ColorMode.original
      ? buildGreySteps(settings.levels)
      : resolvePalette(settings).colors

  const oriented = settings.invert
    ? swatches.map(function invert(color): Rgb {
        return [255 - color[0], 255 - color[1], 255 - color[2]]
      })
    : swatches

  return [
    ...new Set(
      oriented.map(function toSwatch(color) {
        return toHex(color)
      }),
    ),
  ]
}

type Props = {
  settings: DitherSettings
  image: LoadedImage
  previewSize: { width: number; height: number } | null
}

/**
 * Instrument strip for the loaded image, modelled on the step wedge printed in the margin
 * of a press sheet. Deliberately square while the rest of the interface is rounded, so it
 * reads as a gauge inlaid into the layout rather than another pill.
 */
export function MetaReadout(props: Props) {
  const { settings, image, previewSize } = props

  const wedge = getWedgeColors(settings)
  const isDownscaled =
    previewSize !== null &&
    (previewSize.width !== image.width || previewSize.height !== image.height)

  return (
    <div className="border-border/70 divide-border/70 flex h-7 items-stretch divide-x border">
      <span className="flex items-stretch" aria-hidden>
        {wedge.map(function renderStep(color) {
          return <span key={color} className="w-2.5" style={{ backgroundColor: color }} />
        })}
      </span>

      <ReadoutField label="Source" value={`${image.width}×${image.height}`} />

      {isDownscaled ? (
        <ReadoutField
          label="Preview"
          value={`${previewSize.width}×${previewSize.height}`}
          /** Dropped rather than wrapped on narrow screens: useful, but secondary. */
          className="hidden sm:flex"
        />
      ) : null}

      {canAnimate(settings) ? <ReadoutField label="Motion" value="live" isLive /> : null}
    </div>
  )
}
