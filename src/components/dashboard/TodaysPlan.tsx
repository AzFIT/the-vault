/**
 * Today's plan checklist — dashboard.md §3. Rows derive from the shared mock
 * store's planned session (the same rows edited in Sheets → Workouts), so
 * completing/editing sets in Sheets reflects here on navigation.
 */
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowRight, Check } from 'lucide-react'
import { prBoard } from '@/data/mock'
import {
  PLANNED_SESSION_KEY,
  formatDayShort,
  getSessionRows,
  isExerciseDone,
  plannedSessionDate,
  useVault,
  vaultActions,
} from '@/components/sheets/store'

export default function TodaysPlan() {
  const vault = useVault()
  const rows = getSessionRows(vault, PLANNED_SESSION_KEY)

  // Group set rows by exercise, preserving order
  const exercises: { name: string; sets: number; reps: number; kg: number }[] = []
  for (const r of rows) {
    const ex = exercises.find((e) => e.name === r.exercise)
    if (ex) ex.sets += 1
    else exercises.push({ name: r.exercise, sets: 1, reps: r.reps, kg: r.kg })
  }

  const latestPR = prBoard()[0]
  const doneCount = exercises.filter((e) => isExerciseDone(vault, PLANNED_SESSION_KEY, e.name)).length
  const frac = exercises.length ? doneCount / exercises.length : 0

  return (
    <section className="app-card p-6">
      <p className="eyebrow">Today's plan</p>
      <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xl font-bold">Upper Body Strength — Day 2</h3>
        <p className="text-[13px] text-vault-muted">
          Next up · {formatDayShort(plannedSessionDate)} 6:30am · with Dan Kan
        </p>
      </div>

      <ul className="mt-5 divide-y divide-vault-border/60">
        {exercises.map((ex, i) => {
          const done = isExerciseDone(vault, PLANNED_SESSION_KEY, ex.name)
          const isPR = latestPR?.exercise === ex.name
          return (
            <motion.li
              key={ex.name}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: 0.15 + i * 0.05, ease: 'easeOut' }}
              className="flex items-center gap-4 py-3"
            >
              <button
                type="button"
                role="checkbox"
                aria-checked={done}
                aria-label={`Mark ${ex.name} complete`}
                onClick={() => vaultActions.toggleChecklist(PLANNED_SESSION_KEY, ex.name, !done)}
                className={`flex h-5 w-5 shrink-0 items-center justify-center border transition-colors ${
                  done ? 'border-white bg-white' : 'border-white/70 bg-transparent hover:border-white'
                }`}
              >
                {done && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                  >
                    <Check className="h-3.5 w-3.5 text-vault-bg" strokeWidth={3} />
                  </motion.span>
                )}
              </button>
              <span
                className={`flex-1 text-[15px] transition-all duration-300 ${
                  done ? 'text-white/40 line-through' : 'text-white'
                }`}
              >
                {ex.name}
              </span>
              <span className="text-[13px] text-vault-muted tabular-nums">
                {ex.sets}×{ex.reps}
                {ex.kg > 0 ? ` @ ${ex.kg}kg` : ''}
              </span>
              {isPR && (
                <span className="bg-white px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-vault-btn-text">
                  PR
                </span>
              )}
            </motion.li>
          )
        })}
      </ul>

      <div className="mt-5 flex items-center gap-4">
        <span className="text-[13px] text-vault-muted tabular-nums">
          {doneCount} of {exercises.length} complete
        </span>
        <div className="h-1 flex-1 overflow-hidden" style={{ background: 'var(--viz-track)' }}>
          <motion.div
            className="h-full bg-white"
            initial={false}
            animate={{ width: `${frac * 100}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
        <Link to="/sheets" className="btn-ghost shrink-0">
          Open in Sheets <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  )
}
