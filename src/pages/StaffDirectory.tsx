/**
 * Staff directory (/portal/staff) — owner portal roster of Vault trainers,
 * freelance trainers, class instructors, and front desk staff. Wireframe
 * screen 06: category tabs with live counts, tag-chip filtering, search,
 * categorized table with status column, CSV export, and an inline "add
 * staff" form (localStorage-persisted until the real backend lands).
 */
import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Download, Pencil, Search, UserPlus, X } from 'lucide-react'
import { GridAvatar } from '@/components/coach/shared'
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  addStaff,
  exportStaffCsv,
  listStaff,
} from '@/lib/staffDirectory'
import type { StaffCategory, StaffRow, StaffStatus } from '@/lib/staffDirectory'

type TabKey = 'all' | StaffCategory

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'vault', label: 'Vault Trainers' },
  { key: 'freelance', label: 'Freelance' },
  { key: 'instructor', label: 'Class Instructors' },
  { key: 'front-desk', label: 'Front Desk' },
]

const STATUS_META: Record<StaffStatus, { label: string; dot: string; text: string }> = {
  'on-shift': { label: 'On shift', dot: 'bg-[#7ec98f]', text: 'text-[#7ec98f]' },
  off: { label: 'Off today', dot: 'bg-vault-faint', text: 'text-vault-faint' },
  teaching: { label: 'Teaching', dot: 'bg-gold', text: 'text-gold' },
}

function categoryPillCls(category: StaffCategory) {
  switch (category) {
    case 'vault':
      return 'border-[#7ec98f]/50 text-[#7ec98f]'
    case 'instructor':
      return 'border-white/30 text-white/80'
    default:
      return 'border-gold/50 text-gold'
  }
}

