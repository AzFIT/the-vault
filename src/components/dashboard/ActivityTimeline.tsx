/**
 * Activity timeline — dashboard.md §4. Derived from the mock 7-day logs:
 * workouts (white filled dot), nutrition (viz-3 dot), rest/other (hollow dot),
 * PT session entries carry a white PR pill.
 */
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { latestLog, logsForDays, planSummary, prBoard } from '@/data/mock'
import type { DayLog } from '@/data/mock'
import { formatDayShort, formatSleep } from '@/components/sheets/store'

type Kind = 'workout' | 'nutrition' | 'recovery' | 'pt' | 'class'

interface Entry {
  key: string
  time: string
  text: string
  badge: string
  kind: Kind
  pr?: boolean
}

const workoutVolume = (l: DayLog): number =>
  Math.round(l.workout?.exercises.reduce((s, e) => s + e.sets * e.reps * e.weightKg, 0) ?? 0)

function buildEntries(): Entry[] {
  const entries: Entry[] = []
  const recent = [...logsForDays(7)].reverse()
  const todayDate = latestLog().date
  const breakfast = planSummary.mealDay[0]

  recent.forEach((l, idx) => {
    const time = idx === 0 ? 'Today' : idx === 1 ? 'Yesterday' : formatDayShort(l.date)
    if (l.date === todayDate && breakfast) {
      entries.push({
        key: `${l.date}-nutrition`,
        time: 'Today 8:15am',
        text: `Logged breakfast: ${breakfast.calories} kcal · ${breakfast.proteinG}g protein`,
        badge: 'Nutrition',
        kind: 'nutrition',
      })
    }
    if (l.workout) {
      if (l.workout.type === 'Hyrox') {
        entries.push({
          key: `${l.date}-class`,
          time,
          text: `Group class: Hyrox · ${l.workout.durationMin} min`,
          badge: 'Class',
          kind: 'class',
        })
      } else {
        entries.push({
          key: `${l.date}-workout`,
          time,
          text: `Completed ${l.workout.type} · ${l.workout.durationMin} min · ${workoutVolume(l).toLocaleString('en-HK')} kg volume`,
          badge: 'Workout',
          kind: 'workout',
        })
      }
    } else {
      entries.push({
        key: `${l.date}-rest`,
        time,
        text: `Rest day · ${l.steps.toLocaleString('en-HK')} steps · ${formatSleep(l.sleepHrs)} sleep`,
        badge: 'Recovery',
        kind: 'recovery',
      })
    }
  })

  const pr = prBoard()[0]
  if (pr) {
    entries.push({
      key: `pr-${pr.date}`,
      time: formatDayShort(pr.date),
      text: `PT session with Dan Kan · ${pr.exercise} PR ${pr.weightKg}kg × ${pr.reps}`,
      badge: 'PT Session',
      kind: 'pt',
      pr: true,
    })
  }

  return entries.slice(0, 8)
}

function Dot({ kind }: { kind: Kind }) {
  if (kind === 'workout' || kind === 'pt')
    return <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-white" />
  if (kind === 'nutrition')
    return <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: 'var(--viz-3)' }} />
  return (
    <span
      className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 bg-transparent"
      style={{ borderColor: 'var(--viz-3)' }}
    />
  )
}

export default function ActivityTimeline() {
  const entries = buildEntries()

  return (
    <section className="app-card p-6">
      <div className="flex items-baseline justify-between">
        <p className="eyebrow">Activity timeline</p>
        <Link to="/analytics" className="btn-ghost text-[11px]">
          View all
        </Link>
      </div>

      <div className="relative mt-5">
        <motion.span
          aria-hidden
          initial={{ scaleY: 0 }}
          whileInView={{ scaleY: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="absolute bottom-2 left-[5px] top-2 w-px origin-top bg-white/20"
        />
        <ul className="space-y-4">
          {entries.map((e, i) => (
            <motion.li
              key={e.key}
              initial={{ opacity: 0, x: 16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.4, delay: i * 0.08, ease: 'easeOut' }}
              className="relative flex gap-4 pl-6"
            >
              <span className="absolute left-0 top-0">
                <Dot kind={e.kind} />
              </span>
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
                <span className="w-32 shrink-0 text-[13px] text-vault-muted tabular-nums">
                  {e.time}
                </span>
                <span className="min-w-0 flex-1 text-[14px] text-white/90">{e.text}</span>
                <span className="border border-vault-border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em] text-vault-muted">
                  {e.badge}
                </span>
                {e.pr && (
                  <span className="bg-white px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-vault-btn-text">
                    PR
                  </span>
                )}
              </div>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  )
}
