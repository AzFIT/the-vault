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
    throw new Error(`Google Sheets API ${res.status} on ${path.slice(0, 120)}: ${msg}`)
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
// Template mode — two-way sync with the trainer master workbook
//
// Tab layout (banner rows are preserved; column A is always empty):
//   CLIENTS:      header row 4, data rows 5+,   cols B..L
//   MEASUREMENTS: header row 7, data rows 8+,   cols B..M
//   WORKOUT LOG:  header row 7, data rows 8+,   cols B..N
// Dates are `dd Mmm yyyy` (e.g. "20 Jul 2026"). Conflict model: last-write-wins
// per direction, stamped via the template_synced_at sync_config key.
// ---------------------------------------------------------------------------

type SB = ReturnType<typeof createClient>

const TEMPLATE_TABS = {
  CLIENTS: { headerRow: 4, dataStart: 5, lastCol: 'L' },
  MEASUREMENTS: { headerRow: 7, dataStart: 8, lastCol: 'M' },
  'WORKOUT LOG': { headerRow: 7, dataStart: 8, lastCol: 'N' },
} as const
type TemplateTab = keyof typeof TEMPLATE_TABS

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "20 Jul 2026" -> ISO UTC midnight. Returns null when unparseable. */
function parseSheetDate(v: string): string | null {
  const m = v.trim().match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/)
  if (!m) return null
  const mon = MONTHS.findIndex(
    (x) => x.toLowerCase() === m[2].slice(0, 3).toLowerCase(),
  )
  if (mon === -1) return null
  return new Date(Date.UTC(Number(m[3]), mon, Number(m[1]))).toISOString()
}

/** ISO -> "20 Jul 2026" (UTC components, matching the template's date style). */
function fmtSheetDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

/** Lenient number parse — tolerates "80 kg", "12.5", blanks. */
function num(v: unknown): number | null {
  if (v === null || v === undefined) return null
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) ? n : null
}

function str(v: unknown): string {
  return (v ?? '').toString().trim()
}

/** Sheet values like "Male"/"F" -> the DB check constraint's lowercase vocabulary. */
function normGender(v: unknown): string | null {
  const g = str(v).toLowerCase()
  if (g.startsWith('m')) return 'male'
  if (g.startsWith('f')) return 'female'
  if (g === 'other' || g === 'non-binary' || g === 'nonbinary') return 'other'
  return g ? 'other' : null
}

async function getConfig(sb: SB, key: string): Promise<string | null> {
  const { data } = await sb
    .from('sync_config')
    .select('value')
    .eq('key', key)
    .maybeSingle()
  return data?.value != null ? String((data as { value: unknown }).value) : null
}

async function setConfig(sb: SB, key: string, value: string): Promise<void> {
  await sb.from('sync_config').upsert({ key, value }, { onConflict: 'key' })
}

function tabRange(tab: TemplateTab, suffix: string): string {
  return `'${tab.replace(/'/g, "''")}'!${suffix}`
}

async function readTab(token: string, sheetId: string, tab: TemplateTab): Promise<string[][]> {
  const meta = TEMPLATE_TABS[tab]
  const range = tabRange(tab, `B1:${meta.lastCol}1200`)
  const res = await gfetch(
    token,
    `/spreadsheets/${sheetId}/values:batchGet?majorDimension=ROWS&ranges=${encodeURIComponent(range)}`,
  )
  const vrs = (res.valueRanges ?? []) as { values?: string[][] }[]
  return (vrs[0]?.values ?? []) as string[][]
}

/** Clear only the data region of a tab — banner + header rows are preserved. */
async function clearTabData(token: string, sheetId: string, tab: TemplateTab): Promise<void> {
  const meta = TEMPLATE_TABS[tab]
  const range = tabRange(tab, `B${meta.dataStart}:${meta.lastCol}1200`)
  await gfetch(token, `/spreadsheets/${sheetId}/values:batchClear`, {
    method: 'POST',
    body: JSON.stringify({ ranges: [range] }),
  })
}

