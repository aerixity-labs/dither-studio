import { SETTINGS_STORAGE_KEY } from '@/constants/persistence'
import type { DitherSettings } from '@/lib/dither/core'
import { parseStoredSettings, serialiseSettings } from '@/lib/persistence/dither-settings-schema'
import { safeStorage } from '@/lib/persistence/safe-storage'

/** Swap to `'session'` to make a tuned look die with the tab, as the stored image does. */
function getStore() {
  return safeStorage('local')
}

export function readStoredSettings(): DitherSettings | null {
  const store = getStore()
  if (!store) return null

  let raw: string | null

  try {
    raw = store.getItem(SETTINGS_STORAGE_KEY)
  } catch {
    return null
  }

  if (!raw) return null

  const settings = parseStoredSettings(raw)

  /** Drop unusable payloads rather than re-parsing the same garbage every load. */
  if (!settings) clearStoredSettings()

  return settings
}

export function writeStoredSettings(settings: DitherSettings) {
  try {
    getStore()?.setItem(SETTINGS_STORAGE_KEY, serialiseSettings(settings))
  } catch {
    /** Out of quota, or a 0-byte quota in private browsing. Nothing to do. */
  }
}

function clearStoredSettings() {
  try {
    getStore()?.removeItem(SETTINGS_STORAGE_KEY)
  } catch {
    /* Store unreachable. */
  }
}
