/**
 * Owner portal dashboard (/portal) — the studio-owner home, built to the
 * management-portal wireframe screen 02 (Mindbody owner-dashboard layout,
 * Vault skin): greeting → KPI row → today's schedule with Classes /
 * Appointments tabs + clients at risk, and a right-hand rail with live
 * notifications and yesterday's summary. Every figure derives from the
 * shared mock store plus the live enquiries count.
 *
 * The retired /manage page redirects here. Its revenue-stream and staff
 * charts are slated to return as /portal/insights in a later phase.
 */
import { useState } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowDownRight, ArrowUpRight, CheckCircle2, Circle, Eye, EyeOff } from 'lucide-react'
import {
  coachClients,
  formatHKD,
  getCoachById,
  gymClasses,
  monthlyRevenue,
} from '@/data/mock'
import { CountUp, SectionHeader } from '@/components/coach/shared'
import { NOW_LABEL_MINUTES, TODAY_SCHEDULE, timeToMinutes } from '@/components/coach/scheduleData'
import { countNewEnquiries, listEnquiries } from '@/lib/enquiries'
import KpiSheet from '@/components/KpiSheet'
import type { KpiColumn } from '@/components/KpiSheet'
import { KPI_MASK } from '@/components/KpiSheet'

const today = new Date()
const todayLabel = today.toLocaleDateString('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

function greeting(): string {
  const h = today.getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

/** Coach + room for a schedule row, matched by the class's roster slot. */
function coachFor(classId: string | undefined, time: string): string {
  if (!classId) return 'dan-kan'
  const gc = gymClasses.find((g) => g.id === classId)
  return gc?.schedule.find((s) => s.time === time)?.coachId ?? 'dan-kan'
}

const RISK_CLIENTS = [
  {
    initials: 'TC',
    name: 'Tom Whitfield',
    level: 'High' as const,
    reasons: ['Missed 2 sessions', 'Last visit 12 days ago', 'No check-in streak'],
  },
  {
    initials: 'JM',
    name: 'Jessica Mok',
    level: 'Medium' as const,
    reasons: ['Sessions trending 3 → 1 per week', 'Membership ends 26 Sep'],
  },
]

const YESTERDAY = [
  { label: 'Sales', value: 'HK$12,940' },
  { label: 'Clients served', value: '18' },
  { label: 'Appointments', value: '9' },
  { label: 'Classes run', value: '4' },
]

// ---------------------------------------------------------------------------
// KPI row — every card opens a full "sheets view" of its underlying stats;
// an eye toggle masks all figures for privacy (persisted).
// ---------------------------------------------------------------------------

const KPI_HIDDEN_KEY = 'vault-kpi-hidden'

interface SheetDef {
  title: string
  subtitle: string
  columns: KpiColumn[]
  rows: Record<string, string | number>[]
  filterKey?: string
}

function KpiRow() {
  const last = monthlyRevenue[monthlyRevenue.length - 1]
  const prev = monthlyRevenue[monthlyRevenue.length - 2]
  const revDelta = Math.round(((last.total - prev.total) / prev.total) * 100)
  const sesDelta = last.sessionsDelivered - prev.sessionsDelivered
  const classRows = TODAY_SCHEDULE.filter((s) => s.classId)
  const occupancy = Math.round(
    (classRows.reduce(
      (acc, s) => acc + (s.booked ?? 0) / (gymClasses.find((g) => g.id === s.classId)?.capacity ?? 6),
      0,
    ) /
      classRows.length) *
      100,
  )
  const newEnquiries = countNewEnquiries()
  const [hidden, setHidden] = useState(() => localStorage.getItem(KPI_HIDDEN_KEY) === '1')
  const [sheet, setSheet] = useState<SheetDef | null>(null)

  const toggleHidden = () =>
    setHidden((v) => {
      localStorage.setItem(KPI_HIDDEN_KEY, v ? '0' : '1')
      return !v
    })

  const sheets: Record<string, SheetDef> = {
    revenue: {
      title: 'Revenue this month',
      subtitle: 'Monthly breakdown by stream — PT, memberships, classes',
      columns: [
        { key: 'month', label: 'Month' },
        { key: 'pt', label: 'PT', align: 'num' },
        { key: 'memberships', label: 'Memberships', align: 'num' },
        { key: 'classes', label: 'Classes', align: 'num' },
        { key: 'total', label: 'Total', align: 'num' },
        { key: 'sessions', label: 'Sessions', align: 'num' },
        { key: 'newClients', label: 'New clients', align: 'num' },
      ],
      rows: [...monthlyRevenue]
        .reverse()
        .map((m) => ({
          month: m.label,
          pt: m.pt,
          memberships: m.memberships,
          classes: m.classes,
          total: m.total,
          sessions: m.sessionsDelivered,
          newClients: m.newClients,
        })),
    },
    sessions: {
      title: 'Sessions delivered',
      subtitle: 'PT sessions and small-group sessions run per month',
      columns: [
        { key: 'month', label: 'Month' },
        { key: 'sessions', label: 'Sessions', align: 'num' },
        { key: 'newClients', label: 'New clients', align: 'num' },
      ],
      rows: [...monthlyRevenue].reverse().map((m) => ({ month: m.label, sessions: m.sessionsDelivered, newClients: m.newClients })),
    },
    occupancy: {
      title: "Today's class occupancy",
      subtitle: `${classRows.length} classes running today — booked vs capacity`,
      columns: [
        { key: 'time', label: 'Time' },
        { key: 'session', label: 'Session' },
        { key: 'room', label: 'Room' },
        { key: 'booked', label: 'Booked', align: 'num' },
        { key: 'capacity', label: 'Capacity', align: 'num' },
        { key: 'fill', label: 'Fill %', align: 'num' },
      ],
      rows: classRows.map((s) => {
        const cap = gymClasses.find((g) => g.id === s.classId)?.capacity ?? 6
        const booked = s.booked ?? 0
        return {
          time: s.time,
          session: s.label,
          room: s.note ?? '—',
          booked,
          capacity: cap,
          fill: `${Math.round((booked / cap) * 100)}%`,
        }
      }),
    },
    clients: {
      title: 'Active clients',
      subtitle: 'Every active client on the roster with adherence',
      columns: [
        { key: 'name', label: 'Client' },
        { key: 'tier', label: 'Tier' },
        { key: 'goal', label: 'Goal' },
        { key: 'adherence', label: 'Adherence', align: 'num' },
        { key: 'coach', label: 'Coach' },
        { key: 'since', label: 'Since' },
      ],
      filterKey: 'tier',
      rows: coachClients.map((c) => ({
        name: c.name,
        tier: c.tier,
        goal: c.goal,
        adherence: `${c.adherence}%`,
        coach: getCoachById(c.coachId)?.name ?? '—',
        since: c.memberSince,
      })),
    },
    enquiries: {
      title: 'New enquiries',
      subtitle: 'Everything captured by the intake funnel',
      columns: [
        { key: 'date', label: 'Date' },
        { key: 'name', label: 'Name' },
        { key: 'route', label: 'Route' },
        { key: 'plan', label: 'Plan' },
        { key: 'status', label: 'Status' },
      ],
      filterKey: 'route',
      rows: listEnquiries().map((e) => ({
        date: new Date(e.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        name: String(e.payload?.name ?? '—'),
        route: e.route === 'reception' ? 'Reception' : 'Membership',
        plan: e.planLabel,
        status: e.status,
      })),
    },
  }

  const cards = [
    {
      key: 'revenue',
      label: 'Revenue this month',
      value: last.total,
      format: (v: number) => formatHKD(v),
      sub: `${revDelta >= 0 ? '+' : ''}${revDelta}% vs ${prev.label}`,
      up: revDelta >= 0,
    },
    {
      key: 'sessions',
      label: 'Sessions delivered',
      value: last.sessionsDelivered,
      format: (v: number) => String(Math.round(v)),
      sub: `${sesDelta >= 0 ? '+' : ''}${sesDelta} vs ${prev.label}`,
      up: sesDelta >= 0,
    },
    {
      key: 'occupancy',
      label: 'Occupancy today',
      value: occupancy,
      format: (v: number) => `${Math.round(v)}%`,
      sub: `${classRows.length} classes running`,
      up: occupancy >= 70,
    },
    {
      key: 'clients',
      label: 'Active clients',
      value: coachClients.length,
      format: (v: number) => String(Math.round(v)),
      sub: `${last.newClients} new in ${last.label}`,
      up: true,
    },
    {
      key: 'enquiries',
      label: 'New enquiries',
      value: newEnquiries,
      format: (v: number) => String(Math.round(v)),
      sub: 'from the intake funnel',
      up: newEnquiries > 0,
      gold: true,
    },
  ]

  return (
    <div>
      <div className="mb-2 flex items-center justify-end gap-2">
        <span className="text-[11px] text-vault-faint">{hidden ? 'Figures hidden' : 'Figures visible'}</span>
        <button
          type="button"
          onClick={toggleHidden}
          aria-pressed={hidden}
          aria-label={hidden ? 'Show KPI figures' : 'Hide KPI figures'}
          title={hidden ? 'Show KPI figures' : 'Hide KPI figures'}
          className="flex h-8 w-8 items-center justify-center border border-vault-border text-vault-muted transition-colors hover:border-white/40 hover:text-white"
        >
          {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {cards.map((c, i) => (
          <motion.button
            key={c.key}
            type="button"
            onClick={() => setSheet(sheets[c.key])}
            title={`Open ${c.label} detail`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.07, ease: 'easeOut' }}
            className={`app-card p-5 text-left transition-colors hover:border-white/40 ${c.gold ? 'border-gold/50' : ''}`}
          >
            <p className="text-[11px] uppercase tracking-[0.16em] text-vault-muted">{c.label}</p>
            <p className={`tnum mt-3 text-[26px] font-bold leading-none md:text-[30px] ${c.gold ? 'text-gold' : 'text-white'}`}>
              {hidden ? KPI_MASK : <CountUp value={c.value} format={c.format} />}
            </p>
            <p className="mt-2.5 flex items-center gap-1 text-[12px] text-vault-muted">
              {c.up ? (
                <ArrowUpRight className="h-3.5 w-3.5 text-gold" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5 text-vault-muted" />
              )}
              {hidden ? KPI_MASK : c.sub}
            </p>
          </motion.button>
        ))}
      </div>
      {sheet && (
        <KpiSheet
          title={sheet.title}
          subtitle={sheet.subtitle}
          columns={sheet.columns}
          rows={sheet.rows}
          filterKey={sheet.filterKey}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Today's schedule (Classes / Appointments tabs) — wireframe screen 02
// ---------------------------------------------------------------------------

function TodayPanel() {
  const [tab, setTab] = useState<'classes' | 'appointments'>('classes')
  const rows = TODAY_SCHEDULE.filter((s) => (tab === 'classes' ? s.classId : !s.classId))

  return (
    <section className="app-card p-6">
      <SectionHeader
        eyebrow={todayLabel}
        title="Today's schedule"
        right={
          <div className="flex border border-vault-border" role="tablist" aria-label="Schedule filter">
            {(['classes', 'appointments'] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`px-3.5 py-1.5 text-[10px] uppercase tracking-[0.12em] transition-colors ${
                  tab === t ? 'bg-white font-bold text-vault-btn-text' : 'text-vault-muted hover:text-white'
                }`}
              >
                {t === 'classes' ? 'Classes' : 'Appointments'}
              </button>
            ))}
          </div>
        }
      />
      <ul className="divide-y divide-vault-border/60">
        {rows.map((s, i) => {
          const done = timeToMinutes(s.time) <= NOW_LABEL_MINUTES
          const cap = s.classId ? (gymClasses.find((g) => g.id === s.classId)?.capacity ?? 6) : 0
          const booked = s.booked ?? 0
          const coach = getCoachById(coachFor(s.classId, s.time))
          const fillPct = s.classId ? Math.round((booked / cap) * 100) : 0
          return (
            <motion.li
              key={s.time}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.05, ease: 'easeOut' }}
              className="flex flex-wrap items-center gap-x-5 gap-y-2 py-3.5"
            >
              <span className="tnum w-12 shrink-0 text-[13px] text-vault-muted">{s.time}</span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span className={`text-[14px] font-medium ${done ? 'text-white/50' : 'text-white'}`}>{s.label}</span>
                  <span
                    className={`px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] ${
                      s.kind === 'class'
                        ? 'bg-white text-vault-btn-text'
                        : s.kind === 'group'
                          ? 'border border-dashed border-viz-3 text-vault-muted'
                          : 'border border-white/50 text-white/70'
                    }`}
                  >
                    {s.kind === 'class' ? 'Class' : s.kind === 'group' ? '2:1' : '1:1'}
                  </span>
                  {done ? (
                    <span className="flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-vault-faint">
                      <CheckCircle2 className="h-3 w-3" /> Done
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-gold">
                      <Circle className="h-2.5 w-2.5 fill-gold" /> Upcoming
                    </span>
                  )}
                </p>
                <p className="mt-1 text-[12px] text-vault-faint">
                  {coach?.name} · {s.note}
                </p>
              </div>
              {s.classId && (
                <div className="w-32">
                  <div className="flex justify-between text-[11px] tabular-nums text-vault-muted">
                    <span>
                      {booked}/{cap} booked
                    </span>
                    <span>{done ? `${booked} in` : ''}</span>
                  </div>
                  <div className="mt-1 h-1 w-full overflow-hidden" style={{ background: 'var(--viz-track)' }}>
                    <motion.div
                      className="h-full bg-white"
                      initial={false}
                      animate={{ width: `${fillPct}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              )}
            </motion.li>
          )
        })}
      </ul>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Clients at risk
// ---------------------------------------------------------------------------

function RiskPanel() {
  return (
    <section className="app-card p-6">
      <SectionHeader
        eyebrow="Retention"
        title="Clients at risk"
        right={<p className="text-[12px] text-vault-muted">why they might not renew</p>}
      />
      <div className="space-y-4">
        {RISK_CLIENTS.map((r, i) => (
          <motion.div
            key={r.name}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.07 }}
            className={`border-l-2 p-4 ${r.level === 'High' ? 'border-[#ff6b6b]' : 'border-gold'}`}
          >
            <p className="flex flex-wrap items-center gap-2 text-[14px] font-medium text-white">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-vault-surface-3 text-[9px] text-vault-muted">
                {r.initials}
              </span>
              {r.name}
              <span
                className={`px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em] ${
                  r.level === 'High' ? 'border border-[#ff6b6b] text-[#ff6b6b]' : 'border border-gold text-gold'
                }`}
              >
                {r.level}
              </span>
            </p>
            <ul className="mt-2 space-y-1">
              {r.reasons.map((reason) => (
                <li key={reason} className="text-[12px] text-vault-muted">
                  · {reason}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Right rail — notifications + yesterday's summary
// ---------------------------------------------------------------------------

function Rail() {
  const newEnquiries = countNewEnquiries()
  const items = [
    {
      title: 'New enquiries',
      count: newEnquiries,
      note: 'membership · trial — reply via CRM',
      link: '/admin/enquiries',
    },
    { title: 'Memberships expiring', count: 2, note: 'within 14 days — send renewal' },
    { title: 'Failed payments', count: 1, note: 'autopay retry tomorrow' },
  ]

  return (
    <div className="space-y-6">
      <section className="app-card p-5" aria-label="Notifications">
        <h3 className="mb-3 text-[15px] font-bold">Notifications</h3>
        <div className="space-y-3">
          {items.map((n) => (
            <div key={n.title} className="border-l-2 border-gold/50 pl-3">
              <p className="flex items-center justify-between text-[13px] font-medium text-white">
                {n.title}
                {n.count > 0 && (
                  <span
                    className={`px-1.5 text-[10px] font-bold leading-tight ${
                      n.title === 'New enquiries' ? 'bg-gold text-black' : 'bg-[#ff6b6b] text-black'
                    }`}
                  >
                    {n.count}
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-[11px] text-vault-muted">
                {n.note}
                {n.link && (
                  <>
                    {' '}
                    ·{' '}
                    <Link to={n.link} className="text-gold transition-colors hover:text-white">
                      View all
                    </Link>
                  </>
                )}
              </p>
            </div>
          ))}
        </div>
      </section>
      <section className="app-card p-5" aria-label="Yesterday's summary">
        <h3 className="mb-3 text-[15px] font-bold">Yesterday's summary</h3>
        <ul className="space-y-2 text-[12px] text-vault-muted">
          {YESTERDAY.map((r) => (
            <li key={r.label} className="flex items-baseline justify-between">
              <span>{r.label}</span>
              <b className="tnum text-white">{r.value}</b>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PortalOwner() {
  const classes = TODAY_SCHEDULE.filter((s) => s.classId).length
  const pt = TODAY_SCHEDULE.filter((s) => !s.classId).length
  const newEnquiries = countNewEnquiries()

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <p className="eyebrow">Owner portal</p>
        <h2 className="mt-1 text-2xl font-bold text-white md:text-3xl">
          {greeting()}, Dan
        </h2>
        <p className="mt-1 text-[13px] text-vault-muted">
          {todayLabel} · {classes} classes · {pt} PT sessions
          {newEnquiries > 0 ? ` · ${newEnquiries} enquiry${newEnquiries > 1 ? 'ies' : ''} awaiting reply` : ''}
        </p>
      </div>

      <KpiRow />

      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-6">
          <TodayPanel />
          <RiskPanel />
        </div>
        <Rail />
      </div>
    </div>
  )
}
