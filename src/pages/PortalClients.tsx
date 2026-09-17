/**
 * Clients (/portal/clients) — the owner portal's member-list CRM
 * (wireframe screen 03). Status tabs with live counts, search, billing
 * filter, dense table with membership + last visit + actionable billing
 * status (send reminder, retry payment). Add client persists to
 * localStorage; Print uses the browser print dialog; Export downloads
 * the current view as CSV.
 */
import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Check, ChevronDown, Download, Pencil, Plus, Printer, Search, X } from 'lucide-react'
import { GridAvatar } from '@/components/coach/shared'
import {
  STATUS_LABELS,
  STATUS_ORDER,
  addClient,
  exportClientsCsv,
  listClients,
  updateClient,
} from '@/lib/clientDirectory'
import type { BillingStatus, ClientRow, ClientStatus } from '@/lib/clientDirectory'

type TabKey = 'all' | ClientStatus
type BillingFilter = 'all' | BillingStatus | 'at-risk'

const BILLING_FILTERS: { key: BillingFilter; label: string }[] = [
  { key: 'all', label: 'All billing' },
  { key: 'paid', label: 'Paid' },
  { key: 'no-card', label: 'No card on file' },
  { key: 'failed', label: 'Failed' },
  { key: 'at-risk', label: 'At-risk members' },
]

const TIER_PILL: Record<ClientStatus, { label: string; cls: string }> = {
  member: { label: '', cls: '' }, // decided per-row by tierState
  visitor: { label: 'TRIAL', cls: 'border-white/30 text-white/80' },
  frozen: { label: 'FROZEN', cls: 'border-vault-faint/60 text-vault-faint' },
  lead: { label: 'LEAD', cls: 'border-gold/50 text-gold' },
}

function tierPill(row: ClientRow) {
  if (row.status !== 'member') return TIER_PILL[row.status]
  return row.tierState === 'at-risk'
    ? { label: 'AT RISK', cls: 'border-gold/50 text-gold' }
    : { label: 'ACTIVE', cls: 'border-[#7ec98f]/50 text-[#7ec98f]' }
}

function BillingCell({ row, onAction }: { row: ClientRow; onAction: (id: string, patch: Partial<ClientRow>) => void }) {
  if (row.billing === null) return <span className="text-vault-faint">—</span>
  if (row.billing === 'paid') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] text-[#7ec98f]">
        <Check className="h-3.5 w-3.5" /> Paid · autopay
      </span>
    )
  }
  if (row.billing === 'no-card') {
    return (
      <div className="space-y-1">
        <p className="flex items-center gap-1.5 text-[12px] text-gold">
          <span aria-hidden>⚠</span> No card on file
        </p>
        {row.reminderSent ? (
          <p className="text-[11px] text-vault-faint">Reminder sent</p>
        ) : (
          <button
            type="button"
            onClick={() => onAction(row.id, { reminderSent: true })}
            className="text-[11px] text-gold underline-offset-2 hover:underline"
          >
            Send reminder
          </button>
        )}
      </div>
    )
  }
  return (
    <div className="space-y-1">
      <p className="flex items-center gap-1.5 text-[12px] text-[#e06565]">
        <X className="h-3.5 w-3.5" /> Failed — retrying
      </p>
      <button
        type="button"
        onClick={() => onAction(row.id, { billing: 'paid' })}
        className="text-[11px] text-[#e06565] underline-offset-2 hover:underline"
      >
        Retry payment
      </button>
    </div>
  )
}

