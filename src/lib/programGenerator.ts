// ---------------------------------------------------------------------------
// Constraint-based program generator (Azfit.ai port, adapted to The Vault).
// Coach picks a profile (goal / experience / frequency / equipment / injuries)
// and gets a full 4-week draft program built from the seeded Supabase
// `exercise_library` — weeks → days → sessions → exercises with sets/reps/rpe.
// Pure module: no Supabase calls, no React. Deterministic (sorted picks).
// ---------------------------------------------------------------------------

import type { LibraryExercise } from '@/lib/exerciseLibrary'
import { findContraindications, normalizeLimitation } from '@/lib/exerciseSafety'

// ---- public types ----------------------------------------------------------

export type GoalId = 'fat_loss' | 'muscle' | 'strength' | 'recomposition' | 'performance' | 'general'
export type ExperienceId = 'beginner' | 'intermediate' | 'advanced'
export type EquipmentId = 'full' | 'dumbbells' | 'home' | 'bodyweight'
export type MethodId =
  | 'straight' | 'supersets' | 'trisets' | 'giant' | 'circuit' | 'gvt' | 'pyramid'
  | 'cluster' | 'dropset' | 'restpause' | 'wave' | 'ladder' | 'fivebyfive' | 'structural'
  | 'circuitcond' | 'hiit' | 'intervals' | 'fartlek' | 'sprint' | 'tabata'
  | 'amrap' | 'emom' | 'gbc' | 'strongman'
  | 'functional' | 'skill' | 'agility' | 'sport' | 'olympic' | 'plyo' | 'powerlifting' | 'performance'

export interface GeneratorInput {
  goal: GoalId
  experience: ExperienceId
  frequency: 2 | 3 | 4 // builder has 5 day columns — capped at 4
  equipment: EquipmentId
  injuries?: string // free text, comma-separated
  /** Training method — drives pairing notation (A1/A2…), set/rep/rest presets, slot rotation. */
  method?: MethodId
  /** How many exercises each generated session should hold (3–8). */
  exercisesPerSession?: number
  /** Program length in weeks (2–8). Week 1 is generated; later weeks are clones. */
  weeks?: number
}

export interface GeneratedExercise {
  name: string
  sets: number
  reps: number
  kg: number // left at 0 — the coach sets working loads
  rpe: number
  rest: number // seconds, from goal rules — the coach can override
  /** Poliquin block notation, e.g. A / A1 / A2 — auto-assigned from the method. */
  notation?: string
}

export interface GeneratedSession {
  title: string
  exercises: GeneratedExercise[]
}

/** One week laid out over the builder's 5 day columns (null = rest day). */
export type GeneratedWeek = (GeneratedSession | null)[]

export interface GeneratedProgram {
  name: string
  goalLabel: string
  experienceLabel: string
  methodLabel: string
  weeks: GeneratedWeek[] // week 1 generated; weeks 2+ are clones (progression is Phase 4)
  warnings: string[]
}

// ---- goal parameters -------------------------------------------------------

interface GoalParams {
  label: string
  sets: number
  repsRange: [number, number]
  rpe: number
  rest: [number, number] // seconds between sets / after a pair
}

const GOAL_PARAMS: Record<GoalId, GoalParams> = {
  fat_loss: { label: 'Fat Loss', sets: 3, repsRange: [12, 15], rpe: 7, rest: [45, 60] },
  muscle: { label: 'Build Muscle', sets: 3, repsRange: [8, 12], rpe: 7, rest: [60, 90] },
  strength: { label: 'Strength', sets: 4, repsRange: [3, 6], rpe: 8, rest: [150, 180] },
  recomposition: { label: 'Recomposition', sets: 3, repsRange: [8, 10], rpe: 7, rest: [60, 60] },
  performance: { label: 'Performance', sets: 4, repsRange: [5, 8], rpe: 8, rest: [90, 120] },
  general: { label: 'General Health', sets: 2, repsRange: [10, 12], rpe: 6, rest: [45, 60] },
}

const EXPERIENCE_LABELS: Record<ExperienceId, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

const EQUIPMENT_LABELS: Record<EquipmentId, string> = {
  full: 'Full gym',
  dumbbells: 'Dumbbells only',
  home: 'Home gym (DB + bands)',
  bodyweight: 'Bodyweight',
}

// ---- slot taxonomy ---------------------------------------------------------
// Slots are generator buckets; each maps to a movement_category label in the
// seeded library, with a keyword fallback for the ~2/3 of rows whose
// movement_category is NULL (the xlsx stays the source of truth — we never
// write classifications back).

