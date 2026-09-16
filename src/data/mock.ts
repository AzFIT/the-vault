/**
 * The Vault Fitness — mock data model (design.md §8).
 * Single source of truth for all app pages. Everything is deterministic:
 * the 16-week time series is generated with a seeded RNG at module load,
 * so charts, heatmaps and tables always render identical data.
 */

// ---------------------------------------------------------------------------
// Seeded RNG (mulberry32) — deterministic across reloads
// ---------------------------------------------------------------------------
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(20260209)
const noise = (amp: number) => (rand() * 2 - 1) * amp

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------
export interface Coach {
  id: string
  name: string
  role: string
  specialties: string[]
  /** public/ image path, when a portrait exists (otherwise initials monogram) */
  photo?: string
}

export const coaches: Coach[] = [
  {
    id: 'dan-kan',
    name: 'Dan Kan',
    role: 'Head Coach & Co-Founder',
    specialties: ['Strength & Conditioning', 'Body Composition', 'Hyrox'],
  },
  {
    id: 'ziggy-makant',
    name: 'Ziggy Makant',
    role: "Head of Women's Health",
    specialties: ['Pre & Postnatal', 'FITMAMA', 'Menopause'],
  },
  {
    id: 'teresa-riddle',
    name: 'Teresa Riddle',
    role: 'Personal Trainer',
    specialties: ['Strength', 'Rehab', 'Functional Medicine'],
  },
  {
    id: 'tarryn-maree',
    name: 'Tarryn Maree',
    role: "Women's Health Trainer",
    specialties: ['FITMAMA Strength', 'FITMAMA Restore', 'Pelvic Health'],
  },
  {
    id: 'emily-flavell',
    name: 'Emily Flavell',
    role: 'Junior Trainer',
    specialties: ['Group Classes', 'Strength Foundations'],
  },
]

export const COACH_EXPERIENCE_YEARS = 30

export type ClientTier = 'PT 3x/wk' | 'PT 2x/wk' | "Women's Programme" | 'Open Gym'

export interface Client {
  id: string
  name: string
  age: number
  goal: string
  tier: ClientTier
  /** 0–100 adherence to plan over the trailing 4 weeks */
  adherence: number
  coachId: string
  programId: string
  memberSince: string
  trend: 'up' | 'down' | 'flat'
}

/** Demo client for the client-view persona (design.md §8) */
export const demoClient = {
  id: 'rachel-cheung',
  name: 'Rachel Cheung',
  age: 34,
  location: 'Sheung Wan',
  memberSince: '2025-01',
  goal: 'Reduce body fat',
  coachId: 'dan-kan',
  programId: 'body-comp-reset',
  heightCm: 165,
  startWeightKg: 68.6,
  targetWeightKg: 62,
}