/** Write rows (header row first) over the tab's data region. */
async function writeTab(
  token: string,
  sheetId: string,
  tab: TemplateTab,
  rows: (string | number | null)[][],
): Promise<void> {
  const meta = TEMPLATE_TABS[tab]
  const range = tabRange(tab, `B${meta.headerRow}:${meta.lastCol}${meta.headerRow + rows.length - 1}`)
  await gfetch(token, `/spreadsheets/${sheetId}/values:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: [{ range, majorDimension: 'ROWS', values: rows }],
    }),
  })
}

interface TemplateClient {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  date_of_birth: string | null
  gender: string | null
  height_cm: number | null
  weight_kg: number | null
  intake_profile: Record<string, unknown> | null
}

/** Build a client lookup keyed by email, lowercase name, and sheet Client ID. */
async function loadClientMap(sb: SB): Promise<Map<string, TemplateClient>> {
  const { data } = await (sb as SB & { from: (t: string) => any })
    .from('clients')
    .select('id,full_name,email,phone,date_of_birth,gender,height_cm,weight_kg,intake_profile')
  const map = new Map<string, TemplateClient>()
  for (const c of (data ?? []) as TemplateClient[]) {
    if (c.email) map.set(`email:${c.email.toLowerCase()}`, c)
    if (c.full_name) map.set(`name:${c.full_name.toLowerCase()}`, c)
    const sid = (c.intake_profile as Record<string, unknown> | null)?.sheet_client_id
    if (sid) map.set(`sid:${String(sid).toLowerCase()}`, c)
  }
  return map
}

function findClient(map: Map<string, TemplateClient>, key: string): TemplateClient | null {
  const k = key.trim().toLowerCase()
  return map.get(`email:${k}`) ?? map.get(`name:${k}`) ?? map.get(`sid:${k}`) ?? null
}

// ---- template_pull ----------------------------------------------------------

async function templatePull(sb: SB, token: string, sheetId: string) {
  const db = sb as SB & { from: (t: string) => any }
  const counts = {
    clients: { inserted: 0, updated: 0, skipped: 0 },
    measurements: { inserted: 0, updated: 0, skipped: 0 },
    workout_logs: { inserted: 0, updated: 0, skipped: 0 },
  }
  const errors: string[] = []
  const noteErr = (where: string, e: unknown) => {
    if (errors.length < 10) errors.push(`${where}: ${e instanceof Error ? e.message : String(e)}`)
  }

  // CLIENTS — upsert by email; sheet Client ID lives inside intake_profile.
  const clientRows = (await readTab(token, sheetId, 'CLIENTS')).slice(
    TEMPLATE_TABS.CLIENTS.dataStart - 1,
  )
  for (const row of clientRows) {
    const email = str(row[2])
    const name = str(row[1])
    if (!email && !name) continue
    if (!email.includes('@')) {
      counts.clients.skipped++
      continue
    }
    const dob = parseSheetDate(str(row[4]))
    const { data: existing } = await db
      .from('clients')
      .select('id,intake_profile')
      .eq('email', email.toLowerCase())
      .maybeSingle()
    const profile: Record<string, unknown> = {
      ...(existing?.intake_profile ?? {}),
    }
    if (str(row[0])) profile.sheet_client_id = str(row[0])
    const goalW = num(row[9])
    const bf = num(row[10])
    if (goalW !== null) profile.goal_weight_kg = goalW
    if (bf !== null) profile.start_body_fat_pct = bf
    const patch = {
      full_name: name || undefined,
      phone: str(row[3]) || null,
      date_of_birth: dob ? dob.slice(0, 10) : null,
      gender: normGender(row[6]),
      height_cm: num(row[7]),
      weight_kg: num(row[8]),
      intake_profile: profile,
      updated_at: new Date().toISOString(),
    }
    if (existing) {
      const { error } = await db.from('clients').update(patch).eq('id', existing.id)
      if (error) {
        counts.clients.skipped++
        noteErr(`client ${email}`, error.message ?? error)
      } else counts.clients.updated++
    } else {
      const { error } = await db.from('clients').insert({
        email: email.toLowerCase(),
        trainer_id: DEFAULT_TRAINER,
        ...patch,
      })
      if (error) {
        counts.clients.skipped++
        noteErr(`client ${email}`, error.message ?? error)
      } else counts.clients.inserted++
    }
  }

  const map = await loadClientMap(sb)

  // MEASUREMENTS — upsert by (client, recorded_at).
  const measRows = (await readTab(token, sheetId, 'MEASUREMENTS')).slice(
    TEMPLATE_TABS.MEASUREMENTS.dataStart - 1,
  )
  for (const row of measRows) {
    const client = findClient(map, str(row[0]))
    const rec = parseSheetDate(str(row[1]))
    if (!client || !rec) {
      counts.measurements.skipped++
      continue
    }
    const payload = {
      client_id: client.id,
      recorded_at: rec,
      weight_kg: num(row[3]),
      body_fat_percentage: num(row[4]),
      chest_cm: num(row[5]),
      waist_cm: num(row[6]),
      hips_cm: num(row[7]),
      thighs_cm: num(row[8]),
      arms_cm: num(row[9]),
      bmi: num(row[10]),
      notes: str(row[11]) || null,
    }
    const { data: ex } = await db
      .from('body_composition')
      .select('id')
      .eq('client_id', client.id)
      .eq('recorded_at', rec)
      .maybeSingle()
    if (ex) {
      const { error } = await db.from('body_composition').update(payload).eq('id', ex.id)
      if (error) counts.measurements.skipped++
      else counts.measurements.updated++
    } else {
      const { error } = await db.from('body_composition').insert(payload)
      if (error) counts.measurements.skipped++
      else counts.measurements.inserted++
    }
  }

  // WORKOUT LOG — group rows by (client, date), one parent log per day.
  const logRows = (await readTab(token, sheetId, 'WORKOUT LOG')).slice(
    TEMPLATE_TABS['WORKOUT LOG'].dataStart - 1,
  )
  const groups = new Map<string, string[][]>()
  for (const row of logRows) {
    const clientKey = str(row[0])
    const date = parseSheetDate(str(row[1]))
    const exercise = str(row[6])
    if (!clientKey || !date || !exercise) continue
    const key = `${clientKey.toLowerCase()}|${date}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(row)
  }
  for (const [key, rows] of groups) {
    const [clientKey, date] = [key.slice(0, key.lastIndexOf('|')), key.slice(key.lastIndexOf('|') + 1)]
    const client = findClient(map, clientKey)
    if (!client) {
      counts.workout_logs.skipped += rows.length
      continue
    }
    const dayStart = new Date(date)
    const dayEnd = new Date(dayStart.getTime() + 24 * 3600 * 1000).toISOString()
    const phase = str(rows[0][3])
    const session = str(rows[0][4])
    const notes = [phase && `Phase ${phase}`, session && `Session ${session}`]
      .filter(Boolean)
      .join(' · ')
    const { data: parent } = await db
      .from('workout_logs')
      .select('id')
      .eq('client_id', client.id)
      .gte('completed_at', date)
      .lt('completed_at', dayEnd)
      .maybeSingle()
    let logId: string
    if (parent) {
      logId = parent.id
      await db.from('workout_logs').update({ notes: notes || null }).eq('id', logId)
      counts.workout_logs.updated++
    } else {
      const { data: created, error } = await db
        .from('workout_logs')
        .insert({ client_id: client.id, completed_at: date, notes: notes || null })
        .select('id')
        .maybeSingle()
      if (error || !created) {
        counts.workout_logs.skipped += rows.length
        continue
      }
      logId = created.id
      counts.workout_logs.inserted++
    }
    // One entry per exercise, per-set arrays ordered by Set #.
    const byExercise = new Map<string, string[][]>()
    for (const r of rows) {
      const name = str(r[6])
      if (!byExercise.has(name)) byExercise.set(name, [])
      byExercise.get(name)!.push(r)
    }
    for (const [name, setRows] of byExercise) {
      setRows.sort((a, b) => (num(a[7]) ?? 0) - (num(b[7]) ?? 0))
      const loads = setRows.map((r) => num(r[8]) ?? 0)
      const reps = setRows.map((r) => num(r[9]) ?? 0)
      const rpes = setRows.map((r) => num(r[10]) ?? 0)
      const payload = {
        workout_log_id: logId,
        client_id: client.id,
        exercise_id: null,
        exercise_name: name,
        total_sets: setRows.length,
        sets_completed: setRows.length,
        reps_per_set: reps,
        weight_per_set: loads,
        rpe_per_set: rpes,
        notes: null,
      }
      const { data: ex } = await db
        .from('workout_log_entries')
        .select('id')
        .eq('workout_log_id', logId)
        .eq('exercise_name', name)
        .maybeSingle()
      if (ex) await db.from('workout_log_entries').update(payload).eq('id', ex.id)
      else await db.from('workout_log_entries').insert(payload)
    }
  }
  return { ...counts, errors }
}

