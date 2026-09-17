/**
 * POS data layer — product catalog, cart math, and sale logging for the
 * front-desk point of sale (/portal/pos). Completing a sale writes one
 * 'sale' event per transaction (label carries the HK$ total so the My
 * shift KPI can sum it) plus a 'stock' event for every merch item sold —
 * all auto-tagged to the signed-in staff ID via the shared shift log.
 */
import { recordEvent } from '@/lib/staff'

export interface Product {
  id: string
  label: string
  price: number
  category: 'Passes' | 'Memberships' | 'PT packs' | 'Merch'
  /** merch items log a stock adjustment on sale */
  stock?: boolean
}

export const PRODUCTS: Product[] = [
  { id: 'day-pass', label: 'Day pass', price: 180, category: 'Passes' },
  { id: 'class-dropin', label: 'Class drop-in', price: 120, category: 'Passes' },
  { id: 'trial-class', label: 'Trial class', price: 0, category: 'Passes' },
  { id: 'class-pack-10', label: 'Class pack 10', price: 1500, category: 'Memberships' },
  { id: 'open-gym-monthly', label: 'Open gym — monthly', price: 980, category: 'Memberships' },
  { id: 'pt-3-pack', label: 'PT 3-pack', price: 2100, category: 'PT packs' },
  { id: 'pt-12-pack', label: 'PT 12-pack', price: 7500, category: 'PT packs' },
  { id: 'merch-tee', label: 'Merch — tee', price: 280, category: 'Merch', stock: true },
  { id: 'protein-bar', label: 'Protein bar', price: 45, category: 'Merch', stock: true },
  { id: 'vault-shaker', label: 'Vault shaker', price: 160, category: 'Merch', stock: true },
]

/** Subset surfaced in the My shift quick-add. */
export const QUICK_SALE_ITEMS: Product[] = [
  PRODUCTS[0],
  PRODUCTS[3],
  PRODUCTS[5],
  PRODUCTS[7],
]

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
