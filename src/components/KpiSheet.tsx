/**
 * KpiSheet — the "full sheets view" behind every KPI card. Opens as a
 * centered modal with a spreadsheet-style table: click any column header to
 * sort (asc → desc), and when `filterKey` is set a category dropdown filters
 * the rows. Purely presentational — callers supply columns and rows.
 */
import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, X } from 'lucide-react'

export interface KpiColumn {
  key: string
  label: string
  /** 'text' left-aligns, 'num' right-aligns (tabular numbers) */
  align?: 'text' | 'num'
}

export interface KpiSheetProps {
  title: string
  subtitle?: string
  columns: KpiColumn[]
  rows: Record<string, string | number>[]
  /** Column used for the category filter dropdown (optional). */
  filterKey?: string
  onClose: () => void
}

type SortDir = 'asc' | 'desc'

export default function KpiSheet({ title, subtitle, columns, rows, filterKey, onClose }: KpiSheetProps) {
  const [sort, setSort] = useState<{ key: string; dir: SortDir } | null>(null)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const filterOptions = useMemo(() => {
    if (!filterKey) return []
    const vals = [...new Set(rows.map((r) => String(r[filterKey] ?? '')))].sort()
    return vals
  }, [rows, filterKey])

  const visible = useMemo(() => {
    let out = filterKey && filter !== 'all' ? rows.filter((r) => String(r[filterKey] ?? '') === filter) : rows
    if (sort) {
      out = [...out].sort((a, b) => {
        const av = a[sort.key]
        const bv = b[sort.key]
        const cmp =
          typeof av === 'number' && typeof bv === 'number'
            ? av - bv
            : String(av ?? '').localeCompare(String(bv ?? ''))
        return sort.dir === 'asc' ? cmp : -cmp
      })
    }
    return out
  }, [rows, sort, filter, filterKey])

  const toggleSort = (key: string) =>
    setSort((s) => (s?.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }))

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex max-h-[85vh] w-full max-w-3xl flex-col border border-vault-border bg-vault-surface shadow-2xl"
      >
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3 border-b border-vault-border px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.2em] text-vault-muted">KPI detail</p>
            <h3 className="text-lg font-bold text-white">{title}</h3>
            {subtitle && <p className="mt-0.5 text-[12px] text-vault-faint">{subtitle}</p>}
          </div>
          {filterKey && filterOptions.length > 0 && (
            <label className="flex items-center gap-2 text-[11px] uppercase tracking-[0.1em] text-vault-faint">
              Category
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="border border-vault-border bg-vault-surface-2 px-2 py-1.5 text-[12px] normal-case tracking-normal text-white focus:border-gold focus:outline-none"
              >
                <option value="all">All ({rows.length})</option>
                {filterOptions.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 text-vault-muted transition-colors hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Table */}
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[560px] text-left text-[13px]">
            <thead className="sticky top-0 bg-vault-surface-2">
              <tr className="border-b border-vault-border text-[10px] uppercase tracking-[0.14em] text-vault-faint">
                {columns.map((c) => (
                  <th key={c.key} className={`px-4 py-3 font-medium ${c.align === 'num' ? 'text-right' : ''}`}>
                    <button
                      type="button"
                      onClick={() => toggleSort(c.key)}
                      className={`inline-flex items-center gap-1 uppercase tracking-[0.14em] transition-colors hover:text-white ${
                        sort?.key === c.key ? 'text-gold' : ''
                      }`}
                    >
                      {c.label}
                      {sort?.key === c.key ? (
                        sort.dir === 'asc' ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-40" />
                      )}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((r, i) => (
                <tr key={i} className="border-b border-vault-border/50 last:border-0 hover:bg-white/[0.03]">
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={`px-4 py-2.5 text-vault-muted ${c.align === 'num' ? 'tnum text-right' : ''}`}
                    >
                      {r[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-10 text-center text-[13px] text-vault-faint">
                    No rows{filter !== 'all' ? ` in category “${filter}”` : ''}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="border-t border-vault-border px-5 py-3 text-[11px] text-vault-faint">
          {visible.length} of {rows.length} rows · click a column header to sort
        </div>
      </div>
    </div>
  )
}

/** Mask a KPI value when privacy mode is on. */
export const KPI_MASK = '•••'
