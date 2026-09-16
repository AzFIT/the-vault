import { useMemo, useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { motion } from 'framer-motion'
import { AnimatedNumber, SectionCard, VIZ } from './shared'
import type { RangeKey } from './analyticsData'
import { macroAverages, macroTargets } from './analyticsData'

/* ── Card A — donut ────────────────────────────────────────── */
export function MacroDonut({ range }: { range: RangeKey }) {
  const m = useMemo(() => macroAverages(range), [range])
  const [active, setActive] = useState<number | null>(null)

  const total = m.proteinKcal + m.carbsKcal + m.fatKcal
  const data = [
    { name: 'Protein', grams: m.proteinG, kcal: m.proteinKcal, pct: Math.round((m.proteinKcal / total) * 100), color: VIZ[1] },
    { name: 'Carbs', grams: m.carbsG, kcal: m.carbsKcal, pct: Math.round((m.carbsKcal / total) * 100), color: VIZ[2] },
    { name: 'Fat', grams: m.fatG, kcal: m.fatKcal, pct: Math.round((m.fatKcal / total) * 100), color: VIZ[3] },
  ]

  return (
    <SectionCard eyebrow="Nutrition" title="Macro split — average">
      <div className="flex flex-col items-center gap-6 sm:flex-row">
        <div className="relative h-[220px] w-[220px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="kcal"
                nameKey="name"
                innerRadius={79}
                outerRadius={101}
                paddingAngle={4}
                cornerRadius={6}
                strokeWidth={0}
                isAnimationActive
                animationDuration={1000}
                onMouseEnter={(_, i) => setActive(i)}
                onMouseLeave={() => setActive(null)}
              >
                {data.map((d, i) => (
                  <Cell
                    key={d.name}
                    fill={d.color}
                    opacity={active === null || active === i ? 1 : 0.4}
                    style={{
                      transform: active === i ? 'scale(1.04)' : 'scale(1)',
                      transformOrigin: 'center',
                      transition: 'opacity 0.25s ease, transform 0.25s ease',
                    }}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <AnimatedNumber value={m.calories} className="text-[26px] font-bold text-white" />
            <span className="text-[11px] uppercase tracking-[0.14em] text-vault-muted">kcal avg/day</span>
          </div>
        </div>

        <div className="w-full space-y-3">
          {data.map((d) => (
            <div key={d.name} className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 shrink-0" style={{ background: d.color }} aria-hidden />
              <span className="w-16 text-[13px] text-white">{d.name}</span>
              <span className="tnum flex-1 text-right text-[13px] text-vault-muted">{d.grams} g</span>
              <span className="tnum w-10 text-right text-[13px] font-medium text-white">{d.pct}%</span>
            </div>
          ))}
          <p className="pt-1 text-[12px] text-vault-faint">By calories, averaged across the selected range.</p>
        </div>
      </div>
    </SectionCard>
  )
}

/* ── Card B — bullet bars vs targets ───────────────────────── */
export function MacroBullets({ range }: { range: RangeKey }) {
  const m = useMemo(() => macroAverages(range), [range])

  const rows = [
    { label: 'Calories', avg: m.calories, target: macroTargets.calories, unit: '' },
    { label: 'Protein', avg: m.proteinG, target: macroTargets.proteinG, unit: 'g' },
    { label: 'Carbs', avg: m.carbsG, target: macroTargets.carbsG, unit: 'g' },
    { label: 'Fat', avg: m.fatG, target: macroTargets.fatG, unit: 'g' },
  ]

  return (
    <SectionCard eyebrow="Nutrition" title="Daily averages vs targets">
      <div className="space-y-6 pt-2">
        {rows.map((r, i) => {
          const scale = Math.max(r.avg, r.target) * 1.15
          const fillPct = Math.min(100, (r.avg / scale) * 100)
          const tickPct = Math.min(100, (r.target / scale) * 100)
          const hitPct = Math.round((r.avg / r.target) * 100)
          return (
            <div key={`${range}-${r.label}`}>
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-[13px] text-white">{r.label}</span>
                <span className="tnum text-[12px] text-vault-muted">
                  {r.avg.toLocaleString()}
                  {r.unit} / {r.target.toLocaleString()}
                  {r.unit} · <span className="text-white">{hitPct}%</span>
                </span>
              </div>
              <div className="relative h-2 w-full rounded-full" style={{ background: VIZ.track }}>
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${fillPct}%` }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
                  className="h-full rounded-full bg-white"
                />
                {/* target tick */}
                <span
                  className="absolute top-[-3px] h-[14px] w-[2px] bg-white"
                  style={{ left: `${tickPct}%` }}
                  aria-hidden
                />
              </div>
            </div>
          )
        })}
      </div>
      <p className="mt-6 text-[12px] text-vault-faint">White bar = actual average · tick = daily target.</p>
    </SectionCard>
  )
}
