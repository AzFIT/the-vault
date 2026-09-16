/**
 * Shared client-side mock store for The Vault app pages.
 *
 * Wraps the deterministic constants from `@/data/mock` with user edits made
 * in the Tracking Sheets / Dashboard UI. Module-level external store (no
 * backend) consumed via `useSyncExternalStore`, so edits made on `/sheets`
 * are reflected on `/dashboard` when navigating within the session.
 */
import { useSyncExternalStore } from 'react'
import {
  dailyLogs,
  latestLog,
  macroTargets,
  planSummary,
} from '@/data/mock'
import type { DayLog } from '@/data/mock'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DailyEdit {
  weightKg?: number
  steps?: number
  sleepHrs?: number
  calories?: number
  waterL?: number
  energy?: number
  notes?: string
}

export interface SetRow {
  id: string
  exercise: string
  /** set number within the exercise (1-based) */
  set: number
  reps: number
  kg: number
  rpe: number
  done: boolean
}

export interface FoodRow {
  id: string
  meal: string
  food: string
  /** quantity in units; for DB foods 1 unit = 100g */
  qty: number
  /** macros per unit */
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export interface DayEntry {
  date: string
  weightKg: number | null
  steps: number | null
  sleepHrs: number | null
  calories: number | null
  waterL: number
  energy: number
  notes: string
  log: DayLog | undefined
  locked: boolean
}

type SaveState = 'clean' | 'dirty' | 'saved'

export interface VaultState {
  dailyEdits: Record<string, DailyEdit>
  /** session rows keyed by session key (ISO date or PLANNED_SESSION_KEY) */
  workoutEdits: Record<string, SetRow[]>
  /** past sessions unlocked for editing */
  unlocked: Record<string, boolean>
  /** exercise-level checklist overrides, key `${sessionKey}::${exercise}` */
  checklist: Record<string, boolean>
  /** today's nutrition rows (null = not yet customised) */
  foodRows: FoodRow[] | null
  saveState: SaveState
}

// ---------------------------------------------------------------------------
// Deterministic derived defaults (fields mock.ts doesn't carry: water,
// energy, notes) — stable hash of the date so values never change per load.
// ---------------------------------------------------------------------------

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

const NOTE_POOL = [
  'Felt strong on bench',
  'Solid session, legs heavy',
  'Long workday — short walk only',
  'Great sleep, recovery on point',
  'Hungry evening, held target',
  'Hyrox lungs burning',
  'Rest day stretch + walk',
  'Protein on point today',
]

export const defaultWaterL = (date: string): number =>
  Math.round((1.6 + (hashStr(date) % 6) * 0.2) * 10) / 10

export const defaultEnergy = (date: string): number => 3 + (hashStr(`${date}#e`) % 3)

export const defaultNotes = (date: string): string =>
  NOTE_POOL[hashStr(`${date}#n`) % NOTE_POOL.length]

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

/** Key for the upcoming planned session (not yet logged in mock series). */
export const PLANNED_SESSION_KEY = 'planned-upper'

const today = latestLog()

/** ISO date of the day after the latest log — the next scheduled day. */
export const plannedSessionDate = ((): string => {
  const d = new Date(`${today.date}T00:00:00`)
  d.setDate(d.getDate() + 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
})()

/** Most recent Upper Body log — blueprint for the planned session. */
const latestUpperLog: DayLog | undefined = [...dailyLogs]
  .reverse()
  .find((l) => l.workout?.type === 'Upper Body')

export interface SessionMeta {
  key: string
  date: string
  label: string
  coach: string | null
  planned: boolean
  durationMin: number | null
}

/** Build set-rows from a logged workout (defaults: all done). */
function rowsFromLog(log: DayLog): SetRow[] {
  const rows: SetRow[] = []
  log.workout?.exercises.forEach((e, ei) => {
    for (let s = 1; s <= e.sets; s++) {
      rows.push({
        id: `${log.date}-${ei}-${s}`,
        exercise: e.exercise,
        set: s,
        reps: e.reps,
        kg: e.weightKg,
        rpe: Math.round((7.5 + ((ei + s) % 3) * 0.5) * 2) / 2,
        done: true,
      })
    }
  })
  return rows
}

/** Planned session rows — from the Upper Body blueprint, nothing done yet. */
function plannedRows(): SetRow[] {
  const rows: SetRow[] = []
  latestUpperLog?.workout?.exercises.forEach((e, ei) => {
    for (let s = 1; s <= e.sets; s++) {
      rows.push({
        id: `${PLANNED_SESSION_KEY}-${ei}-${s}`,
        exercise: e.exercise,
        set: s,
        reps: e.reps,
        kg: e.weightKg,
        rpe: 8,
        done: false,
      })
    }
  })
  return rows
}

const plannedCache: { rows: SetRow[] | null } = { rows: null }

export function defaultSessionRows(key: string): SetRow[] {
  if (key === PLANNED_SESSION_KEY) {
    if (!plannedCache.rows) plannedCache.rows = plannedRows()
    return plannedCache.rows
  }
  const log = dailyLogs.find((l) => l.date === key)
  return log ? rowsFromLog(log) : []
}

export function sessionMeta(key: string): SessionMeta | null {
  if (key === PLANNED_SESSION_KEY) {
    return {
      key,
      date: plannedSessionDate,
      label: 'Upper Body — Day 2',
      coach: 'Dan Kan',
      planned: true,
      durationMin: null,
    }
  }
  const log = dailyLogs.find((l) => l.date === key)
  if (!log?.workout) return null
  return {
    key,
    date: log.date,
    label: `${log.workout.type} Session`,
    coach: log.workout.type === 'Conditioning' ? null : 'Dan Kan',
    planned: false,
    durationMin: log.workout.durationMin,
  }
}

export const sessionVolume = (rows: SetRow[]): number =>
  Math.round(rows.reduce((s, r) => s + r.reps * r.kg, 0))

// ---------------------------------------------------------------------------
// Nutrition — today's meal sheet seeded from the plan summary's sample day
// ---------------------------------------------------------------------------

export const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'] as const

function defaultFoodRows(): FoodRow[] {
  return planSummary.mealDay.map((m, i) => {
    const meal = m.meal === 'Snack' ? 'Snacks' : m.meal
    const fat = Math.round(((m.calories * 0.28) / 9) * 10) / 10
    const carbs = Math.round(((m.calories - m.proteinG * 4 - fat * 9) / 4) * 10) / 10
    return {
      id: `seed-${i}`,
      meal,
      food: m.items,
      qty: 1,
      kcal: m.calories,
      protein: m.proteinG,
      carbs: Math.max(0, carbs),
      fat,
    }
  })
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

/**
 * Persisted to localStorage so the "Saved" indicator is honest — edits
 * survive reloads. No backend yet; swap for an API write when one lands.
 */
const PERSIST_KEY = 'vault-sheet-store'

type PersistedState = Omit<VaultState, 'saveState'>

function loadPersisted(): PersistedState {
  const fallback: PersistedState = {
    dailyEdits: {},
    workoutEdits: {},
    unlocked: {},
    checklist: {},
    foodRows: null,
  }
  try {
    const raw = localStorage.getItem(PERSIST_KEY)
    if (!raw) return fallback
    return { ...fallback, ...(JSON.parse(raw) as Partial<PersistedState>) }
  } catch {
    return fallback
  }
}

function persist() {
  try {
    const { saveState: _saveState, ...rest } = state
    void _saveState
    localStorage.setItem(PERSIST_KEY, JSON.stringify(rest))
  } catch {
    // storage full / unavailable — edits live on for this session
  }
}

let state: VaultState = {
  ...loadPersisted(),
  saveState: 'clean',
}

const listeners = new Set<() => void>()
let saveTimer: ReturnType<typeof setTimeout> | null = null

function emit() {
  listeners.forEach((l) => l())
}

function setState(patch: Partial<VaultState>, opts?: { transient?: boolean }) {
  state = { ...state, ...patch }
  if (!opts?.transient) {
    persist()
    state = { ...state, saveState: 'dirty' }
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      state = { ...state, saveState: 'saved' }
      emit()
    }, 700)
  }
  emit()
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

const getSnapshot = () => state

/** Reactive access to the shared mock store. */
export function useVault(): VaultState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export const vaultActions = {
  setDailyField(date: string, field: keyof DailyEdit, value: number | string) {
    setState({
      dailyEdits: {
        ...state.dailyEdits,
        [date]: { ...state.dailyEdits[date], [field]: value },
      },
    })
  },

  setSessionRows(key: string, rows: SetRow[]) {
    setState({ workoutEdits: { ...state.workoutEdits, [key]: rows } })
  },

  updateSetRow(key: string, id: string, patch: Partial<SetRow>) {
    const base = state.workoutEdits[key] ?? defaultSessionRows(key)
    setState({
      workoutEdits: {
        ...state.workoutEdits,
        [key]: base.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      },
    })
  },

  addSetRow(key: string, afterId: string | null) {
    const base = [...(state.workoutEdits[key] ?? defaultSessionRows(key))]
    const src = afterId ? base.find((r) => r.id === afterId) : base[base.length - 1]
    if (!src) return
    const sameEx = base.filter((r) => r.exercise === src.exercise)
    const row: SetRow = {
      ...src,
      id: `${key}-add-${Date.now()}`,
      set: sameEx.length + 1,
      done: false,
    }
    const idx = afterId ? base.findIndex((r) => r.id === afterId) : base.length - 1
    base.splice(idx + 1, 0, row)
    setState({ workoutEdits: { ...state.workoutEdits, [key]: base } })
  },

  toggleSessionLock(key: string) {
    setState({ unlocked: { ...state.unlocked, [key]: !state.unlocked[key] } })
  },

  toggleChecklist(sessionKey: string, exercise: string, done: boolean) {
    setState({
      checklist: { ...state.checklist, [`${sessionKey}::${exercise}`]: done },
    })
  },

  setFoodRows(rows: FoodRow[]) {
    setState({ foodRows: rows })
  },

  updateFoodRow(id: string, patch: Partial<FoodRow>) {
    const base = state.foodRows ?? defaultFoodRows()
    setState({
      foodRows: base.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    })
  },

  addFoodRow(meal: string) {
    const base = [...(state.foodRows ?? defaultFoodRows())]
    base.push({
      id: `food-${Date.now()}`,
      meal,
      food: '',
      qty: 1,
      kcal: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    })
    setState({ foodRows: base })
  },

  /** "Copy yesterday" mock: restores the plan's sample rows for that meal. */
  copyYesterdayMeal(meal: string) {
    const base = state.foodRows ?? defaultFoodRows()
    const seeds = defaultFoodRows()
      .filter((r) => r.meal === meal)
      .map((r, i) => ({ ...r, id: `y-${Date.now()}-${i}` }))
    setState({ foodRows: [...base.filter((r) => r.meal !== meal), ...seeds] })
  },

  copyMeal(fromMeal: string, toMeal: string) {
    const base = state.foodRows ?? defaultFoodRows()
    const src = base.filter((r) => r.meal === fromMeal)
    if (src.length === 0) return
    const copies = src.map((r, i) => ({
      ...r,
      id: `copy-${Date.now()}-${i}`,
      meal: toMeal,
    }))
    setState({ foodRows: [...base.filter((r) => r.meal !== toMeal), ...copies] })
  },

  clearWeek(dates: string[]) {
    const dailyEdits = { ...state.dailyEdits }
    const workoutEdits = { ...state.workoutEdits }
    dates.forEach((d) => {
      delete dailyEdits[d]
      delete workoutEdits[d]
    })
    setState({ dailyEdits, workoutEdits })
  },

  copyLastWeek(thisDates: string[], prevDates: string[]) {
    const dailyEdits = { ...state.dailyEdits }
    thisDates.forEach((d, i) => {
      const prev = prevDates[i]
      const prevLog = dailyLogs.find((l) => l.date === prev)
      const prevEntry: DailyEdit = {
        weightKg: dailyEdits[prev]?.weightKg ?? prevLog?.weightKg,
        steps: dailyEdits[prev]?.steps ?? prevLog?.steps,
        sleepHrs: dailyEdits[prev]?.sleepHrs ?? prevLog?.sleepHrs,
        calories: dailyEdits[prev]?.calories ?? prevLog?.calories,
        waterL: dailyEdits[prev]?.waterL ?? defaultWaterL(prev),
        energy: dailyEdits[prev]?.energy ?? defaultEnergy(prev),
      }
      dailyEdits[d] = { ...dailyEdits[d], ...prevEntry }
    })
    setState({ dailyEdits })
  },
}

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export function getDayEntry(s: VaultState, date: string): DayEntry {
  const log = dailyLogs.find((l) => l.date === date)
  const edit = s.dailyEdits[date] ?? {}
  return {
    date,
    weightKg: edit.weightKg ?? log?.weightKg ?? null,
    steps: edit.steps ?? log?.steps ?? null,
    sleepHrs: edit.sleepHrs ?? log?.sleepHrs ?? null,
    calories: edit.calories ?? log?.calories ?? null,
    waterL: edit.waterL ?? defaultWaterL(date),
    energy: edit.energy ?? defaultEnergy(date),
    notes: edit.notes ?? defaultNotes(date),
    log,
    locked: date > today.date,
  }
}

export function getSessionRows(s: VaultState, key: string): SetRow[] {
  return s.workoutEdits[key] ?? defaultSessionRows(key)
}

export function isSessionReadOnly(s: VaultState, key: string): boolean {
  const meta = sessionMeta(key)
  if (!meta) return false
  if (meta.planned) return false
  return !s.unlocked[key]
}

/** Dashboard checklist: override wins, else all sets of the exercise done. */
export function isExerciseDone(s: VaultState, sessionKey: string, exercise: string): boolean {
  const override = s.checklist[`${sessionKey}::${exercise}`]
  if (override !== undefined) return override
  const rows = getSessionRows(s, sessionKey).filter((r) => r.exercise === exercise)
  return rows.length > 0 && rows.every((r) => r.done)
}

export function getFoodRows(s: VaultState): FoodRow[] {
  return s.foodRows ?? defaultFoodRows()
}

export const foodRowMacros = (r: FoodRow) => ({
  kcal: Math.round(r.kcal * r.qty),
  protein: Math.round(r.protein * r.qty * 10) / 10,
  carbs: Math.round(r.carbs * r.qty * 10) / 10,
  fat: Math.round(r.fat * r.qty * 10) / 10,
})

export function dayMacroTotals(s: VaultState) {
  const rows = getFoodRows(s)
  const t = rows.reduce(
    (acc, r) => {
      const m = foodRowMacros(r)
      acc.kcal += m.kcal
      acc.protein += m.protein
      acc.carbs += m.carbs
      acc.fat += m.fat
      return acc
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  )
  return {
    kcal: Math.round(t.kcal),
    protein: Math.round(t.protein),
    carbs: Math.round(t.carbs),
    fat: Math.round(t.fat),
  }
}

export { macroTargets }

/** Weekday-aware gym hours (real The Vault hours). */
export function gymHoursLabel(dateIso: string): string {
  const dow = new Date(`${dateIso}T00:00:00`).getDay()
  return dow === 0 || dow === 6 ? '8:00AM – 8:00PM' : '6:30AM – 11:30PM'
}

export function formatDateLong(dateIso: string): string {
  return new Date(`${dateIso}T00:00:00`)
    .toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    .toUpperCase()
}

export function formatDayShort(dateIso: string): string {
  return new Date(`${dateIso}T00:00:00`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

/** "7h 30m" from decimal hours */
export function formatSleep(hrs: number): string {
  const h = Math.floor(hrs)
  const m = Math.round((hrs - h) * 60)
  return m === 60 ? `${h + 1}h 0m` : `${h}h ${m}m`
}
