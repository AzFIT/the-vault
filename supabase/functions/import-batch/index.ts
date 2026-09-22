import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

/**
 * Import batch — staff-gated loader for the one-off CSV migrations
 * (Shopify customers/orders, MINDBODY clients/memberships/schedule).
 *
 * The importer script (tools/import_csv.py) maps CSV columns to a normalized
 * row shape and calls the actions below; this function resolves clients by
 * email/phone, dedupes, and writes with the service key. All actions are
 * idempotent so a re-run of the same file never doubles data.
 *
 * Demo-grade staff gate, same model as enquiries-inbox. Replace with
 * Supabase Auth + staff roles before go-live.
 */
const STAFF_KEY = 'vault_enq_3d8b52f1a947c60e'

const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

/** Columns each target accepts — anything else is dropped before writing. */
const ALLOWED: Record<string, string[]> = {
  clients: ['trainer_id', 'full_name', 'email', 'phone', 'date_of_birth', 'gender', 'fitness_goal', 'status', 'notes', 'intake_profile'],
  packages: ['name', 'total_sessions', 'sessions_used', 'price_cents', 'purchased_at', 'expires_at', 'active'],
  payments: ['amount_cents', 'kind', 'note', 'paid_at'],
  sessions: ['title', 'type', 'status', 'starts_at', 'ends_at', 'location', 'notes'],
}

function clean(row: Record<string, unknown>, cols: string[]) {
  const out: Record<string, unknown> = {}
  for (const c of cols) {
    const v = row[c]
    if (v !== undefined && v !== null && v !== '') out[c] = v
  }
  return out
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  if (req.headers.get('x-staff-key') !== STAFF_KEY) return json({ error: 'unauthorized' }, 401)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json body' }, 400)
  }

  const action = String(body.action ?? '')
  const rows = (body.rows ?? []) as Record<string, unknown>[]
  if (!Array.isArray(rows) || rows.length === 0) return json({ error: 'rows required' }, 400)
  if (rows.length > 500) return json({ error: 'max 500 rows per batch' }, 400)

  /** Resolve a client by email (preferred) or phone; returns uuid or null. */
  async function findClient(ref: Record<string, unknown>): Promise<string | null> {
    const email = String(ref.client_email ?? '').trim().toLowerCase()
    const phone = String(ref.client_phone ?? '').replace(/\D/g, '')
    if (email) {
      const { data } = await supabase.from('clients').select('id').ilike('email', email).limit(1)
      if (data?.[0]) return (data[0] as { id: string }).id
    }
    if (phone) {
      // digits-only comparison: strip non-digits on both sides via a broad ilike
      const { data } = await supabase.from('clients').select('id, phone').not('phone', 'is', null).limit(500)
      const hit = (data ?? []).find((r) => String((r as { phone: string }).phone ?? '').replace(/\D/g, '') === phone)
      if (hit) return (hit as { id: string }).id
    }
    return null
  }

  // ---- action: upsert_clients ---------------------------------------------------
  if (action === 'upsert_clients') {
    let inserted = 0
    let updated = 0
    let skipped = 0
    for (const raw of rows) {
      const row = clean(raw, ALLOWED.clients)
      const email = String(row.email ?? '').trim().toLowerCase()
      if (!row.full_name || (!email && !row.phone)) {
        skipped++
        continue
      }
      const existing = await findClient({ client_email: email, client_phone: row.phone })
      if (existing) {
        const { error } = await supabase.from('clients').update(row).eq('id', existing)
        if (error) return json({ error: error.message, inserted, updated, skipped }, 500)
        updated++
      } else {
        const { error } = await supabase.from('clients').insert(row)
        if (error) return json({ error: error.message, inserted, updated, skipped }, 500)
        inserted++
      }
    }
    return json({ inserted, updated, skipped })
  }

  // ---- actions: packages / payments / sessions (client-linked, idempotent-ish) ---
  if (action === 'import_packages' || action === 'import_payments' || action === 'import_sessions') {
    const table = action.replace('import_', '') as 'packages' | 'payments' | 'sessions'
    let inserted = 0
    let skipped = 0
    for (const raw of rows) {
      const clientId = await findClient(raw)
      if (!clientId) {
        skipped++
        continue
      }
      const row = clean(raw, ALLOWED[table])
      if (table === 'packages') {
        // idempotent: same client + name + purchased_at → update instead of duplicate
        const { data } = await supabase
          .from('packages')
          .select('id')
          .eq('client_id', clientId)
          .eq('name', String(row.name ?? ''))
          .eq('purchased_at', String(row.purchased_at ?? ''))
          .limit(1)
        if (data?.[0]) {
          await supabase.from('packages').update(row).eq('id', (data[0] as { id: string }).id)
          inserted++ // counted as written
          continue
        }
      }
      const { error } = await supabase.from(table).insert({ ...row, client_id: clientId })
      if (error) return json({ error: error.message, inserted, skipped }, 500)
      inserted++
    }
    return json({ inserted, skipped })
  }

  return json({ error: 'unknown action — use upsert_clients | import_packages | import_payments | import_sessions' }, 400)
})