type Slot =
  | 'pressing'
  | 'pulling'
  | 'bilateral_quad'
  | 'unilateral_quad'
  | 'posterior'
  | 'delt_scap'
  | 'biceps'
  | 'triceps'
  | 'bracing'
  | 'metcon'
  | 'target_areas'
  | 'power'
  | 'plyo'

const CATEGORY_TO_SLOT: Record<string, Slot> = {
  'Upper-Body Push': 'pressing',
  'Upper-Body Pull': 'pulling',
  'Knee-Dominant — Bilateral': 'bilateral_quad',
  'Knee-Dominant — Unilateral': 'unilateral_quad',
  'Hip-Dominant': 'posterior',
  'Shoulder / Scapular Control': 'delt_scap',
  'Elbow Flexion': 'biceps',
  'Elbow Extension': 'triceps',
  'Anti-Movement Core': 'bracing',
  'Conditioning': 'metcon',
  'Targeted Accessory': 'target_areas',
  'Full-Body Power': 'power',
  'Olympic Lift': 'power',
  'Plyometric': 'plyo',
  'Mobility / Prehab': 'target_areas',
}

const KEYWORD_RULES: [RegExp, Slot][] = [
  [/snatch|clean(?! press)|jerk|push press|throw/, 'power'],
  [/box jump|broad jump|jump squat|bound|hop/, 'plyo'],
  [/erg|sled|ski|bike|burpee|jump rope|airdyne|assault|farmer|loaded carry|bear crawl|shuttle/, 'metcon'],
  [/plank|pallof|dead ?bug|rollout|hollow|bird ?dog|copenhagen/, 'bracing'],
  [/curl/, 'biceps'],
  [/skull|tricep|kickback/, 'triceps'],
  [/face pull|band pull|lateral raise|rear delt|shrug|scapular|y-raise/, 'delt_scap'],
  [/deadlift|rdl|romanian|hip thrust|glute bridge|swing|back extension|good morning|leg curl|pull-through/, 'posterior'],
  [/lunge|split squat|step[- ]?up|bulgarian|single[- ]leg squat/, 'unilateral_quad'],
  [/squat|leg press|hack squat|goblet/, 'bilateral_quad'],
  [/press|push[- ]?up|pushup|dip/, 'pressing'],
  [/row|lat pulldown|pull[- ]?up|chin[- ]?up|pullover|straight[- ]?arm/, 'pulling'],
]

function classifyEx(ex: LibraryExercise): Slot | null {
  const catSlot = ex.movement_category ? CATEGORY_TO_SLOT[ex.movement_category] : undefined
  if (catSlot) return catSlot
  const hay = `${ex.name} ${ex.base_exercise ?? ''}`.toLowerCase()
  for (const [re, slot] of KEYWORD_RULES) {
    if (re.test(hay)) return slot
  }
  return null
}

// ---- equipment filter ------------------------------------------------------

const EQUIPMENT_FORBIDDEN: Record<Exclude<EquipmentId, 'full'>, RegExp> = {
  dumbbells: /barbell|plate|machine|cable|kettlebell|smith|trap bar|landmine|ez bar/,
  home: /barbell|plate loaded|machine|cable station|smith|trap bar|leg press|hack squat/,
  bodyweight: /barbell|dumbbell|kettlebell|cable|machine|band|plate|smith|trap bar|ez bar|medicine ball/,
}

function equipmentOk(ex: LibraryExercise, equipment: EquipmentId): boolean {
  if (equipment === 'full') return true
  const eq = (ex.equipment ?? '').toLowerCase()
  if (!eq) return true // rows without equipment metadata stay available
  return !EQUIPMENT_FORBIDDEN[equipment].test(eq)
}

// ---- split templates (frequency 2–4) ---------------------------------------

const DAY_COLUMN_COUNT = 7 // Mon–Sun

/** Which day-column indices hold sessions for each frequency (7-day week). */
const PLACEMENT: Record<number, number[]> = {
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
}

/** Session titles per frequency (structure stays; slots come from rotations). */
const SESSION_TITLES: Record<number, string[]> = {
  2: ['Full Body A', 'Full Body B'],
  3: ['Full Body 1', 'Full Body 2', 'Full Body 3'],
  4: ['Upper A', 'Lower A', 'Upper B', 'Lower B'],
}

