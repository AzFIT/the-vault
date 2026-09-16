/**
 * Analytics derivations — everything computed from src/data/mock.ts
 * (the single source of truth). No parallel data source.
 */
import {
  LOG_END_DATE,
  LOG_WEEKS,
  dailyLogs,
  demoClient,
  macroTargets,
} from '@/data/mock'
import type { DayLog } from '@/data/mock'

export type RangeKey = '4W' | '8W' | '16W' | 'ALL'
export const RANGE_OPTIONS: RangeKey[] = ['4W', '8W', '16W', 'ALL']
export const rangeWeeks = (r: RangeKey): number => (r === 'ALL' ? LOG_WEEKS : parseInt(r, 10))

/** Week indices (0-based, oldest first) covered by a range */
export const weeksInRange = (r: RangeKey): number[] => {
  const n = rangeWeeks(r)
  return Array.from({ length: n }, (_, i) => LOG_WEEKS - n + i)
}

export const logsForWeekIdx = (w: number): DayLog[] => dailyLogs.slice(w * 7, w * 7 + 7)

const avg = (ns: number[]) => (ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : 0)
const r1 = (n: number) => Math.round(n * 10) / 10

/* ── Weight trend ──────────────────────────────────────────── */
export interface WeekPoint {
  week: number
  label: string
  actual: number
  trend: number
  target: number
  /** representative date (last day of week) for the drawer */
  date: string
}

export function weightPoints(range: RangeKey): WeekPoint[] {
  // 7-day moving average over the whole daily series (sampled at week end)
  const ma7: number[] = dailyLogs.map((_, i) => {
    const window = dailyLogs.slice(Math.max(0, i - 6), i + 1)
    return avg(window.map((l) => l.weightKg))
  })
  const start = demoClient.startWeightKg
  const goal = demoClient.targetWeightKg
  return weeksInRange(range).map((w) => {
    const logs = logsForWeekIdx(w)
    const t = w / (LOG_WEEKS - 1)
    return {
      week: w + 1,
      label: `W${w + 1}`,
      actual: r1(avg(logs.map((l) => l.weightKg))),
      trend: r1(ma7[w * 7 + 6]),
      target: r1(start + (goal - start) * t),
      date: logs[logs.length - 1].date,
    }
  })
}

/* ── Volume ────────────────────────────────────────────────── */
export interface WeekVolume {
  week: number
  label: string
  volume: number
  sessions: number
}

export const volumeOfLog = (l: DayLog): number =>
  l.workout ? l.workout.exercises.reduce((s, e) => s + e.sets * e.reps * e.weightKg, 0) : 0

export function volumePoints(range: RangeKey): WeekVolume[] {
  return weeksInRange(range).map((w) => {
    const logs = logsForWeekIdx(w)
    return {
      week: w + 1,
      label: `W${w + 1}`,
      volume: Math.round(logs.reduce((s, l) => s + volumeOfLog(l), 0)),
      sessions: logs.filter((l) => l.workout).length,
    }
  })
}

/* ── Macros ────────────────────────────────────────────────── */
export interface MacroAverages {
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
  /** kcal shares for the donut */
  proteinKcal: number
  carbsKcal: number
  fatKcal: number
}

export function macroAverages(range: RangeKey): MacroAverages {
  const logs = weeksInRange(range).flatMap(logsForWeekIdx)
  const calories = Math.round(avg(logs.map((l) => l.calories)))
  const proteinG = Math.round(avg(logs.map((l) => l.proteinG)))
  const carbsG = Math.round(avg(logs.map((l) => l.carbsG)))
  const fatG = Math.round(avg(logs.map((l) => l.fatG)))
  return { calories, proteinG, carbsG, fatG, proteinKcal: proteinG * 4, carbsKcal: carbsG * 4, fatKcal: fatG * 9 }
}

/* ── KPIs ──────────────────────────────────────────────────── */
export interface Kpis {
  weight: number
  weightDelta: number
  totalVolume: number
  volumeDeltaPct: number
  adherencePct: number
  sessionsDone: number
  sessionsPlanned: number
  streak: number
  bestStreak: number
}

const isActiveDay = (l: DayLog) => !!l.workout || l.steps >= 8000
const PLANNED_DOW = [1, 2, 4, 6] // Mon / Tue / Thu / Sat split in mock.ts

export function computeKpis(range: RangeKey): Kpis {
  const weeks = weeksInRange(range)
  const logs = weeks.flatMap(logsForWeekIdx)
  const allLogs = dailyLogs

  let planned = 0
  let done = 0
  for (const l of logs) {
    const dow = new Date(`${l.date}T00:00:00`).getDay()
    if (PLANNED_DOW.includes(dow)) {
      planned++
      if (l.workout) done++
    }
  }

  // streaks computed over the full series
  let best = 0
  let run = 0
  for (const l of allLogs) {
    if (isActiveDay(l)) {
      run++
      best = Math.max(best, run)
    } else run = 0
  }
  let current = 0
  for (let i = allLogs.length - 1; i >= 0; i--) {
    if (isActiveDay(allLogs[i])) current++
    else break
  }

  const totalVolume = Math.round(logs.reduce((s, l) => s + volumeOfLog(l), 0))
  // previous equal-length window for the volume delta
  const n = rangeWeeks(range) * 7
  const endIdx = weeks[0] * 7
  const prev = dailyLogs.slice(Math.max(0, endIdx - n), endIdx)
  const prevVol = prev.reduce((s, l) => s + volumeOfLog(l), 0)
  const volumeDeltaPct = prevVol > 0 ? Math.round(((totalVolume - prevVol) / prevVol) * 100) : 0

  return {
    weight: logs[logs.length - 1].weightKg,
    weightDelta: r1(logs[logs.length - 1].weightKg - logs[0].weightKg),
    totalVolume,
    volumeDeltaPct,
    adherencePct: planned ? Math.round((done / planned) * 100) : 0,
    sessionsDone: done,
    sessionsPlanned: planned,
    streak: current,
    bestStreak: best,
  }
}

