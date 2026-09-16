/**
 * Management view — the studio-owner surface (Mindbody-style scope, Vault
 * skin). Aggregates the three things management checks daily:
 *
 *   1. Scheduling — today's classes/PT with coach, room, capacity, check-ins
 *      plus per-room utilisation for the day.
 *   2. Revenue — 12-month stacked stream chart (PT / memberships / classes)
 *      and the current-month breakdown vs last month.
 *   3. Staff performance — per-coach sessions, attributed revenue,
 *      utilisation, active clients and adherence, ranked.
 *
 * All figures derive from the shared mock store (monthlyRevenue, coaches,
 * gymClasses, TODAY_SCHEDULE) plus the live enquiries CRM count. Staff
 * splits are deterministic weights, not random — same numbers every render.
 */
import { motion } from 'framer-motion'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  Circle,
  DoorOpen,
} from 'lucide-react'
import {
  coachClients,
  coaches,
  formatHKD,
  getCoachById,
  gymClasses,
  monthlyRevenue,
} from '@/data/mock'
import { SectionHeader, CountUp, GridAvatar } from '@/components/coach/shared'
import { TODAY_SCHEDULE, NOW_LABEL_MINUTES, timeToMinutes } from '@/components/coach/scheduleData'
import { countNewEnquiries } from '@/lib/enquiries'

const STREAMS = [
  { key: 'pt', label: 'PT Packages', color: 'var(--viz-1)' },
  { key: 'memberships', label: 'Memberships', color: 'var(--viz-2)' },
  { key: 'classes', label: 'Classes', color: 'var(--viz-3)' },
] as const

/** Coach for a schedule row — match the class's roster slot by start time. */
function coachFor(classId: string | undefined, time: string): string {
  if (!classId) return 'dan-kan'
  const gc = gymClasses.find((g) => g.id === classId)
  const slot = gc?.schedule.find((s) => s.time === time)
  return slot?.coachId ?? 'dan-kan'
}

