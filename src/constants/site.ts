export const SITE_NAME = 'Dither Studio'

/** Android truncates around 12 characters, and "Dither Studio" is 13. */
export const SITE_SHORT_NAME = 'Dither'

export const SITE_TITLE = `${SITE_NAME} – free online image dithering tool`

export const SITE_DESCRIPTION =
  'Dither photos in real time in your browser. Ordered, halftone and error-diffusion patterns, editable colour palettes, live animation, and PNG, GIF and WebM export.'

export const SITE_AUTHOR = 'Aerixity'

export const SITE_KEYWORDS = [
  'image dithering',
  'dither tool',
  'halftone generator',
  'Floyd-Steinberg',
  'Atkinson dithering',
  'ordered dithering',
  'pixel art converter',
  'retro image effect',
]

/** The sRGB equivalent of `--background`, which is the only theme. */
export const SITE_THEME_COLOR = '#0a0a0a'

/** Bump when the page's copy or feature set changes, not on every deploy. */
export const SITE_LAST_MODIFIED = '2026-08-01'

export const SITE_FEATURES = [
  'Eight dither patterns: Bayer 2×2, 4×4 and 8×8, halftone, crosshatch, noise, Floyd–Steinberg and Atkinson',
  'Grayscale, duotone, palette and original colour modes',
  'Editable colour palettes with named look presets',
  'Live animation: noise drift, pattern shift and wave',
  'Full-resolution PNG, JPEG and WebP export',
  'Animated GIF and WebM video export',
  'Runs entirely on device – images are never uploaded',
]
