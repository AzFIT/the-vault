import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

// Program builder persistence — the coach portal's save/load/assign endpoint.
// Demo-grade gate: the same secret ships in the frontend bundle. Before
// go-live, move this to a Supabase env var and switch to real trainer auth.
const BUILDER_SECRET = 'vault_bld_8f3a91c27d54e6b0'
// Coach Demo (DEMO) — the trainer profile that owns the app's client roster.
const DEFAULT_TRAINER = 'b82bc96b-1c24-4722-835e-abd73d1c9750'

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

Deno.serve(async (req: Request) => {
  // Browser preflight (supabase-js sends authorization/apikey headers).
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json' }, 400)
  }
  if (body?.secret !== BUILDER_SECRET) return json({ error: 'unauthorized' }, 401)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  const trainerId = String(body.trainer_id ?? DEFAULT_TRAINER)

  // ---- action: clients -----------------------------------------------------
  if (body.action === 'clients') {
    const { data, error } = await supabase
      .from('clients')
      .select('id,full_name,email,status')
      .eq('trainer_id', trainerId)
      .order('full_name')
    if (error) return json({ error: error.message }, 500)
    return json({ clients: data ?? [] })
  }

  // ---- action: assign ------------------------------------------------------
  // Link (or unlink, with client_id null) a program to a client row.
  if (body.action === 'assign') {
    const programId = String(body.program_id ?? '')
    const clientId = body.client_id ? String(body.client_id) : null
    if (!programId) return json({ error: 'program_id required' }, 400)
    const { data, error } = await supabase
      .from('programs')
      .update({ client_id: clientId, updated_at: new Date().toISOString() })
      .eq('id', programId)
      .eq('trainer_id', trainerId)
      .select('id,client_id')
      .single()
    if (error || !data) return json({ error: error?.message ?? 'assign failed' }, 500)
    return json(data)
  }

  // ---- action: load ----------------------------------------------------------
  // Return the trainer's programs with workouts, exercises, assigned client
  // and Google Sheets link state nested. One embedded select — the previous
  // N+1 version took ~36s with 60 programs / 221 workouts / 1.4k exercises
  // and timed out in the browser.
  if (body.action === 'load') {
    const [{ data: clients }, { data: programs, error }] = await Promise.all([
      supabase.from('clients').select('id,full_name').eq('trainer_id', trainerId),
      supabase
        .from('programs')
        .select(
          'id,name,description,duration_weeks,frequency_per_week,status,phases,client_id,sheet_id,sheet_synced_at,created_at,workouts(id,name,notes,week_number,exercises(name,sets,reps,rest_seconds,order_index,notes))',
        )
        .eq('trainer_id', trainerId)
        .order('created_at', { ascending: false }),
    ])
    if (error) return json({ error: error.message }, 500)

    const clientName = new Map<string, string>()
    for (const c of (clients ?? []) as { id: string; full_name: string }[]) {
      clientName.set(c.id, c.full_name)
    }

    const result = ((programs ?? []) as Record<string, unknown>[]).map((p) => {
      const workouts = ((p.workouts ?? []) as Record<string, unknown>[])
        .map((w) => ({
          ...w,
          // Sort client-side — PostgREST can't order an embedded resource
          // by a sibling table's column.
          exercises: ((w.exercises ?? []) as Record<string, unknown>[]).sort(
            (a, b) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0),
          ),
        }))
        .sort((a, b) => String(a.name).localeCompare(String(b.name)))
      const assignee = p.client_id ? (clientName.get(String(p.client_id)) ?? null) : null
      const { workouts: _w, ...rest } = p
      return { ...rest, client_name: assignee, workouts }
    })
    return json({ programs: result })
  }

  // ---- action: save (default) ------------------------------------------------
  const name = String(body.name ?? '').trim()
  const workouts = Array.isArray(body.workouts) ? (body.workouts as Record<string, unknown>[]) : []
  if (!name) return json({ error: 'name required' }, 400)
  if (workouts.length === 0) return json({ error: 'at least one workout required' }, 400)

  // Idempotent upsert: match an existing draft by (trainer, name) and replace
  // its contents so the builder can be re-saved freely.
  const { data: existing } = await supabase
    .from('programs')
    .select('id')
    .eq('trainer_id', trainerId)
    .eq('name', name)
    .maybeSingle()

  let programId: string
  let replaced = false

  if (existing) {
    programId = (existing as { id: string }).id
    replaced = true
    const { data: oldWorkouts } = await supabase
      .from('workouts')
      .select('id')
      .eq('program_id', programId)
    const ids = ((oldWorkouts ?? []) as { id: string }[]).map((w) => w.id)
    for (const id of ids) {
      await supabase.from('exercises').delete().eq('workout_id', id)
    }
    if (ids.length) await supabase.from('workouts').delete().in('id', ids)
    await supabase
      .from('programs')
      .update({
        duration_weeks: (body.duration_weeks as number | null) ?? null,
        frequency_per_week: (body.frequency_per_week as number | null) ?? null,
        phases: (body.phases as object | null) ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', programId)
  } else {
    const { data: created, error } = await supabase
      .from('programs')
      .insert({
        trainer_id: trainerId,
        name,
        duration_weeks: (body.duration_weeks as number | null) ?? null,
        frequency_per_week: (body.frequency_per_week as number | null) ?? null,
        status: 'draft',
        phases: (body.phases as object | null) ?? null,
      })
      .select('id')
      .single()
    if (error || !created) return json({ error: error?.message ?? 'insert failed' }, 500)
    programId = (created as { id: string }).id
  }

  let workoutsCreated = 0
  let exercisesCreated = 0

  for (const w of workouts) {
    const { data: wo, error } = await supabase
      .from('workouts')
      .insert({
        program_id: programId,
        name: String(w.name ?? 'Session'),
        notes: (w.notes as string | null) ?? null,
      })
      .select('id')
      .single()
    if (error || !wo) continue
    workoutsCreated += 1

    const exs = Array.isArray(w.exercises) ? (w.exercises as Record<string, unknown>[]) : []
    const rows = exs
      .map((e, i) => ({
        workout_id: (wo as { id: string }).id,
        name: String(e.name ?? '').trim(),
        sets: (e.sets as number | null) ?? null,
        reps: e.reps != null ? String(e.reps) : null,
        rest_seconds: (e.rest_seconds as number | null) ?? null,
        order_index: (e.order_index as number | null) ?? i + 1,
        notes: (e.notes as string | null) ?? null,
      }))
      .filter((r) => r.name)
    if (rows.length) {
      const { data: ins } = await supabase.from('exercises').insert(rows).select('id')
      exercisesCreated += ((ins ?? []) as { id: string }[]).length
    }
  }

  return json({ program_id: programId, workouts_created: workoutsCreated, exercises_created: exercisesCreated, replaced })
})