export const coachClients: Client[] = [
  { id: 'rachel-cheung', name: 'Rachel Cheung', age: 34, goal: 'Reduce body fat', tier: 'PT 3x/wk', adherence: 92, coachId: 'dan-kan', programId: 'body-comp-reset', memberSince: '2025-01', trend: 'up' },
  { id: 'marcus-lau', name: 'Marcus Lau', age: 41, goal: 'Build strength', tier: 'PT 2x/wk', adherence: 78, coachId: 'dan-kan', programId: 'strength-foundation', memberSince: '2024-09', trend: 'up' },
  { id: 'priya-sharma', name: 'Priya Sharma', age: 29, goal: 'Hyrox race prep', tier: 'PT 2x/wk', adherence: 88, coachId: 'dan-kan', programId: 'hyrox-engine', memberSince: '2025-06', trend: 'up' },
  { id: 'tom-whitfield', name: 'Tom Whitfield', age: 38, goal: 'Muscle gain', tier: 'Open Gym', adherence: 61, coachId: 'teresa-riddle', programId: 'strength-foundation', memberSince: '2025-03', trend: 'flat' },
  { id: 'karen-ng', name: 'Karen Ng', age: 32, goal: 'Postnatal return', tier: "Women's Programme", adherence: 95, coachId: 'ziggy-makant', programId: 'postnatal-return', memberSince: '2025-08', trend: 'up' },
  { id: 'jason-ho', name: 'Jason Ho', age: 27, goal: 'General fitness', tier: 'Open Gym', adherence: 54, coachId: 'emily-flavell', programId: 'strength-foundation', memberSince: '2025-11', trend: 'down' },
  { id: 'amelia-wong', name: 'Amelia Wong', age: 36, goal: 'Reduce body fat', tier: 'PT 3x/wk', adherence: 83, coachId: 'dan-kan', programId: 'body-comp-reset', memberSince: '2025-02', trend: 'up' },
  { id: 'david-chan', name: 'David Chan', age: 45, goal: 'Return from injury', tier: 'PT 2x/wk', adherence: 71, coachId: 'teresa-riddle', programId: 'strength-foundation', memberSince: '2024-12', trend: 'flat' },
  { id: 'sophie-leung', name: 'Sophie Leung', age: 31, goal: 'Build strength', tier: 'PT 3x/wk', adherence: 90, coachId: 'ziggy-makant', programId: 'strength-foundation', memberSince: '2025-04', trend: 'up' },
  { id: 'kevin-tsang', name: 'Kevin Tsang', age: 33, goal: 'Hyrox race prep', tier: 'PT 2x/wk', adherence: 66, coachId: 'emily-flavell', programId: 'hyrox-engine', memberSince: '2025-07', trend: 'flat' },
  { id: 'michelle-yip', name: 'Michelle Yip', age: 52, goal: 'Menopause strength', tier: "Women's Programme", adherence: 86, coachId: 'tarryn-maree', programId: 'postnatal-return', memberSince: '2025-05', trend: 'up' },
  { id: 'alex-fong', name: 'Alex Fong', age: 24, goal: 'Muscle gain', tier: 'Open Gym', adherence: 49, coachId: 'dan-kan', programId: 'strength-foundation', memberSince: '2026-01', trend: 'down' },
]

// ---------------------------------------------------------------------------
// Programs & classes
// ---------------------------------------------------------------------------
export interface Program {
  id: string
  name: string
  durationWeeks: number
  sessionsPerWeek: number
  focus: string
  phases: string[]
}

export const programs: Program[] = [
  {
    id: 'strength-foundation',
    name: 'Vault Strength Foundation',
    durationWeeks: 12,
    sessionsPerWeek: 3,
    focus: 'Progressive overload on the big lifts — squat, hinge, press, pull.',
    phases: ['Anatomical Adaptation', 'Accumulation', 'Intensification', 'Realisation'],
  },
  {
    id: 'hyrox-engine',
    name: 'Hyrox Engine Builder',
    durationWeeks: 8,
    sessionsPerWeek: 4,
    focus: 'Race-day conditioning — sled, sandbag, ski erg, wall balls, running economy.',
    phases: ['Base Aerobic', 'Threshold', 'Race Specific', 'Taper'],
  },
  {
    id: 'postnatal-return',
    name: 'Postnatal Return to Strength',
    durationWeeks: 10,
    sessionsPerWeek: 2,
    focus: 'FITMAMA — pelvic health, core restoration, graded return to loading.',
    phases: ['Reconnect', 'Rebuild', 'Reload'],
  },
  {
    id: 'body-comp-reset',
    name: 'Body Composition Reset',
    durationWeeks: 16,
    sessionsPerWeek: 3,
    focus: 'Test, don’t guess — diagnostics, nutrition protocol, measured recomposition.',
    phases: ['Diagnostics', 'Deficit Block 1', 'Diet Break', 'Deficit Block 2', 'Consolidation'],
  },
]

export interface GymClass {
  id: string
  name: string
  durationMin: number
  capacity: number
  description: string
  memberPriceHKD: number
  nonMemberPriceHKD: number
  schedule: { day: string; time: string; coachId: string }[]
}

