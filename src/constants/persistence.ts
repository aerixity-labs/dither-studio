/**
 * Storage lifetimes are deliberately different for the two things we keep.
 *
 * Settings are non-identifying look parameters, so they live in `localStorage`
 * and outlast the tab: losing a hand-tuned look is the more annoying failure.
 * The photo is the privacy-weighted artefact, so it is scoped to the tab
 * session via `SESSION_TOKEN_KEY` and disappears when the tab closes.
 */
export const SETTINGS_STORAGE_KEY = 'dither-studio.settings'

/** Bump only for a genuinely breaking shape change; additive fields default. */
export const SETTINGS_SCHEMA_VERSION = 1

/** A slider drag dispatches per pointer move, and `setItem` writes to disk. */
export const SETTINGS_WRITE_DEBOUNCE_MS = 250

export const SESSION_TOKEN_KEY = 'dither-studio.session'

export const IMAGE_DB_NAME = 'dither-studio'
export const IMAGE_STORE_NAME = 'source-images'

/**
 * A tab can be closed without ever running cleanup, so records are also swept
 * by age on the next mount.
 */
export const ORPHAN_IMAGE_TTL_MS = 12 * 60 * 60 * 1000

/** Caps worst-case residency at this many uploads of `MAX_UPLOAD_BYTES`. */
export const MAX_STORED_IMAGES = 3
