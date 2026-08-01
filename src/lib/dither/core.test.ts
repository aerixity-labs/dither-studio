import { describe, expect, it } from 'vitest'

import {
  applyDither,
  ColorMode,
  DEFAULT_DITHER_SETTINGS,
  DitherPattern,
  resolvePalette,
  type DitherSettings,
  type PixelBuffer,
} from './core'

/** Every test drives the public `applyDither`, so nothing here depends on internal exports. */
function makeSource(width: number, height: number, grey: number, alpha = 255): PixelBuffer {
  const data = new Uint8ClampedArray(width * height * 4)

  for (let index = 0; index < data.length; index += 4) {
    data[index] = grey
    data[index + 1] = grey
    data[index + 2] = grey
    data[index + 3] = alpha
  }

  return { width, height, data }
}

function settingsFor(overrides: Partial<DitherSettings>): DitherSettings {
  return { ...DEFAULT_DITHER_SETTINGS, ...overrides }
}

function meanChannel(frame: PixelBuffer) {
  let total = 0

  for (let index = 0; index < frame.data.length; index += 4) {
    total += frame.data[index]
  }

  return total / (frame.width * frame.height)
}

/** Deliberately not multiples of any cell size under test, so the last tile is truncated. */
const ODD_WIDTH = 17
const ODD_HEIGHT = 13
const CELL_SIZES = [1, 2, 3, 5, 24]
const ORDERED = DitherPattern.bayer4
const DIFFUSION = DitherPattern.floydSteinberg

describe('tiling', () => {
  /**
   * `applyDither` allocates a zero-filled buffer, so any pixel the cell loops failed to cover
   * keeps `alpha === 0`. This is the invariant that makes the work linear in pixel count: the
   * cells partition the image rather than overlapping or leaving gaps.
   */
  it.each([ORDERED, DIFFUSION])('writes every pixel exactly once for %s', (pattern) => {
    for (const cellSize of CELL_SIZES) {
      const source = makeSource(ODD_WIDTH, ODD_HEIGHT, 128)
      const out = applyDither(source, settingsFor({ pattern, cellSize }))

      const unwritten: number[] = []
      for (let pixel = 0; pixel < ODD_WIDTH * ODD_HEIGHT; pixel += 1) {
        if (out.data[pixel * 4 + 3] === 0) unwritten.push(pixel)
      }

      expect(unwritten, `cellSize ${cellSize} left pixels unwritten`).toEqual([])
    }
  })

  it('never grows the buffer past the image, including the last row and column', () => {
    for (const cellSize of CELL_SIZES) {
      const source = makeSource(ODD_WIDTH, ODD_HEIGHT, 200)
      const out = applyDither(source, settingsFor({ pattern: ORDERED, cellSize }))

      expect(out.data.length).toBe(ODD_WIDTH * ODD_HEIGHT * 4)
      expect(out.width).toBe(ODD_WIDTH)
      expect(out.height).toBe(ODD_HEIGHT)

      const lastPixel = (ODD_HEIGHT - 1) * ODD_WIDTH + (ODD_WIDTH - 1)
      expect(out.data[lastPixel * 4 + 3], `cellSize ${cellSize} skipped the last pixel`).toBe(255)
    }
  })
})

describe('palette', () => {
  it.each([ColorMode.grayscale, ColorMode.duotone, ColorMode.palette])(
    'resolves %s to an ascending luminance ramp',
    (colorMode) => {
      const { colors, luminances } = resolvePalette(settingsFor({ colorMode }))

      expect(colors.length).toBeGreaterThanOrEqual(2)
      expect(luminances.length).toBe(colors.length)

      for (let index = 1; index < luminances.length; index += 1) {
        expect(luminances[index]).toBeGreaterThanOrEqual(luminances[index - 1])
      }
    },
  )

  /**
   * Error diffusion feeds `luminances[index]` straight back into the error term, so a
   * narrowed copy seeds a rounding difference the feedback loop amplifies across the image.
   * Storing these as `Float32Array` changed ~12% of output bytes at 700×700 while looking
   * perfectly fine at 400×400 — hence an exactness assertion rather than a fixture.
   */
  it.each([ColorMode.duotone, ColorMode.palette])(
    'stores %s luminances at full double precision',
    (colorMode) => {
      const palette = ['#1b2033', '#8a4b06', '#e08a1e', '#f2e8d5']
      const { colors, luminances } = resolvePalette(settingsFor({ colorMode, palette }))

      colors.forEach(function exact(color, index) {
        const expected = (0.299 * color[0] + 0.587 * color[1] + 0.114 * color[2]) / 255
        expect(luminances[index]).toBe(expected)
      })
    },
  )

  /** Proves the palette lookup only ever returns real entries, for both pixel paths. */
  it.each([ORDERED, DIFFUSION])('emits only palette colours in palette mode for %s', (pattern) => {
    const palette = ['#101010', '#8a4b06', '#e08a1e', '#fff2d0']
    const settings = settingsFor({ pattern, colorMode: ColorMode.palette, palette, cellSize: 1 })
    const allowed = new Set(
      resolvePalette(settings).colors.map(function toKey(color) {
        return `${color[0]},${color[1]},${color[2]}`
      }),
    )

    const out = applyDither(makeSource(16, 16, 150), settings)

    for (let index = 0; index < out.data.length; index += 4) {
      const key = `${out.data[index]},${out.data[index + 1]},${out.data[index + 2]}`
      expect(allowed.has(key), `unexpected colour ${key}`).toBe(true)
    }
  })
})

