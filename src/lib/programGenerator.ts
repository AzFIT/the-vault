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

export interface GeneratorInput {
  goal: GoalId
  experience: ExperienceId
  frequency: 2 | 3 | 4 // builder has 5 day columns — capped at 4
  equipment: EquipmentId
  injuries?: string // free text, comma-separated
}

export interface GeneratedExercise {
  name: string
  sets: number
  reps: number
  kg: number // left at 0 — the coach sets working loads
  rpe: number
  rest: number // seconds, from goal rules — the coach can override
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
  weeks: GeneratedWeek[] // 4 weeks; weeks 2–4 are clones (progression is Phase 4)
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

interface SlotSpec {
  slot: Slot
  count: number
}

/** Session templates per frequency: title + which slots (and how many picks each). */
const SPLIT_TEMPLATES: Record<number, { title: string; slots: SlotSpec[] }[]> = {
  2: [
    {
      title: 'Full Body A',
      slots: [
        { slot: 'pressing', count: 2 },
        { slot: 'posterior', count: 1 },
        { slot: 'bilateral_quad', count: 1 },
        { slot: 'bracing', count: 1 },
      ],
    },
    {
      title: 'Full Body B',
      slots: [
        { slot: 'pulling', count: 2 },
        { slot: 'unilateral_quad', count: 1 },
        { slot: 'bracing', count: 1 },
        { slot: 'biceps', count: 1 },
      ],
    },
  ],
  3: [
    {
      title: 'Full Body 1',
      slots: [
        { slot: 'pressing', count: 2 },
        { slot: 'posterior', count: 1 },
        { slot: 'bilateral_quad', count: 1 },
        { slot: 'bracing', count: 1 },
      ],
    },
    {
      title: 'Full Body 2',
      slots: [
        { slot: 'pulling', count: 2 },
        { slot: 'unilateral_quad', count: 1 },
        { slot: 'bracing', count: 1 },
        { slot: 'biceps', count: 1 },
      ],
    },
    {
      title: 'Full Body 3',
      slots: [
        { slot: 'pressing', count: 1 },
        { slot: 'pulling', count: 1 },
        { slot: 'posterior', count: 1 },
        { slot: 'bracing', count: 1 },
        { slot: 'metcon', count: 1 },
      ],
    },
  ],
  4: [
    {
      title: 'Upper A',
      slots: [
        { slot: 'pressing', count: 2 },
        { slot: 'pulling', count: 2 },
        { slot: 'delt_scap', count: 1 },
      ],
    },
    {
      title: 'Lower A',
      slots: [
        { slot: 'bilateral_quad', count: 1 },
        { slot: 'unilateral_quad', count: 1 },
        { slot: 'posterior', count: 2 },
        { slot: 'bracing', count: 1 },
      ],
    },
    {
      title: 'Upper B',
      slots: [
        { slot: 'pressing', count: 1 },
        { slot: 'pulling', count: 1 },
        { slot: 'biceps', count: 1 },
        { slot: 'triceps', count: 1 },
        { slot: 'delt_scap', count: 1 },
      ],
    },
    {
      title: 'Lower B',
      slots: [
        { slot: 'bilateral_quad', count: 2 },
        { slot: 'posterior', count: 1 },
        { slot: 'bracing', count: 1 },
        { slot: 'target_areas', count: 1 },
      ],
    },
  ],
}

const CONDITIONING_RE = /erg|sled|ski|bike|run|row(ing)? machine|airdyne|assault|shuttle|jump rope|farmer|carry|burpee/

// ---- generator -------------------------------------------------------------

export function generateProgram(input: GeneratorInput, library: LibraryExercise[]): GeneratedProgram {
  const goal = GOAL_PARAMS[input.goal]
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
    const sessions = SPLIT_TEMPLATES[input.frequency]
    const columns = PLACEMENT[input.frequency]
    sessions.forEach((template, i) => {
      const exercises: GeneratedExercise[] = []
      let missed: string[] = []
      for (const spec of template.slots) {
        for (let k = 0; k < spec.count; k++) {
          const ex = pick(spec.slot)
          if (!ex) {
            missed.push(spec.slot)
            continue
          }
          const cond = isConditioning(ex.name)
          const reps = cond ? 1 : Math.max(1, Math.floor((goal.repsRange[0] + goal.repsRange[1]) / 2))
          const rpe = Math.max(5, goal.rpe - (input.experience === 'beginner' ? 1 : 0))
          const rest = cond ? 60 : Math.round((goal.rest[0] + goal.rest[1]) / 2)
          exercises.push({ name: ex.name, sets: goal.sets, reps, kg: 0, rpe, rest })
        }
      }
      if (missed.length > 0) {
        const uniq = Array.from(new Set(missed))
        warnings.push(`Not enough "${uniq.join('", "')}" exercises in the library for ${template.title} — slot(s) left empty`)
      }
      if (exercises.length > 0) {
        days[columns[i]] = { title: template.title, exercises }
      }
    })
    return days
  }

  const week1 = buildWeek()
  // Weeks 2–4 are clones (kg untouched at 0 — progression rules are a later phase).
  const weeks: GeneratedWeek[] = [week1, ...Array.from({ length: 3 }, () => week1.map((d) => d && { ...d, exercises: d.exercises.map((e) => ({ ...e })) }))]

  if (excludedCount > 0) {
    warnings.unshift(`${excludedCount} exercise(s) swapped out for injury-safety rules`)
  }

  const goalLabel = goal.label
  const name = `Generated — ${goalLabel}`
  return {
    name,
    goalLabel,
    experienceLabel: EXPERIENCE_LABELS[input.experience],
    weeks,
    warnings,
  }
}

export const GENERATOR_GOALS = GOAL_PARAMS
export const GENERATOR_EQUIPMENT_LABELS = EQUIPMENT_LABELS
export const GENERATOR_EXPERIENCE_LABELS = EXPERIENCE_LABELS
