import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

// Two-way Google Sheets sync for the Vault program builder.
//
// Auth model: a Google service account JSON lives in the
// GOOGLE_SERVICE_ACCOUNT_JSON project secret (never in the frontend). The
// spreadsheet is created by (or shared with) the service account, and the
// trainer edits it from their own Google account after sharing.
//
// Same demo-grade gate as save-program: real Supabase Auth before go-live.
const BUILDER_SECRET = 'vault_bld_8f3a91c27d54e6b0'
const DEFAULT_TRAINER = 'b82bc96b-1c24-4722-835e-abd73d1c9750'

const SHEETS_SCOPE =
  'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file'
const SHEETS_API = 'https://sheets.googleapis.com/v4'

const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

// ---------------------------------------------------------------------------
// Google service-account auth (hand-rolled RS256 JWT → OAuth access token)
// ---------------------------------------------------------------------------

interface ServiceAccount {
  client_email: string
  private_key: string
  token_uri?: string
}

function getServiceAccount(): ServiceAccount | null {
  const raw = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON')
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (parsed?.client_email && parsed?.private_key) return parsed as ServiceAccount
    return null
  } catch {
    return null
  }
}

/** Fallback: read the service account JSON from the private sync_config table
 *  (service-role only, no RLS grants) when the env secret is not set. The
 *  hosted runtime only exposes Dashboard/CLI secrets via Deno.env, so the
 *  demo stores the key here instead. */
async function getServiceAccountFromDb(
  supabase: ReturnType<typeof createClient>,
): Promise<ServiceAccount | null> {
  try {
    const { data } = await supabase
      .from('sync_config')
      .select('value')
      .eq('key', 'google_service_account_json')
      .maybeSingle()
    if (!data?.value) return null
    const parsed = JSON.parse(String((data as { value: string }).value))
    if (parsed?.client_email && parsed?.private_key) return parsed as ServiceAccount
    return null
  } catch {
    return null
  }
}

/** Env secret wins; DB fallback keeps the sync working without dashboard access. */
async function resolveServiceAccount(
  supabase: ReturnType<typeof createClient>,
): Promise<ServiceAccount | null> {
  return getServiceAccount() ?? (await getServiceAccountFromDb(supabase))
}

const b64url = (data: Uint8Array | ArrayBuffer): string => {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function googleAccessToken(sa: ServiceAccount): Promise<string> {
  const pem = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '')
  const binary = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0))
  const key = await crypto.subtle.importKey(
    'pkcs8',
    binary.buffer as ArrayBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const now = Math.floor(Date.now() / 1000)
  const header = b64url(new TextEncoder().encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })))
  const payload = b64url(
    new TextEncoder().encode(
      JSON.stringify({
        iss: sa.client_email,
        scope: SHEETS_SCOPE,
        aud: sa.token_uri ?? 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now,
      }),
    ),
  )
  const unsigned = `${header}.${payload}`
  const sig = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    key,
    new TextEncoder().encode(unsigned),
  )
  const jwt = `${unsigned}.${b64url(sig)}`
  const tokenUri = sa.token_uri ?? 'https://oauth2.googleapis.com/token'
  const res = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.access_token) {
    throw new Error(
      `Google auth failed: ${data.error_description ?? data.error ?? `HTTP ${res.status}`}`,
    )
  }
  return data.access_token as string
}

/** Grant a Google user writer access to a spreadsheet (uses drive.file scope). */
async function shareSpreadsheet(token: string, spreadsheetId: string, email: string): Promise<void> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'writer', type: 'user', emailAddress: email }),
    },
  )
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(
      `Drive share failed: ${(data.error as { message?: string } | undefined)?.message ?? `HTTP ${res.status}`}`,
    )
  }
}