export const CLASS_MEMBER_PRICE = 150
export const CLASS_NON_MEMBER_PRICE = 350

export const gymClasses: GymClass[] = [
  {
    id: 'strength',
    name: 'Strength',
    durationMin: 60,
    capacity: 6,
    description:
      'A 60-minute class using dumbbells, barbells and bodyweight movements to build strength and improve body composition. Suitable for all levels.',
    memberPriceHKD: CLASS_MEMBER_PRICE,
    nonMemberPriceHKD: CLASS_NON_MEMBER_PRICE,
    schedule: [
      { day: 'Mon', time: '07:00', coachId: 'dan-kan' },
      { day: 'Wed', time: '18:30', coachId: 'emily-flavell' },
      { day: 'Sat', time: '09:00', coachId: 'dan-kan' },
    ],
  },
  {
    id: 'hyrox',
    name: 'Hyrox',
    durationMin: 60,
    capacity: 6,
    description:
      'Prepare for Hyrox singles, doubles or relay — sandbags, sled track, treadmills, wall balls and ski erg. Everything you need to condition for race day.',
    memberPriceHKD: CLASS_MEMBER_PRICE,
    nonMemberPriceHKD: CLASS_NON_MEMBER_PRICE,
    schedule: [
      { day: 'Tue', time: '07:00', coachId: 'dan-kan' },
      { day: 'Thu', time: '18:30', coachId: 'emily-flavell' },
    ],
  },
  {
    id: 'fitmama-strength',
    name: 'FITMAMA Strength',
    durationMin: 60,
    capacity: 6,
    description:
      'Pre and postnatal strength training led by women’s health specialists — trimester-scaled loading and birth preparation.',
    memberPriceHKD: CLASS_MEMBER_PRICE,
    nonMemberPriceHKD: CLASS_NON_MEMBER_PRICE,
    schedule: [
      { day: 'Mon', time: '10:00', coachId: 'ziggy-makant' },
      { day: 'Fri', time: '10:00', coachId: 'tarryn-maree' },
    ],
  },
  {
    id: 'fitmama-restore',
    name: 'FITMAMA Restore',
    durationMin: 45,
    capacity: 6,
    description:
      'Postnatal rehabilitation — pelvic floor, breathwork and gentle progressive loading for new mothers.',
    memberPriceHKD: CLASS_MEMBER_PRICE,
    nonMemberPriceHKD: CLASS_NON_MEMBER_PRICE,
    schedule: [{ day: 'Wed', time: '10:00', coachId: 'tarryn-maree' }],
  },
]

// ---------------------------------------------------------------------------
// Membership pricing (real The Vault pricing — design.md §8)
// ---------------------------------------------------------------------------
export interface MembershipPlan {
  id: string
  name: string
  priceHKD: number
  /** e.g. '/mo' for rolling plans */
  period?: string
  note: string
  featured?: boolean
  badge?: string
}

export const membershipPlans: MembershipPlan[] = [
  { id: 'day', name: 'Day Pass', priceHKD: 350, note: 'Single one-off use. Ideal for trial or travellers. Towels, lockers, showers included.' },
  { id: 'week', name: '1-Week Pass', priceHKD: 599, note: '7-day multi-entry pass. Same inclusions.' },
  { id: 'month', name: '1 Month', priceHKD: 1388, note: 'No joining fees. Towels, lockers, showers included.' },
  { id: 'six-month', name: '6 Month', priceHKD: 6528, note: 'Payable up front. Secures your membership.' },
  { id: 'year', name: '12 Month', priceHKD: 10656, note: 'Payable up front.', featured: true, badge: 'Best Value' },
  { id: 'autopay', name: 'Monthly Autopay', priceHKD: 1288, period: '/mo', note: 'Rolling. Cancel anytime. No contract, no joining fees.' },
]

