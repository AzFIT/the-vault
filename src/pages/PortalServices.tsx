/**
 * Services & Products (/portal/services) — the owner portal's catalog of
 * what the front-desk point of sale sells. Category tabs with live counts,
 * search, dense table with price / stock / status, inline add & edit forms,
 * archive-restore (items are never deleted — sale log lines keep their
 * labels), CSV export of the current view, and reset to defaults.
 *
 * The catalog persists to localStorage (posCatalog.ts, same event + storage
 * pattern as gymSettings.ts) and the till reads it live — a price change or
 * archive here is reflected on /portal/pos immediately, in every open tab.
 */
import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Archive, ArchiveRestore, Check, Download, Package, Pencil, Plus, Printer, RotateCcw, Search, X } from 'lucide-react'
import NavButtons from '@/components/NavButtons'
import { PRODUCT_CATEGORIES, exportCatalogCsv, usePosCatalog } from '@/lib/posCatalog'
import type { Product, ProductCategory } from '@/lib/posCatalog'
import { formatHKD } from '@/lib/pos'

type TabKey = 'all' | ProductCategory | 'archived'

const EMPTY_FORM = { label: '', price: '', category: 'Passes' as ProductCategory, stock: false }

export default function PortalServices() {
  const [catalog, saveCatalog, resetCatalog] = usePosCatalog()
  const [tab, setTab] = useState<TabKey>('all')
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [savedFlash, setSavedFlash] = useState(false)

  const counts = useMemo(() => {
    const c: Record<TabKey, number> = { all: 0, Passes: 0, Memberships: 0, 'PT packs': 0, Merch: 0, archived: 0 }
    for (const p of catalog) {
      c.all += 1
      if (p.archived) c.archived += 1
      else c[p.category] += 1
    }
    return c
  }, [catalog])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return catalog.filter((p) => {
      if (tab === 'archived' ? !p.archived : p.archived) return false
      if (tab !== 'all' && tab !== 'archived' && p.category !== tab) return false
      if (q && !p.label.toLowerCase().includes(q)) return false
      return true
    })
  }, [catalog, tab, query])

  const closeForm = () => {
    setAdding(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  const startEdit = (p: Product) => {
    setEditingId(p.id)
    setAdding(false)
    setForm({ label: p.label, price: String(p.price), category: p.category, stock: p.stock ?? false })
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const label = form.label.trim()
    const price = Math.max(0, Math.round(Number(form.price) || 0))
    if (!label) return
    if (editingId) {
      saveCatalog(catalog.map((p) => (p.id === editingId ? { ...p, label, price, category: form.category, stock: form.category === 'Merch' ? form.stock : undefined } : p)))
    } else {
      const id = `p-${Date.now().toString(36)}`
      saveCatalog([...catalog, { id, label, price, category: form.category, stock: form.category === 'Merch' ? form.stock : undefined }])
    }
    closeForm()
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 2200)
  }

  const toggleArchive = (id: string) =>
    saveCatalog(catalog.map((p) => (p.id === id ? { ...p, archived: !p.archived } : p)))

  const dirty = editingId !== null || adding

  return (
    <div className="space-y-5">
      {/* Header + toolbar */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Manage · Services &amp; Products</p>
          <h2 className="mt-1 text-2xl font-bold text-white">Services &amp; Products</h2>
          <p className="mt-1 text-[13px] text-vault-muted">
            The catalog the front-desk till sells from. Changes appear on the point of sale instantly, in every open tab.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-vault-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products…"
              className="w-52 border border-vault-border bg-vault-surface py-2 pl-9 pr-3 text-[13px] text-white placeholder:text-vault-faint focus:border-gold focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={() => (dirty ? closeForm() : setAdding(true))}
            className="inline-flex items-center gap-2 bg-gold px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-black transition-colors hover:bg-gold-2"
          >
            {adding ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {adding ? 'Cancel' : 'Add product'}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 border border-vault-border px-3 py-2 text-[11px] uppercase tracking-[0.1em] text-vault-muted transition-colors hover:border-white/40 hover:text-white"
          >
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
          <button
            type="button"
            onClick={() => exportCatalogCsv(visible)}
            disabled={visible.length === 0}
            className="inline-flex items-center gap-2 border border-vault-border px-3 py-2 text-[11px] uppercase tracking-[0.1em] text-vault-muted transition-colors hover:border-white/40 hover:text-white disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          <button
            type="button"
            onClick={resetCatalog}
            title="Restore the original 10-item catalog"
            className="inline-flex items-center gap-2 border border-vault-border px-3 py-2 text-[11px] uppercase tracking-[0.1em] text-vault-muted transition-colors hover:border-white/40 hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
          <NavButtons homeTo="/portal" />
        </div>
      </div>

      {/* Add / edit inline form */}
      {dirty && (
        <form onSubmit={submit} className="app-card space-y-3 p-4">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-white">
              <Package className="h-4 w-4 text-gold" strokeWidth={1.5} />
              {editingId ? 'Edit product' : 'Add a new product'}
            </p>
            <button type="button" onClick={closeForm} aria-label="Close" className="text-vault-muted hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-vault-faint">Name</span>
              <input
                required
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="e.g. Day pass"
                className="w-full border border-vault-border bg-vault-surface px-3 py-2 text-[13px] text-white placeholder:text-vault-faint focus:border-gold focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-vault-faint">Price (HK$)</span>
              <input
                required
                inputMode="numeric"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value.replace(/[^\d]/g, '') })}
                placeholder="180"
                className="w-full border border-vault-border bg-vault-surface px-3 py-2 text-[13px] text-white placeholder:text-vault-faint focus:border-gold focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-vault-faint">Category</span>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as ProductCategory })}
                className="w-full border border-vault-border bg-vault-surface px-3 py-2 text-[13px] text-white focus:border-gold focus:outline-none"
              >
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            {form.category === 'Merch' && (
              <label className="flex items-end gap-2 pb-2">
                <input
                  type="checkbox"
                  checked={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.checked })}
                  className="h-4 w-4 accent-[#d4af37]"
                />
                <span className="text-[12px] text-vault-muted">Tracks stock (logs a stock adjustment on each sale)</span>
              </label>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 bg-gold px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-black hover:bg-gold-2"
            >
              <Check className="h-3.5 w-3.5" /> {editingId ? 'Save changes' : 'Add product'}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="border border-vault-border px-3 py-2 text-[11px] uppercase tracking-[0.1em] text-vault-muted hover:text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1 border-b border-vault-border" role="tablist" aria-label="Product categories">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'all'}
          onClick={() => setTab('all')}
          className={`px-3 py-2.5 text-[12px] transition-colors ${
            tab === 'all'
              ? 'border-b-2 border-gold font-semibold text-white'
              : 'border-b-2 border-transparent text-vault-muted hover:text-white'
          }`}
        >
          All <span className="tnum text-vault-faint">{counts.all}</span>
        </button>
        {PRODUCT_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={tab === c}
            onClick={() => setTab(c)}
            className={`px-3 py-2.5 text-[12px] transition-colors ${
              tab === c
                ? 'border-b-2 border-gold font-semibold text-white'
                : 'border-b-2 border-transparent text-vault-muted hover:text-white'
            }`}
          >
            {c} <span className="tnum text-vault-faint">{counts[c]}</span>
          </button>
        ))}
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'archived'}
          onClick={() => setTab('archived')}
          className={`px-3 py-2.5 text-[12px] transition-colors ${
            tab === 'archived'
              ? 'border-b-2 border-gold font-semibold text-white'
              : 'border-b-2 border-transparent text-vault-muted hover:text-white'
          }`}
        >
          Archived <span className="tnum text-vault-faint">{counts.archived}</span>
        </button>
      </div>

      {/* Table */}
      <div className="app-card overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-vault-border text-[10px] uppercase tracking-[0.14em] text-vault-faint">
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => (
              <tr key={p.id} className="border-b border-vault-border/50 last:border-0 hover:bg-white/[0.03]">
                <td className="px-4 py-3">
                  <p className={`font-medium ${p.archived ? 'text-vault-muted line-through' : 'text-white'}`}>{p.label}</p>
                  <p className="text-[11px] text-vault-faint">{p.id}</p>
                </td>
                <td className="px-4 py-3 text-vault-muted">{p.category}</td>
                <td className="px-4 py-3">
                  <span className="tnum text-white">{p.price === 0 ? 'Free' : formatHKD(p.price)}</span>
                </td>
                <td className="px-4 py-3">
                  {p.stock ? (
                    <span className="inline-block border border-vault-border px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-vault-muted">
                      Tracks stock
                    </span>
                  ) : (
                    <span className="text-vault-faint">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block border px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] ${
                      p.archived ? 'border-vault-faint/60 text-vault-faint' : 'border-[#7ec98f]/50 text-[#7ec98f]'
                    }`}
                  >
                    {p.archived ? 'Archived' : 'Active'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(p)}
                      aria-label={`Edit ${p.label}`}
                      title="Edit"
                      className="p-1.5 text-vault-faint transition-colors hover:text-white"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleArchive(p.id)}
                      aria-label={p.archived ? `Restore ${p.label}` : `Archive ${p.label}`}
                      title={p.archived ? 'Restore — show on the till again' : 'Archive — hide from the till'}
                      className="p-1.5 text-vault-faint transition-colors hover:text-gold"
                    >
                      {p.archived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-[13px] text-vault-faint">
                  No products match{query ? ` “${query}”` : ''}
                  {tab === 'archived' ? ' — nothing archived yet' : ''}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footnotes */}
      <div className="flex flex-wrap gap-x-8 gap-y-2 text-[11px] text-vault-faint">
        <p>
          <span className="text-vault-muted">Archive, don’t delete</span> — past sale log lines keep their product
          names, and an archived item can be restored at any time.
        </p>
        <p>
          <span className="text-vault-muted">The till reads this catalog live</span> — new prices and archives reach
          the front-desk POS and the My shift quick-add instantly.
        </p>
        {savedFlash && (
          <p className="flex items-center gap-1.5 text-[#7ec98f]">
            <Check className="h-3.5 w-3.5" /> Catalog saved
          </p>
        )}
      </div>
    </div>
  )
}