/** Slot rotations — ordered buckets to pick from, truncated to exercisesPerSession. */
const ROTATIONS = {
  fullBody: ['pressing', 'pulling', 'posterior', 'bilateral_quad', 'bracing', 'unilateral_quad', 'delt_scap', 'biceps', 'triceps', 'target_areas'] as Slot[],
  upper: ['pressing', 'pulling', 'pressing', 'pulling', 'delt_scap', 'biceps', 'triceps', 'target_areas'] as Slot[],
  lower: ['bilateral_quad', 'posterior', 'unilateral_quad', 'posterior', 'bracing', 'bilateral_quad', 'target_areas'] as Slot[],
  metconFirst: ['metcon', 'plyo', 'bilateral_quad', 'posterior', 'bracing', 'pressing', 'pulling', 'unilateral_quad'] as Slot[],
  powerFirst: ['power', 'bilateral_quad', 'posterior', 'pressing', 'pulling', 'delt_scap', 'bracing'] as Slot[],
  plyoFirst: ['plyo', 'bilateral_quad', 'unilateral_quad', 'pressing', 'pulling', 'posterior', 'bracing'] as Slot[],
} satisfies Record<string, Slot[]>

const CONDITIONING_RE = /erg|sled|ski|bike|run|row(ing)? machine|airdyne|assault|shuttle|jump rope|farmer|carry|burpee/

// ---- training methods ------------------------------------------------------

type NotationMode = 'letter' | 'pair' | 'trio' | 'circuit' | 'none'

interface MethodDef {
  label: string
  group: 'strength' | 'conditioning' | 'performance'
  /** How Poliquin notation is auto-assigned. */
  notation: NotationMode
  /** Suggested exercise count per session when this method is picked. */
  defaultCount: number
  /** Slot rotation override (defaults to the frequency-based one). */
  rotation?: keyof typeof ROTATIONS
  sets?: number
  reps?: number
  /** Rest override (seconds) — otherwise the goal's rest range is used. */
  rest?: number
  rpe?: number
  note?: string
}

export const GENERATOR_METHODS: Record<MethodId, MethodDef> = {
  straight:     { label: 'Straight Sets', group: 'strength', notation: 'letter', defaultCount: 5 },
  supersets:    { label: 'Supersets', group: 'strength', notation: 'pair', defaultCount: 6, rest: 75 },
  trisets:      { label: 'Trisets', group: 'strength', notation: 'trio', defaultCount: 6, rest: 90 },
  giant:        { label: 'Giant Sets', group: 'strength', notation: 'circuit', defaultCount: 6, sets: 3, rest: 150 },
  circuit:      { label: 'Circuits', group: 'strength', notation: 'circuit', defaultCount: 6, sets: 3, rest: 45 },
  gvt:          { label: 'German Volume Training (10×10)', group: 'strength', notation: 'pair', defaultCount: 4, sets: 10, reps: 10, rest: 60, note: '10 sets × 10 reps per exercise — high volume' },
  pyramid:      { label: 'Pyramid Sets', group: 'strength', notation: 'letter', defaultCount: 5, sets: 5, reps: 8, rest: 90 },
  cluster:      { label: 'Cluster Sets', group: 'strength', notation: 'letter', defaultCount: 5, sets: 4, reps: 4, rest: 30 },
  dropset:      { label: 'Drop Sets', group: 'strength', notation: 'letter', defaultCount: 5, sets: 3, reps: 10, rest: 45 },
  restpause:    { label: 'Rest-Pause', group: 'strength', notation: 'letter', defaultCount: 5, sets: 3, reps: 6, rest: 20 },
  wave:         { label: 'Wave Loading', group: 'strength', notation: 'letter', defaultCount: 5, sets: 3, reps: 3, rest: 180 },
  ladder:       { label: '5-4-3-2-1 Ladder', group: 'strength', notation: 'letter', defaultCount: 4, sets: 5, reps: 5, rest: 120 },
  fivebyfive:   { label: '5×5 Strength', group: 'strength', notation: 'letter', defaultCount: 5, sets: 5, reps: 5, rest: 180 },
  structural:   { label: 'Structural Balance', group: 'strength', notation: 'pair', defaultCount: 6, sets: 3, reps: 12, rest: 60 },
  circuitcond:  { label: 'Circuit Conditioning', group: 'conditioning', notation: 'circuit', defaultCount: 6, sets: 3, reps: 1, rest: 45 },
  hiit:         { label: 'HIIT', group: 'conditioning', notation: 'circuit', defaultCount: 5, sets: 8, reps: 1, rest: 60, rotation: 'metconFirst' },
  intervals:    { label: 'Interval Training', group: 'conditioning', notation: 'circuit', defaultCount: 4, sets: 6, reps: 1, rest: 60, rotation: 'metconFirst' },
  fartlek:      { label: 'Fartlek Training', group: 'conditioning', notation: 'circuit', defaultCount: 4, sets: 6, reps: 1, rest: 45, rotation: 'metconFirst' },
  sprint:       { label: 'Sprint Intervals', group: 'conditioning', notation: 'circuit', defaultCount: 4, sets: 8, reps: 1, rest: 90, rotation: 'metconFirst' },
  tabata:       { label: 'Tabata', group: 'conditioning', notation: 'circuit', defaultCount: 4, sets: 8, reps: 20, rest: 10 },
  amrap:        { label: 'AMRAP', group: 'conditioning', notation: 'letter', defaultCount: 6, sets: 1, reps: 1, rest: 0, rotation: 'metconFirst' },
  emom:         { label: 'EMOM', group: 'conditioning', notation: 'circuit', defaultCount: 5, sets: 10, reps: 1, rest: 60, rotation: 'metconFirst' },
  gbc:          { label: 'GBC (German Body Composition)', group: 'conditioning', notation: 'pair', defaultCount: 6, sets: 3, reps: 12, rest: 45 },
  strongman:    { label: 'Modified Strongman', group: 'conditioning', notation: 'circuit', defaultCount: 5, sets: 4, reps: 1, rest: 90, rotation: 'metconFirst' },
  functional:   { label: 'Functional Training', group: 'performance', notation: 'circuit', defaultCount: 6, sets: 3, reps: 8, rest: 45 },
  skill:        { label: 'Skill Work (Agility · Speed · Coordination)', group: 'performance', notation: 'letter', defaultCount: 4, sets: 3, reps: 5, rest: 60 },
  agility:      { label: 'Speed & Agility Ladder Work', group: 'performance', notation: 'circuit', defaultCount: 4, sets: 6, reps: 1, rest: 60, rotation: 'metconFirst' },
  sport:        { label: 'Sport-Specific Drills', group: 'performance', notation: 'letter', defaultCount: 5, sets: 4, reps: 6, rest: 90 },
  olympic:      { label: 'Olympic Lifts', group: 'performance', notation: 'pair', defaultCount: 5, sets: 5, reps: 3, rest: 120, rotation: 'powerFirst' },
  plyo:         { label: 'Plyometrics', group: 'performance', notation: 'letter', defaultCount: 5, sets: 4, reps: 5, rest: 90, rotation: 'plyoFirst' },
  powerlifting: { label: 'Powerlifting', group: 'performance', notation: 'letter', defaultCount: 5, sets: 5, reps: 3, rest: 180 },
  performance:  { label: 'Athletic Performance Block', group: 'performance', notation: 'circuit', defaultCount: 6, sets: 4, reps: 5, rest: 75 },
}

