import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

// Schedule admin endpoint — the only write path for `schedule_blocks`
// (RLS grants public read only). Owner + front-desk schedule grids share
// one cloud truth: edits made in either surface appear in the other, in
// every open browser, because reads go straight to Postgres.
//
// Same demo-grade gate as book-class: a shared builder secret instead of
// real Supabase Auth. Staff identity arrives with real auth.
const BUILDER_SECRET = 'vault_bld_8f3a91c27d54e6b0'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })

// --- demo week seed (port of src/lib/schedule.ts SEED_SPECS) ---------------

interface SeedSpec {
  day: number
  type: 'pt' | 'class' | 'open'
  title: string
  startMin: number
  durationMin: number
  room: string
  coach?: string
  capacity?: number
  enrolled?: number
  note?: string
}

const SEED_SPECS: SeedSpec[] = [
  { day: 0, type: 'class', title: 'Strength Class', startMin: 8 * 60, durationMin: 60, room: 'Main', capacity: 6, enrolled: 5 },
  { day: 0, type: 'open', title: 'Open slot', startMin: 12 * 60, durationMin: 120, room: 'Reformer', note: 'bookable' },
  { day: 0, type: 'class', title: 'Hyrox Class', startMin: 19 * 60 + 30, durationMin: 60, room: 'Main', capacity: 6, enrolled: 5 },
  { day: 1, type: 'pt', title: 'Marcus Lau 1:1', startMin: 7 * 60, durationMin: 60, room: 'VIP', coach: 'Dan' },
  { day: 1, type: 'class', title: 'Strength Class', startMin: 8 * 60, durationMin: 60, room: 'Main', capacity: 6, enrolled: 5 },
  { day: 1, type: 'class', title: 'FITMAMA Strength', startMin: 12 * 60 + 15, durationMin: 60, room: 'Main', capacity: 6, enrolled: 4 },
  { day: 1, type: 'pt', title: 'Priya 1:1', startMin: 17 * 60, durationMin: 60, room: 'Main', coach: 'Ziggy' },
  { day: 1, type: 'class', title: 'Hyrox Class', startMin: 18 * 60 + 30, durationMin: 60, room: 'Main', capacity: 6, enrolled: 6 },
  { day: 2, type: 'class', title: 'Strength Class', startMin: 8 * 60, durationMin: 60, room: 'Main', capacity: 6, enrolled: 6 },
  { day: 2, type: 'class', title: 'FITMAMA Strength', startMin: 12 * 60 + 15, durationMin: 60, room: 'Main', capacity: 6, enrolled: 6 },
  { day: 2, type: 'class', title: 'Hyrox Class', startMin: 19 * 60 + 30, durationMin: 60, room: 'Main', capacity: 6, enrolled: 6 },
  { day: 3, type: 'pt', title: 'Marcus Lau 1:1', startMin: 7 * 60, durationMin: 60, room: 'VIP', coach: 'Dan' },
  { day: 3, type: 'class', title: 'Strength Class', startMin: 8 * 60, durationMin: 60, room: 'Main', capacity: 6, enrolled: 4 },
  { day: 3, type: 'class', title: 'FITMAMA Strength', startMin: 12 * 60 + 15, durationMin: 60, room: 'Main', capacity: 6, enrolled: 4 },
  { day: 3, type: 'pt', title: 'Rachel + David 2:1', startMin: 18 * 60 + 30, durationMin: 60, room: 'VIP', coach: 'Dan' },
  { day: 3, type: 'class', title: 'Hyrox Class', startMin: 19 * 60 + 30, durationMin: 60, room: 'Main', capacity: 6, enrolled: 6 },
  { day: 4, type: 'class', title: 'Strength Class', startMin: 8 * 60, durationMin: 60, room: 'Main', capacity: 6, enrolled: 5 },
  { day: 4, type: 'class', title: 'Hyrox Class', startMin: 18 * 60 + 30, durationMin: 60, room: 'Main', capacity: 6, enrolled: 5 },
]

/** Monday (yyyy-mm-dd) of the week containing the given ISO date. */
function mondayOf(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`)
  const dow = (d.getUTCDay() + 6) % 7 // Mon = 0
  d.setUTCDate(d.getUTCDate() - dow)
  return d.toISOString().slice(0, 10)
}

function addDaysIso(isoDate: string, n: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function isIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`))
}

