/**
 * Reading the `localStorage`/`sessionStorage` property itself throws when the browser
 * is set to block all storage, not just the get/set, so every access goes through here.
 */
export function safeStorage(kind: 'local' | 'session'): Storage | null {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}
