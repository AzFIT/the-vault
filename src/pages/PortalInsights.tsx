/**
 * Insights (/portal/insights) — the owner portal's revenue reporting, the
 * charts from the retired /manage view rebuilt on the portal chrome:
 *
 *   1. Revenue — trailing-12-month stacked stream chart (PT / memberships /
 *      classes) plus the current-month breakdown vs last month with shares.
 *   2. Staff performance — per-coach sessions, attributed revenue,
 *      utilisation, active clients and adherence, ranked.
 *
 * All figures derive from the shared mock store (monthlyRevenue, coaches,
 * coachClients). Staff splits are deterministic weights, not random — same
 * numbers every render. The hide/show-figures toggle is shared with the
 * owner dashboard and front desk (see lib/kpiHidden), and a Print / PDF
 * button opens the standalone report at /portal/insights/report.
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
import { CalendarClock, Eye, EyeOff, Printer } from 'lucide-react'
import { formatHKD, monthlyRevenue } from '@/data/mock'
import { GridAvatar, SectionHeader } from '@/components/coach/shared'
import { KPI_MASK } from '@/components/KpiSheet'
import { useKpiHidden } from '@/lib/kpiHidden'
import { STREAMS, staffPerformanceRows } from '@/lib/insights'

const todayLabel = new Date().toLocaleDateString('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}) {
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

// ---------------------------------------------------------------------------
// Revenue — 12-month stream chart + current month breakdown
// ---------------------------------------------------------------------------

function RevenuePanels({ hidden }: { hidden: boolean }) {
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
            <div className="flex flex-wrap items-center gap-4">
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
                <p className="tnum text-[13px] font-bold text-white">
                  {hidden ? KPI_MASK : formatHKD(r.value)}
                </p>
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
                  {hidden ? KPI_MASK : `${r.share}% · ${r.delta >= 0 ? '+' : ''}${r.delta}%`}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="mt-6 flex items-baseline justify-between border-t border-vault-border/60 pt-4">
          <p className="text-[12px] uppercase tracking-[0.14em] text-vault-muted">Total</p>
          <p className="tnum text-xl font-bold text-gold">{hidden ? KPI_MASK : formatHKD(last.total)}</p>
        </div>
      </section>
    </>
  )
}

// ---------------------------------------------------------------------------
// Staff performance — deterministic attribution (Head Coach > Junior)
// ---------------------------------------------------------------------------

function StaffPanel({ hidden }: { hidden: boolean }) {
  const last = monthlyRevenue[monthlyRevenue.length - 1]
  const rows = staffPerformanceRows()

  const maxRevenue = Math.max(...rows.map((r) => r.revenue))

  return (
    <section className="app-card p-6">
      <SectionHeader
        eyebrow={last.label}
        title="Staff performance"
        right={
          <p className="text-[12px] text-vault-muted">
            {rows.length} coaches · ranked by revenue
          </p>
        }
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
                <td className="tnum py-3.5 pr-4 text-right text-[14px] text-white">
                  {hidden ? KPI_MASK : r.sessions}
                </td>
                <td className="tnum py-3.5 pr-4 text-right text-[14px] font-bold text-white">
                  {hidden ? KPI_MASK : formatHKD(r.revenue)}
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
                      {hidden ? KPI_MASK : `${Math.round((r.revenue / maxRevenue) * 100)}%`}
                    </span>
                  </div>
                </td>
                <td className="tnum py-3.5 pr-4 text-right text-[14px] text-white">
                  {hidden ? KPI_MASK : `${r.utilisation}%`}
                </td>
                <td className="tnum py-3.5 pr-4 text-right text-[14px] text-white">
                  {hidden ? KPI_MASK : r.clients}
                </td>
                <td className="tnum py-3.5 text-right text-[14px] text-white">
                  {hidden ? KPI_MASK : `${r.adherence}%`}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-[11px] text-vault-faint">
        Revenue attribution is a deterministic weight by seniority — real per-coach splits arrive
        with the backend.
      </p>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PortalInsights() {
  const [hidden, toggleHidden] = useKpiHidden()

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Grow · Insights</p>
          <h2 className="mt-1 text-2xl font-bold text-white md:text-3xl">Revenue & performance</h2>
          <p className="mt-0.5 flex items-center gap-2 text-[13px] text-vault-muted">
            <CalendarClock className="h-3.5 w-3.5" /> {todayLabel}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              // Dev base is './' — resolve against the origin root instead of
              // the current route so the URL works from any page.
              const base = import.meta.env.BASE_URL
              const root = base === './' ? '/' : base
              window.open(`${root}portal/insights/report`, '_blank', 'noopener')
            }}
            className="inline-flex items-center gap-2 border border-vault-border px-3 py-2 text-[11px] uppercase tracking-[0.1em] text-vault-muted transition-colors hover:border-white/40 hover:text-white"
          >
            <Printer className="h-3.5 w-3.5" /> Print / PDF report
          </button>
          <button
            type="button"
            onClick={toggleHidden}
            aria-pressed={hidden}
            className="inline-flex items-center gap-2 border border-vault-border px-3 py-2 text-[11px] uppercase tracking-[0.1em] text-vault-muted transition-colors hover:border-white/40 hover:text-white"
          >
            {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {hidden ? 'Show figures' : 'Hide figures'}
          </button>
        </div>
      </div>

      {/* Revenue */}
      <div className="grid gap-6 xl:grid-cols-3">
        <RevenuePanels hidden={hidden} />
      </div>

      {/* Staff */}
      <StaffPanel hidden={hidden} />
    </div>
  )
}
