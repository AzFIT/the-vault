import { useEffect } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { dailyLogs, formatDate, formatWeekdayDate, getLogByDate } from './analyticsData'
import { macroTargets } from '@/data/mock'
import type { DayLog } from '@/data/mock'

function StatRow({ label, value, meta }: { label: string; value: string; meta?: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-vault-border/60 py-2.5 last:border-0">
      <span className="text-[12px] uppercase tracking-[0.14em] text-vault-muted">{label}</span>
      <span className="tnum text-right text-[15px] text-white">
        {value}
        {meta && <span className="ml-2 text-[12px] text-vault-faint">{meta}</span>}
      </span>
    </div>
  )
}

function DrawerBody({ log, onNav }: { log: DayLog; onNav: (date: string) => void }) {
  const idx = dailyLogs.findIndex((l) => l.date === log.date)
  const prev = dailyLogs[idx - 1]
  const next = dailyLogs[idx + 1]

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-vault-border p-5">
        <p className="eyebrow">Daily Log</p>
        <div className="mt-1 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">{formatWeekdayDate(log.date)}</h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => prev && onNav(prev.date)}
              disabled={!prev}
              aria-label="Previous day"
              className="p-1.5 text-vault-muted transition-colors hover:text-white disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => next && onNav(next.date)}
              disabled={!next}
              aria-label="Next day"
              className="p-1.5 text-vault-muted transition-colors hover:text-white disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <p className="mt-0.5 text-[12px] text-vault-faint">{formatDate(log.date)}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <p className="eyebrow mb-2">Body & Recovery</p>
        <StatRow label="Weight" value={`${log.weightKg} kg`} />
        <StatRow label="Steps" value={log.steps.toLocaleString()} meta={log.steps >= 9000 ? 'target hit' : `< 9,000`} />
        <StatRow label="Sleep" value={`${log.sleepHrs} h`} meta={log.sleepHrs >= 7 ? 'on target' : 'below 7 h'} />

        <p className="eyebrow mb-2 mt-6">Nutrition</p>
        <StatRow label="Calories" value={log.calories.toLocaleString()} meta={`/ ${macroTargets.calories}`} />
        <StatRow label="Protein" value={`${log.proteinG} g`} meta={`/ ${macroTargets.proteinG} g`} />
        <StatRow label="Carbs" value={`${log.carbsG} g`} meta={`/ ${macroTargets.carbsG} g`} />
        <StatRow label="Fat" value={`${log.fatG} g`} meta={`/ ${macroTargets.fatG} g`} />

        <p className="eyebrow mb-2 mt-6">Workout</p>
        {log.workout ? (
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-[15px] font-medium text-white">{log.workout.type}</span>
              <span className="tnum text-[12px] text-vault-muted">{log.workout.durationMin} min</span>
            </div>
            <table className="tnum w-full text-[13px]">
              <tbody>
                {log.workout.exercises.map((e) => (
                  <tr key={e.exercise} className="border-b border-vault-border/60 last:border-0">
                    <td className="py-2 pr-2 text-white">
                      {e.exercise}
                      {e.isPR && (
                        <span className="ml-2 bg-white px-1.5 py-px text-[9px] font-medium uppercase tracking-[0.1em] text-vault-btn-text">
                          PR
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-right text-vault-muted">
                      {e.sets} × {e.reps}
                      {e.weightKg > 0 ? ` · ${e.weightKg} kg` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[13px] text-vault-muted">Rest day — no session logged.</p>
        )}

        <p className="eyebrow mb-2 mt-6">Notes</p>
        <p className="text-[13px] leading-relaxed text-vault-muted">
          {log.workout
            ? `${log.workout.type.toLowerCase()} session at The Vault. ${log.sleepHrs >= 7 ? 'Well recovered going in.' : 'Sleep was short — kept RPE moderate.'}`
            : 'Recovery day. Focus on steps, protein and sleep ahead of the next session.'}
        </p>
      </div>

      <div className="border-t border-vault-border p-5">
        <Link to="/sheets" className="btn-ghost group text-[13px]">
          Edit in Sheets
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  )
}

export default function DayDrawer({
  date,
  onClose,
  onNav,
}: {
  date: string | null
  onClose: () => void
  onNav: (date: string) => void
}) {
  // ESC closes the drawer
  useEffect(() => {
    if (!date) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [date, onClose])

  const log = date ? getLogByDate(date) : undefined
  return (
    <AnimatePresence>
      {log && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[68] bg-black/50"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: 440 }}
            animate={{ x: 0 }}
            exit={{ x: 440 }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            className="fixed inset-y-0 right-0 z-[69] w-[min(420px,100vw)] border-l border-vault-border bg-vault-surface"
            role="dialog"
            aria-modal="true"
            aria-label="Day log"
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 z-10 text-vault-muted transition-colors hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <DrawerBody log={log} onNav={onNav} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
