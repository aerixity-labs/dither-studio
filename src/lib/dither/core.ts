/// <reference lib="webworker" />
/**
 * The dithering core, and the Web Worker entry.
 *
 * The listener at the bottom is guarded so importing this on the main thread is safe,
 * which the no-worker fallback in `useDitherRender` relies on.
 */

/* ---------- types ---------- */

export const DitherPattern = {
  bayer2: 'bayer2',
  bayer4: 'bayer4',
  bayer8: 'bayer8',
  halftone: 'halftone',
  noise: 'noise',
  crosshatch: 'crosshatch',
  floydSteinberg: 'floyd-steinberg',
  atkinson: 'atkinson',
} as const

export type DitherPattern = (typeof DitherPattern)[keyof typeof DitherPattern]

export const ColorMode = {
  original: 'original',
  grayscale: 'grayscale',
  duotone: 'duotone',
  palette: 'palette',
} as const

export type ColorMode = (typeof ColorMode)[keyof typeof ColorMode]

export const AnimationMode = {
  noiseDrift: 'noise-drift',
  patternShift: 'pattern-shift',
  wave: 'wave',
} as const

export type AnimationMode = (typeof AnimationMode)[keyof typeof AnimationMode]

/**
 * Patterns that diffuse quantization error to neighbouring pixels. They are
 * order-dependent, so they cannot be recomputed per animation frame from a
 * time offset alone and are excluded from animation.
 */
const ERROR_DIFFUSION_PATTERNS: ReadonlySet<DitherPattern> = new Set([
  DitherPattern.floydSteinberg,
  DitherPattern.atkinson,
])

export function isErrorDiffusion(pattern: DitherPattern) {
  return ERROR_DIFFUSION_PATTERNS.has(pattern)
}

export type Rgb = readonly [number, number, number]

export type DitherSettings = {
  pattern: DitherPattern
  colorMode: ColorMode
  /** Edge length in pixels of one dither cell. */
  cellSize: number
  /** Bias applied to the pattern threshold, 0 to 1. */
  threshold: number
  /** -1 to 1. */
  brightness: number
  /** 0 to 2, 1 is unchanged. */
  contrast: number
  /** 0.2 to 3, 1 is unchanged. */
  gamma: number
  /** Tones per channel in `original` mode, 2 to 16. */
  levels: number
  invert: boolean
  /** Dark ink colour for `duotone`. */
  primaryColor: string
  /** Light paper colour for `duotone`. */
  secondaryColor: string
  /** Ordered dark to light for `palette`. */
  palette: string[]
  animated: boolean
  animationMode: AnimationMode
  /** Multiplier on elapsed time, 0.05 to 4. */
  animationSpeed: number
}

/**
 * The worker keeps the decoded source pixels between renders, so an animated
 * preview only sends settings and a timestamp per frame instead of
 * re-transferring several megabytes of image data sixty times a second.
 */
export type DitherRequest =
  | { type: 'source'; width: number; height: number; pixels: ArrayBuffer }
  | { type: 'render'; id: number; settings: DitherSettings; time: number }

export type DitherResponse =
  | { id: number; ok: true; width: number; height: number; pixels: ArrayBuffer }
  | { id: number; ok: false; message: string }

/* ---------- defaults ---------- */

export const DEFAULT_DITHER_SETTINGS: DitherSettings = {
  pattern: DitherPattern.bayer4,
  colorMode: ColorMode.grayscale,
  cellSize: 2,
  threshold: 0.5,
  brightness: 0,
  contrast: 1,
  gamma: 1,
  levels: 4,
  invert: false,
  primaryColor: '#1b2033',
  secondaryColor: '#f2e8d5',
  palette: ['#1b2033', '#c9a227', '#f2e8d5'],
  animated: false,
  animationMode: AnimationMode.noiseDrift,
  animationSpeed: 1,
}