/** Insert the demo week for `monday` when that week has no blocks yet. */
async function ensureWeek(
  sb: ReturnType<typeof createClient>,
  monday: string,
): Promise<{ seeded: number }> {
  const friday = addDaysIso(monday, 4)
  const { count } = await sb
    .from('schedule_blocks')
    .select('id', { count: 'exact', head: true })
    .gte('date', monday)
    .lte('date', friday)
  if (count && count > 0) return { seeded: 0 }
  const rows = SEED_SPECS.map((s) => ({
    type: s.type,
    title: s.title,
    date: addDaysIso(monday, s.day),
    start_min: s.startMin,
    duration_min: s.durationMin,
    room: s.room,
    coach: s.coach ?? null,
    capacity: s.capacity ?? null,
    enrolled: s.enrolled ?? null,
    note: s.note ?? null,
  }))
  const { error } = await sb.from('schedule_blocks').insert(rows)
  if (error) throw new Error(`seed failed: ${error.message}`)
  return { seeded: rows.length }
}

// --- handler ----------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json' }, 400)
  }
  if (body?.secret !== BUILDER_SECRET) return json({ error: 'unauthorized' }, 401)

  const action = String(body.action ?? 'list')
  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    if (action === 'ensure_week') {
      const date = String(body.date ?? new Date().toISOString().slice(0, 10))
      if (!isIsoDate(date)) return json({ error: 'date must be yyyy-mm-dd' }, 400)
      return json(await ensureWeek(sb, mondayOf(date)))
    }

    if (action === 'list') {
      const from = String(body.from ?? '')
      const to = String(body.to ?? '')
      if (!isIsoDate(from) || !isIsoDate(to)) return json({ error: 'from/to must be yyyy-mm-dd' }, 400)
      const { data, error } = await sb
        .from('schedule_blocks')
        .select('*')
        .gte('date', from)
        .lte('date', to)
        .order('date')
        .order('start_min')
      if (error) return json({ error: error.message }, 400)
      return json({ blocks: data ?? [] })
    }

    if (action === 'create') {
      const b = (body.block ?? {}) as Record<string, unknown>
      const row = {
        type: String(b.type ?? 'class'),
        title: String(b.title ?? '').trim(),
        date: String(b.date ?? ''),
        start_min: Number(b.startMin ?? 0),
        duration_min: Number(b.durationMin ?? 60),
        room: String(b.room ?? 'Main'),
        coach: b.coach ? String(b.coach) : null,
        capacity: b.capacity != null ? Number(b.capacity) : null,
        enrolled: b.enrolled != null ? Number(b.enrolled) : null,
        note: b.note ? String(b.note) : null,
      }
      if (!row.title || !isIsoDate(row.date)) return json({ error: 'title and valid date required' }, 400)
      const { data, error } = await sb.from('schedule_blocks').insert(row).select('*').single()
      if (error) return json({ error: error.message }, 400)
      return json({ block: data })
    }

    if (action === 'update') {
      const id = String(body.id ?? '')
      const patch = (body.patch ?? {}) as Record<string, unknown>
      const fieldMap: Record<string, string> = {
        type: 'type', title: 'title', date: 'date', startMin: 'start_min',
        durationMin: 'duration_min', room: 'room', coach: 'coach',
        capacity: 'capacity', enrolled: 'enrolled', note: 'note',
      }
      const mapped: Record<string, unknown> = { updated_at: new Date().toISOString() }
      for (const [key, col] of Object.entries(fieldMap)) {
        if (key in patch) mapped[col] = patch[key] === undefined ? null : patch[key]
      }
      if (!id || !Object.keys(mapped).length) return json({ error: 'id and patch required' }, 400)
      const { data, error } = await sb.from('schedule_blocks').update(mapped).eq('id', id).select('*').single()
      if (error) return json({ error: error.message }, 400)
      return json({ block: data })
    }

    if (action === 'delete') {
      const id = String(body.id ?? '')
      if (!id) return json({ error: 'id required' }, 400)
      const { error } = await sb.from('schedule_blocks').delete().eq('id', id)
      if (error) return json({ error: error.message }, 400)
      return json({ deleted: true })
    }

    return json({ error: `unknown action: ${action}` }, 400)
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
