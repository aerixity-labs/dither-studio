import { SESSION_TOKEN_KEY } from '@/constants/persistence'
import { safeStorage } from '@/lib/persistence/safe-storage'

/**
 * Identifies this tab so a stored image can be scoped to its session.
 *
 * `sessionStorage` has exactly the lifetime we want – survives a reload, dies with the
 * tab – but cannot hold a 25 MB image. The bytes go to IndexedDB; this token says which
 * record is ours.
 */
function getStore() {
  return safeStorage('session')
}

function createToken() {
  try {
    return crypto.randomUUID()
  } catch {
    /** `randomUUID` needs a secure context; uniqueness per tab is all we need. */
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  }
}

/** `null` when this tab has never stored an image, or storage is unusable. */
export function readSessionToken(): string | null {
  try {
    return getStore()?.getItem(SESSION_TOKEN_KEY) ?? null
  } catch {
    return null
  }
}

/** Minted lazily on first save, so a visitor who never uploads leaves nothing behind. */
export function ensureSessionToken(): string | null {
  const store = getStore()
  if (!store) return null

  try {
    const existing = store.getItem(SESSION_TOKEN_KEY)
    if (existing) return existing

    const token = createToken()
    store.setItem(SESSION_TOKEN_KEY, token)
    return token
  } catch {
    return null
  }
}