/**
 * Longest-edge ceiling for the interactive preview. Full-resolution work is
 * deferred to export, so a 6000 px upload still scrubs at interactive speed.
 */
export const DEFAULT_MAX_RENDER_SIZE = 1400

/**
 * Animation needs both conditions, for different reasons: error-diffusion patterns cannot
 * be recomputed from a timestamp at all, while an ordered pattern with the toggle off would
 * record a perfectly valid video of a still frame.
 */
export function canAnimate(settings: DitherSettings) {
  return settings.animated && !isErrorDiffusion(settings.pattern)
}

/**
 * Value equality over every field, so callers can compare inline-built settings objects.
 *
 * Fields come from the defaults rather than a hand-written list, so a new setting is covered
 * automatically instead of silently comparing as equal.
 */
export function areSettingsEqual(a: DitherSettings, b: DitherSettings) {
  const keys = Object.keys(DEFAULT_DITHER_SETTINGS) as (keyof DitherSettings)[]

  return keys.every(function sameField(key) {
    const left = a[key]
    const right = b[key]

    if (Array.isArray(left) && Array.isArray(right)) {
      return (
        left.length === right.length &&
        left.every(function sameItem(item, index) {
          return item === right[index]
        })
      )
    }

    return left === right
  })
}

/* ---------- color ---------- */

const HEX_PATTERN = /^#?([\da-f]{3}|[\da-f]{6})$/iu
const RGB_PATTERN = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/iu

const UNPARSEABLE_COLOR: Rgb = [0, 0, 0]

export function isValidHex(value: string) {
  return HEX_PATTERN.test(value.trim())
}

/**
 * Accepts `#abc`, `#aabbcc` and `rgb()` / `rgba()` notation. Anything
 * unparseable resolves to black rather than throwing, so a half-typed value in
 * a colour field cannot break the render loop.
 */
function parseColor(value: string): Rgb {
  const trimmed = value.trim()
  const hexMatch = HEX_PATTERN.exec(trimmed)

  if (hexMatch) {
    const hex = hexMatch[1]
    if (hex.length === 3) {
      return [
        Number.parseInt(hex[0] + hex[0], 16),
        Number.parseInt(hex[1] + hex[1], 16),
        Number.parseInt(hex[2] + hex[2], 16),
      ]
    }
    return [
      Number.parseInt(hex.slice(0, 2), 16),
      Number.parseInt(hex.slice(2, 4), 16),
      Number.parseInt(hex.slice(4, 6), 16),
    ]
  }

  const rgbMatch = RGB_PATTERN.exec(trimmed)
  if (rgbMatch) {
    return [
      clampChannel(Number(rgbMatch[1])),
      clampChannel(Number(rgbMatch[2])),
      clampChannel(Number(rgbMatch[3])),
    ]
  }

  return UNPARSEABLE_COLOR
}

export function toHex(color: Rgb) {
  const parts = color.map((channel) => clampChannel(channel).toString(16).padStart(2, '0'))
  return `#${parts.join('')}`
}

/** Rec. 601 luma, the weighting that best matches perceived brightness. */
function getLuminance(red: number, green: number, blue: number) {
  return (0.299 * red + 0.587 * green + 0.114 * blue) / 255
}

function clampChannel(value: number) {
  if (value < 0) return 0
  if (value > 255) return 255
  return Math.round(value)
}

