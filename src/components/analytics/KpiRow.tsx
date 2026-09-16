import { motion } from 'framer-motion'
import { AnimatedNumber } from './shared'
import type { Kpis, RangeKey } from './analyticsData'
import { rangeWeeks } from './analyticsData'

export default function KpiRow({ kpis, range }: { kpis: Kpis; range: RangeKey }) {
  const weeks = rangeWeeks(range)
  const cards = [
    {
      label: 'Body Weight',
      value: <AnimatedNumber value={kpis.weight} decimals={1} suffix=" kg" className="text-[34px] font-bold" />,
      delta: `${kpis.weightDelta <= 0 ? '−' : '+'}${Math.abs(kpis.weightDelta).toFixed(1)} kg in ${weeks} weeks`,
    },
    {
      label: 'Total Volume',
      value: <AnimatedNumber value={kpis.totalVolume} suffix=" kg" className="text-[34px] font-bold" />,
      delta: `${kpis.volumeDeltaPct >= 0 ? '+' : ''}${kpis.volumeDeltaPct}% vs previous ${weeks} weeks`,
    },
    {
      label: 'Adherence',
      value: <AnimatedNumber value={kpis.adherencePct} suffix="%" className="text-[34px] font-bold" />,
      delta: `${kpis.sessionsDone} of ${kpis.sessionsPlanned} planned sessions`,
    },
    {
      label: 'Current Streak',
      value: <AnimatedNumber value={kpis.streak} suffix={kpis.streak === 1 ? ' day' : ' days'} className="text-[34px] font-bold" />,
      delta: `Best: ${kpis.bestStreak} days`,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      {cards.map((c, i) => (
        <motion.div
          key={`${range}-${c.label}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08, duration: 0.5, ease: 'easeOut' }}
          className="app-card p-5"
        >
          <p className="eyebrow">{c.label}</p>
          <div className="mt-2 text-white">{c.value}</div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 + i * 0.08, duration: 0.5 }}
            className="mt-1 text-[13px] text-viz-2"
          >
            {c.delta}
          </motion.p>
        </motion.div>
      ))}
    </div>
  )
}
