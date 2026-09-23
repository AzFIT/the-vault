/**
 * Vault entry transition — the "opening the vault" ceremony between sign-in
 * and the destination portal. Sign-in surfaces call `requestVaultEntry(to)`
 * instead of navigating directly; the App-level `VaultEntry` overlay plays
 * the intro, fades to black with a gold light sweep, navigates underneath,
 * then reveals the destination.
 *
 * Cadence: the full clip plays once per browser session; repeat sign-ins
 * get the short "door opens" cut. Tap skips the video. Reduced-motion
 * users go straight to the fade.
 */

export const VAULT_ENTRY_EVENT = 'vault-entry-request'

/** Ask the overlay to play the entry transition. Empty `to` = stay on the current page. */
export function requestVaultEntry(to: string) {
  window.dispatchEvent(new CustomEvent<string>(VAULT_ENTRY_EVENT, { detail: to }))
}

export function entryPlayedThisSession(): boolean {
  try {
    return sessionStorage.getItem('vault-entry-played') === '1'
  } catch {
    return false
  }
}

export function markEntryPlayed() {
  try {
    sessionStorage.setItem('vault-entry-played', '1')
  } catch {
    /* private mode — play the full clip every time */
  }
}