describe('tone preservation', () => {
  /**
   * The point of dithering: the mean of the output must match the input tone. A 32×32 uniform
   * field with `cellSize: 1` and `bayer8` samples all 64 matrix thresholds evenly, so the mean
   * is the pattern's tone response.
   *
   * Tolerance is 6/255 because Bayer 8×8 quantises the dither to 64 discrete steps.
   */
  it.each([64, 96, 160, 200])('holds a uniform grey of %i at levels 2', (grey) => {
    const out = applyDither(
      makeSource(32, 32, grey),
      settingsFor({
        pattern: DitherPattern.bayer8,
        colorMode: ColorMode.original,
        levels: 2,
        cellSize: 1,
      }),
    )

    expect(Math.abs(meanChannel(out) - grey)).toBeLessThanOrEqual(6)
  })

  it('holds a uniform grey across level counts', () => {
    for (const levels of [2, 4, 8, 16]) {
      const out = applyDither(
        makeSource(32, 32, 160),
        settingsFor({
          pattern: DitherPattern.bayer8,
          colorMode: ColorMode.original,
          levels,
          cellSize: 1,
        }),
      )

      expect(Math.abs(meanChannel(out) - 160), `levels ${levels} drifted`).toBeLessThanOrEqual(6)
    }
  })
})

describe('error diffusion', () => {
  /**
   * Diffusion is chaotic, so a rounding change shows up as drift rather than a wrong pixel,
   * and small fixtures hide it entirely. 600×600 is large enough for the feedback loop to
   * amplify a perturbation into a measurable tone shift.
   *
   * Atkinson spreads only 6/8 of the error, so it lightens by design — its bound is
   * deliberately one-sided.
   */
  it.each([
    [DitherPattern.floydSteinberg, 4],
    [DitherPattern.atkinson, 14],
  ])('conserves tone for %s', (pattern, tolerance) => {
    const grey = 128
    const out = applyDither(
      makeSource(600, 600, grey),
      settingsFor({ pattern, colorMode: ColorMode.grayscale, cellSize: 1 }),
    )

    const mean = meanChannel(out)
    expect(mean).toBeGreaterThanOrEqual(grey - 4)
    expect(mean).toBeLessThanOrEqual(grey + tolerance)
  })
})

describe('robustness', () => {
  it.each([ORDERED, DIFFUSION])('keeps every channel finite and in range for %s', (pattern) => {
    const out = applyDither(
      makeSource(24, 24, 90),
      settingsFor({ pattern, colorMode: ColorMode.palette, cellSize: 2 }),
    )

    for (const channel of out.data) {
      expect(Number.isFinite(channel)).toBe(true)
      expect(channel).toBeGreaterThanOrEqual(0)
      expect(channel).toBeLessThanOrEqual(255)
    }
  })

  it.each([ORDERED, DIFFUSION])(
    'leaves a fully transparent source transparent for %s',
    (pattern) => {
      const out = applyDither(makeSource(12, 9, 200, 0), settingsFor({ pattern, cellSize: 3 }))

      expect(Array.from(out.data).every((channel) => channel === 0)).toBe(true)
    },
  )

  /** `gamma: 0` is guarded inside the tone curve; a divide-by-zero would surface as NaN here. */
  it('survives degenerate tone settings', () => {
    for (const overrides of [
      { gamma: 0 },
      { contrast: 0 },
      { brightness: -1 },
      { brightness: 1 },
      { levels: 2 },
    ]) {
      const out = applyDither(
        makeSource(16, 16, 128),
        settingsFor({ pattern: ORDERED, colorMode: ColorMode.original, cellSize: 1, ...overrides }),
      )

      const label = JSON.stringify(overrides)
      expect(
        Array.from(out.data).every((channel) => Number.isFinite(channel)),
        `${label} produced a non-finite channel`,
      ).toBe(true)
    }
  })
})
