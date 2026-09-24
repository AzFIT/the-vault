/**
 * Vault entry transition — the "opening the vault" ceremony between sign-in
 * and the destination portal. Sign-in surfaces call `requestVaultEntry(to)`
 * after their button flips to the green "Vault Unlocked" state; the
 * App-level `VaultEntry` overlay then dips to black, sweeps the gold light
 * line across, navigates underneath, and reveals the destination.
 * Reduced-motion users get a quick black dip only.
 */

export const VAULT_ENTRY_EVENT = 'vault-entry-request'

/** Ask the overlay to play the entry transition. Empty `to` = stay on the current page. */
export function requestVaultEntry(to: string) {
  window.dispatchEvent(new CustomEvent<string>(VAULT_ENTRY_EVENT, { detail: to }))
}
