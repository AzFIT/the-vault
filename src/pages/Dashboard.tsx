/**
 * Client Dashboard — The Vault app (dashboard.md).
 * Persona: Rachel Cheung. All figures derive from src/data/mock.ts selectors;
 * the plan checklist reads the shared sheets store so Sheets edits show here.
 */
import {
  adherenceForWeek,
  average,
  fitnessScore,
  latestLog,
  logsForDays,
  logsForWeek,
  LOG_WEEKS,
  macroTargets,
  proteinAdherenceForWeek,
} from '@/data/mock'
import GreetingStrip from '@/components/dashboard/GreetingStrip'
import RingCard from '@/components/dashboard/RingCard'
import TodaysPlan from '@/components/dashboard/TodaysPlan'
import CoachColumn from '@/components/dashboard/CoachColumn'
import ActivityTimeline from '@/components/dashboard/ActivityTimeline'
import AchievementsGrid from '@/components/dashboard/AchievementsGrid'
import WeekSnapshot from '@/components/dashboard/WeekSnapshot'
import { formatSleep } from '@/components/sheets/store'

const STEP_TARGET = 9000
const SLEEP_TARGET = 8

/** Same composite as fitnessScore(), computed for an arbitrary week index. */
function scoreForWeek(w: number): number {
  const logs = logsForWeek(w)
  return Math.round(
    0.4 * adherenceForWeek(w) +
      0.25 * Math.min(100, (average(logs.map((l) => l.steps)) / 10000) * 100) +
      0.2 * Math.min(100, (average(logs.map((l) => l.sleepHrs)) / SLEEP_TARGET) * 100) +
      0.15 * proteinAdherenceForWeek(w),
  )
}

/** Symmetric per-target adherence: 100% on target, tapering either side. */
function targetAdherence(actual: number, target: number): number {
  if (target <= 0) return 100
  return Math.min(actual / target, target / actual) * 100
}

export default function Dashboard() {
  const today = latestLog()
  const last7 = logsForDays(7)

  const score = fitnessScore()
  const scoreDelta = score - scoreForWeek(LOG_WEEKS - 2)

  const macroPct = Math.round(
    average([
      targetAdherence(today.calories, macroTargets.calories),
      targetAdherence(today.proteinG, macroTargets.proteinG),
      targetAdherence(today.carbsG, macroTargets.carbsG),
      targetAdherence(today.fatG, macroTargets.fatG),
    ]),
  )
  const macroCal = {
    p: today.proteinG * 4,
    c: today.carbsG * 4,
    f: today.fatG * 9,
  }
  const macroTotal = macroCal.p + macroCal.c + macroCal.f || 1

  const stepsPct = Math.round((today.steps / STEP_TARGET) * 100)
  const sleepPct = Math.round((today.sleepHrs / SLEEP_TARGET) * 100)

  const rings = [
    {
      label: 'Fitness score',
      pct: score,
      centerValue: score,
      formatCenter: (v: number) => String(Math.round(v)),
      caption: `${scoreDelta >= 0 ? '↑' : '↓'} ${Math.abs(scoreDelta)} pts this week`,
      spark: last7.map((l) =>
        Math.round(60 * Math.min(1, l.steps / STEP_TARGET) + 40 * Math.min(1, l.sleepHrs / SLEEP_TARGET)),
      ),
      sparkLabel: 'Daily score',
      formatSpark: (v: number) => String(Math.round(v)),
    },
    {
      label: 'Macros',
      pct: macroPct,
      centerValue: macroPct,
      formatCenter: (v: number) => `${Math.round(v)}%`,
      caption: `${today.calories.toLocaleString('en-HK')} / ${macroTargets.calories.toLocaleString('en-HK')} kcal`,
      spark: last7.map((l) => l.calories),
      sparkLabel: 'Calories',
      formatSpark: (v: number) => `${Math.round(v).toLocaleString('en-HK')}`,
      ticks: [
        { frac: macroCal.p / macroTotal, color: 'var(--viz-2)' },
        { frac: macroCal.c / macroTotal, color: 'var(--viz-3)' },
        { frac: macroCal.f / macroTotal, color: 'var(--viz-4)' },
      ],
    },
    {
      label: 'Steps',
      pct: stepsPct,
      centerValue: today.steps,
      formatCenter: (v: number) => Math.round(v).toLocaleString('en-HK'),
      caption: `Target ${STEP_TARGET.toLocaleString('en-HK')}`,
      spark: last7.map((l) => l.steps),
      sparkLabel: 'Steps',
      formatSpark: (v: number) => Math.round(v).toLocaleString('en-HK'),
    },
    {
      label: 'Sleep',
      pct: sleepPct,
      centerValue: today.sleepHrs,
      formatCenter: (v: number) => formatSleep(v),
      caption: `Target ${SLEEP_TARGET}h · ${sleepPct}% quality`,
      spark: last7.map((l) => l.sleepHrs),
      sparkLabel: 'Sleep (hrs)',
      formatSpark: (v: number) => formatSleep(v),
    },
  ]

  return (
    <div className="space-y-6">
      <GreetingStrip />

      {/* Section 2 — progress rings (hero of the page) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {rings.map((r, i) => (
          <RingCard key={r.label} {...r} delay={0.1 + i * 0.15} />
        ))}
      </div>

      {/* Sections 3–5 — plan + timeline (2/3) beside coach cards + badges (1/3) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <TodaysPlan />
          <ActivityTimeline />
        </div>
        <div className="space-y-6">
          <CoachColumn />
          <AchievementsGrid />
        </div>
      </div>

      {/* Section 6 — week snapshot */}
      <WeekSnapshot />
    </div>
  )
}