function clamp01(value: number) {
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

/* ---------- bayer-matrices ---------- */

/**
 * Ordered dithering matrices, each holding every integer from 0 to size^2 - 1
 * exactly once. Recursively generated by the standard construction
 * `M(2n) = [[4M+0, 4M+2], [4M+3, 4M+1]]`, flattened row-major.
 */
function buildBayerMatrix(size: number) {
  if (size === 1) return Int32Array.of(0)

  const half = size / 2
  const smaller = buildBayerMatrix(half)
  const matrix = new Int32Array(size * size)
  const quadrantOffsets = [0, 2, 3, 1]

  for (let y = 0; y < half; y += 1) {
    for (let x = 0; x < half; x += 1) {
      const base = smaller[y * half + x] * 4
      for (let quadrant = 0; quadrant < 4; quadrant += 1) {
        const offsetY = quadrant >= 2 ? half : 0
        const offsetX = quadrant % 2 === 1 ? half : 0
        matrix[(y + offsetY) * size + (x + offsetX)] = base + quadrantOffsets[quadrant]
      }
    }
  }

  return matrix
}

type BayerMatrix = {
  size: number
  /** Row-major thresholds already normalised to the 0 to 1 range. */
  thresholds: Float32Array
}

function normalise(size: number): BayerMatrix {
  const raw = buildBayerMatrix(size)
  const total = size * size
  const thresholds = new Float32Array(total)
  for (let index = 0; index < total; index += 1) {
    thresholds[index] = (raw[index] + 0.5) / total
  }
  return { size, thresholds }
}

const BAYER_2 = normalise(2)
const BAYER_4 = normalise(4)
const BAYER_8 = normalise(8)

function getBayerMatrix(pattern: DitherPattern) {
  if (pattern === DitherPattern.bayer2) return BAYER_2
  if (pattern === DitherPattern.bayer8) return BAYER_8
  return BAYER_4
}

/* ---------- threshold-pattern ---------- */

const TAU = Math.PI * 2

/** Cells per repeat of the line-screen patterns. */
const HALFTONE_PERIOD = 4
const CROSSHATCH_PERIOD = 5

/** Peak threshold jitter added by the `noise-drift` animation mode. */
const DRIFT_AMPLITUDE = 0.22

/**
 * Grain fields per second at speed 1. The drift seed is quantised to whole steps
 * of this rate, which is what makes `animationSpeed` audible: feeding the hash a
 * continuously changing seed reshuffles it completely on every frame at any
 * speed, because any seed delta beyond roughly 1/43758 fully decorrelates it. At
 * 60fps even speed 0.05 clears that by 365x, so the grain looked identical from
 * 0.05 to 4. Quantising instead scales the *reseed rate*: 1 field per second at
 * 0.05, 48 at 4.
 */
const DRIFT_STEPS_PER_SECOND = 12

/** Peak threshold swing of the `wave` animation mode. */
const WAVE_AMPLITUDE = 0.28

/**
 * Deterministic per-cell hash in the 0 to 1 range. Uses the fractional part of
 * a large sine product, the standard trick for cheap GPU-style noise without a
 * lookup texture.
 */
function hashNoise(x: number, y: number, seed: number) {
  const value = Math.sin(x * 12.9898 + y * 78.233 + seed * 43.7585) * 43758.5453
  return value - Math.floor(value)
}

function fract(value: number) {
  return value - Math.floor(value)
}

/** Triangle wave over a unit period, peaking at 1 mid-period. */
function triangle(value: number) {
  return 1 - Math.abs(fract(value) - 0.5) * 2
}

/**
 * Concentric-dot halftone: distance from each cell to the centre of its tile on
 * a 45-degree rotated screen, which grows round dots the way a print halftone
 * does instead of drawing a diagonal line screen.
 *
 * The rotation is deliberately irrational relative to the cell grid so the dot
 * centres do not all land on integer cells, which is what gives intermediate
 * threshold values rather than a two-level checkerboard.
 */
function halftoneThreshold(cellX: number, cellY: number, phase: number) {
  const cos = Math.SQRT1_2
  const sin = Math.SQRT1_2
  const rotatedX = (cellX * cos + cellY * sin) / HALFTONE_PERIOD + phase
  const rotatedY = (cellY * cos - cellX * sin) / HALFTONE_PERIOD + phase
  const dotX = fract(rotatedX) - 0.5
  const dotY = fract(rotatedY) - 0.5
  const distance = Math.min(1, Math.sqrt(dotX * dotX + dotY * dotY) * Math.SQRT2)
  return 1 - distance
}

/**
 * Woven line screen. The two diagonals use co-prime periods so `cellX + cellY`
 * and `cellX - cellY` cannot stay in lockstep – sharing a period collapses both
 * waves onto the same parity and degenerates into a tone-deaf checkerboard.
 */
function crosshatchThreshold(cellX: number, cellY: number, phase: number) {
  const forward = triangle((cellX + cellY) / CROSSHATCH_PERIOD + phase)
  const backward = triangle((cellX - cellY) / (CROSSHATCH_PERIOD + 1) - phase)
  return (forward + backward) / 2
}

type ThresholdSampler = (cellX: number, cellY: number) => number

/**
 * Builds the per-cell threshold function for a pattern. Hoisting the pattern
 * switch out of the pixel loop keeps the inner loop free of branching on
 * settings that cannot change mid-frame.
 *
 * `cellX` / `cellY` are cell indices rather than pixel coordinates, so the
 * pattern scales with `cellSize` instead of being resampled by it.
 */
function createThresholdSampler(settings: DitherSettings, time: number): ThresholdSampler {
  const { pattern, threshold, animated, animationMode, animationSpeed } = settings
  const phase = animated ? time * animationSpeed : 0

  const waveShift =
    animated && animationMode === AnimationMode.wave ? Math.sin(phase * TAU) * WAVE_AMPLITUDE : 0
  const patternShift =
    animated && animationMode === AnimationMode.patternShift ? Math.round(phase * 4) : 0
  const isDrifting = animated && animationMode === AnimationMode.noiseDrift
  const driftSeed = Math.floor(phase * DRIFT_STEPS_PER_SECOND)

  /**
   * Shifts the whole pattern window by the user threshold. At 0.5 the pattern
   * passes through untouched; moving towards 0 or 1 biases the image light or
   * dark while preserving the pattern's relative ordering exactly.
   *
   * `noise-drift` adds per-cell jitter here rather than inside each pattern, so
   * every pattern animates under that mode instead of only the noise one.
   */
  function bias(raw: number, cellX: number, cellY: number) {
    const drift = isDrifting ? (hashNoise(cellX, cellY, driftSeed) - 0.5) * DRIFT_AMPLITUDE : 0
    return clampThreshold(raw + threshold - 0.5 + waveShift + drift)
  }

  if (pattern === DitherPattern.noise) {
    return function sampleNoise(cellX, cellY) {
      return clampThreshold(
        hashNoise(cellX, cellY, isDrifting ? driftSeed + 1 : 1) + threshold - 0.5 + waveShift,
      )
    }
  }

  if (pattern === DitherPattern.halftone) {
    const screenPhase = patternShift / HALFTONE_PERIOD
    return function sampleHalftone(cellX, cellY) {
      return bias(halftoneThreshold(cellX, cellY, screenPhase), cellX, cellY)
    }
  }

  if (pattern === DitherPattern.crosshatch) {
    const screenPhase = patternShift / CROSSHATCH_PERIOD
    return function sampleCrosshatch(cellX, cellY) {
      return bias(crosshatchThreshold(cellX, cellY, screenPhase), cellX, cellY)
    }
  }

  const { size, thresholds } = getBayerMatrix(pattern)

  return function sampleOrdered(cellX, cellY) {
    const matrixX = (((cellX + patternShift) % size) + size) % size
    const matrixY = (((cellY + patternShift) % size) + size) % size
    return bias(thresholds[matrixY * size + matrixX], cellX, cellY)
  }
}

function clampThreshold(value: number) {
  if (value < 0.001) return 0.001
  if (value > 0.999) return 0.999
  return value
}

/* ---------- error-diffusion ---------- */

/** Offsets are relative to the pixel being processed. */
type DiffusionCell = {
  dx: number
  dy: number
  weight: number
}

type DiffusionKernel = {
  cells: readonly DiffusionCell[]
  divisor: number
}

const FLOYD_STEINBERG: DiffusionKernel = {
  cells: [
    { dx: 1, dy: 0, weight: 7 },
    { dx: -1, dy: 1, weight: 3 },
    { dx: 0, dy: 1, weight: 5 },
    { dx: 1, dy: 1, weight: 1 },
  ],
  divisor: 16,
}

/**
 * Atkinson spreads only 6/8 of the error, which lightens large flat areas and
 * gives the sparse, high-contrast look of early Macintosh dithering.
 */
const ATKINSON: DiffusionKernel = {
  cells: [
    { dx: 1, dy: 0, weight: 1 },
    { dx: 2, dy: 0, weight: 1 },
    { dx: -1, dy: 1, weight: 1 },
    { dx: 0, dy: 1, weight: 1 },
    { dx: 1, dy: 1, weight: 1 },
    { dx: 0, dy: 2, weight: 1 },
  ],
  divisor: 8,
}

function getDiffusionKernel(pattern: DitherPattern) {
  return pattern === DitherPattern.atkinson ? ATKINSON : FLOYD_STEINBERG
}

/* ---------- quantize ---------- */

const WHITE: Rgb = [255, 255, 255]
const BLACK: Rgb = [0, 0, 0]

/**
 * Palette resolved once per frame and sorted dark to light, so a luminance
 * value maps onto it by simple index arithmetic in the pixel loop.
 */
type ResolvedPalette = {
  colors: Rgb[]
  /**
   * Parallel to `colors`. Float64 rather than Float32 because error diffusion feeds an entry's
   * luminance straight back into the error term, and a narrowed copy seeds a rounding
   * difference that the feedback loop then amplifies across the whole image.
   */
  luminances: Float64Array
}

export function resolvePalette(settings: DitherSettings): ResolvedPalette {
  const raw = selectColors(settings)
  const withLuminance = raw.map(function toEntry(color) {
    return { color, luminance: getLuminance(color[0], color[1], color[2]) }
  })

  withLuminance.sort(function byLuminance(a, b) {
    return a.luminance - b.luminance
  })

  const colors = withLuminance.map(function pickColor(entry) {
    return entry.color
  })
  const luminances = Float64Array.from(
    withLuminance.map(function pickLuminance(entry) {
      return entry.luminance
    }),
  )

  return { colors, luminances }
}

function selectColors(settings: DitherSettings): Rgb[] {
  if (settings.colorMode === ColorMode.grayscale) return [BLACK, WHITE]

  if (settings.colorMode === ColorMode.duotone) {
    return [parseColor(settings.primaryColor), parseColor(settings.secondaryColor)]
  }

  if (settings.colorMode === ColorMode.palette) {
    const parsed = settings.palette.map(parseColor)
    if (parsed.length >= 2) return parsed
    if (parsed.length === 1) return [parsed[0], WHITE]
    return [BLACK, WHITE]
  }

  return [BLACK, WHITE]
}

/**
 * Maps a dithered luminance onto the palette. The threshold has already been folded into
 * `luminance` by the caller, so this is a plain nearest-stop lookup over an ascending ramp –
 * O(paletteLength) with an early exit, and palettes are single digits long.
 *
 * Returns the index rather than the colour so error diffusion can read the entry's exact
 * precomputed luminance instead of recomputing it from the RGB triple.
 */
function pickPaletteIndex(palette: ResolvedPalette, luminance: number): number {
  const { colors, luminances } = palette
  const lastIndex = colors.length - 1

  if (luminance <= luminances[0]) return 0
  if (luminance >= luminances[lastIndex]) return lastIndex

  for (let index = 0; index < lastIndex; index += 1) {
    const lower = luminances[index]
    const upper = luminances[index + 1]
    if (luminance <= upper) {
      const midpoint = (lower + upper) / 2
      return luminance < midpoint ? index : index + 1
    }
  }

  return lastIndex
}

/**
 * Snaps one channel onto the quantisation ramp used by `original` mode, which keeps the
 * source hues while collapsing them to a poster-like set of steps.
 *
 * `stepSize` is passed in because it depends only on `levels`, so the caller computes it once
 * per frame rather than three times per cell.
 */
function quantizeChannel(value: number, stepSize: number) {
  return Math.round(value / stepSize) * stepSize
}

/* ---------- apply-dither ---------- */

/**
 * The buffer type parameter is pinned to `ArrayBuffer` (never
 * `SharedArrayBuffer`) so `data.buffer` stays structured-clone transferable
 * without needing an assertion at the worker boundary.
 */
export type PixelBuffer = {
  width: number
  height: number
  data: Uint8ClampedArray<ArrayBuffer>
}

/**
 * Precomputed 256-entry brightness / contrast / gamma curve. Building it once
 * per frame turns three float operations per channel into one array read,
 * which is the difference between a smooth and a stuttering preview.
 */
function buildToneCurve(brightness: number, contrast: number, gamma: number) {
  const curve = new Uint8ClampedArray(256)
  const safeGamma = gamma <= 0 ? 0.01 : gamma
  const inverseGamma = 1 / safeGamma

  for (let value = 0; value < 256; value += 1) {
    const contrasted = (value - 128) * contrast + 128 + brightness * 255
    const normalised = clamp01(contrasted / 255)
    curve[value] = clampChannel(normalised ** inverseGamma * 255)
  }

  return curve
}

/**
 * Dithers `source` into a new buffer. Pure and DOM-free so the same code runs
 * on the main thread, inside the worker, and in every export path.
 *
 * `time` only has an effect when `settings.animated` is set and the pattern is
 * not error diffusion.
 */
export function applyDither(source: PixelBuffer, settings: DitherSettings, time = 0): PixelBuffer {
  const { width, height } = source
  const output = new Uint8ClampedArray(width * height * 4)
  const curve = buildToneCurve(settings.brightness, settings.contrast, settings.gamma)
  const palette = resolvePalette(settings)
  const cellSize = Math.max(1, Math.round(settings.cellSize))

  if (isErrorDiffusion(settings.pattern)) {
    diffuseError(source, output, settings, palette, curve, cellSize)
  } else {
    applyOrdered(source, output, settings, palette, curve, cellSize, time)
  }

  return { width, height, data: output }
}

/**
 * Ordered / stochastic patterns. One pass, no inter-pixel dependency: sample
 * the top-left pixel of each cell, decide its colour, then flood the cell.
 */
function applyOrdered(
  source: PixelBuffer,
  output: Uint8ClampedArray,
  settings: DitherSettings,
  palette: ResolvedPalette,
  curve: Uint8ClampedArray,
  cellSize: number,
  time: number,
) {
  const { width, height, data } = source
  const { colors } = palette
  const { invert } = settings
  const sampleThreshold = createThresholdSampler(settings, time)
  const usesPalette = settings.colorMode !== ColorMode.original

  /**
   * The dither nudge has to span exactly one quantisation step, or the pattern cannot carry a
   * tone across a step boundary often enough and the output stops averaging to the input.
   */
  const stepSize = 255 / (Math.max(2, Math.round(settings.levels)) - 1)

  const gridWidth = Math.ceil(width / cellSize)
  const gridHeight = Math.ceil(height / cellSize)

  for (let cellY = 0; cellY < gridHeight; cellY += 1) {
    const y = cellY * cellSize

    for (let cellX = 0; cellX < gridWidth; cellX += 1) {
      const x = cellX * cellSize
      const sourceIndex = (y * width + x) * 4
      const alpha = data[sourceIndex + 3]

      if (alpha < 10) {
        fillCell(output, width, height, x, y, cellSize, 0, 0, 0, 0)
        continue
      }

      const red = curve[data[sourceIndex]]
      const green = curve[data[sourceIndex + 1]]
      const blue = curve[data[sourceIndex + 2]]
      const threshold = sampleThreshold(cellX, cellY)

      let outRed: number
      let outGreen: number
      let outBlue: number

      if (usesPalette) {
        const luminance = getLuminance(red, green, blue)
        const chosen = colors[pickPaletteIndex(palette, luminance + (0.5 - threshold))]
        outRed = chosen[0]
        outGreen = chosen[1]
        outBlue = chosen[2]
      } else {
        const nudge = (0.5 - threshold) * stepSize
        outRed = quantizeChannel(clampChannel(red + nudge), stepSize)
        outGreen = quantizeChannel(clampChannel(green + nudge), stepSize)
        outBlue = quantizeChannel(clampChannel(blue + nudge), stepSize)
      }

      if (invert) {
        outRed = 255 - outRed
        outGreen = 255 - outGreen
        outBlue = 255 - outBlue
      }

      fillCell(output, width, height, x, y, cellSize, outRed, outGreen, outBlue, alpha)
    }
  }
}

/**
 * Error-diffusion patterns. Works on a downsampled cell grid so `cellSize`
 * behaves consistently with the ordered patterns, then scales the result back
 * up. Sequential by nature: each cell's error must reach its neighbours before
 * they are visited.
 */
function diffuseError(
  source: PixelBuffer,
  output: Uint8ClampedArray,
  settings: DitherSettings,
  palette: ResolvedPalette,
  curve: Uint8ClampedArray,
  cellSize: number,
) {
  const { width, height, data } = source
  const { colors, luminances } = palette
  const { invert } = settings
  const { cells, divisor } = getDiffusionKernel(settings.pattern)
  const gridWidth = Math.ceil(width / cellSize)
  const gridHeight = Math.ceil(height / cellSize)

  const luminanceGrid = new Float32Array(gridWidth * gridHeight)
  const alphaGrid = new Uint8ClampedArray(gridWidth * gridHeight)

  for (let cellY = 0; cellY < gridHeight; cellY += 1) {
    for (let cellX = 0; cellX < gridWidth; cellX += 1) {
      const sourceIndex = (cellY * cellSize * width + cellX * cellSize) * 4
      const gridIndex = cellY * gridWidth + cellX
      alphaGrid[gridIndex] = data[sourceIndex + 3]
      luminanceGrid[gridIndex] = getLuminance(
        curve[data[sourceIndex]],
        curve[data[sourceIndex + 1]],
        curve[data[sourceIndex + 2]],
      )
    }
  }

  const bias = settings.threshold - 0.5

  for (let cellY = 0; cellY < gridHeight; cellY += 1) {
    for (let cellX = 0; cellX < gridWidth; cellX += 1) {
      const gridIndex = cellY * gridWidth + cellX
      const alpha = alphaGrid[gridIndex]
      const x = cellX * cellSize
      const y = cellY * cellSize

      if (alpha < 10) {
        fillCell(output, width, height, x, y, cellSize, 0, 0, 0, 0)
        continue
      }

      const wanted = luminanceGrid[gridIndex]
      const index = pickPaletteIndex(palette, wanted - bias)
      const chosen = colors[index]
      const error = wanted - luminances[index]
      /** Divided once per cell, not per kernel cell. Exact: both divisors are powers of two. */
      const spread = error / divisor

      for (const cell of cells) {
        const neighbourX = cellX + cell.dx
        const neighbourY = cellY + cell.dy
        if (
          neighbourX < 0 ||
          neighbourX >= gridWidth ||
          neighbourY < 0 ||
          neighbourY >= gridHeight
        ) {
          continue
        }
        luminanceGrid[neighbourY * gridWidth + neighbourX] += spread * cell.weight
      }

      const red = invert ? 255 - chosen[0] : chosen[0]
      const green = invert ? 255 - chosen[1] : chosen[1]
      const blue = invert ? 255 - chosen[2] : chosen[2]

      fillCell(output, width, height, x, y, cellSize, red, green, blue, alpha)
    }
  }
}

/**
 * Writes one flat cell of colour. Bounds are clamped so a cell size that does
 * not divide the image evenly cannot write past the last row or column.
 */
function fillCell(
  output: Uint8ClampedArray,
  width: number,
  height: number,
  originX: number,
  originY: number,
  cellSize: number,
  red: number,
  green: number,
  blue: number,
  alpha: number,
) {
  const endX = Math.min(originX + cellSize, width)
  const endY = Math.min(originY + cellSize, height)

  for (let y = originY; y < endY; y += 1) {
    let index = (y * width + originX) * 4
    for (let x = originX; x < endX; x += 1) {
      output[index] = red
      output[index + 1] = green
      output[index + 2] = blue
      output[index + 3] = alpha
      index += 4
    }
  }
}

/* ---------- prepare-source ---------- */

export type SourceImage = HTMLImageElement | ImageBitmap

export function getIntrinsicSize(image: SourceImage) {
  if (image instanceof ImageBitmap) return { width: image.width, height: image.height }
  return {
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
  }
}

/**
 * Scales an image down so its longest edge is at most `maxSize`, preserving
 * aspect ratio. Never scales up – a small source stays at its native size so it
 * is not blurred before being dithered.
 */
export function getRenderSize(image: SourceImage, maxSize: number) {
  const { width, height } = getIntrinsicSize(image)
  const longest = Math.max(width, height)

  if (longest <= maxSize || maxSize <= 0) {
    return { width: Math.max(1, width), height: Math.max(1, height) }
  }

  const scale = maxSize / longest
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/**
 * Decodes an image into raw RGBA at the given size. Throws on a tainted canvas
 * so callers can surface a CORS message instead of rendering a blank frame.
 */
export function prepareSource(image: SourceImage, width: number, height: number): PixelBuffer {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('This browser could not provide a 2D canvas context.')

  context.drawImage(image, 0, 0, width, height)

  const imageData = context.getImageData(0, 0, width, height)
  return { width, height, data: new Uint8ClampedArray(imageData.data) }
}

/* ---------- worker entry ---------- */

/**
 * The worker side. The source is uploaded once and retained here, so an animated preview
 * costs one buffer hand-off per frame instead of two.
 *
 * A positive test for the worker scope, not a negative test for `window`: bundlers shim
 * `window` inside worker chunks – Turbopack does – so `typeof window === 'undefined'` is
 * false there and the listener would silently never register, leaving every render hanging
 * with no error. `DedicatedWorkerGlobalScope` exists only in a real worker: absent on the
 * main thread, absent in Node during server rendering, present here.
 */
// oxlint-disable-next-line unicorn/no-typeof-undefined -- typeof is the only safe test for a possibly-undeclared global
if (typeof DedicatedWorkerGlobalScope !== 'undefined' && typeof self !== 'undefined') {
  let source: PixelBuffer | null = null

  self.addEventListener('message', function onMessage(event) {
    const message = event.data

    if (message.type === 'source') {
      source = {
        width: message.width,
        height: message.height,
        data: new Uint8ClampedArray(message.pixels),
      }
      return
    }

    if (!source) {
      self.postMessage({
        id: message.id,
        ok: false,
        message: 'No source image has been uploaded to the dither worker.',
      })
      return
    }

    try {
      const result = applyDither(source, message.settings, message.time)
      self.postMessage(
        {
          id: message.id,
          ok: true,
          width: result.width,
          height: result.height,
          pixels: result.data.buffer,
        },
        [result.data.buffer],
      )
    } catch (error: unknown) {
      self.postMessage({
        id: message.id,
        ok: false,
        message: error instanceof Error ? error.message : 'Dithering failed.',
      })
    }
  })
}