/** Auto-assign Poliquin notation from the method and exercise position. */
function assignNotation(mode: NotationMode, index: number, count: number): string | undefined {
  // Circuit: one continuous block for the whole session — A1, A2, A3…
  if (mode === 'circuit') return `A${index + 1}`
  if (mode === 'none') return undefined
  const letter = String.fromCharCode(65 + Math.floor(index / (mode === 'trio' ? 3 : 2)))
  if (mode === 'letter') return letter
  const size = mode === 'trio' ? 3 : 2
  const pos = index % size
  const blockStart = Math.floor(index / size) * size
  const inBlock = Math.min(size, count - blockStart)
  // Odd trailing exercise stands alone as the next plain letter (A, B, …).
  if (pos === inBlock - 1 && inBlock < size) return String.fromCharCode(65 + Math.floor(index / size))
  return `${letter}${pos + 1}`
}

// ---- generator -------------------------------------------------------------

export function generateProgram(input: GeneratorInput, library: LibraryExercise[]): GeneratedProgram {
  const goal = GOAL_PARAMS[input.goal]
  const method = GENERATOR_METHODS[input.method ?? 'straight']
  const exercisesPerSession = Math.min(8, Math.max(3, input.exercisesPerSession ?? method.defaultCount))
  const weekCount = Math.min(8, Math.max(2, input.weeks ?? 4))
  const limitations = (input.injuries ?? '')
    .split(/[,;]/)
    .map(normalizeLimitation)
    .filter(Boolean)

  // Bucket the library by slot, respecting equipment.
  const pools = new Map<Slot, LibraryExercise[]>()
  for (const ex of library) {
    if (!equipmentOk(ex, input.equipment)) continue
    const slot = classifyEx(ex)
    if (!slot) continue
    if (!pools.has(slot)) pools.set(slot, [])
    pools.get(slot)!.push(ex)
  }

  // Deterministic pick order per pool: experience preference, then difficulty, then name.
  const difficultyOrder = (
    { beginner: ['Beginner', 'Intermediate', 'Advanced'],
      intermediate: ['Intermediate', 'Beginner', 'Advanced'],
      advanced: ['Advanced', 'Intermediate', 'Beginner'] } as Record<ExperienceId, string[]>
  )[input.experience]
  const orderKey = (ex: LibraryExercise) =>
    difficultyOrder.indexOf(ex.difficulty ?? '') === -1
      ? 99
      : difficultyOrder.indexOf(ex.difficulty ?? '')
  for (const pool of pools.values()) {
    pool.sort((a, b) => orderKey(a) - orderKey(b) || (a.name ?? '').localeCompare(b.name ?? ''))
  }

  const usedPerSlot = new Map<Slot, Set<string>>()
  const usedName = (slot: Slot) => {
    if (!usedPerSlot.has(slot)) usedPerSlot.set(slot, new Set())
    return usedPerSlot.get(slot)!
  }
  const warnings: string[] = []
  const warnedNotes = new Set<string>()
  let excludedCount = 0

  const pick = (slot: Slot): LibraryExercise | null => {
    const pool = pools.get(slot) ?? []
    for (const ex of pool) {
      if (usedName(slot).has(ex.name)) continue
      const contra = findContraindications(`${ex.name} ${ex.base_exercise ?? ''}`, limitations)
      if (contra.some((c) => c.severity === 'exclude')) {
        excludedCount += 1
        continue
      }
      for (const c of contra) {
        if (c.severity === 'warn' && !warnedNotes.has(c.note)) warnedNotes.add(c.note)
      }
      usedName(slot).add(ex.name)
      return ex
    }
    return null
  }

  const isConditioning = (name: string) => CONDITIONING_RE.test(name.toLowerCase())

  const buildWeek = (): GeneratedWeek => {
    const days: GeneratedWeek = Array.from({ length: DAY_COLUMN_COUNT }, () => null)
    const titles = SESSION_TITLES[input.frequency]
    const columns = PLACEMENT[input.frequency]
    const baseRotation = input.frequency === 4 ? null : ROTATIONS.fullBody
    titles.forEach((title, i) => {
      const rotation =
        method.rotation != null
          ? ROTATIONS[method.rotation]
          : input.frequency === 4
            ? (i % 2 === 0 ? ROTATIONS.upper : ROTATIONS.lower)
            : baseRotation!
      const slots = rotation.slice(0, exercisesPerSession)
      const exercises: GeneratedExercise[] = []
      const missed: string[] = []
      slots.forEach((slot, idx) => {
        const ex = pick(slot)
        if (!ex) {
          missed.push(slot)
          return
        }
        const cond = isConditioning(ex.name)
        const reps = method.reps ?? (cond ? 1 : Math.max(1, Math.floor((goal.repsRange[0] + goal.repsRange[1]) / 2)))
        const rpe = method.rpe ?? Math.max(5, goal.rpe - (input.experience === 'beginner' ? 1 : 0))
        const rest = method.rest ?? (cond ? 60 : Math.round((goal.rest[0] + goal.rest[1]) / 2))
        const notation = assignNotation(method.notation, idx, slots.length)
        exercises.push({ name: ex.name, sets: method.sets ?? goal.sets, reps, kg: 0, rpe, rest, notation })
      })
      if (missed.length > 0) {
        const uniq = Array.from(new Set(missed))
        warnings.push(`Not enough "${uniq.join('", "')}" exercises in the library for ${title} — slot(s) left empty`)
      }
      if (exercises.length > 0) {
        days[columns[i]] = { title, exercises }
      }
    })
    return days
  }

  const week1 = buildWeek()
  // Weeks 2+ are clones (kg untouched at 0 — progression rules are a later phase).
  const weeks: GeneratedWeek[] = [week1, ...Array.from({ length: weekCount - 1 }, () => week1.map((d) => d && { ...d, exercises: d.exercises.map((e) => ({ ...e })) }))]

  if (excludedCount > 0) {
    warnings.unshift(`${excludedCount} exercise(s) swapped out for injury-safety rules`)
  }

  const goalLabel = goal.label
  const name = `Generated — ${goalLabel} · ${method.label}`
  return {
    name,
    goalLabel,
    experienceLabel: EXPERIENCE_LABELS[input.experience],
    methodLabel: method.label,
    weeks,
    warnings,
  }
}

export const GENERATOR_GOALS = GOAL_PARAMS
export const GENERATOR_EQUIPMENT_LABELS = EQUIPMENT_LABELS
export const GENERATOR_EXPERIENCE_LABELS = EXPERIENCE_LABELS