// ---- template_push ----------------------------------------------------------

async function templatePush(sb: SB, token: string, sheetId: string) {
  const db = sb as SB & { from: (t: string) => any }
  const out: Record<string, number> = {}

  // CLIENTS
  const { data: clients } = await db
    .from('clients')
    .select('id,full_name,email,phone,date_of_birth,gender,height_cm,weight_kg,intake_profile')
    .order('full_name')
  const idMap = new Map<string, string>()
  const cRows: (string | number | null)[][] = [[
    'Client ID', 'Name', 'Email', 'Phone', 'Date of Birth', 'Age', 'Gender',
    'Height (cm)', 'Start Weight (kg)', 'Goal Weight (kg)', 'Body Fat %',
  ]]
  let seq = 1
  const nowY = new Date().getUTCFullYear()
  for (const c of (clients ?? []) as TemplateClient[]) {
    const profile = (c.intake_profile ?? {}) as Record<string, unknown>
    const sid = str(profile.sheet_client_id) || `C-${String(seq).padStart(3, '0')}`
    idMap.set(c.id, sid)
    const dob = c.date_of_birth ? new Date(c.date_of_birth) : null
    const age = dob ? nowY - dob.getUTCFullYear() : null
    cRows.push([
      sid, c.full_name ?? '', c.email ?? '', c.phone ?? '',
      c.date_of_birth ? fmtSheetDate(c.date_of_birth) : '', age,
      c.gender ?? '', c.height_cm ?? '', c.weight_kg ?? '',
      (profile.goal_weight_kg as number | undefined) ?? null,
      (profile.start_body_fat_pct as number | undefined) ?? null,
    ])
    seq++
  }
  await clearTabData(token, sheetId, 'CLIENTS')
  await writeTab(token, sheetId, 'CLIENTS', cRows)
  out.CLIENTS = cRows.length - 1

  // MEASUREMENTS
  const { data: meas } = await db
    .from('body_composition')
    .select('client_id,recorded_at,weight_kg,body_fat_percentage,chest_cm,waist_cm,hips_cm,thighs_cm,arms_cm,bmi,notes')
    .order('recorded_at')
  const mRows: (string | number | null)[][] = [[
    'Client', 'Date', 'Week', 'Weight (kg)', 'Body Fat %', 'Chest (cm)', 'Waist (cm)',
    'Hips (cm)', 'Thigh (cm)', 'Arm (cm)', 'BMI', 'Notes',
  ]]
  for (const m of meas ?? []) {
    const r = m as Record<string, unknown>
    const sid = idMap.get(String(r.client_id))
    if (!sid) continue
    mRows.push([
      sid, r.recorded_at ? fmtSheetDate(String(r.recorded_at)) : '', '',
      (r.weight_kg as number | null) ?? null,
      (r.body_fat_percentage as number | null) ?? null,
      (r.chest_cm as number | null) ?? null,
      (r.waist_cm as number | null) ?? null,
      (r.hips_cm as number | null) ?? null,
      (r.thighs_cm as number | null) ?? null,
      (r.arms_cm as number | null) ?? null,
      (r.bmi as number | null) ?? null,
      str(r.notes) || null,
    ])
  }
  await clearTabData(token, sheetId, 'MEASUREMENTS')
  await writeTab(token, sheetId, 'MEASUREMENTS', mRows)
  out.MEASUREMENTS = mRows.length - 1

  // WORKOUT LOG
  const { data: logs } = await db
    .from('workout_logs')
    .select('id,client_id,completed_at,notes')
    .order('completed_at')
  const { data: entries } = await db
    .from('workout_log_entries')
    .select('workout_log_id,exercise_name,total_sets,reps_per_set,weight_per_set,rpe_per_set')
  const byLog = new Map<string, Record<string, unknown>[]>()
  for (const e of (entries ?? []) as Record<string, unknown>[]) {
    const lid = String(e.workout_log_id)
    if (!byLog.has(lid)) byLog.set(lid, [])
    byLog.get(lid)!.push(e)
  }
  const wRows: (string | number | null)[][] = [[
    'Client', 'Date', 'Week', 'Phase', 'Session', 'Order', 'Exercise',
    'Set #', 'Load (kg)', 'Reps', 'RPE', 'Volume (kg)', 'Target Reps',
  ]]
  for (const log of logs ?? []) {
    const l = log as Record<string, unknown>
    const sid = idMap.get(String(l.client_id))
    if (!sid) continue
    const dateStr = l.completed_at ? fmtSheetDate(String(l.completed_at)) : ''
    const exList = byLog.get(String(l.id)) ?? []
    exList.forEach((e, orderIdx) => {
      const loads = (e.weight_per_set as number[] | null) ?? []
      const reps = (e.reps_per_set as number[] | null) ?? []
      const rpes = (e.rpe_per_set as number[] | null) ?? []
      const sets = Math.max(loads.length, reps.length, Number(e.total_sets ?? 0), 1)
      for (let i = 0; i < sets; i++) {
        const load = loads[i] ?? null
        const rep = reps[i] ?? null
        wRows.push([
          sid, dateStr, '', '', '', orderIdx + 1, str(e.exercise_name),
          i + 1, load, rep, rpes[i] ?? null,
          load !== null && rep !== null ? Math.round(load * rep * 10) / 10 : null,
          '',
        ])
      }
    })
  }
  await clearTabData(token, sheetId, 'WORKOUT LOG')
  await writeTab(token, sheetId, 'WORKOUT LOG', wRows)
  out['WORKOUT LOG'] = wRows.length - 1

  return out
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

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
  // The coach UI spells actions pull_template/push_template; this function's
  // canonical form is template_pull/template_push. Normalize both.
  const rawAction = String(body.action ?? 'status')
  const action =
    rawAction === 'pull_template' ? 'template_pull'
    : rawAction === 'push_template' ? 'template_push'
    : rawAction === 'status_template' ? 'template_status'
    : rawAction === 'link_template' ? 'template_link'
    : rawAction
  const programId = body.program_id ? String(body.program_id) : null

  // ---- template mode (trainer master workbook) --------------------------------
  if (action.startsWith('template_') || action.endsWith('_template')) {
    let sheetId = await getConfig(supabase, 'template_sheet_id')
    if (action === 'template_status') {
      return json({
        configured: Boolean(await resolveServiceAccount(supabase)),
        sheet_id: sheetId,
        sheet_url: sheetId ? `https://docs.google.com/spreadsheets/d/${sheetId}/edit` : null,
        sheet_synced_at: await getConfig(supabase, 'template_synced_at'),
      })
    }
    // A sheet_id / sheet_ref sent with any action links it first — the coach UI
    // connects and pushes in a single call, so link-on-push is the happy path.
    const bodyRef = str(body.sheet_ref ?? body.sheet_id)
    if (bodyRef) {
      const m =
        bodyRef.match(/\/d\/([a-zA-Z0-9-_]{20,})/) ?? bodyRef.match(/^([a-zA-Z0-9-_]{20,})$/)
      if (!m) return json({ error: 'could not parse a spreadsheet ID from sheet_ref/sheet_id' }, 400)
      await setConfig(supabase, 'template_sheet_id', m[1])
      sheetId = m[1]
    }
    if (action === 'template_link') {
      return json({
        sheet_id: sheetId,
        sheet_url: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
      })
    }
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
    if (!sheetId) {
      return json({ error: 'no template sheet linked — paste the sheet URL first' }, 400)
    }
    const token = await googleAccessToken(sa)
    const now = new Date().toISOString()
    try {
      if (action === 'template_pull') {
        const counts = await templatePull(supabase, token, sheetId)
        await setConfig(supabase, 'template_synced_at', now)
        const c = counts as { clients: { inserted: number; updated: number }; measurements: { inserted: number; updated: number }; workout_logs: { inserted: number; updated: number } }
        const rows_imported =
          c.clients.inserted + c.clients.updated +
          c.measurements.inserted + c.measurements.updated +
          c.workout_logs.inserted + c.workout_logs.updated
        return json({ ...counts, rows_imported, sheet_synced_at: now })
      }
      if (action === 'template_push') {
        const rows = await templatePush(supabase, token, sheetId)
        await setConfig(supabase, 'template_synced_at', now)
        return json({
          rows_written: rows,
          rows_imported: Object.values(rows).reduce((a, b) => a + (b as number), 0),
          sheet_id: sheetId,
          sheet_url: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
          sheet_synced_at: now,
        })
      }
    } catch (e) {
      return json(
        { error: e instanceof Error ? e.message : 'unknown error', action },
        500,
      )
    }
    return json({ error: `unknown action: ${action}` }, 400)
  }

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
