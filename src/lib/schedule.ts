/**
 * Schedule data layer — the owner portal's week grid (wireframe screen 04).
 * Three block types: 'pt' (gold, revenue-bearing 1:1/2:1), 'class' (white,
 * group class with capacity), 'open' (dashed, bookable room slot).
 *
 * Phase 2 of the cloud migration: blocks persist in Supabase
 * (`schedule_blocks`, public read via RLS) and writes go through the
 * `manage-schedule` Edge Function. The exported sync API is unchanged —
 * `listBlocks()` reads a module cache seeded with the demo week so first
 * paint is instant, `refreshSchedule()` hydrates from the cloud and fires
 * SCHEDULE_EVENT, and the CRUD functions are async underneath (pages wire
 * them with `.then()` / the event). Owner and front-desk grids share one
 * cloud truth: an edit in either surface appears in the other.
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

const FN_URL = 'https://gcurvjprfwecbchreieu.supabase.co/functions/v1/manage-schedule'
const BUILDER_SECRET = 'vault_bld_8f3a91c27d54e6b0'

export const SCHEDULE_EVENT = 'vault-schedule-changed'

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
  { day: 1, type: 'pt', title: 'Priya 1:1', startMin: 17 * 60, durationMin: 60, room: 'Main', coach: 'Ziggy' },
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
// Store — module cache over Supabase, seeded with the demo week
// ---------------------------------------------------------------------------

function notify() {
  window.dispatchEvent(new Event(SCHEDULE_EVENT))
}

/** Demo-week cache so the grid renders before the cloud round-trip. */
const cache: ScheduleBlock[] = buildSeed()
/** Weeks already ensured server-side (avoid a ensure_week call per render). */
const ensuredWeeks = new Set<string>()

async function callFn(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(FN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: BUILDER_SECRET, ...body }),
  })
  const parsed = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok || parsed.error) throw new Error(String(parsed.error ?? `HTTP ${res.status}`))
  return parsed
}

interface CloudBlock {
  id: string
  type: BlockType
  title: string
  date: string
  start_min: number
  duration_min: number
  room: string
  coach: string | null
  capacity: number | null
  enrolled: number | null
  note: string | null
}

function fromCloud(b: CloudBlock): ScheduleBlock {
  return {
    id: b.id,
    type: b.type,
    title: b.title,
    date: String(b.date).slice(0, 10),
    startMin: b.start_min,
    durationMin: b.duration_min,
    room: b.room,
    coach: b.coach ?? undefined,
    capacity: b.capacity ?? undefined,
    enrolled: b.enrolled ?? undefined,
    note: b.note ?? undefined,
  }
}

/** Load a week range from the cloud into the cache. Dates: ISO yyyy-mm-dd. */
export async function refreshSchedule(fromIso: string, toIso: string): Promise<void> {
  const { blocks } = (await callFn({ action: 'list', from: fromIso, to: toIso })) as {
    blocks: CloudBlock[]
  }
  const incoming = new Set(blocks.map((b) => b.id))
  // Drop cached rows inside the range that no longer exist upstream, then
  // upsert the fetched rows (other weeks in the cache are untouched).
  for (let i = cache.length - 1; i >= 0; i--) {
    if (cache[i].date >= fromIso && cache[i].date <= toIso && !incoming.has(cache[i].id)) {
      cache.splice(i, 1)
    }
  }
  for (const b of blocks) {
    const row = fromCloud(b)
    const idx = cache.findIndex((c) => c.id === row.id)
    if (idx >= 0) cache[idx] = row
    else cache.push(row)
  }
  notify()
}

/** Seed the demo week server-side if that week has no blocks yet. */
export async function ensureWeek(dateIso: string): Promise<void> {
  const monday = iso(mondayOf(new Date(`${dateIso}T00:00:00`)))
  if (ensuredWeeks.has(monday)) return
  ensuredWeeks.add(monday)
  try {
    await callFn({ action: 'ensure_week', date: dateIso })
  } catch {
    ensuredWeeks.delete(monday) // allow retry on next visit
  }
}

export function listBlocks(): ScheduleBlock[] {
  return cache
}

export async function addBlock(input: Omit<ScheduleBlock, 'id'>): Promise<void> {
  const { block } = (await callFn({ action: 'create', block: input })) as { block: CloudBlock }
  // Optimistic cache update — the grid reflects the write immediately even
  // if the follow-up refresh round-trip fails.
  cache.push(fromCloud(block))
  notify()
  await refreshSchedule(input.date, input.date).catch(() => undefined)
}

export async function updateBlock(id: string, patch: Partial<ScheduleBlock>): Promise<void> {
  const current = cache.find((r) => r.id === id)
  // JSON drops undefined keys — convert them to null so clearing a field
  // (coach, note…) actually writes NULL upstream instead of being ignored.
  const cleaned = Object.fromEntries(
    Object.entries(patch).map(([k, v]) => [k, v === undefined ? null : v]),
  )
  const { block } = (await callFn({ action: 'update', id, patch: cleaned })) as { block: CloudBlock }
  const idx = cache.findIndex((r) => r.id === id)
  if (idx >= 0) cache[idx] = fromCloud(block)
  notify()
  if (current) await refreshSchedule(current.date, current.date).catch(() => undefined)
}

export async function deleteBlock(id: string): Promise<void> {
  const current = cache.find((r) => r.id === id)
  await callFn({ action: 'delete', id })
  const idx = cache.findIndex((r) => r.id === id)
  if (idx >= 0) cache.splice(idx, 1)
  notify()
  if (current) await refreshSchedule(current.date, current.date).catch(() => undefined)
}
