/**
 * POS product catalog — the owner-editable list of what the front-desk point
 * of sale sells. Stored in localStorage and synced live across components
 * and tabs via the same event + storage pattern as gymSettings.ts, so a
 * price change or archive on /portal/services shows up on the till
 * immediately (and in every open tab).
 *
 * Products are archived, never deleted — past sale log lines keep their
 * labels, and an archived item can be restored. The defaults below are the
 * seed catalog; the first write persists them and "Reset to defaults"
 * restores exactly this list.
 */
import { useCallback, useEffect, useState } from 'react'

export type ProductCategory = 'Passes' | 'Memberships' | 'PT packs' | 'Merch'

export interface Product {
  id: string
  label: string
  price: number
  category: ProductCategory
  /** merch items log a stock adjustment on sale */
  stock?: boolean
  /** archived items are hidden from the till but keep their sale history */
  archived?: boolean
}

export const PRODUCT_CATEGORIES: ProductCategory[] = ['Passes', 'Memberships', 'PT packs', 'Merch']

export const DEFAULT_CATALOG: Product[] = [
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

const KEY = 'vault-pos-catalog'
const EVENT = 'vault-pos-catalog-changed'

export function getPosCatalog(): Product[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Product[]) : DEFAULT_CATALOG
  } catch {
    return DEFAULT_CATALOG
  }
}

export function savePosCatalog(next: Product[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // storage unavailable — change applies to this mount only
  }
  window.dispatchEvent(new Event(EVENT))
}

export function resetPosCatalog() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(EVENT))
}

/** [catalog, save, reset] — subscribes to live changes from any surface. */
export function usePosCatalog(): [Product[], (next: Product[]) => void, () => void] {
  const [catalog, setCatalog] = useState<Product[]>(getPosCatalog)

  useEffect(() => {
    const refresh = () => setCatalog(getPosCatalog())
    window.addEventListener(EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  const save = useCallback((next: Product[]) => {
    savePosCatalog(next)
    setCatalog(next)
  }, [])
  const reset = useCallback(() => {
    resetPosCatalog()
    setCatalog(DEFAULT_CATALOG)
  }, [])

  return [catalog, save, reset]
}

/** Download the given products (e.g. the current filtered view) as CSV. */
export function exportCatalogCsv(products: Product[]) {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = [
    ['label', 'category', 'priceHKD', 'tracksStock', 'status'],
    ...products.map((p) => [p.label, p.category, p.price, p.stock ? 'yes' : '', p.archived ? 'archived' : 'active']),
  ]
    .map((r) => r.map(esc).join(','))
    .join('\r\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `vault-products-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
