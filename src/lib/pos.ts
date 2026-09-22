/**
 * POS data layer — cart math and sale logging for the front-desk point of
 * sale (/portal/pos). The product catalog itself lives in posCatalog.ts
 * (owner-editable, localStorage-backed); useProducts() here is the till-side
 * view: active (non-archived) products, live across tabs.
 *
 * Completing a sale writes one 'sale' event per transaction (label carries
 * the HK$ total so the My shift KPI can sum it) plus a 'stock' event for
 * every merch item sold — all auto-tagged to the signed-in staff ID via the
 * shared shift log.
 */
import { useMemo } from 'react'
import { usePosCatalog } from '@/lib/posCatalog'
import type { Product } from '@/lib/posCatalog'
import { recordEvent } from '@/lib/staff'

export type { Product } from '@/lib/posCatalog'
export type { ProductCategory } from '@/lib/posCatalog'

/**
 * Catalog IDs surfaced in the My shift quick-add, in display order. Resolved
 * against the live catalog so owner edits/archives are honoured; unknown IDs
 * are skipped.
 */
export const QUICK_SALE_IDS = ['day-pass', 'class-pack-10', 'pt-3-pack', 'merch-tee']

/** Active products (archived excluded), live from the catalog store. */
export function useProducts(): Product[] {
  const [catalog] = usePosCatalog()
  return useMemo(() => catalog.filter((p) => !p.archived), [catalog])
}

export interface CartLine {
  product: Product
  qty: number
}

export function cartTotal(lines: CartLine[]): number {
  return lines.reduce((a, l) => a + l.product.price * l.qty, 0)
}

export function formatHKD(n: number): string {
  return `HK$${n.toLocaleString('en-HK')}`
}

export type PaymentMethod = 'Cash' | 'Card' | 'FPS'

/**
 * Log a completed sale under the acting staff ID. One 'sale' event carries
 * the item summary + HK$ total; each merch item logs a 'stock' adjustment.
 * Returns the event points earned (sale + stock events, stock = 0).
 */
export function recordSale(
  staffId: string,
  lines: CartLine[],
  method: PaymentMethod,
  customer?: string,
): { total: number; points: number } {
  const total = cartTotal(lines)
  const summary = lines.map((l) => `${l.product.label}${l.qty > 1 ? ` ×${l.qty}` : ''}`).join(' + ')
  const who = customer?.trim() ? ` — ${customer.trim()}` : ''
  recordEvent(staffId, 'sale', `Sale${who} — ${summary} (${method}) ${formatHKD(total)}`)
  for (const l of lines) {
    if (l.product.stock) {
      recordEvent(staffId, 'stock', `Stock out — ${l.product.label}${l.qty > 1 ? ` ×${l.qty}` : ''}`)
    }
  }
  return { total, points: lines.length > 0 ? 3 : 0 }
}
