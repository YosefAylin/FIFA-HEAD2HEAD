/**
 * Shared chat identity — persisted per device in localStorage. Extracted from
 * GroupChat so the home-page ChatBox and the /chat page use the same identity.
 */

const IDENTITY_KEY = 'fifa-chat-identity'

/** The current device's chosen identity name, or `null` if not chosen yet. */
export function getIdentity(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(IDENTITY_KEY)
}

export function storeIdentity(name: string): void {
  window.localStorage.setItem(IDENTITY_KEY, name)
}

export function clearIdentity(): void {
  window.localStorage.removeItem(IDENTITY_KEY)
}
