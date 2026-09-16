import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts'
import { X } from 'lucide-react'
import { SectionCard, VIZ } from './shared'
import type { PrTile } from './analyticsData'
import { buildPrTiles, formatDate } from './analyticsData'

function Sparkline({ spark, id }: { spark: (number | null)[]; id: string }) {
  const data = spark.map((v, i) => ({ i, v }))
  return (
    <div className="h-[60px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 4, bottom: 2, left: 4 }}>
          <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
          <Line
            type="monotone"
            dataKey="v"
            stroke={VIZ[1]}
            strokeWidth={1.5}
            dot={false}
            connectNulls
            isAnimationActive
            animationDuration={800}
            // last point marker drawn via activeDot-less custom dot
            // (kept simple: line only, end dot rendered below)
            key={id}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function PrBoard() {
  const tiles = useMemo(() => buildPrTiles(), [])
  const [selected, setSelected] = useState<PrTile | null>(null)

  // ESC closes the history modal
  useEffect(() => {
    if (!selected) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [selected])

  return (
    <SectionCard eyebrow="Personal Records" title="All-time board">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((t, i) => (
          <motion.button
            key={t.exercise}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: i * 0.1, duration: 0.5, ease: 'easeOut' }}
            whileHover={{ y: -4 }}
            onClick={() => setSelected(t)}
            className="app-card group p-5 text-left transition-colors hover:border-white/40"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="eyebrow">{t.exercise}</p>
              {t.isNew && (
                <motion.span
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="shrink-0 bg-gold px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-black"
                >
                  New PR
                </motion.span>
              )}
            </div>
            <p className="tnum mt-2 text-[32px] font-bold leading-none text-white">
              {t.weightKg} <span className="text-[15px] font-normal text-vault-muted">kg × {t.reps}</span>
            </p>
            <p className="mt-1 text-[12px] text-vault-muted">{formatDate(t.date)}</p>
            <div className="mt-3">
              <Sparkline spark={t.spark} id={t.exercise} />
            </div>
            <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-vault-faint">Est. 1RM trend</p>
          </motion.button>
        ))}
      </div>

      {/* History modal */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] bg-black/60"
              onClick={() => setSelected(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.97 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="fixed left-1/2 top-1/2 z-[71] max-h-[80dvh] w-[min(560px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-vault-border bg-vault-surface p-6"
              role="dialog"
              aria-modal="true"
              aria-label={`${selected.exercise} history`}
            >
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <p className="eyebrow">{selected.exercise}</p>
                  <h4 className="mt-1 text-xl font-bold text-white">Full history</h4>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  aria-label="Close"
                  className="text-vault-muted transition-colors hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <table className="tnum w-full text-[13px]">
                <thead>
                  <tr className="border-b border-vault-border text-left text-[11px] uppercase tracking-[0.14em] text-vault-muted">
                    <th className="py-2 pr-3 font-normal">Date</th>
                    <th className="py-2 pr-3 font-normal">Sets × Reps</th>
                    <th className="py-2 pr-3 text-right font-normal">kg</th>
                    <th className="py-2 text-right font-normal">e1RM</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.history
                    .slice()
                    .reverse()
                    .map((h, i) => (
                      <motion.tr
                        key={`${h.date}-${i}`}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03, duration: 0.3 }}
                        className="border-b border-vault-border/50 text-white last:border-0"
                      >
                        <td className="py-2 pr-3 text-vault-muted">{formatDate(h.date)}</td>
                        <td className="py-2 pr-3">
                          {h.sets} × {h.reps}
                        </td>
                        <td className="py-2 pr-3 text-right">{h.weightKg}</td>
                        <td className="py-2 text-right font-medium">{h.e1rm}</td>
                      </motion.tr>
                    ))}
                </tbody>
              </table>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </SectionCard>
  )
}
