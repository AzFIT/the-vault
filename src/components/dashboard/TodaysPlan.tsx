/**
 * Today's plan checklist — dashboard.md §3. Rows derive from the shared mock
 * store's planned session (the same rows edited in Sheets → Workouts), so
 * completing/editing sets in Sheets reflects here on navigation.
 *
 * Each exercise row has a collapsible toggle (chevron) that expands into a
 * per-set breakdown — one row per set in the prescription ("4×6 @ 61.5kg"
 * → 4 set rows). Per-set done ticks write through to the shared store, so
 * ticking every set also ticks the exercise (isExerciseDone falls back to
 * "all sets done" when there's no checklist override).
 *
 * A square maximize button in the card header projects the whole plan into
 * a fullscreen overlay (ESC or the minimize button closes it).
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Check, ChevronDown, Maximize2, Minimize2 } from 'lucide-react'
import { prBoard } from '@/data/mock'
import {
  PLANNED_SESSION_KEY,
  formatDayShort,
  getSessionRows,
  isExerciseDone,
  plannedSessionDate,
  useVault,
  vaultActions,
  type SetRow,
} from '@/components/sheets/store'

/** Expanded per-set table for one exercise — one row per set in the plan. */
function SetBreakdown({ rows }: { rows: SetRow[] }) {
  return (
    <div className="mt-2 border border-vault-border/60 bg-white/[0.02] px-3 py-2">
      <div className="grid grid-cols-[2.5rem_1fr_1fr_3rem_2rem] items-center gap-2 pb-1 text-[10px] uppercase tracking-[0.12em] text-vault-muted">
        <span>Set</span>
        <span>Reps</span>
        <span>Load</span>
        <span className="text-right">RPE</span>
        <span className="text-right">Done</span>
      </div>
      <ul className="divide-y divide-vault-border/40">
        {rows.map((row) => (
          <li
            key={row.id}
            className="grid grid-cols-[2.5rem_1fr_1fr_3rem_2rem] items-center gap-2 py-1.5 text-[13px] tabular-nums"
          >
            <span className="text-vault-muted">{row.set}</span>
            <span className={row.done ? 'text-white/40 line-through' : 'text-white'}>{row.reps}</span>
            <span className={row.done ? 'text-white/40 line-through' : 'text-white'}>
              {row.kg > 0 ? `${row.kg} kg` : '—'}
            </span>
            <span className={`text-right ${row.done ? 'text-white/40' : 'text-vault-muted'}`}>
              {row.rpe > 0 ? row.rpe : '—'}
            </span>
            <span className="flex justify-end">
              <button
                type="button"
                role="checkbox"
                aria-checked={row.done}
                aria-label={`Mark set ${row.set} of ${row.exercise} done`}
                onClick={() => vaultActions.updateSetRow(PLANNED_SESSION_KEY, row.id, { done: !row.done })}
                className={`flex h-4 w-4 items-center justify-center border transition-colors ${
                  row.done ? 'border-white bg-white' : 'border-white/50 bg-transparent hover:border-white'
                }`}
              >
                {row.done && <Check className="h-3 w-3 text-vault-bg" strokeWidth={3} />}
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

type ExerciseGroup = { name: string; sets: number; reps: number; kg: number }

/** The exercise checklist — shared between the card and the fullscreen view. */
function PlanExercises({
  exercises,
  rowsByExercise,
  open,
  onToggle,
}: {
  exercises: ExerciseGroup[]
  rowsByExercise: Map<string, SetRow[]>
  open: string | null
  onToggle: (name: string) => void
}) {
  const vault = useVault()
  const latestPR = prBoard()[0]
  return (
    <ul className="mt-5 divide-y divide-vault-border/60">
      {exercises.map((ex, i) => {
        const done = isExerciseDone(vault, PLANNED_SESSION_KEY, ex.name)
        const isPR = latestPR?.exercise === ex.name
        const expanded = open === ex.name
        return (
          <motion.li
            key={ex.name}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.15 + i * 0.05, ease: 'easeOut' }}
            className="py-3"
          >
            <div className="flex items-center gap-4">
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
              <button
                type="button"
                aria-expanded={expanded}
                aria-label={expanded ? `Collapse sets for ${ex.name}` : `Show sets for ${ex.name}`}
                onClick={() => onToggle(ex.name)}
                className="flex h-6 w-6 shrink-0 items-center justify-center border border-vault-border/70 text-vault-muted transition-colors hover:border-white hover:text-white"
              >
                <motion.span
                  animate={{ rotate: expanded ? 180 : 0 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="flex"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </motion.span>
              </button>
            </div>

            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  key="set-breakdown"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <SetBreakdown rows={rowsByExercise.get(ex.name) ?? []} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.li>
        )
      })}
    </ul>
  )
}

/** Progress bar + "Open in Sheets" — shared footer of card and fullscreen. */
function PlanProgress({ doneCount, total }: { doneCount: number; total: number }) {
  const frac = total ? doneCount / total : 0
  return (
    <div className="mt-5 flex items-center gap-4">
      <span className="text-[13px] text-vault-muted tabular-nums">
        {doneCount} of {total} complete
      </span>
      <div className="h-1 flex-1 overflow-hidden" style={{ background: 'var(--viz-track)' }}>
        <motion.div
          className="h-full bg-white"
          initial={false}
          animate={{ width: `${frac * 100}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
      <Link to="/sheets?tab=workouts" className="btn-ghost shrink-0">
        Open in Sheets <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}

export default function TodaysPlan() {
  const vault = useVault()
  const rows = getSessionRows(vault, PLANNED_SESSION_KEY)
  const [open, setOpen] = useState<string | null>(null)
  const [fullscreen, setFullscreen] = useState(false)

  // ESC closes the fullscreen overlay
  useEffect(() => {
    if (!fullscreen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fullscreen])

  // Group set rows by exercise, preserving order
  const exercises: ExerciseGroup[] = []
  const rowsByExercise = new Map<string, SetRow[]>()
  for (const r of rows) {
    const ex = exercises.find((e) => e.name === r.exercise)
    if (ex) ex.sets += 1
    else exercises.push({ name: r.exercise, sets: 1, reps: r.reps, kg: r.kg })
    const list = rowsByExercise.get(r.exercise)
    if (list) list.push(r)
    else rowsByExercise.set(r.exercise, [r])
  }

  const doneCount = exercises.filter((e) => isExerciseDone(vault, PLANNED_SESSION_KEY, e.name)).length

  const headerRight = (
    <p className="text-[13px] text-vault-muted">
      Next up · {formatDayShort(plannedSessionDate)} 6:30am · with Dan Kan
    </p>
  )

  const toggle = (name: string) => setOpen((o) => (o === name ? null : name))

  return (
    <section className="app-card p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">Today's plan</p>
          <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-xl font-bold">Upper Body Strength — Day 2</h3>
            {headerRight}
          </div>
        </div>
        <button
          type="button"
          aria-label="Expand today's plan to fullscreen"
          aria-expanded={fullscreen}
          onClick={() => setFullscreen(true)}
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center border border-vault-border/70 text-vault-faint transition-colors hover:border-white hover:text-white"
        >
          <Maximize2 className="h-3.5 w-3.5" strokeWidth={1.75} />
        </button>
      </div>

      <PlanExercises exercises={exercises} rowsByExercise={rowsByExercise} open={open} onToggle={toggle} />
      <PlanProgress doneCount={doneCount} total={exercises.length} />

      {/* Fullscreen overlay */}
      <AnimatePresence>
        {fullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 overflow-y-auto bg-vault-bg p-6 md:p-10"
            role="dialog"
            aria-modal="true"
            aria-label="Today's plan — fullscreen"
          >
            <div className="mx-auto max-w-3xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">Today's plan</p>
                  <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <h3 className="text-2xl font-bold md:text-3xl">Upper Body Strength — Day 2</h3>
                    {headerRight}
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Exit fullscreen"
                  onClick={() => setFullscreen(false)}
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center border border-vault-border/70 text-vault-faint transition-colors hover:border-white hover:text-white"
                >
                  <Minimize2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              </div>

              <PlanExercises exercises={exercises} rowsByExercise={rowsByExercise} open={open} onToggle={toggle} />
              <PlanProgress doneCount={doneCount} total={exercises.length} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
