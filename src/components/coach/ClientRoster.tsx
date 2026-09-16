import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Search } from 'lucide-react'
import type { Client } from '@/data/mock'
import { coachClients, getProgramById, LOG_END_DATE } from '@/data/mock'
import { GridAvatar, TierPill, StatusPill, SectionHeader } from './shared'
import { isAtRisk } from './utils'

export type RosterFilter = 'ALL' | 'PT 3X' | 'PT 2X' | "WOMEN'S" | 'AT RISK'

const FILTERS: RosterFilter[] = ['ALL', 'PT 3X', 'PT 2X', "WOMEN'S", 'AT RISK']

function shiftDay(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + days)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function matchesFilter(c: Client, f: RosterFilter): boolean {
  switch (f) {
    case 'PT 3X':
      return c.tier === 'PT 3x/wk'
    case 'PT 2X':
      return c.tier === 'PT 2x/wk'
    case "WOMEN'S":
      return c.tier === "Women's Programme"
    case 'AT RISK':
      return isAtRisk(c)
    default:
      return true
  }
}

export default function ClientRoster({
  programOverrides,
  filter,
  onFilterChange,
  onSelect,
}: {
  programOverrides: Record<string, string>
  filter: RosterFilter
  onFilterChange: (f: RosterFilter) => void
  onSelect: (c: Client) => void
}) {
  const [query, setQuery] = useState('')
  const atRiskCount = coachClients.filter(isAtRisk).length

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return coachClients.filter(
      (c) =>
        matchesFilter(c, filter) &&
        (q === '' ||
          c.name.toLowerCase().includes(q) ||
          c.goal.toLowerCase().includes(q) ||
          (getProgramById(programOverrides[c.id] ?? c.programId)?.name ?? '')
            .toLowerCase()
            .includes(q)),
    )
  }, [query, filter, programOverrides])

  return (
    <section className="app-card p-6">
      <SectionHeader eyebrow="Clients" title="Client roster" />

      {/* Search + filter chips */}
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((f) => {
            const active = filter === f
            return (
              <button
                key={f}
                onClick={() => onFilterChange(f)}
                className={`relative px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] transition-colors ${
                  active ? 'text-white' : 'text-vault-muted hover:text-white'
                }`}
              >
                {f}
                {f === 'AT RISK' && (
                  <span className="tnum ml-1.5 border border-dashed border-viz-3 px-1 text-[10px] text-vault-muted">
                    {atRiskCount}
                  </span>
                )}
                {active && (
                  <motion.span
                    layoutId="roster-filter-underline"
                    className="absolute inset-x-2 bottom-0 h-px bg-white"
                    transition={{ duration: 0.25 }}
                  />
                )}
              </button>
            )
          })}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-vault-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clients"
            className="w-full border border-vault-border bg-vault-bg py-2 pl-9 pr-12 text-[13px] text-white placeholder:text-vault-faint focus:border-vault-surface-3 focus:outline-none lg:w-64"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 border border-vault-border px-1 text-[10px] text-vault-faint">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Header row */}
      <div className="hidden grid-cols-[minmax(0,2.2fr)_minmax(0,1.6fr)_minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.9fr)] gap-3 border-b border-vault-border pb-2 text-[10px] uppercase tracking-[0.16em] text-vault-faint md:grid">
        <span>Client</span>
        <span>Program</span>
        <span>Adherence</span>
        <span>Last session</span>
        <span>Next session</span>
        <span>Status</span>
      </div>

      <AnimatePresence mode="popLayout" initial={false}>
        {rows.map((c, i) => {
          const program = getProgramById(programOverrides[c.id] ?? c.programId)
          const risk = isAtRisk(c)
          return (
            <motion.button
              layout="position"
              key={c.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
              transition={{ duration: 0.35, delay: i * 0.04, ease: 'easeOut' }}
              onClick={() => onSelect(c)}
              className="group grid w-full grid-cols-[minmax(0,2.2fr)_minmax(0,1.1fr)_minmax(0,0.9fr)] items-center gap-3 border-b border-vault-border/60 px-2 py-3 text-left transition-colors last:border-0 hover:bg-vault-surface-2 md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.6fr)_minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.9fr)]"
            >
              <span className="flex min-w-0 items-center gap-3 transition-transform duration-200 group-hover:translate-x-1">
                <GridAvatar name={c.name} size={32} />
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-medium text-white">
                    {c.name}
                  </span>
                  <span className="mt-1 hidden sm:inline-block">
                    <TierPill tier={c.tier} />
                  </span>
                </span>
              </span>
              <span className="hidden truncate text-[13px] text-vault-muted md:block">
                {program?.name ?? '—'}
              </span>
              <span className="flex items-center gap-2">
                <span className="hidden h-1 w-12 overflow-hidden bg-viz-track sm:block">
                  <motion.span
                    className="block h-full bg-white"
                    initial={{ width: 0 }}
                    animate={{ width: `${c.adherence}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </span>
                <span className="tnum text-[13px] text-white">{c.adherence}%</span>
              </span>
              <span className="tnum hidden text-[13px] text-vault-muted md:block">
                {shiftDay(LOG_END_DATE, -(1 + (i % 4)))}
              </span>
              <span className="tnum hidden text-[13px] text-vault-muted md:block">
                {shiftDay(LOG_END_DATE, 1 + (i % 3))}
              </span>
              <span className="flex md:justify-start">
                <StatusPill atRisk={risk} />
              </span>
            </motion.button>
          )
        })}
      </AnimatePresence>

      {rows.length === 0 && (
        <p className="py-10 text-center text-[13px] text-vault-faint">
          No clients match this filter.
        </p>
      )}
    </section>
  )
}
