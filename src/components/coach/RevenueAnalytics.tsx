import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  monthlyRevenue,
  coachClients,
  membershipPlans,
  introPackage,
  formatHKD,
  LOG_END_DATE,
} from '@/data/mock'
import type { Client } from '@/data/mock'
import { SectionHeader } from './shared'

type StreamKey = 'pt' | 'memberships' | 'classes' | 'intro'

const STREAMS: { key: StreamKey; label: string; color: string }[] = [
  { key: 'pt', label: 'PT Packages', color: 'var(--viz-1)' },
  { key: 'memberships', label: 'Memberships', color: 'var(--viz-2)' },
  { key: 'classes', label: 'Classes', color: 'var(--viz-3)' },
  { key: 'intro', label: 'Intro Packages', color: 'var(--viz-4)' },
]

/** Intro-package revenue derived from mock newClients × published HK$4,500 package */
const introFor = (newClients: number) =>
  Math.round(newClients / 2) * introPackage.priceHKD

/** Derived per-session yield from the mock revenue series (PT ÷ sessions) */
function perSessionYield(): number {
  const last = monthlyRevenue[monthlyRevenue.length - 1]
  return last.pt / last.sessionsDelivered
}

const WEEKLY_SESSIONS: Record<Client['tier'], number> = {
  'PT 3x/wk': 3,
  'PT 2x/wk': 2,
  "Women's Programme": 2,
  'Open Gym': 0,
}

function tenureMonths(memberSince: string): number {
  const end = new Date(`${LOG_END_DATE}T00:00:00`)
  const [y, m] = memberSince.split('-').map(Number)
  return Math.max(1, (end.getFullYear() - y) * 12 + (end.getMonth() + 1 - m))
}

function ltvFor(client: Client, perSession: number, openGymMonthly: number): number {
  const weekly = WEEKLY_SESSIONS[client.tier]
  const monthly =
    weekly === 0 ? openGymMonthly : weekly * 4.33 * perSession
  return Math.round(monthly * tenureMonths(client.memberSince) / 100) * 100
}

function RevenueTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { dataKey?: string | number; value?: number | string }[]
  label?: string | number
}) {
  if (!active || !payload?.length) return null
  const total = payload.reduce((s, p) => s + Number(p.value ?? 0), 0)
  return (
    <div className="border border-vault-border bg-vault-surface-2 px-4 py-3 text-[12px] shadow-lg">
      <p className="mb-2 text-[10px] uppercase tracking-[0.16em] text-vault-muted">
        {label}
      </p>
      {STREAMS.map((s) => {
        const p = payload.find((x) => x.dataKey === s.key)
        return (
          <div key={s.key} className="flex items-center justify-between gap-6 py-0.5">
            <span className="flex items-center gap-2 text-vault-muted">
              <span className="h-2 w-2" style={{ background: s.color }} />
              {s.label}
            </span>
            <span className="tnum text-white">{formatHKD(Number(p?.value ?? 0))}</span>
          </div>
        )
      })}
      <div className="mt-2 flex items-center justify-between gap-6 border-t border-vault-border pt-2">
        <span className="text-vault-muted">Total</span>
        <span className="tnum font-bold text-white">{formatHKD(total)}</span>
      </div>
    </div>
  )
}