async function gfetch(token: string, path: string, init?: RequestInit): Promise<Record<string, unknown>> {
  const res = await fetch(`${SHEETS_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg =
      (data.error as { message?: string } | undefined)?.message ??
      JSON.stringify(data).slice(0, 200)
    throw new Error(`Google Sheets API ${res.status}: ${msg}`)
  }
  return data as Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Sheet layout helpers
// ---------------------------------------------------------------------------

const HEADERS = ['Exercise', 'Sets', 'Reps', 'Rest (s)', 'Notes']

/** Strip characters Google forbids in tab titles; dedupe against taken set. */
function cleanTabTitle(name: string, taken: Set<string>): string {
  const base = name
    .replace(/[\[\]*?/\\:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90) || 'Session'
  let candidate = base
  let n = 2
  while (taken.has(candidate)) {
    candidate = `${base} (${n++})`.slice(0, 100)
  }
  taken.add(candidate)
  return candidate
}

interface SheetExercise {
  name: string
  sets: number | null
  reps: string | null
  rest_seconds: number | null
  notes: string | null
}
interface SheetWorkout {
  name: string
  notes: string | null
  exercises: SheetExercise[]
}

function workoutValues(w: SheetWorkout): string[][] {
  return [
    HEADERS,
    ...w.exercises.map((e) => [
      e.name,
      e.sets != null ? String(e.sets) : '',
      e.reps ?? '',
      e.rest_seconds != null ? String(e.rest_seconds) : '',
      e.notes ?? '',
    ]),
  ]
}

function summaryValues(prog: Record<string, unknown>, clientName: string | null, now: string): string[][] {
  return [
    [`THE VAULT — ${String(prog.name ?? 'Program')}`],
    ['Program builder ↔ Google Sheets sync'],
    [],
    ['Program ID', String(prog.id)],
    ['Weeks', prog.duration_weeks != null ? String(prog.duration_weeks) : ''],
    ['Frequency / week', prog.frequency_per_week != null ? String(prog.frequency_per_week) : ''],
    ['Status', String(prog.status ?? '')],
    ['Client', clientName ?? ''],
    ['Last synced', now],
    [],
    ['Edit the session tabs below and use "Import from Sheets" in the builder to pull changes back.'],
  ]
}

// ---------------------------------------------------------------------------
// Database helpers
// ---------------------------------------------------------------------------

async function fetchProgram(
  supabase: ReturnType<typeof createClient>,
  programId: string,
  trainerId: string,
): Promise<{ prog: Record<string, unknown>; workouts: SheetWorkout[]; clientName: string | null }> {
  const { data: prog, error } = await supabase
    .from('programs')
    .select('id,name,duration_weeks,frequency_per_week,status,client_id,sheet_id')
    .eq('id', programId)
    .eq('trainer_id', trainerId)
    .single()
  if (error || !prog) throw new Error('program not found for this trainer')

  const { data: workouts } = await supabase
    .from('workouts')
    .select('id,name,notes')
    .eq('program_id', programId)
    .order('name')
  const out: SheetWorkout[] = []
  for (const w of (workouts ?? []) as Record<string, unknown>[]) {
    const { data: exs } = await supabase
      .from('exercises')
      .select('name,sets,reps,rest_seconds,order_index,notes')
      .eq('workout_id', String(w.id))
      .order('order_index')
    out.push({
      name: String(w.name ?? 'Session'),
      notes: (w.notes as string | null) ?? null,
      exercises: ((exs ?? []) as Record<string, unknown>[]).map((e) => ({
        name: String(e.name ?? ''),
        sets: (e.sets as number | null) ?? null,
        reps: e.reps != null ? String(e.reps) : null,
        rest_seconds: (e.rest_seconds as number | null) ?? null,
        notes: (e.notes as string | null) ?? null,
      })),
    })
  }

  let clientName: string | null = null
  const clientId = (prog as { client_id?: string | null }).client_id
  if (clientId) {
    const { data: c } = await supabase.from('clients').select('full_name').eq('id', clientId).single()
    clientName = (c as { full_name?: string } | null)?.full_name ?? null
  }
  return { prog: prog as Record<string, unknown>, workouts: out, clientName }
}

/** Replace a program's workouts/exercises with the given set (same as save). */
async function replaceContent(
  supabase: ReturnType<typeof createClient>,
  programId: string,
  workouts: SheetWorkout[],
): Promise<{ workouts_imported: number; exercises_imported: number }> {
  const { data: oldWorkouts } = await supabase
    .from('workouts')
    .select('id')
    .eq('program_id', programId)
  const ids = ((oldWorkouts ?? []) as { id: string }[]).map((w) => w.id)
  for (const id of ids) {
    await supabase.from('exercises').delete().eq('workout_id', id)
  }
  if (ids.length) await supabase.from('workouts').delete().in('id', ids)

  let workoutsImported = 0
  let exercisesImported = 0
  for (const w of workouts) {
    const { data: wo, error } = await supabase
      .from('workouts')
      .insert({ program_id: programId, name: w.name, notes: w.notes })
      .select('id')
      .single()
    if (error || !wo) continue
    workoutsImported += 1
    const rows = w.exercises
      .map((e, i) => ({
        workout_id: (wo as { id: string }).id,
        name: e.name.trim(),
        sets: e.sets,
        reps: e.reps,
        rest_seconds: e.rest_seconds,
        order_index: i + 1,
        notes: e.notes,
      }))
      .filter((r) => r.name)
    if (rows.length) {
      const { data: ins } = await supabase.from('exercises').insert(rows).select('id')
      exercisesImported += ((ins ?? []) as { id: string }[]).length
    }
  }
  return { workouts_imported: workoutsImported, exercises_imported: exercisesImported }
}

// ---------------------------------------------------------------------------
// Sheet write / read
// ---------------------------------------------------------------------------

async function writeSheet(
  token: string,
  spreadsheetId: string,
  tabs: { title: string; values: string[][] }[],
): Promise<void> {
  const data = tabs.map((t) => ({
    range: `'${t.title.replace(/'/g, "''")}'!A1`,
    majorDimension: 'ROWS',
    values: t.values,
  }))
  await gfetch(token, `/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({ valueInputOption: 'RAW', data }),
  })
}

/** Create a brand-new spreadsheet owned by the service account. */
async function createSpreadsheet(token: string, title: string, tabTitles: string[]): Promise<{ id: string; url: string }> {
  const res = await gfetch(token, '/spreadsheets', {
    method: 'POST',
    body: JSON.stringify({
      properties: { title },
      sheets: tabTitles.map((t) => ({ properties: { title: t } })),
    }),
  })
  return {
    id: String(res.spreadsheetId),
    url: String(res.spreadsheetUrl ?? `https://docs.google.com/spreadsheets/d/${String(res.spreadsheetId)}/edit`),
  }
}