export default function StaffDirectory() {
  const [rows, setRows] = useState<StaffRow[]>(() => listStaff())
  const [tab, setTab] = useState<TabKey>('all')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({
    name: '',
    categories: ['vault'] as StaffCategory[],
    role: '',
    tags: '',
    contact: '',
  })

  const counts = useMemo(() => {
    const c: Record<TabKey, number> = {
      all: rows.length,
      vault: 0,
      freelance: 0,
      instructor: 0,
      'front-desk': 0,
    }
    for (const r of rows) for (const cat of r.categories) c[cat] += 1
    return c
  }, [rows])

  const allTags = useMemo(() => {
    const freq = new Map<string, number>()
    for (const r of rows) for (const t of r.tags) freq.set(t, (freq.get(t) ?? 0) + 1)
    return [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t)
  }, [rows])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (tab !== 'all' && !r.categories.includes(tab)) return false
      if (tagFilter && !r.tags.includes(tagFilter)) return false
      if (q) {
        const hay = `${r.name} ${r.role} ${r.staffNo} ${r.tags.join(' ')}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [rows, tab, tagFilter, query])

  const submitAdd = (e: FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.role.trim() || form.categories.length === 0) return
    const primary = form.categories[0]
    setRows(
      addStaff({
        name: form.name.trim(),
        category: primary,
        categories: form.categories,
        role: form.role.trim(),
        tags: form.tags
          .split(',')
          .map((t) => t.trim().toLowerCase().replace(/^#/, '').replace(/\s+/g, '-'))
          .filter(Boolean),
        status: 'off',
        clients: form.categories.includes('vault') ? 0 : null,
        contact: form.contact.trim() || '—',
        since: String(new Date().getFullYear()),
      }),
    )
    setForm({ name: '', categories: ['vault'], role: '', tags: '', contact: '' })
    setAdding(false)
  }

  const toggleFormCategory = (c: StaffCategory) =>
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(c)
        ? f.categories.filter((x) => x !== c)
        : f.categories.length >= 3
          ? f.categories
          : [...f.categories, c],
    }))

  return (
    <div className="space-y-5">
      {/* Header + toolbar */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Manage · Staff</p>
          <h2 className="mt-1 text-2xl font-bold text-white">Staff directory</h2>
          <p className="mt-1 text-[13px] text-vault-muted">
            Every trainer, instructor, and front desk profile — categorized and tagged for search.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-vault-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, tag, specialty…"
              className="w-56 border border-vault-border bg-vault-surface py-2 pl-9 pr-3 text-[13px] text-white placeholder:text-vault-faint focus:border-gold focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="inline-flex items-center gap-2 bg-gold px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-black transition-colors hover:bg-gold-2"
          >
            <UserPlus className="h-3.5 w-3.5" /> Add staff
          </button>
          <button
            type="button"
            disabled
            title="Invites go out once real accounts exist — coming in a later phase"
            className="inline-flex items-center gap-2 border border-vault-border px-3 py-2 text-[11px] uppercase tracking-[0.1em] text-vault-faint"
          >
            Invite <span className="text-[9px]">Soon</span>
          </button>
          <button
            type="button"
            onClick={() => exportStaffCsv(visible)}
            disabled={visible.length === 0}
            className="inline-flex items-center gap-2 border border-vault-border px-3 py-2 text-[11px] uppercase tracking-[0.1em] text-vault-muted transition-colors hover:border-white/40 hover:text-white disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </button>
        </div>
      </div>

      {/* Add staff inline form */}
      {adding && (
        <form onSubmit={submitAdd} className="app-card space-y-3 p-4">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold text-white">Add a new staff member</p>
            <button type="button" onClick={() => setAdding(false)} aria-label="Close" className="text-vault-muted hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-vault-faint">Name</span>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-vault-border bg-vault-surface px-3 py-2 text-[13px] text-white focus:border-gold focus:outline-none"
              />
            </label>
            <div className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-vault-faint">
                Categories (up to 3 · first = primary)
              </span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {CATEGORY_ORDER.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleFormCategory(c)}
                    aria-pressed={form.categories.includes(c)}
                    className={`border px-2 py-1 text-[11px] transition-colors ${
                      form.categories.includes(c)
                        ? 'border-gold bg-gold/10 text-gold'
                        : 'border-vault-border text-vault-muted hover:border-white/30 hover:text-white'
                    }`}
                  >
                    {CATEGORY_LABELS[c]}
                  </button>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-vault-faint">Role</span>
              <input
                required
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full border border-vault-border bg-vault-surface px-3 py-2 text-[13px] text-white focus:border-gold focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-vault-faint">Tags (comma separated)</span>
              <input
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="strength, first-aid"
                className="w-full border border-vault-border bg-vault-surface px-3 py-2 text-[13px] text-white placeholder:text-vault-faint focus:border-gold focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-vault-faint">Contact</span>
              <input
                value={form.contact}
                onChange={(e) => setForm({ ...form, contact: e.target.value })}
                className="w-full border border-vault-border bg-vault-surface px-3 py-2 text-[13px] text-white focus:border-gold focus:outline-none"
              />
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="border border-vault-border px-3 py-2 text-[11px] uppercase tracking-[0.1em] text-vault-muted hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-gold px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-black hover:bg-gold-2"
            >
              Save staff member
            </button>
          </div>
        </form>
      )}

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1 border-b border-vault-border" role="tablist" aria-label="Staff categories">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2.5 text-[12px] transition-colors ${
              tab === t.key
                ? 'border-b-2 border-gold font-semibold text-white'
                : 'border-b-2 border-transparent text-vault-muted hover:text-white'
            }`}
          >
            {t.label} <span className="tnum text-vault-faint">{counts[t.key]}</span>
          </button>
        ))}
      </div>

      {/* Tag chips */}
      <div className="flex flex-wrap gap-1.5">
        {allTags.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTagFilter((cur) => (cur === t ? null : t))}
            aria-pressed={tagFilter === t}
            className={`border px-2 py-1 text-[11px] transition-colors ${
              tagFilter === t
                ? 'border-gold bg-gold/10 text-gold'
                : 'border-vault-border text-vault-muted hover:border-white/30 hover:text-white'
            }`}
          >
            #{t}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="app-card overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-vault-border text-[10px] uppercase tracking-[0.14em] text-vault-faint">
              <th className="px-4 py-3 font-medium">Staff</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Tags</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Clients</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium" aria-label="Edit" />
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => {
              const status = STATUS_META[r.status]
              return (
                <tr key={r.id} className="border-b border-vault-border/50 last:border-0 hover:bg-white/[0.03]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <GridAvatar name={r.name} size={32} />
                      <div>
                        <p className="font-medium text-white">{r.name}</p>
                        <p className="tnum text-[11px] text-vault-faint">
                          {r.staffNo} · since {r.since}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex max-w-[260px] flex-wrap gap-1">
                      {r.categories.slice(0, 3).map((c) => (
                        <span key={c} className={`inline-block border px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] ${categoryPillCls(c)}`}>
                          {CATEGORY_LABELS[c]}
                        </span>
                      ))}
                      {r.categories.length > 3 && (
                        <span className="inline-block border border-vault-border px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-vault-faint">
                          +{r.categories.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-vault-muted">{r.role}</td>
                  <td className="px-4 py-3">
                    <div className="flex max-w-[220px] flex-wrap gap-1">
                      {r.tags.map((t) => (
                        <span key={t} className="text-[11px] text-vault-faint">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-[12px] ${status.text}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                      {r.statusNote ?? status.label}
                    </span>
                  </td>
                  <td className="tnum px-4 py-3 text-vault-muted">{r.clients ?? '—'}</td>
                  <td className="tnum px-4 py-3 text-vault-muted">{r.contact}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled
                      title="Profile editing comes with the staff profile drawer — coming in a later phase"
                      className="text-vault-faint hover:text-white disabled:cursor-not-allowed"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              )
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-[13px] text-vault-faint">
                  No staff match{query ? ` “${query}”` : ''}
                  {tagFilter ? ` with #${tagFilter}` : ''}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Legends */}
      <div className="flex flex-wrap gap-x-8 gap-y-2 text-[11px] text-vault-faint">
        <p>
          <span className="text-vault-muted">Staff ID</span> is the auto-tag key — every sale and client
          interaction links back to it.
        </p>
        <p>
          <span className="text-vault-muted">Status</span> doubles as the location board: on shift, off
          today, or teaching with the next class time.
        </p>
      </div>
    </div>
  )
}
