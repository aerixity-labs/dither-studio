import { z } from 'zod'

import { SLIDER_RANGES, type SliderRange } from '@/constants/dither'
import { MAX_PALETTE_COLORS, MIN_PALETTE_COLORS } from '@/constants/palettes'
import { SETTINGS_SCHEMA_VERSION } from '@/constants/persistence'
import {
  AnimationMode,
  ColorMode,
  DEFAULT_DITHER_SETTINGS,
  DitherPattern,
  isValidHex,
  type DitherSettings,
} from '@/lib/dither/core'

const hexColor = z.string().refine(isValidHex, 'Not a hex colour')

/**
 * The slider bounds double as the persistence contract. Widening a range stays compatible;
 * narrowing one invalidates older payloads, which self-heal to the defaults.
 *
 * Values are clamped but never snapped to `step`: snapping introduces float drift like
 * `1.1800000000000002`, which would stop a restored look matching its preset.
 */
function sliderNumber(range: SliderRange, fallback: number, isInteger = false) {
  const base = isInteger ? z.number().int() : z.number()
  return base.min(range.min).max(range.max).default(fallback)
}

const settingsSchema = z.object({
  pattern: z.enum(DitherPattern).default(DEFAULT_DITHER_SETTINGS.pattern),
  colorMode: z.enum(ColorMode).default(DEFAULT_DITHER_SETTINGS.colorMode),
  cellSize: sliderNumber(SLIDER_RANGES.cellSize, DEFAULT_DITHER_SETTINGS.cellSize, true),
  threshold: sliderNumber(SLIDER_RANGES.threshold, DEFAULT_DITHER_SETTINGS.threshold),
  brightness: sliderNumber(SLIDER_RANGES.brightness, DEFAULT_DITHER_SETTINGS.brightness),
  contrast: sliderNumber(SLIDER_RANGES.contrast, DEFAULT_DITHER_SETTINGS.contrast),
  gamma: sliderNumber(SLIDER_RANGES.gamma, DEFAULT_DITHER_SETTINGS.gamma),
  levels: sliderNumber(SLIDER_RANGES.levels, DEFAULT_DITHER_SETTINGS.levels, true),
  invert: z.boolean().default(DEFAULT_DITHER_SETTINGS.invert),
  primaryColor: hexColor.default(DEFAULT_DITHER_SETTINGS.primaryColor),
  secondaryColor: hexColor.default(DEFAULT_DITHER_SETTINGS.secondaryColor),
  palette: z
    .array(hexColor)
    .min(MIN_PALETTE_COLORS)
    .max(MAX_PALETTE_COLORS)
    .default(function fallbackPalette() {
      return [...DEFAULT_DITHER_SETTINGS.palette]
    }),
  animated: z.boolean().default(DEFAULT_DITHER_SETTINGS.animated),
  animationMode: z.enum(AnimationMode).default(DEFAULT_DITHER_SETTINGS.animationMode),
  animationSpeed: sliderNumber(
    SLIDER_RANGES.animationSpeed,
    DEFAULT_DITHER_SETTINGS.animationSpeed,
  ),
})

const storedSettingsSchema = z.object({
  version: z.literal(SETTINGS_SCHEMA_VERSION),
  settings: settingsSchema,
})

/**
 * A *missing* field defaults, but a single *invalid* field rejects the whole payload.
 *
 * The app is the only writer, so an out-of-range value means version skew or hand-editing;
 * keeping half of it would produce a look nobody chose. Absence just means the field was
 * added in a later release, so nobody loses their look to an additive change.
 */
export function parseStoredSettings(raw: string): DitherSettings | null {
  try {
    const result = storedSettingsSchema.safeParse(JSON.parse(raw))
    if (!result.success) return null

    /** Spread over the defaults so a field added since this payload was written is present. */
    return { ...DEFAULT_DITHER_SETTINGS, ...result.data.settings }
  } catch {
    return null
  }
}

export function serialiseSettings(settings: DitherSettings) {
  return JSON.stringify({ version: SETTINGS_SCHEMA_VERSION, settings })
}