/** Reset an existing spreadsheet to SUMMARY + one tab per workout, then fill. */
async function resetSpreadsheetTabs(
  token: string,
  spreadsheetId: string,
  tabTitles: string[],
): Promise<void> {
  const meta = await gfetch(
    token,
    `/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
  )
  const sheets = ((meta.sheets ?? []) as { properties: { sheetId: number; title: string } }[]).map(
    (s) => s.properties,
  )
  if (!sheets.length) throw new Error('spreadsheet has no sheets')
  const requests: Record<string, unknown>[] = []
  for (const s of sheets.slice(1)) {
    requests.push({ deleteSheet: { sheetId: s.sheetId } })
  }
  requests.push({
    updateSheetProperties: {
      properties: { sheetId: sheets[0].sheetId, title: 'SUMMARY' },
      fields: 'title',
    },
  })
  for (const t of tabTitles) {
    requests.push({ addSheet: { properties: { title: t } } })
  }
  await gfetch(token, `/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({ requests }),
  })
}

/** Parse one tab's values back into a workout. Returns null if no data rows. */
function parseTab(title: string, values: string[][] | undefined): SheetWorkout | null {
  if (!values) return null
  const headerIdx = values.findIndex(
    (r) => (r[0] ?? '').trim().toLowerCase() === 'exercise',
  )
  if (headerIdx === -1) return null
  const exercises: SheetExercise[] = []
  for (const row of values.slice(headerIdx + 1)) {
    const name = (row[0] ?? '').trim()
    if (!name) break // blank row ends the table
    const sets = parseInt(row[1] ?? '', 10)
    const rest = parseInt(row[3] ?? '', 10)
    exercises.push({
      name,
      sets: Number.isFinite(sets) ? sets : null,
      reps: (row[2] ?? '').trim() || null,
      rest_seconds: Number.isFinite(rest) ? rest : null,
      notes: (row[4] ?? '').trim() || null,
    })
    if (exercises.length >= 300) break
  }
  if (!exercises.length) return null
  return { name: title, notes: null, exercises }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
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
  const action = String(body.action ?? 'status')
  const programId = body.program_id ? String(body.program_id) : null

  // ---- action: status -------------------------------------------------------
  if (action === 'status') {
    const out: Record<string, unknown> = { configured: Boolean(await resolveServiceAccount(supabase)) }
    if (programId) {
      const { data: p } = await supabase
        .from('programs')
        .select('sheet_id,sheet_synced_at')
        .eq('id', programId)
        .eq('trainer_id', trainerId)
        .maybeSingle()
      const row = (p ?? {}) as { sheet_id?: string | null; sheet_synced_at?: string | null }
      out.sheet_id = row.sheet_id ?? null
      out.sheet_url = row.sheet_id
        ? `https://docs.google.com/spreadsheets/d/${row.sheet_id}/edit`
        : null
      out.sheet_synced_at = row.sheet_synced_at ?? null
    }
    return json(out)
  }

  if (!programId) return json({ error: 'program_id required' }, 400)
  const sa = await resolveServiceAccount(supabase)
  if (!sa) {
    return json(
      {
        error:
          'Google Sheets not configured — set the GOOGLE_SERVICE_ACCOUNT_JSON project secret with a Google service account key (Sheets API enabled).',
        configured: false,
      },
      400,
    )
  }

  try {
    // ---- action: link -------------------------------------------------------
    if (action === 'link') {
      const ref = String(body.sheet_ref ?? '').trim()
      const m = ref.match(/\/d\/([a-zA-Z0-9-_]{20,})/) ?? ref.match(/^([a-zA-Z0-9-_]{20,})$/)
      if (!m) return json({ error: 'could not parse a spreadsheet ID from sheet_ref' }, 400)
      const sheetId = m[1]
      const { error } = await supabase
        .from('programs')
        .update({ sheet_id: sheetId })
        .eq('id', programId)
        .eq('trainer_id', trainerId)
      if (error) return json({ error: error.message }, 500)
      return json({
        sheet_id: sheetId,
        sheet_url: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
      })
    }

    const { prog, workouts, clientName } = await fetchProgram(supabase, programId, trainerId)
    const now = new Date().toISOString()
    const taken = new Set<string>(['SUMMARY'])
    const tabTitles = workouts.map((w) => cleanTabTitle(w.name, taken))
    const shareWith = body.share_with ? String(body.share_with).trim() : ''

    /** Share a freshly created spreadsheet with the trainer's Google account.
     *  A share failure must not fail the sync — surface it as a warning. */
    const shareCreated = async (
      token: string,
      spreadsheetId: string,
    ): Promise<string | null> => {
      if (!shareWith) return null
      try {
        await shareSpreadsheet(token, spreadsheetId, shareWith)
        return null
      } catch (e) {
        return e instanceof Error ? e.message : 'share failed'
      }
    }

    // ---- action: create -----------------------------------------------------
    if (action === 'create') {
      if (prog.sheet_id) {
        return json({ error: 'program already has a linked sheet — use push', sheet_id: prog.sheet_id }, 400)
      }
      const token = await googleAccessToken(sa)
      const title = `The Vault — ${String(prog.name)}`
      const created = await createSpreadsheet(token, title, ['SUMMARY', ...tabTitles])
      const shareWarning = await shareCreated(token, created.id)
      await writeSheet(token, created.id, [
        { title: 'SUMMARY', values: summaryValues(prog, clientName, now) },
        ...workouts.map((w, i) => ({ title: tabTitles[i], values: workoutValues(w) })),
      ])
      await supabase
        .from('programs')
        .update({ sheet_id: created.id, sheet_synced_at: now })
        .eq('id', programId)
      return json({ sheet_id: created.id, sheet_url: created.url, sheet_synced_at: now, created: true, share_warning: shareWarning })
    }

    // ---- action: push ---------------------------------------------------------
    if (action === 'push') {
      const token = await googleAccessToken(sa)
      let sheetId = String(prog.sheet_id ?? '')
      let sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`
      let shareWarning: string | null = null
      if (!sheetId) {
        const created = await createSpreadsheet(
          token,
          `The Vault — ${String(prog.name)}`,
          ['SUMMARY', ...tabTitles],
        )
        sheetId = created.id
        sheetUrl = created.url
        shareWarning = await shareCreated(token, created.id)
      } else {
        await resetSpreadsheetTabs(token, sheetId, tabTitles)
      }
      await writeSheet(token, sheetId, [
        { title: 'SUMMARY', values: summaryValues(prog, clientName, now) },
        ...workouts.map((w, i) => ({ title: tabTitles[i], values: workoutValues(w) })),
      ])
      await supabase
        .from('programs')
        .update({ sheet_id: sheetId, sheet_synced_at: now })
        .eq('id', programId)
      return json({ sheet_id: sheetId, sheet_url: sheetUrl, sheet_synced_at: now, share_warning: shareWarning })
    }

    // ---- action: pull ---------------------------------------------------------
    if (action === 'pull') {
      const sheetId = String(prog.sheet_id ?? '')
      if (!sheetId) {
        return json({ error: 'no sheet linked to this program — create or link one first' }, 400)
      }
      const token = await googleAccessToken(sa)
      const meta = await gfetch(token, `/spreadsheets/${sheetId}?fields=sheets.properties`)
      const titles = (
        (meta.sheets ?? []) as { properties: { title: string } }[]
      )
        .map((s) => s.properties.title)
        .filter((t) => t !== 'SUMMARY')
      if (!titles.length) return json({ error: 'sheet has no session tabs to import' }, 400)

      const ranges = titles.map((t) => `'${t.replace(/'/g, "''")}'!A1:E500`)
      const qs = ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join('&')
      const batch = await gfetch(
        token,
        `/spreadsheets/${sheetId}/values:batchGet?majorDimension=ROWS&${qs}`,
      )
      const valueRanges = (batch.valueRanges ?? []) as { range?: string; values?: string[][] }[]
      const parsed: SheetWorkout[] = []
      for (const vr of valueRanges) {
        const tab = (vr.range ?? '').split('!')[0].replace(/^'|'$/g, '')
        const w = parseTab(tab, vr.values)
        if (w) parsed.push(w)
      }
      if (!parsed.length) {
        return json({ error: 'no exercise rows found in the sheet (expected Exercise/Sets/Reps/Rest/Notes headers)' }, 400)
      }
      const counts = await replaceContent(supabase, programId, parsed)
      await supabase
        .from('programs')
        .update({ sheet_synced_at: new Date().toISOString() })
        .eq('id', programId)
      return json({ ...counts, sheet_synced_at: new Date().toISOString() })
    }

    return json({ error: `unknown action: ${action}` }, 400)
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'unknown error' }, 500)
  }
})
