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
  // Roster rows + a current-week activity summary per client (program workouts
  // and completions aggregated server-side so the cards don't need N+1 calls)
  // + open fraud-flag counts and profile photos.
  if (body.action === 'clients') {
    const { data: clients, error } = await supabase
      .from('clients')
      .select('id,full_name,email,status,photo_url')
      .eq('trainer_id', trainerId)
      .order('full_name')
    if (error) return json({ error: error.message }, 500)
    const list = (clients ?? []) as {
      id: string
      full_name: string
      email: string | null
      status: string | null
      photo_url: string | null
    }[]
    if (list.length === 0) return json({ clients: [] })

    const ids = list.map((c) => c.id)
    const [{ data: programs }, { data: completions }, { data: openFlags }] = await Promise.all([
      supabase
        .from('programs')
        .select('id,client_id,duration_weeks,start_date,updated_at,workouts(id)')
        .in('client_id', ids)
        .order('updated_at', { ascending: false }),
      supabase
        .from('client_session_completions')
        .select('client_id,workout_id,week_number')
        .in('client_id', ids),
      supabase.from('client_flags').select('client_id').eq('status', 'open').in('client_id', ids),
    ])

    // Current program per client = most recently updated assignment.
    const current = new Map<string, { id: string; duration: number; start: string | null; workoutIds: string[] }>()
    for (const p of (programs ?? []) as Record<string, unknown>[]) {
      const cid = String(p.client_id ?? '')
      if (!cid || current.has(cid)) continue
      current.set(cid, {
        id: String(p.id),
        duration: Math.max(1, Number(p.duration_weeks ?? 1) || 1),
        start: (p.start_date as string | null) ?? null,
        workoutIds: ((p.workouts ?? []) as { id: string }[]).map((w) => w.id),
      })
    }

    const flagCount = new Map<string, number>()
    for (const f of (openFlags ?? []) as { client_id: string }[]) {
      flagCount.set(f.client_id, (flagCount.get(f.client_id) ?? 0) + 1)
    }

    const now = Date.now()
    const byClient = new Map<string, { week: number; done: number; total: number }>()
    for (const [cid, prog] of current) {
      if (prog.workoutIds.length === 0) continue
      let week = 1
      if (prog.start) {
        const days = Math.floor((now - new Date(prog.start).getTime()) / 86_400_000)
        week = Math.min(Math.max(1, Math.floor(days / 7) + 1), prog.duration)
      }
      const idsSet = new Set(prog.workoutIds)
      const done = ((completions ?? []) as Record<string, unknown>[]).filter(
        (c) => String(c.client_id) === cid && Number(c.week_number) === week && idsSet.has(String(c.workout_id)),
      ).length
      byClient.set(cid, { week, done, total: prog.workoutIds.length })
    }

    return json({
      clients: list.map((c) => ({
        ...c,
        activity: byClient.get(c.id) ?? null,
        open_flags: flagCount.get(c.id) ?? 0,
      })),
    })
  }

  // ---- action: upload_photo ------------------------------------------------
  // Store a face photo for a client in the public client-photos bucket and
  // pin the URL on the client row. Front-desk flow: snap/attach, done.
  if (body.action === 'upload_photo') {
    const clientId = String(body.client_id ?? '')
    const dataBase64 = String(body.data_base64 ?? '').replace(/^data:image\/\w+;base64,/, '')
    if (!clientId || !dataBase64) return json({ error: 'client_id and data_base64 required' }, 400)
    let bytes: Uint8Array
    try {
      const bin = atob(dataBase64)
      bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0))
    } catch {
      return json({ error: 'invalid base64 image data' }, 400)
    }
    if (bytes.length > 500_000) return json({ error: 'image too large — keep it under ~500 KB' }, 400)
    const path = `${clientId}.jpg`
    const { error: upErr } = await supabase.storage
      .from('client-photos')
      .upload(path, bytes, { contentType: 'image/jpeg', upsert: true })
    if (upErr) return json({ error: upErr.message }, 500)
    const { data: urlData } = supabase.storage.from('client-photos').getPublicUrl(path)
    const photoUrl = `${urlData.publicUrl}?v=${Date.now()}`
    const { error: updErr } = await supabase
      .from('clients')
      .update({ photo_url: photoUrl })
      .eq('id', clientId)
    if (updErr) return json({ error: updErr.message }, 500)
    return json({ ok: true, photo_url: photoUrl })
  }

  // ---- action: flag_client ---------------------------------------------------
  // Discreet fraud flag: staff suspect the person scanning in isn't the member.
  // No confrontation — flag, and management reviews from the flags list.
  if (body.action === 'flag_client') {
    const clientId = String(body.client_id ?? '')
    const reason = String(body.reason ?? '').trim()
    const flaggedBy = String(body.flagged_by ?? 'staff').trim() || 'staff'
    if (!clientId) return json({ error: 'client_id required' }, 400)
    const { data, error } = await supabase
      .from('client_flags')
      .insert({ client_id: clientId, flagged_by: flaggedBy, reason })
      .select('id,created_at')
      .single()
    if (error || !data) return json({ error: error?.message ?? 'flag failed' }, 500)
    return json({ ok: true, flag: data })
  }

  // ---- action: update_flag ---------------------------------------------------
  // Management review: move a flag through open → reviewing → resolved.
  if (body.action === 'update_flag') {
    const flagId = String(body.flag_id ?? '')
    const status = String(body.status ?? '')
    const notes = body.notes != null ? String(body.notes) : null
    if (!flagId || !['open', 'reviewing', 'resolved'].includes(status)) {
      return json({ error: 'flag_id and valid status required' }, 400)
    }
    const { data, error } = await supabase
      .from('client_flags')
      .update({
        status,
        resolution_notes: notes,
        resolved_at: status === 'resolved' ? new Date().toISOString() : null,
      })
      .eq('id', flagId)
      .select('id,status')
      .single()
    if (error || !data) return json({ error: error?.message ?? 'update failed' }, 500)
    return json({ ok: true, flag: data })
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

  // ---- action: client_detail ---------------------------------------------------
  // Full client dashboard: profile row + assigned programs (with workouts and
  // exercises) + recent class bookings matched by email.
  if (body.action === 'client_detail') {
    const clientId = String(body.client_id ?? '')
    if (!clientId) return json({ error: 'client_id required' }, 400)
    const { data: client, error: clientErr } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single()
    if (clientErr || !client) return json({ error: clientErr?.message ?? 'client not found' }, 404)

    const { data: programs } = await supabase
      .from('programs')
      .select(
        'id,name,description,duration_weeks,frequency_per_week,status,start_date,end_date,phase_name,sheet_id,sheet_synced_at,updated_at,workouts(id,name,notes,day_of_week,week_number,exercises(name,sets,reps,rest_seconds,order_index,notes))',
      )
      .eq('client_id', clientId)
      .order('updated_at', { ascending: false })

    const email = (client as Record<string, unknown>).email
      ? String((client as Record<string, unknown>).email).toLowerCase()
      : null
    let bookings: unknown[] = []
    if (email) {
      const { data: bks } = await supabase
        .from('bookings')
        .select('id,class_id,member_name,status,created_at,classes(name,day_of_week,time_label,coach_name)')
        .eq('member_label', email)
        .order('created_at', { ascending: false })
        .limit(10)
      bookings = (bks ?? []) as unknown[]
    }

    const { data: completions } = await supabase
      .from('client_session_completions')
      .select('workout_id,week_number,completed_at')
      .eq('client_id', clientId)
      .order('completed_at', { ascending: false })

    const { data: flags } = await supabase
      .from('client_flags')
      .select('id,flagged_by,reason,status,resolution_notes,created_at,resolved_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(20)

    const shaped = ((programs ?? []) as Record<string, unknown>[]).map((p) => {
      const workouts = ((p.workouts ?? []) as Record<string, unknown>[])
        .map((w) => ({
          ...w,
          exercises: ((w.exercises ?? []) as Record<string, unknown>[]).sort(
            (a, b) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0),
          ),
        }))
        .sort((a, b) => String(a.name).localeCompare(String(b.name)))
      const { workouts: _w, ...rest } = p
      return { ...rest, workouts }
    })
    return json({ client, programs: shaped, bookings, completions: completions ?? [], flags: flags ?? [] })
  }

  // ---- action: my_program ------------------------------------------------------
  // Client-portal view: look the member up by email, return their current
  // (most recently updated) assigned program plus session completions so the
  // client can check off workouts week by week.
  if (body.action === 'my_program') {
    const email = String(body.email ?? '').trim().toLowerCase()
    if (!email) return json({ error: 'email required' }, 400)
    const { data: client, error: clientErr } = await supabase
      .from('clients')
      .select('id,full_name,fitness_goal,experience_level,status')
      .ilike('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (clientErr) return json({ error: clientErr.message }, 500)
    if (!client) return json({ client: null, program: null, completions: [] })

    const { data: program } = await supabase
      .from('programs')
      .select(
        'id,name,description,duration_weeks,frequency_per_week,status,start_date,phase_name,updated_at,workouts(id,name,notes,day_of_week,week_number,exercises(name,sets,reps,rest_seconds,order_index,notes))',
      )
      .eq('client_id', (client as { id: string }).id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const { data: completions } = await supabase
      .from('client_session_completions')
      .select('workout_id,week_number,completed_at')
      .eq('client_id', (client as { id: string }).id)

    let shaped: Record<string, unknown> | null = null
    if (program) {
      const p = program as Record<string, unknown>
      const workouts = ((p.workouts ?? []) as Record<string, unknown>[])
        .map((w) => ({
          ...w,
          exercises: ((w.exercises ?? []) as Record<string, unknown>[]).sort(
            (a, b) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0),
          ),
        }))
        .sort((a, b) => String(a.name).localeCompare(String(b.name)))
      const { workouts: _w, ...rest } = p
      shaped = { ...rest, workouts }
    }
    return json({ client, program: shaped, completions: completions ?? [] })
  }

  // ---- action: complete_session ------------------------------------------------
  // Toggle a workout completion for (client by email, workout, week).
  if (body.action === 'complete_session') {
    const email = String(body.email ?? '').trim().toLowerCase()
    const workoutId = String(body.workout_id ?? '')
    const weekNumber = Math.max(1, Number(body.week_number ?? 1) || 1)
    const done = Boolean(body.done)
    if (!email || !workoutId) return json({ error: 'email and workout_id required' }, 400)
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .ilike('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!client) return json({ error: 'no client row for this email' }, 404)
    const clientId = (client as { id: string }).id

    if (done) {
      const { error } = await supabase
        .from('client_session_completions')
        .upsert(
          { client_id: clientId, workout_id: workoutId, week_number: weekNumber },
          { onConflict: 'client_id,workout_id,week_number' },
        )
      if (error) return json({ error: error.message }, 500)
      return json({ ok: true, done: true })
    }
    const { error } = await supabase
      .from('client_session_completions')
      .delete()
      .eq('client_id', clientId)
      .eq('workout_id', workoutId)
      .eq('week_number', weekNumber)
    if (error) return json({ error: error.message }, 500)
    return json({ ok: true, done: false })
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