export default function RevenueAnalytics() {
  const [hovered, setHovered] = useState<StreamKey | null>(null)
  const [isolated, setIsolated] = useState<StreamKey | null>(null)

  const data = useMemo(
    () =>
      monthlyRevenue.slice(-6).map((m) => ({
        label: m.label,
        pt: m.pt,
        memberships: m.memberships,
        classes: m.classes,
        intro: introFor(m.newClients),
      })),
    [],
  )

  const mix = useMemo(() => {
    const last = monthlyRevenue[monthlyRevenue.length - 1]
    const intro = introFor(last.newClients)
    const rows = [
      { key: 'pt' as StreamKey, value: last.pt },
      { key: 'memberships' as StreamKey, value: last.memberships },
      { key: 'classes' as StreamKey, value: last.classes },
      { key: 'intro' as StreamKey, value: intro },
    ]
    const total = rows.reduce((s, r) => s + r.value, 0)
    return rows.map((r) => ({ ...r, pct: Math.round((r.value / total) * 100) }))
  }, [])

  const topClients = useMemo(() => {
    const perSession = perSessionYield()
    const openGymMonthly =
      membershipPlans.find((p) => p.id === 'autopay')?.priceHKD ?? 1288
    return coachClients
      .map((c) => ({
        client: c,
        ltv: ltvFor(c, perSession, openGymMonthly),
        tenure: tenureMonths(c.memberSince),
      }))
      .sort((a, b) => b.ltv - a.ltv)
      .slice(0, 5)
  }, [])

  const dim = (key: StreamKey): number => {
    if (isolated) return isolated === key ? 1 : 0.12
    if (hovered) return hovered === key ? 1 : 0.4
    return 1
  }

  return (
    <section>
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Card A — monthly revenue */}
        <div className="app-card p-6 lg:col-span-2">
          <SectionHeader eyebrow="Revenue" title="Last 6 months (HK$)" />
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} barCategoryGap="28%">
                <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
                <XAxis
                  dataKey="label"
                  tick={{ fill: 'var(--vault-muted)', fontSize: 12 }}
                  axisLine={{ stroke: 'var(--vault-border)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'var(--vault-faint)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={64}
                  tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                />
                <Tooltip content={<RevenueTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                {STREAMS.map((s, i) => (
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    stackId="rev"
                    fill={s.color}
                    fillOpacity={dim(s.key)}
                    radius={i === STREAMS.length - 1 ? [2, 2, 0, 0] : 0}
                    onMouseEnter={() => setHovered(s.key)}
                    onMouseLeave={() => setHovered(null)}
                    isAnimationActive
                    animationDuration={900}
                    animationBegin={i * 120}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Legend — click to isolate */}
          <div className="mt-4 flex flex-wrap gap-2">
            {STREAMS.map((s) => {
              const active = isolated === null || isolated === s.key
              return (
                <button
                  key={s.key}
                  onClick={() => setIsolated((cur) => (cur === s.key ? null : s.key))}
                  onMouseEnter={() => setHovered(s.key)}
                  onMouseLeave={() => setHovered(null)}
                  className={`flex items-center gap-2 border px-3 py-1.5 text-[11px] transition-opacity ${
                    active
                      ? 'border-vault-border text-white'
                      : 'border-vault-border/50 text-vault-faint opacity-60'
                  }`}
                >
                  <span className="h-2 w-2" style={{ background: s.color }} />
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Card B — this month's mix */}
        <div className="app-card p-6">
          <SectionHeader eyebrow="Stream mix" title="This month" />
          <div className="space-y-5 pt-2">
            {mix.map((row, i) => {
              const s = STREAMS.find((x) => x.key === row.key)!
              return (
                <div key={row.key}>
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="text-[13px] text-white">{s.label}</span>
                    <span className="tnum text-[13px] text-vault-muted">
                      {formatHKD(row.value)}{' '}
                      <span className="text-vault-faint">· {row.pct}%</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-viz-track">
                    <motion.div
                      className="h-full"
                      style={{ background: s.color }}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${row.pct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: i * 0.08, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <p className="mt-6 border-t border-vault-border pt-4 text-[11px] leading-relaxed text-vault-faint">
            Intro Packages estimated from new-client sign-ups × {formatHKD(introPackage.priceHKD)}{' '}
            Introductory Package.
          </p>
        </div>
      </div>

      {/* Strip — top clients by LTV */}
      <div className="app-card mt-6 p-6">
        <p className="mb-4 text-[11px] uppercase tracking-[0.18em] text-vault-muted">
          Top clients by lifetime value
        </p>
        <div>
          {topClients.map(({ client, ltv, tenure }, i) => (
            <motion.div
              key={client.id}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)] items-center gap-3 border-b border-vault-border/50 py-3 last:border-0"
            >
              <span className="truncate text-[14px] font-medium text-white">
                {client.name}
              </span>
              <span className="truncate text-[12px] uppercase tracking-[0.08em] text-vault-muted">
                {client.tier}
              </span>
              <span className="tnum text-[14px] text-white">{formatHKD(ltv)}</span>
              <span className="tnum text-right text-[12px] text-vault-faint">
                {tenure} mo
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