export const introPackage = {
  name: 'Introductory Package',
  priceHKD: 4500,
  includes: [
    '5 × 60-minute PT sessions',
    '1 month VIP gym membership',
    '1 month locker rental',
    '1 supplements starter pack',
  ],
}

// ---------------------------------------------------------------------------
// Achievements
// ---------------------------------------------------------------------------
export interface Achievement {
  id: string
  name: string
  description: string
  earned: boolean
  earnedDate?: string
}

export const achievements: Achievement[] = [
  { id: 'first-session', name: 'First Session', description: 'Completed your first tracked session', earned: true, earnedDate: '2025-10-23' },
  { id: 'ten-sessions', name: '10 Sessions', description: 'Completed 10 tracked sessions', earned: true, earnedDate: '2025-11-18' },
  { id: 'seven-day-streak', name: '7-Day Streak', description: 'Logged every day for a week', earned: true, earnedDate: '2025-12-02' },
  { id: 'five-kg', name: '5kg Milestone', description: 'Down 5kg from starting weight', earned: false },
  { id: 'deadlift-100', name: '100kg Deadlift Club', description: 'Pulled 100kg for a single', earned: true, earnedDate: '2026-01-22' },
  { id: 'hyrox-ready', name: 'Hyrox Ready', description: 'Completed a full race-pace simulation', earned: false },
  { id: 'early-bird', name: 'Early Bird (6:30am)', description: 'Trained in the 6:30am slot', earned: true, earnedDate: '2025-11-06' },
  { id: 'consistency', name: 'Consistency King/Queen', description: '90%+ adherence for a full month', earned: true, earnedDate: '2026-01-31' },
]

// ---------------------------------------------------------------------------
// 16 weeks of daily logs — deterministic time series (design.md §8)
// ---------------------------------------------------------------------------
export interface ExerciseSet {
  exercise: string
  sets: number
  reps: number
  weightKg: number
  isPR?: boolean
}

export interface WorkoutLog {
  type: 'Upper Body' | 'Lower Body' | 'Conditioning' | 'Hyrox'
  durationMin: number
  exercises: ExerciseSet[]
}

export interface DayLog {
  /** ISO date YYYY-MM-DD */
  date: string
  weightKg: number
  steps: number
  sleepHrs: number
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
  workout?: WorkoutLog
}

export const LOG_WEEKS = 16
export const LOG_DAYS = LOG_WEEKS * 7
/** Fixed anchor so the series is deterministic */
export const LOG_END_DATE = '2026-02-09'

