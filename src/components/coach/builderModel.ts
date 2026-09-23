// ---------------------------------------------------------------------------
// Shared program-builder model — used by ProgramBuilder and SessionEditor.
// ---------------------------------------------------------------------------

export interface ExRow {
  id: string
  exercise: string
  sets: number
  reps: number
  kg: number
  rpe: number
  /** Rest after the set/block, seconds — pairs with Poliquin notation. */
  rest?: number | null
  /** Poliquin pair notation: A, A1, A2, B, B1… — resets every session. */
  notation?: string
}
export interface Session {
  id: string
  title: string
  exercises: ExRow[]
}
/** Non-training content placed on a day via the "+" menu. */
export type DayMarker = 'rest' | 'cardio' | 'mobility'
export interface DayCol {
  id: string
  label: string
  sessions: Session[]
  marker?: DayMarker | null
}
export interface Week {
  id: string
  days: DayCol[]
}
export interface ProgramDraft {
  id: string
  name: string
  subtitle: string
  weeks: Week[]
  custom?: boolean
}

export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
/** Which day columns sessions land on, keyed by sessions-per-week (7-day week). */
export const PLACEMENT: Record<number, number[]> = {
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
}

export const MARKER_LABELS: Record<DayMarker, string> = {
  rest: 'Rest',
  cardio: 'Cardio',
  mobility: 'Mobility',
}

let uid = 0
export const nextId = (p: string) => `${p}-${++uid}`

/** Poliquin pair options — also used to build the datalist suggestions. */
export const NOTATION_OPTIONS = [
  'A', 'A1', 'A2', 'A3', 'A4',
  'B', 'B1', 'B2', 'B3', 'B4',
  'C', 'C1', 'C2', 'C3', 'C4',
  'D', 'D1', 'D2', 'D3', 'D4',
]

/** Normalize a typed/picked notation: uppercase, pattern A–H + optional 1–4. */
export function normalizeNotation(raw: string): string {
  const t = raw.trim().toUpperCase()
  return /^[A-H][1-4]?$/.test(t) ? t : ''
}

/** A → next block B; A1 → next block A2. Null when no chain applies. */
export function nextNotation(cur: string): string | null {
  const m = /^([A-H])(\d?)$/.exec(cur)
  if (!m) return null
  if (m[2]) return `${m[1]}${Number(m[2]) + 1}`
  const code = m[1].charCodeAt(0) + 1
  return code <= 'H'.charCodeAt(0) ? String.fromCharCode(code) : null
}
