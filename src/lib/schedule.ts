/**
 * Schedule data layer — the owner portal's week grid (wireframe screen 04).
 * Three block types: 'pt' (gold, revenue-bearing 1:1/2:1), 'class' (white,
 * group class with capacity), 'open' (dashed, bookable room slot).
 * Blocks are dated; the seed is generated against the current week so it
 * always lands on "this week" the first time the page is opened. No backend
 * yet — edits persist to localStorage.
 */

export type BlockType = 'pt' | 'class' | 'open'

export interface ScheduleBlock {
  id: string
  type: BlockType
  title: string
  /** ISO date, yyyy-mm-dd */
  date: string
  /** Minutes from midnight */
  startMin: number
  durationMin: number
  room: string
  coach?: string
  capacity?: number
  enrolled?: number
  note?: string
}

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  pt: 'PT / 1:1',
  class: 'Class',
  open: 'Open slot',
}

export const ROOMS = ['Main', 'VIP', 'Reformer']

/** Grid renders 07:00 → 21:30. */
export const GRID_START_MIN = 7 * 60
export const GRID_END_MIN = 21 * 60 + 30
export const PX_PER_MIN = 1.2

const STORAGE_KEY = 'vault-schedule-v1'

// ---------------------------------------------------------------------------
// Date helpers (local time, Monday-first weeks)
// ---------------------------------------------------------------------------

export function mondayOf(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dow = (date.getDay() + 6) % 7 // Mon = 0
  date.setDate(date.getDate() - dow)
  return date
}

export function iso(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function addDays(d: Date, n: number): Date {
  const date = new Date(d)
  date.setDate(date.getDate() + n)
  return date
}

export function fmtTime(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}

export function fmtHour12(min: number): string {
  const h = Math.floor(min / 60)
  if (h === 12) return '12p'
  return h < 12 ? `${h}a` : `${h - 12}p`
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function fmtDayHeader(d: Date): string {
  return `${DAYS[(d.getDay() + 6) % 7]} ${d.getDate()}`
}

export function fmtWeekLabel(monday: Date): string {
  return `WEEK OF ${monday.getDate()} ${MONTHS[monday.getMonth()]}`
}

// ---------------------------------------------------------------------------
// Seed — rebuilt against the current week on first open
// ---------------------------------------------------------------------------

type SeedSpec = Omit<ScheduleBlock, 'id' | 'date'> & { day: number }

const SEED_SPECS: SeedSpec[] = [
  // Mon
  { day: 0, type: 'class', title: 'Strength Class', startMin: 8 * 60, durationMin: 60, room: 'Main', capacity: 6, enrolled: 5 },
  { day: 0, type: 'open', title: 'Open slot', startMin: 12 * 60, durationMin: 120, room: 'Reformer', note: 'bookable' },
  { day: 0, type: 'class', title: 'Hyrox Class', startMin: 19 * 60 + 30, durationMin: 60, room: 'Main', capacity: 6, enrolled: 5 },
  // Tue
  { day: 1, type: 'pt', title: 'Marcus Lau 1:1', startMin: 7 * 60, durationMin: 60, room: 'VIP', coach: 'Dan' },
  { day: 1, type: 'class', title: 'Strength Class', startMin: 8 * 60, durationMin: 60, room: 'Main', capacity: 6, enrolled: 5 },
  { day: 1, type: 'class', title: 'FITMAMA Strength', startMin: 12 * 60 + 15, durationMin: 60, room: 'Main', capacity: 6, enrolled: 4 },
  { day: 1, type: 'pt', title: 'Priya 1:1', startMin: 18 * 60, durationMin: 60, room: 'Main', coach: 'Ziggy' },
  { day: 1, type: 'class', title: 'Hyrox Class', startMin: 18 * 60 + 30, durationMin: 60, room: 'Main', capacity: 6, enrolled: 6 },
  // Wed
  { day: 2, type: 'class', title: 'Strength Class', startMin: 8 * 60, durationMin: 60, room: 'Main', capacity: 6, enrolled: 6 },
  { day: 2, type: 'class', title: 'FITMAMA Strength', startMin: 12 * 60 + 15, durationMin: 60, room: 'Main', capacity: 6, enrolled: 6 },
  { day: 2, type: 'class', title: 'Hyrox Class', startMin: 19 * 60 + 30, durationMin: 60, room: 'Main', capacity: 6, enrolled: 6 },
  // Thu
  { day: 3, type: 'pt', title: 'Marcus Lau 1:1', startMin: 7 * 60, durationMin: 60, room: 'VIP', coach: 'Dan' },
  { day: 3, type: 'class', title: 'Strength Class', startMin: 8 * 60, durationMin: 60, room: 'Main', capacity: 6, enrolled: 4 },
  { day: 3, type: 'class', title: 'FITMAMA Strength', startMin: 12 * 60 + 15, durationMin: 60, room: 'Main', capacity: 6, enrolled: 4 },
  { day: 3, type: 'pt', title: 'Rachel + David 2:1', startMin: 18 * 60 + 30, durationMin: 60, room: 'VIP', coach: 'Dan' },
  { day: 3, type: 'class', title: 'Hyrox Class', startMin: 19 * 60 + 30, durationMin: 60, room: 'Main', capacity: 6, enrolled: 6 },
  // Fri
  { day: 4, type: 'class', title: 'Strength Class', startMin: 8 * 60, durationMin: 60, room: 'Main', capacity: 6, enrolled: 5 },
  { day: 4, type: 'class', title: 'Hyrox Class', startMin: 18 * 60 + 30, durationMin: 60, room: 'Main', capacity: 6, enrolled: 5 },
]

function buildSeed(): ScheduleBlock[] {
  const monday = mondayOf(new Date())
  return SEED_SPECS.map((s, i) => {
    const { day, ...rest } = s
    return { ...rest, id: `seed-${i}`, date: iso(addDays(monday, day)) }
  })
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

function readStored(): ScheduleBlock[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as ScheduleBlock[]) : null
  } catch {
    return null
  }
}

function writeStored(blocks: ScheduleBlock[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(blocks))
  } catch {
    // storage unavailable — schedule stays seed-only
  }
}

export function listBlocks(): ScheduleBlock[] {
  const stored = readStored()
  if (stored) return stored
  const seed = buildSeed()
  writeStored(seed)
  return seed
}

export function addBlock(input: Omit<ScheduleBlock, 'id'>): ScheduleBlock[] {
  const rows = listBlocks()
  const updated = [...rows, { ...input, id: `blk-${Date.now().toString(36)}` }]
  writeStored(updated)
  return updated
}

export function updateBlock(id: string, patch: Partial<ScheduleBlock>): ScheduleBlock[] {
  const rows = listBlocks()
  const updated = rows.map((r) => (r.id === id ? { ...r, ...patch } : r))
  writeStored(updated)
  return updated
}

export function deleteBlock(id: string): ScheduleBlock[] {
  const rows = listBlocks()
  const updated = rows.filter((r) => r.id !== id)
  writeStored(updated)
  return updated
}