export default function PortalClients() {
  const [rows, setRows] = useState<ClientRow[]>(() => listClients())
  const [tab, setTab] = useState<TabKey>('all')
  const [query, setQuery] = useState('')
  const [billingFilter, setBillingFilter] = useState<BillingFilter>('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({
    name: '',
    status: 'member' as ClientStatus,
    phone: '',
    email: '',
    membership: '',
  })

  const counts = useMemo(() => {
    const c: Record<TabKey, number> = { all: rows.length, member: 0, visitor: 0, frozen: 0, lead: 0 }
    for (const r of rows) c[r.status] += 1
    return c
  }, [rows])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (tab !== 'all' && r.status !== tab) return false
      if (billingFilter === 'at-risk' && r.tierState !== 'at-risk') return false
      if (billingFilter === 'paid' || billingFilter === 'no-card' || billingFilter === 'failed') {
        if (r.billing !== billingFilter) return false
      }
      if (q) {
        const hay = `${r.name} ${r.subtitle} ${r.email} ${r.membership}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [rows, tab, billingFilter, query])

  const apply = (id: string, patch: Partial<ClientRow>) => setRows(updateClient(id, patch))

  const submitAdd = (e: FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    const isMember = form.status === 'member'
    setRows(
      addClient({
        name: form.name.trim(),
        status: form.status,
        subtitle: form.status === 'lead' ? 'New lead' : `${STATUS_LABELS[form.status].replace(/s$/, '')} · The Vault`,
        phone: form.phone.trim() || '—',
        email: form.email.trim() || '—',
        tierState: 'active',
        membership: form.membership.trim() || (isMember ? 'Monthly' : '—'),
        membershipNote: isMember ? 'renews in 30 days' : '—',
        lastVisit: 'Never',
        billing: isMember ? 'no-card' : null,
      }),
    )
    setForm({ name: '', status: 'member', phone: '', email: '', membership: '' })
    setAdding(false)
  }

  const filterLabel = BILLING_FILTERS.find((f) => f.key === billingFilter)?.label ?? 'Filter'

  return (
    <div className="space-y-5">
      {/* Header + toolbar */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Grow · Clients</p>
          <h2 className="mt-1 text-2xl font-bold text-white">Clients</h2>
          <p className="mt-1 text-[13px] text-vault-muted">
            Members, visitors, frozen accounts, and leads — with billing status at a glance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-vault-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search first or last name…"
              className="w-56 border border-vault-border bg-vault-surface py-2 pl-9 pr-3 text-[13px] text-white placeholder:text-vault-faint focus:border-gold focus:outline-none"
            />
          </label>
          {/* Billing filter dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setFilterOpen((v) => !v)}
              aria-expanded={filterOpen}
              className={`inline-flex items-center gap-1.5 border px-3 py-2 text-[11px] uppercase tracking-[0.1em] transition-colors ${
                billingFilter === 'all'
                  ? 'border-vault-border text-vault-muted hover:border-white/40 hover:text-white'
                  : 'border-gold/60 text-gold'
              }`}
            >
              <ChevronDown className="h-3.5 w-3.5" /> {filterLabel}
            </button>
            {filterOpen && (
              <>
                <button type="button" aria-label="Close filter menu" className="fixed inset-0 z-10 cursor-default" onClick={() => setFilterOpen(false)} />
                <div className="absolute right-0 z-20 mt-1 w-48 border border-vault-border bg-vault-surface py-1 shadow-xl">
                  {BILLING_FILTERS.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => {
                        setBillingFilter(f.key)
                        setFilterOpen(false)
                      }}
                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-[12px] transition-colors ${
                        billingFilter === f.key ? 'bg-white/[0.06] text-white' : 'text-vault-muted hover:text-white'
                      }`}
                    >
                      {f.label}
                      {billingFilter === f.key && <Check className="h-3.5 w-3.5 text-gold" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="inline-flex items-center gap-2 bg-gold px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-black transition-colors hover:bg-gold-2"
          >
            <Plus className="h-3.5 w-3.5" /> Add client
          </button>
          <button
            type="button"
            disabled
            title="Client invites go out once real accounts exist — coming in a later phase"
            className="inline-flex items-center gap-2 border border-vault-border px-3 py-2 text-[11px] uppercase tracking-[0.1em] text-vault-faint"
          >
            Invite <span className="text-[9px]">Soon</span>
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
            onClick={() => exportClientsCsv(visible)}
            disabled={visible.length === 0}
            className="inline-flex items-center gap-2 border border-vault-border px-3 py-2 text-[11px] uppercase tracking-[0.1em] text-vault-muted transition-colors hover:border-white/40 hover:text-white disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </button>
        </div>
      </div>

      {/* Add client inline form */}
      {adding && (
        <form onSubmit={submitAdd} className="app-card space-y-3 p-4">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold text-white">Add a new client</p>
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
            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-vault-faint">Status</span>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ClientStatus })}
                className="w-full border border-vault-border bg-vault-surface px-3 py-2 text-[13px] text-white focus:border-gold focus:outline-none"
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-vault-faint">Phone</span>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full border border-vault-border bg-vault-surface px-3 py-2 text-[13px] text-white focus:border-gold focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-vault-faint">Email</span>
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border border-vault-border bg-vault-surface px-3 py-2 text-[13px] text-white focus:border-gold focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-vault-faint">Membership</span>
              <input
                value={form.membership}
                onChange={(e) => setForm({ ...form, membership: e.target.value })}
                placeholder="Monthly, PT 12-pack…"
                className="w-full border border-vault-border bg-vault-surface px-3 py-2 text-[13px] text-white placeholder:text-vault-faint focus:border-gold focus:outline-none"
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
              Save client
            </button>
          </div>
        </form>
      )}

      {/* Status tabs */}
      <div className="flex flex-wrap gap-1 border-b border-vault-border" role="tablist" aria-label="Client statuses">
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
        {STATUS_ORDER.map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={tab === s}
            onClick={() => setTab(s)}
            className={`px-3 py-2.5 text-[12px] transition-colors ${
              tab === s
                ? 'border-b-2 border-gold font-semibold text-white'
                : 'border-b-2 border-transparent text-vault-muted hover:text-white'
            }`}
          >
            {STATUS_LABELS[s]} <span className="tnum text-vault-faint">{counts[s]}</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="app-card overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-vault-border text-[10px] uppercase tracking-[0.14em] text-vault-faint">
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Tier</th>
              <th className="px-4 py-3 font-medium">Membership</th>
              <th className="px-4 py-3 font-medium">Last visit</th>
              <th className="px-4 py-3 font-medium">Billing status</th>
              <th className="px-4 py-3 font-medium" aria-label="Edit" />
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => {
              const pill = tierPill(r)
              return (
                <tr key={r.id} className="border-b border-vault-border/50 last:border-0 hover:bg-white/[0.03]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <GridAvatar name={r.name} size={32} />
                      <div>
                        <p className="font-medium text-white">{r.name}</p>
                        <p className="max-w-[240px] truncate text-[11px] text-vault-faint">{r.subtitle}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="tnum text-vault-muted">{r.phone}</p>
                    <p className="max-w-[180px] truncate text-[11px] text-vault-faint">{r.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block border px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] ${pill.cls}`}>
                      {pill.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-vault-muted">{r.membership}</p>
                    <p className="text-[11px] text-vault-faint">{r.membershipNote}</p>
                  </td>
                  <td className="px-4 py-3 text-vault-muted">{r.lastVisit}</td>
                  <td className="px-4 py-3">
                    <BillingCell row={r} onAction={apply} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled
                      title="Client profiles open with the client drawer — coming in a later phase"
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
                <td colSpan={7} className="px-4 py-10 text-center text-[13px] text-vault-faint">
                  No clients match{query ? ` “${query}”` : ''}
                  {billingFilter !== 'all' ? ` · ${filterLabel}` : ''}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Legends */}
      <div className="flex flex-wrap gap-x-8 gap-y-2 text-[11px] text-vault-faint">
        <p>
          <span className="text-vault-muted">Status tabs</span> keep counts visible — members, visitors,
          frozen, and leads are one click away.
        </p>
        <p>
          <span className="text-vault-muted">Billing status is an action</span> — send a card reminder or
          retry a failed payment straight from the row.
        </p>
      </div>
    </div>
  )
}
