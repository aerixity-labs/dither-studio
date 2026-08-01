import {
  IMAGE_DB_NAME,
  IMAGE_STORE_NAME,
  MAX_STORED_IMAGES,
  ORPHAN_IMAGE_TTL_MS,
} from '@/constants/persistence'
import { createIdbStore } from '@/lib/persistence/idb-key-value'
import { ensureSessionToken, readSessionToken } from '@/lib/persistence/session-token'

type StoredImageRecord = {
  token: string
  savedAt: number
  fileName: string
  type: string
  size: number
  blob: Blob
}

const store = createIdbStore(IMAGE_DB_NAME, IMAGE_STORE_NAME)

function isRecord(value: unknown): value is StoredImageRecord {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<StoredImageRecord>
  return typeof candidate.token === 'string' && candidate.blob instanceof Blob
}

async function readRecords() {
  const values = await store.values<unknown>()
  return values.filter(function keepRecords(value): value is StoredImageRecord {
    return isRecord(value)
  })
}

/**
 * Records are keyed by session token, not one shared slot, so a second tab reloading
 * cannot delete the first tab's image. The cost is records left behind by tabs that
 * closed without cleanup, swept here by age and by count.
 */
async function sweep(records: StoredImageRecord[], ownToken: string | null) {
  const cutoff = Date.now() - ORPHAN_IMAGE_TTL_MS
  const others = records.filter(function isOther(record) {
    return record.token !== ownToken
  })

  function isExpired(record: StoredImageRecord) {
    return typeof record.savedAt !== 'number' || record.savedAt <= cutoff
  }

  const expired = others.filter(function keepExpired(record) {
    return isExpired(record)
  })

  /**
   * Anything inside the TTL may belong to a live sibling tab, so only the oldest are
   * dropped, and only once the cap is exceeded.
   */
  const live = others
    .filter(function keepLive(record) {
      return !isExpired(record)
    })
    .toSorted(function byOldestFirst(a, b) {
      return a.savedAt - b.savedAt
    })

  const overflow = live.slice(0, Math.max(0, live.length - (MAX_STORED_IMAGES - 1)))

  for (const record of [...expired, ...overflow]) {
    await store.remove(record.token)
  }
}

/** Fire and forget: a 25 MB write must never delay the preview. Never rejects. */
export async function saveStoredImage(file: File) {
  const token = ensureSessionToken()
  if (!token) return

  const record: StoredImageRecord = {
    token,
    savedAt: Date.now(),
    fileName: file.name,
    type: file.type,
    size: file.size,
    blob: file,
  }

  const didWrite = await store.set(token, record)
  if (!didWrite) return

  await sweep(await readRecords(), token)
}

/**
 * Returns a `File`, not the raw blob, so the caller can push it back through the same
 * validation and decode path an upload takes – re-checking a stale record for free.
 */
export async function loadStoredImage(): Promise<File | null> {
  const token = readSessionToken()
  const records = await readRecords()

  await sweep(records, token)

  if (!token) return null

  const record = records.find(function byToken(candidate) {
    return candidate.token === token
  })

  if (!record) return null

  return new File([record.blob], record.fileName, { type: record.type })
}

export async function clearStoredImage() {
  const token = readSessionToken()
  if (!token) return
  await store.remove(token)
}