const today = new Date()
const todayLabel = today.toLocaleDateString('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

// ---------------------------------------------------------------------------
// KPI row
// ---------------------------------------------------------------------------

function KpiRow() {
  const last = monthlyRevenue[monthlyRevenue.length - 1]
  const prev = monthlyRevenue[monthlyRevenue.length - 2]
  const revDelta = Math.round(((last.total - prev.total) / prev.total) * 100)
  const sesDelta = last.sessionsDelivered - prev.sessionsDelivered
  const classRows = TODAY_SCHEDULE.filter((s) => s.classId)
  const occupancy = Math.round(
    (classRows.reduce((acc, s) => acc + (s.booked ?? 0) / (gymClasses.find((g) => g.id === s.classId)?.capacity ?? 6), 0) /
      classRows.length) *
      100,
  )
  const newEnquiries = countNewEnquiries()

  const cards = [
    {
      label: 'Revenue this month',
      value: last.total,
      format: (v: number) => formatHKD(v),
      sub: `${revDelta >= 0 ? '+' : ''}${revDelta}% vs ${prev.label}`,
      up: revDelta >= 0,
    },
    {
      label: 'Sessions delivered',
      value: last.sessionsDelivered,
      format: (v: number) => String(Math.round(v)),
      sub: `${sesDelta >= 0 ? '+' : ''}${sesDelta} vs ${prev.label}`,
      up: sesDelta >= 0,
    },
    {
      label: 'Class occupancy today',
      value: occupancy,
      format: (v: number) => `${Math.round(v)}%`,
      sub: `${classRows.length} classes running`,
      up: occupancy >= 70,
    },
    {
      label: 'Active clients',
      value: coachClients.length,
      format: (v: number) => String(Math.round(v)),
      sub: `${last.newClients} new in ${last.label}`,
      up: true,
    },
    {
      label: 'New enquiries',
      value: newEnquiries,
      format: (v: number) => String(Math.round(v)),
      sub: 'from the intake funnel',
      up: newEnquiries > 0,
      gold: true,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
      {cards.map((c, i) => (
        <motion.div
          key={c.label}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: i * 0.07, ease: 'easeOut' }}
          className={`app-card p-5 ${c.gold ? 'border-gold/50' : ''}`}
        >
          <p className="text-[11px] uppercase tracking-[0.16em] text-vault-muted">{c.label}</p>
          <p className={`tnum mt-3 text-[26px] font-bold leading-none md:text-[30px] ${c.gold ? 'text-gold' : 'text-white'}`}>
            <CountUp value={c.value} format={c.format} />
          </p>
          <p className="mt-2.5 flex items-center gap-1 text-[12px] text-vault-muted">
            {c.up ? (
              <ArrowUpRight className="h-3.5 w-3.5 text-gold" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5 text-vault-muted" />
            )}
            {c.sub}
          </p>
        </motion.div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Scheduling — today + rooms
// ---------------------------------------------------------------------------

function SchedulePanel() {
  return (
    <section className="app-card p-6 xl:col-span-2">
      <SectionHeader eyebrow={todayLabel} title="Today's schedule" />
      <ul className="mt-2 divide-y divide-vault-border/60">
        {TODAY_SCHEDULE.map((s, i) => {
          const done = timeToMinutes(s.time) <= NOW_LABEL_MINUTES
          const cap = s.classId ? (gymClasses.find((g) => g.id === s.classId)?.capacity ?? 6) : 0
          const booked = s.classId ? (s.booked ?? 0) : 1
          const checkedIn = s.classId ? Math.max(0, booked - (booked > 2 ? 1 : 0)) : done ? 1 : 0
          const coach = getCoachById(coachFor(s.classId, s.time))
          const fillPct = s.classId ? Math.round((booked / cap) * 100) : 100
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
                  <span className={`text-[14px] font-medium ${done ? 'text-white/50' : 'text-white'}`}>
                    {s.label}
                  </span>
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
                    <span>{checkedIn} in</span>
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

function RoomsPanel() {
  // Utilisation = booked minutes vs a 12-hour operating day (8:00–20:00)
  const OPEN_MIN = 12 * 60
  const rooms = ['Main Studio', 'VIP Studio', 'Reformer Room']
  const roomKey = (note: string) => (note.toLowerCase().includes('vip') ? 'VIP Studio' : 'Main Studio')
  const bookedMin = new Map<string, number>(rooms.map((r) => [r, 0]))
  for (const s of TODAY_SCHEDULE) {
    const room = roomKey(s.note)
    bookedMin.set(room, (bookedMin.get(room) ?? 0) + 60)
  }
  const classesThisWeek = gymClasses.reduce((acc, g) => acc + g.schedule.length, 0)

  return (
    <section className="app-card flex flex-col p-6">
      <SectionHeader
        eyebrow="Capacity"
        title="Rooms today"
        right={<DoorOpen className="h-4 w-4 text-vault-faint" strokeWidth={1.5} />}
      />
      <div className="mt-4 flex-1 space-y-5">
        {rooms.map((r, i) => {
          const pct = Math.min(100, Math.round(((bookedMin.get(r) ?? 0) / OPEN_MIN) * 100))
          return (
            <motion.div
              key={r}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 + i * 0.06 }}
            >
              <div className="flex items-baseline justify-between">
                <p className="text-[13px] font-medium text-white">{r}</p>
                <p className="tnum text-[12px] text-vault-muted">
                  {(bookedMin.get(r) ?? 0) / 60}h · {pct}%
                </p>
              </div>
              <div className="mt-1.5 h-1 w-full overflow-hidden" style={{ background: 'var(--viz-track)' }}>
                <motion.div
                  className={`h-full ${pct > 0 ? 'bg-gold' : 'bg-transparent'}`}
                  initial={false}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            </motion.div>
          )
        })}
      </div>
      <div className="mt-6 space-y-2 border-t border-vault-border/60 pt-4 text-[12px] text-vault-muted">
        <p className="flex justify-between"><span>Classes this week</span><span className="tnum text-white">{classesThisWeek}</span></p>
        <p className="flex justify-between"><span>1:1 / 2:1 sessions this week</span><span className="tnum text-white">24</span></p>
        <p className="flex justify-between"><span>Staff on floor today</span><span className="tnum text-white">{coaches.length}</span></p>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Revenue — 12-month stream chart + current month breakdown
// ---------------------------------------------------------------------------

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  const total = payload.reduce((a, p) => a + p.value, 0)
  return (
    <div className="border border-vault-border bg-vault-surface px-3 py-2.5 shadow-xl shadow-black/50">
      <p className="mb-1.5 text-[11px] uppercase tracking-[0.14em] text-vault-muted">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-[12px] tabular-nums">
          <span className="h-2 w-2" style={{ background: p.color }} />
          <span className="w-24 text-vault-muted">{p.name}</span>
          <span className="text-white">{formatHKD(p.value)}</span>
        </p>
      ))}
      <p className="mt-1.5 border-t border-vault-border/60 pt-1.5 text-[12px] font-bold tabular-nums text-gold">
        {formatHKD(total)}
      </p>
    </div>
  )
}

function RevenuePanel() {
  const last = monthlyRevenue[monthlyRevenue.length - 1]
  const prev = monthlyRevenue[monthlyRevenue.length - 2]

  const rows = STREAMS.map((s) => {
    const v = last[s.key as 'pt' | 'memberships' | 'classes']
    const pv = prev[s.key as 'pt' | 'memberships' | 'classes']
    return {
      ...s,
      value: v,
      share: Math.round((v / last.total) * 100),
      delta: Math.round(((v - pv) / pv) * 100),
    }
  })

  return (
    <>
      <section className="app-card p-6 xl:col-span-2">
        <SectionHeader
          eyebrow="Trailing 12 months"
          title="Revenue by stream"
          right={
            <div className="flex items-center gap-4">
              {STREAMS.map((s) => (
                <span key={s.key} className="flex items-center gap-1.5 text-[11px] text-vault-muted">
                  <span className="h-2 w-2" style={{ background: s.color }} />
                  {s.label}
                </span>
              ))}
            </div>
          }
        />
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyRevenue} margin={{ top: 8, right: 4, left: 4, bottom: 0 }} barCategoryGap="28%">
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="label"
                tick={{ fill: 'var(--vault-muted)', fontSize: 11 }}
                axisLine={{ stroke: 'var(--vault-border)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'var(--vault-muted)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                width={36}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Legend wrapperStyle={{ display: 'none' }} />
              {STREAMS.map((s) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  stackId="rev"
                  fill={s.color}
                  radius={s.key === 'classes' ? [2, 2, 0, 0] : [0, 0, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="app-card flex flex-col p-6">
        <SectionHeader eyebrow={last.label} title="This month" />
        <div className="mt-4 flex-1 space-y-4">
          {rows.map((r, i) => (
            <motion.div
              key={r.key}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: 0.08 + i * 0.06 }}
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="flex items-center gap-2 text-[13px] text-white">
                  <span className="h-2 w-2" style={{ background: r.color }} />
                  {r.label}
                </p>
                <p className="tnum text-[13px] font-bold text-white">{formatHKD(r.value)}</p>
              </div>
              <div className="mt-1.5 flex items-center gap-3">
                <div className="h-1 flex-1 overflow-hidden" style={{ background: 'var(--viz-track)' }}>
                  <motion.div
                    className="h-full"
                    style={{ background: r.color }}
                    initial={false}
                    animate={{ width: `${r.share}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
                <span className="tnum w-16 text-right text-[11px] text-vault-muted">
                  {r.share}% · {r.delta >= 0 ? '+' : ''}{r.delta}%
                </span>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="mt-6 flex items-baseline justify-between border-t border-vault-border/60 pt-4">
          <p className="text-[12px] uppercase tracking-[0.14em] text-vault-muted">Total</p>
          <p className="tnum text-xl font-bold text-gold">{formatHKD(last.total)}</p>
        </div>
      </section>
    </>
  )
}

// ---------------------------------------------------------------------------
// Staff performance
// ---------------------------------------------------------------------------

/** Deterministic attribution weights (Head Coach > Junior). */
const STAFF_WEIGHTS = [0.3, 0.22, 0.2, 0.16, 0.12]
const STAFF_UTIL = [92, 84, 81, 76, 62]
const STAFF_ADHERENCE = [89, 91, 86, 84, 78]

function StaffPanel() {
  const last = monthlyRevenue[monthlyRevenue.length - 1]

  // Deterministic attribution — same numbers every render, so no memo needed.
  const totalClients = coachClients.length
  const rows = coaches.map((c, i) => {
    const sessions = Math.round(last.sessionsDelivered * STAFF_WEIGHTS[i])
    const revenue = Math.round((last.pt * STAFF_WEIGHTS[i]) / 100) * 100
    const clients = Math.max(1, Math.round((totalClients * STAFF_WEIGHTS[i]) / 0.62) - (i > 2 ? 1 : 0))
    return {
      coach: c,
      sessions,
      revenue,
      utilisation: STAFF_UTIL[i],
      adherence: STAFF_ADHERENCE[i],
      clients,
    }
  })

  const maxRevenue = Math.max(...rows.map((r) => r.revenue))

  return (
    <section className="app-card p-6">
      <SectionHeader
        eyebrow={last.label}
        title="Staff performance"
        right={<p className="text-[12px] text-vault-muted">{rows.length} coaches · ranked by revenue</p>}
      />
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left">
          <thead>
            <tr className="border-b border-vault-border text-[11px] uppercase tracking-[0.14em] text-vault-muted">
              <th className="pb-3 pr-4 font-normal">Coach</th>
              <th className="pb-3 pr-4 text-right font-normal">Sessions</th>
              <th className="pb-3 pr-4 text-right font-normal">Revenue</th>
              <th className="pb-3 pr-4 font-normal">Revenue share</th>
              <th className="pb-3 pr-4 text-right font-normal">Utilisation</th>
              <th className="pb-3 pr-4 text-right font-normal">Clients</th>
              <th className="pb-3 text-right font-normal">Adherence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-vault-border/50">
            {rows.map((r, i) => (
              <motion.tr
                key={r.coach.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.05 }}
                className={i === 0 ? 'bg-gold/[0.04]' : ''}
              >
                <td className="py-3.5 pr-4">
                  <div className="flex items-center gap-3">
                    {i === 0 && <span className="w-5 text-[11px] font-bold text-gold">#1</span>}
                    {i !== 0 && <span className="w-5 text-[11px] text-vault-faint">{i + 1}</span>}
                    <GridAvatar name={r.coach.name} size={32} />
                    <div>
                      <p className="text-[14px] font-medium text-white">{r.coach.name}</p>
                      <p className="text-[11px] text-vault-faint">{r.coach.role}</p>
                    </div>
                  </div>
                </td>
                <td className="tnum py-3.5 pr-4 text-right text-[14px] text-white">{r.sessions}</td>
                <td className="tnum py-3.5 pr-4 text-right text-[14px] font-bold text-white">
                  {formatHKD(r.revenue)}
                </td>
                <td className="py-3.5 pr-4">
                  <div className="flex items-center gap-2">
                    <div className="h-1 w-24 overflow-hidden" style={{ background: 'var(--viz-track)' }}>
                      <motion.div
                        className={`h-full ${i === 0 ? 'bg-gold' : 'bg-white/70'}`}
                        initial={false}
                        animate={{ width: `${(r.revenue / maxRevenue) * 100}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                      />
                    </div>
                    <span className="tnum text-[11px] text-vault-muted">
                      {Math.round((r.revenue / maxRevenue) * 100)}%
                    </span>
                  </div>
                </td>
                <td className="tnum py-3.5 pr-4 text-right text-[14px] text-white">{r.utilisation}%</td>
                <td className="tnum py-3.5 pr-4 text-right text-[14px] text-white">{r.clients}</td>
                <td className="tnum py-3.5 text-right text-[14px] text-white">{r.adherence}%</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Manage() {
  return (
    <div className="space-y-6 md:space-y-8">
      {/* Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Management</p>
          <h2 className="mt-1 text-2xl font-bold text-white md:text-3xl">Studio overview</h2>
          <p className="mt-0.5 flex items-center gap-2 text-[13px] text-vault-muted">
            <CalendarClock className="h-3.5 w-3.5" /> {todayLabel}
          </p>
        </div>
      </div>

      {/* KPIs */}
      <KpiRow />

      {/* Scheduling */}
      <div className="grid gap-6 xl:grid-cols-3">
        <SchedulePanel />
        <RoomsPanel />
      </div>

      {/* Revenue */}
      <div className="grid gap-6 xl:grid-cols-3">
        <RevenuePanel />
      </div>

      {/* Staff */}
      <StaffPanel />
    </div>
  )
}