function isoDaysAgo(n: number): string {
  const d = new Date(`${LOG_END_DATE}T00:00:00`)
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

/** Progressive lift numbers: week index 0 (oldest) → 15 (latest) */
function progression(base: number, perWeek: number, week: number) {
  return Math.round((base + perWeek * week) * 2) / 2
}

function buildWorkout(week: number, dow: number): WorkoutLog | undefined {
  // Training split: Mon Upper, Tue Conditioning, Thu Lower, Sat Hyrox/Upper alternating
  const isUpper = dow === 1 || (dow === 6 && week % 2 === 0)
  const isLower = dow === 4
  const isCond = dow === 2
  const isHyrox = dow === 6 && week % 2 === 1
  // occasional missed session (~12%)
  if (rand() < 0.12) return undefined

  if (isUpper) {
    const bench = progression(42.5, 1.25, week)
    const row = progression(40, 1.25, week)
    const press = progression(22.5, 0.6, week)
    return {
      type: 'Upper Body',
      durationMin: 55 + Math.round(noise(8)),
      exercises: [
        { exercise: 'Bench Press', sets: 4, reps: 6, weightKg: bench, isPR: bench >= 60 && week === 14 },
        { exercise: 'Barbell Row', sets: 4, reps: 8, weightKg: row },
        { exercise: 'Overhead Press', sets: 3, reps: 8, weightKg: press },
        { exercise: 'Lat Pulldown', sets: 3, reps: 10, weightKg: progression(35, 1, week) },
        { exercise: 'Incline DB Curl', sets: 3, reps: 12, weightKg: progression(8, 0.25, week) },
      ],
    }
  }
  if (isLower) {
    const squat = progression(50, 1.9, week)
    const dead = progression(60, 2.5, week)
    const thrust = progression(70, 2.8, week)
    return {
      type: 'Lower Body',
      durationMin: 60 + Math.round(noise(8)),
      exercises: [
        { exercise: 'Back Squat', sets: 4, reps: 5, weightKg: squat, isPR: squat >= 80 && week === 13 },
        { exercise: 'Deadlift', sets: 3, reps: 3, weightKg: dead, isPR: dead >= 100 && week === 12 },
        { exercise: 'Hip Thrust', sets: 4, reps: 8, weightKg: thrust, isPR: thrust >= 120 && week === 15 },
        { exercise: 'Walking Lunge', sets: 3, reps: 10, weightKg: progression(12, 0.5, week) },
        { exercise: 'Leg Curl', sets: 3, reps: 12, weightKg: progression(30, 1, week) },
      ],
    }
  }
  if (isCond) {
    return {
      type: 'Conditioning',
      durationMin: 40 + Math.round(noise(6)),
      exercises: [
        { exercise: 'Ski Erg', sets: 5, reps: 1, weightKg: 0 },
        { exercise: 'Kettlebell Swing', sets: 5, reps: 20, weightKg: 20 },
        { exercise: 'Sled Push', sets: 6, reps: 1, weightKg: progression(60, 2, week) },
      ],
    }
  }
  if (isHyrox) {
    return {
      type: 'Hyrox',
      durationMin: 65 + Math.round(noise(8)),
      exercises: [
        { exercise: 'Sandbag Lunge', sets: 4, reps: 20, weightKg: 15 },
        { exercise: 'Wall Balls', sets: 4, reps: 25, weightKg: 6 },
        { exercise: 'Sled Pull', sets: 4, reps: 1, weightKg: progression(50, 2, week) },
        { exercise: 'Row Erg', sets: 3, reps: 1, weightKg: 0 },
      ],
    }
  }
  return undefined
}

function buildDailyLogs(): DayLog[] {
  const logs: DayLog[] = []
  const startW = demoClient.startWeightKg // 68.6
  const endW = 63.9
  for (let i = LOG_DAYS - 1; i >= 0; i--) {
    const dayIndex = LOG_DAYS - 1 - i // 0 = oldest
    const week = Math.floor(dayIndex / 7)
    const date = isoDaysAgo(i)
    const dow = new Date(`${date}T00:00:00`).getDay() // 0 Sun … 6 Sat
    const t = dayIndex / (LOG_DAYS - 1)

    const weekend = dow === 0 || dow === 6
    const workout = buildWorkout(week, dow)

    logs.push({
      date,
      weightKg: Math.round((startW + (endW - startW) * t + noise(0.45)) * 10) / 10,
      steps: Math.max(
        2800,
        Math.round(7400 + (weekend ? -1800 : 900) + (workout ? 1400 : 0) + noise(1600)),
      ),
      sleepHrs: Math.round(Math.min(9.2, Math.max(5.1, 7 + noise(0.9) + (weekend ? 0.4 : 0))) * 10) / 10,
      calories: Math.round(1880 + (weekend ? 210 : 0) + noise(190)),
      proteinG: Math.round(128 + noise(17)),
      carbsG: Math.round(172 + (weekend ? 28 : 0) + noise(26)),
      fatG: Math.round(61 + noise(11)),
      workout,
    })
  }
  return logs
}

/** 112 days, oldest first, ending LOG_END_DATE */
export const dailyLogs: DayLog[] = buildDailyLogs()

// ---------------------------------------------------------------------------
// Macro targets & plan summary data (client view — Rachel)
// ---------------------------------------------------------------------------
export interface MacroTargets {
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
}

export const macroTargets: MacroTargets = {
  calories: 1900,
  proteinG: 130,
  carbsG: 175,
  fatG: 60,
}

export interface MealItem {
  meal: string
  items: string
  calories: number
  proteinG: number
}

export interface PlanSummaryData {
  bmr: number
  tdee: number
  targetCalories: number
  deficit: number
  macros: MacroTargets
  projectedWeeklyLossKg: number
  roadmap: { phase: string; weeks: string; focus: string }[]
  mealDay: MealItem[]
}

export const planSummary: PlanSummaryData = {
  bmr: 1340,
  tdee: 1945,
  targetCalories: 1900,
  deficit: 450,
  macros: macroTargets,
  projectedWeeklyLossKg: 0.4,
  roadmap: [
    { phase: 'Diagnostics', weeks: 'Weeks 1–2', focus: 'Baseline testing, fat-storage pattern analysis, nutrition audit' },
    { phase: 'Deficit Block 1', weeks: 'Weeks 3–8', focus: '450 kcal deficit, 3× strength, steps floor 8,000' },
    { phase: 'Diet Break', weeks: 'Weeks 9–10', focus: 'Eat at maintenance, hold training volume' },
    { phase: 'Deficit Block 2', weeks: 'Weeks 11–15', focus: 'Resume deficit, add Hyrox conditioning day' },
    { phase: 'Consolidation', weeks: 'Week 16', focus: 'Re-test, reverse to maintenance, next-block planning' },
  ],
  mealDay: [
    { meal: 'Breakfast', items: 'Greek yoghurt, whey, berries, oats', calories: 430, proteinG: 38 },
    { meal: 'Lunch', items: 'Cha siu chicken rice box, greens, soup', calories: 560, proteinG: 42 },
    { meal: 'Snack', items: 'Protein shake, apple, almonds', calories: 280, proteinG: 25 },
    { meal: 'Dinner', items: 'Steamed fish, tofu, choi sum, jasmine rice', calories: 630, proteinG: 45 },
  ],
}

// ---------------------------------------------------------------------------
// Revenue (coach view) — HK$, deterministic
// ---------------------------------------------------------------------------
export interface RevenueMonth {
  /** e.g. '2025-03' */
  month: string
  label: string
  pt: number
  memberships: number
  classes: number
  total: number
  sessionsDelivered: number
  newClients: number
}

function buildRevenue(): RevenueMonth[] {
  const out: RevenueMonth[] = []
  const end = new Date(`${LOG_END_DATE}T00:00:00`)
  for (let k = 11; k >= 0; k--) {
    const d = new Date(end.getFullYear(), end.getMonth() - k, 1)
    const seasonal = 1 + 0.18 * Math.sin(((d.getMonth() + 10) / 12) * Math.PI * 2)
    const pt = Math.round((182000 * seasonal + noise(14000)) / 100) * 100
    const mem = Math.round((96500 * (1 + (11 - k) * 0.012) + noise(6000)) / 100) * 100
    const cls = Math.round((23400 * seasonal + noise(2200)) / 100) * 100
    out.push({
      month: d.toISOString().slice(0, 7),
      label: d.toLocaleString('en-US', { month: 'short' }),
      pt,
      memberships: mem,
      classes: cls,
      total: pt + mem + cls,
      sessionsDelivered: Math.round(212 * seasonal + noise(18)),
      newClients: Math.max(0, Math.round(4 + noise(2.5))),
    })
  }
  return out
}

/** 12 months ending at LOG_END_DATE's month */
export const monthlyRevenue: RevenueMonth[] = buildRevenue()

// ---------------------------------------------------------------------------
// Helper selectors
// ---------------------------------------------------------------------------
export const getCoachById = (id: string): Coach | undefined =>
  coaches.find((c) => c.id === id)

export const getClientById = (id: string): Client | undefined =>
  coachClients.find((c) => c.id === id)

export const getProgramById = (id: string): Program | undefined =>
  programs.find((p) => p.id === id)

export const latestLog = (): DayLog => dailyLogs[dailyLogs.length - 1]

export const logsForDays = (n: number): DayLog[] => dailyLogs.slice(-n)

/** Logs for week index w (0 = oldest of the 16 weeks) */
export const logsForWeek = (w: number): DayLog[] =>
  dailyLogs.slice(w * 7, w * 7 + 7)

export const weightSeries = (): { date: string; weightKg: number }[] =>
  dailyLogs.map((l) => ({ date: l.date, weightKg: l.weightKg }))

export const weightChange = (): number =>
  Math.round((latestLog().weightKg - dailyLogs[0].weightKg) * 10) / 10

export const average = (nums: number[]): number =>
  nums.length === 0 ? 0 : nums.reduce((a, b) => a + b, 0) / nums.length

export const avgStepsLast7 = (): number =>
  Math.round(average(logsForDays(7).map((l) => l.steps)))

export const avgSleepLast7 = (): number =>
  Math.round(average(logsForDays(7).map((l) => l.sleepHrs)) * 10) / 10

/** % of days in week w that hit the protein target */
export const proteinAdherenceForWeek = (w: number): number =>
  Math.round(
    (logsForWeek(w).filter((l) => l.proteinG >= macroTargets.proteinG).length / 7) * 100,
  )

/** % of days in week w with a logged workout or 8k+ steps */
export const adherenceForWeek = (w: number): number =>
  Math.round(
    (logsForWeek(w).filter((l) => l.workout || l.steps >= 8000).length / 7) * 100,
  )

export const adherenceSeries = (): { week: number; adherence: number }[] =>
  Array.from({ length: LOG_WEEKS }, (_, w) => ({
    week: w + 1,
    adherence: adherenceForWeek(w),
  }))

/** Total lifted volume (sets × reps × kg) for week w */
export const volumeForWeek = (w: number): number =>
  Math.round(
    logsForWeek(w).reduce((sum, l) => {
      if (!l.workout) return sum
      return (
        sum +
        l.workout.exercises.reduce((s, e) => s + e.sets * e.reps * e.weightKg, 0)
      )
    }, 0),
  )

export const volumeSeries = (): { week: number; volume: number }[] =>
  Array.from({ length: LOG_WEEKS }, (_, w) => ({ week: w + 1, volume: volumeForWeek(w) }))

export interface PRRecord {
  date: string
  exercise: string
  weightKg: number
  reps: number
}

/** All personal records across the 16 weeks, newest first */
export const prBoard = (): PRRecord[] => {
  const prs: PRRecord[] = []
  for (const l of dailyLogs) {
    if (!l.workout) continue
    for (const e of l.workout.exercises) {
      if (e.isPR) prs.push({ date: l.date, exercise: e.exercise, weightKg: e.weightKg, reps: e.reps })
    }
  }
  return prs.reverse()
}

/** Simple fitness score 0–100 for the dashboard ring */
export const fitnessScore = (): number =>
  Math.round(
    0.4 * adherenceForWeek(LOG_WEEKS - 1) +
      0.25 * Math.min(100, (avgStepsLast7() / 10000) * 100) +
      0.2 * Math.min(100, (avgSleepLast7() / 8) * 100) +
      0.15 * proteinAdherenceForWeek(LOG_WEEKS - 1),
  )

export const coachStats = () => ({
  activeClients: coachClients.length,
  avgAdherence: Math.round(average(coachClients.map((c) => c.adherence))),
  sessionsThisMonth: monthlyRevenue[monthlyRevenue.length - 1].sessionsDelivered,
  revenueThisMonth: monthlyRevenue[monthlyRevenue.length - 1].total,
})

export const formatHKD = (n: number): string =>
  `HK$${n.toLocaleString('en-HK', { maximumFractionDigits: 0 })}`
