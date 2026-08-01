import {
  AnimationMode,
  ColorMode,
  DEFAULT_DITHER_SETTINGS,
  DitherPattern,
  type DitherSettings,
} from '@/lib/dither/core'

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024

export const ACCEPTED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/avif',
] as const

export const ACCEPTED_IMAGE_ACCEPT_ATTRIBUTE = ACCEPTED_IMAGE_TYPES.join(',')

export type SliderRange = {
  min: number
  max: number
  step: number
}

export const SLIDER_RANGES = {
  cellSize: { min: 1, max: 24, step: 1 },
  threshold: { min: 0, max: 1, step: 0.01 },
  brightness: { min: -1, max: 1, step: 0.01 },
  contrast: { min: 0, max: 2, step: 0.01 },
  gamma: { min: 0.2, max: 3, step: 0.01 },
  levels: { min: 2, max: 16, step: 1 },
  animationSpeed: { min: 0.05, max: 4, step: 0.05 },
} as const satisfies Record<string, SliderRange>

/**
 * Deliberately narrower than `SLIDER_RANGES`: rolling the full range lands on an
 * all-black or all-white frame often enough to make the button feel broken.
 */
export const RANDOM_RANGES = {
  cellSize: { min: 1, max: 6, step: 1 },
  threshold: { min: 0.35, max: 0.65, step: 0.01 },
  contrast: { min: 0.9, max: 1.4, step: 0.01 },
  gamma: { min: 0.8, max: 1.4, step: 0.01 },
} as const satisfies Record<string, SliderRange>

export const RANDOM_INVERT_CHANCE = 0.15

/** Radix controls hand back a plain `string`; this narrows it to the option union. */
export function findOption<T extends { value: string }>(options: readonly T[], value: string) {
  return options.find(function byValue(option) {
    return option.value === value
  })
}

export const PATTERN_OPTIONS: readonly { value: DitherPattern; label: string }[] = [
  { value: DitherPattern.bayer2, label: 'Bayer 2×2' },
  { value: DitherPattern.bayer4, label: 'Bayer 4×4' },
  { value: DitherPattern.bayer8, label: 'Bayer 8×8' },
  { value: DitherPattern.halftone, label: 'Halftone' },
  { value: DitherPattern.crosshatch, label: 'Crosshatch' },
  { value: DitherPattern.noise, label: 'Noise' },
  { value: DitherPattern.floydSteinberg, label: 'Floyd–Steinberg' },
  { value: DitherPattern.atkinson, label: 'Atkinson' },
]

export const COLOR_MODE_OPTIONS: readonly { value: ColorMode; label: string; hint: string }[] = [
  { value: ColorMode.grayscale, label: 'Grayscale', hint: 'Pure black and white' },
  { value: ColorMode.duotone, label: 'Duotone', hint: 'Two colours you pick' },
  { value: ColorMode.palette, label: 'Palette', hint: 'Multi-stop colour ramp' },
  { value: ColorMode.original, label: 'Original', hint: 'Keep source hues, posterised' },
]

export const ANIMATION_MODE_OPTIONS: readonly {
  value: AnimationMode
  label: string
  hint: string
}[] = [
  { value: AnimationMode.noiseDrift, label: 'Noise drift', hint: 'Grain reseeds every frame' },
  { value: AnimationMode.patternShift, label: 'Pattern shift', hint: 'Matrix scrolls diagonally' },
  { value: AnimationMode.wave, label: 'Wave', hint: 'Threshold breathes in and out' },
]

export type LookPreset = {
  id: string
  label: string
  description: string
  settings: DitherSettings
}

/**
 * Named looks that set pattern, tone and palette together. The first two
 * reproduce the reference artwork this studio was built around.
 */
export const LOOK_PRESETS: readonly LookPreset[] = [
  {
    id: 'sepia-halftone',
    label: 'Sepia halftone',
    description: 'Warm three-tone print screen on cream stock',
    settings: {
      ...DEFAULT_DITHER_SETTINGS,
      pattern: DitherPattern.halftone,
      colorMode: ColorMode.palette,
      palette: ['#1b2033', '#c9a227', '#f2e8d5'],
      cellSize: 3,
      threshold: 0.5,
      contrast: 1.18,
      gamma: 1.05,
    },
  },
  {
    id: 'newsprint',
    label: 'Newsprint',
    description: 'Fine four-tone grey screen, cold paper',
    settings: {
      ...DEFAULT_DITHER_SETTINGS,
      pattern: DitherPattern.bayer8,
      colorMode: ColorMode.palette,
      palette: ['#0d0d0f', '#6b6b66', '#c9c7c0', '#f2ead8'],
      cellSize: 2,
      threshold: 0.5,
      contrast: 1.22,
      gamma: 1,
    },
  },
  {
    id: 'pure-mono',
    label: 'Pure mono',
    description: 'One-bit error diffusion, maximum detail',
    settings: {
      ...DEFAULT_DITHER_SETTINGS,
      pattern: DitherPattern.floydSteinberg,
      colorMode: ColorMode.grayscale,
      cellSize: 1,
      contrast: 1.1,
    },
  },
  {
    id: 'macintosh',
    label: 'Macintosh',
    description: 'Sparse Atkinson grain, 1984 grey',
    settings: {
      ...DEFAULT_DITHER_SETTINGS,
      pattern: DitherPattern.atkinson,
      colorMode: ColorMode.duotone,
      primaryColor: '#22201d',
      secondaryColor: '#dedbd2',
      cellSize: 2,
      contrast: 1.15,
    },
  },
  {
    id: 'gameboy',
    label: 'Game Boy',
    description: 'Four-green LCD ramp on a coarse grid',
    settings: {
      ...DEFAULT_DITHER_SETTINGS,
      pattern: DitherPattern.bayer4,
      colorMode: ColorMode.palette,
      palette: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'],
      cellSize: 4,
      contrast: 1.1,
    },
  },
  {
    id: 'riso-crosshatch',
    label: 'Riso crosshatch',
    description: 'Woven line screen in spot-ink colours',
    settings: {
      ...DEFAULT_DITHER_SETTINGS,
      pattern: DitherPattern.crosshatch,
      colorMode: ColorMode.palette,
      palette: ['#2b2b6e', '#e0457b', '#f5c04a', '#f7f2e4'],
      cellSize: 3,
      contrast: 1.12,
    },
  },
  {
    id: 'live-grain',
    label: 'Live grain',
    description: 'Animated stochastic noise, amber phosphor',
    settings: {
      ...DEFAULT_DITHER_SETTINGS,
      pattern: DitherPattern.noise,
      colorMode: ColorMode.palette,
      palette: ['#100b04', '#8a4b06', '#e08a1e', '#ffd08a'],
      cellSize: 2,
      contrast: 1.15,
      animated: true,
      animationMode: AnimationMode.noiseDrift,
      animationSpeed: 1.4,
    },
  },
]

export const DEFAULT_LOOK_PRESET_ID = 'sepia-halftone'