/* ── Heatmap ───────────────────────────────────────────────── */
/** 0 rest/base · 1 logged only · 2 trained · 3 trained+nutrition · 4 perfect */
export function cellLevel(l: DayLog): 0 | 1 | 2 | 3 | 4 {
  const trained = !!l.workout
  const nutrition = l.proteinG >= macroTargets.proteinG
  const stepsHit = l.steps >= 9000
  if (trained && nutrition && stepsHit) return 4
  if (trained && nutrition) return 3
  if (trained) return 2
  return 1
}

export function heatmapSummary(): { adherencePct: number; sessions: number; longestStreak: number } {
  let sessions = 0
  let planned = 0
  for (const l of dailyLogs) {
    const dow = new Date(`${l.date}T00:00:00`).getDay()
    if (PLANNED_DOW.includes(dow)) {
      planned++
      if (l.workout) sessions++
    }
  }
  let best = 0
  let run = 0
  for (const l of dailyLogs) {
    if (isActiveDay(l)) {
      run++
      best = Math.max(best, run)
    } else run = 0
  }
  return {
    adherencePct: planned ? Math.round((sessions / planned) * 100) : 0,
    sessions,
    longestStreak: best,
  }
}

/* ── PR board ──────────────────────────────────────────────── */
export interface PrHistoryEntry {
  date: string
  sets: number
  reps: number
  weightKg: number
  e1rm: number
}

export interface PrTile {
  exercise: string
  weightKg: number
  reps: number
  date: string
  isNew: boolean
  /** weekly best estimated 1RM, oldest → newest (null = not trained) */
  spark: (number | null)[]
  history: PrHistoryEntry[]
}

const e1rm = (w: number, r: number) => r1(w * (1 + r / 30))
const PR_EXERCISES = ['Deadlift', 'Bench Press', 'Back Squat', 'Hip Thrust']

export function buildPrTiles(): PrTile[] {
  return PR_EXERCISES.map((exercise) => {
    const history: PrHistoryEntry[] = []
    const spark: (number | null)[] = []
    for (let w = 0; w < LOG_WEEKS; w++) {
      let bestE: number | null = null
      for (const l of logsForWeekIdx(w)) {
        if (!l.workout) continue
        for (const e of l.workout.exercises) {
          if (e.exercise !== exercise || e.weightKg <= 0) continue
          const est = e1rm(e.weightKg, e.reps)
          history.push({ date: l.date, sets: e.sets, reps: e.reps, weightKg: e.weightKg, e1rm: est })
          bestE = bestE === null ? est : Math.max(bestE, est)
        }
      }
      spark.push(bestE)
    }
    const pr = history.reduce((a, b) => (b.weightKg > a.weightKg ? b : a), history[0])
    const daysSince = Math.round(
      (new Date(`${LOG_END_DATE}T00:00:00`).getTime() - new Date(`${pr.date}T00:00:00`).getTime()) / 86400000,
    )
    return { exercise, weightKg: pr.weightKg, reps: pr.reps, date: pr.date, isNew: daysSince <= 14, spark, history }
  })
}

/* ── Insight strip ─────────────────────────────────────────── */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function buildInsights(): string[] {
  // 1 — deadlift progression
  const deads: { date: string; w: number }[] = []
  for (const l of dailyLogs) {
    for (const e of l.workout?.exercises ?? []) {
      if (e.exercise === 'Deadlift') deads.push({ date: l.date, w: e.weightKg })
    }
  }
  const first = deads[0]
  const last = deads[deads.length - 1]
  const month = MONTHS[new Date(`${first.date}T00:00:00`).getMonth()]
  const i1 = `Your deadlift is up ${r1(last.w - first.w)} kg since ${month} — the strength block is working.`

  // 2 — protein vs target
  const avgP = Math.round(avg(dailyLogs.map((l) => l.proteinG)))
  const diff = macroTargets.proteinG - avgP
  const i2 =
    diff > 0
      ? `Protein averages ${avgP} g — ${diff} g under target. Front-load it at breakfast.`
      : `Protein averages ${avgP} g — ${-diff} g over target. Hold the line.`

  // 3 — best weekday by volume + completion
  const byDow = Array.from({ length: 7 }, () => ({ volume: 0, done: 0, planned: 0 }))
  for (const l of dailyLogs) {
    const dow = new Date(`${l.date}T00:00:00`).getDay()
    if (PLANNED_DOW.includes(dow)) {
      byDow[dow].planned++
      if (l.workout) {
        byDow[dow].done++
        byDow[dow].volume += volumeOfLog(l)
      }
    }
  }
  let bestDow = 1
  for (let d = 0; d < 7; d++) if (byDow[d].volume > byDow[bestDow].volume) bestDow = d
  const completion = byDow[bestDow].planned ? Math.round((byDow[bestDow].done / byDow[bestDow].planned) * 100) : 0
  const i3 = `You train best on ${WEEKDAYS[bestDow]}s: highest volumes and ${completion}% session completion.`

  return [i1, i2, i3]
}

export const formatDate = (iso: string): string => {
  const d = new Date(`${iso}T00:00:00`)
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`
}

export const formatWeekdayDate = (iso: string): string => {
  const d = new Date(`${iso}T00:00:00`)
  return `${WEEKDAYS[d.getDay()].slice(0, 3)} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`
}

export const getLogByDate = (iso: string): DayLog | undefined => dailyLogs.find((l) => l.date === iso)

export { macroTargets, LOG_WEEKS, dailyLogs }
