import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

/**
 * Enquiries inbox — public intake submissions + staff-gated CRM views.
 *
 * action 'submit' (public): the marketing site's intake forms lodge leads
 * here, inserted server-side with the service role key. The publishable key
 * also has an RLS insert-only fallback on public.enquiries.
 *
 * actions 'list' / 'update' (staff): reading leads is PII, so CRM reads and
 * status updates go through this function behind a shared staff key in the
 * x-staff-key header — demo-grade gate, same model as save-program. Replace
 * with Supabase Auth + staff roles before go-live.
 */
const STAFF_KEY = 'vault_enq_3d8b52f1a947c60e'

const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

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

  const action = String(body.action ?? 'list')

  // ---- action: submit (PUBLIC — no staff key required) --------------------------
  // Intake forms on the marketing site call this to lodge a lead. Server-side
  // insert with the service key: the publishable key keeps only its RLS
  // insert-only fallback, and spam checks/rate limits can live here later.
  if (action === 'submit') {
    const e = (body.enquiry ?? {}) as Record<string, unknown>
    if (!e.title || !e.source) return json({ error: 'title and source required' }, 400)
    const { data, error } = await supabase
      .from('enquiries')
      .insert({
        source: String(e.source),
        title: String(e.title),
        contact_name: (e.contact_name as string) ?? null,
        contact_phone: (e.contact_phone as string) ?? null,
        contact_email: (e.contact_email as string) ?? null,
        preferred_channels: Array.isArray(e.preferred_channels)
          ? (e.preferred_channels as string[])
          : [],
        best_time: (e.best_time as string) ?? null,
        payload: (e.payload as Record<string, unknown>) ?? {},
      })
      .select('id')
      .single()
    if (error) return json({ error: error.message }, 500)
    return json({ id: (data as { id: string } | null)?.id ?? null })
  }

  // Everything below is staff-only.
  if (req.headers.get('x-staff-key') !== STAFF_KEY) return json({ error: 'unauthorized' }, 401)
  if (action === 'list') {
    const { data, error } = await supabase
      .from('enquiries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300)
    if (error) return json({ error: error.message }, 500)
    return json({ enquiries: data ?? [] })
  }

  // ---- action: update -----------------------------------------------------------
  if (action === 'update') {
    const id = String(body.id ?? '')
    if (!id) return json({ error: 'id required' }, 400)
    const patch: Record<string, unknown> = {}
    if (body.status !== undefined) patch.status = String(body.status)
    if (body.notes !== undefined) patch.notes = String(body.notes)
    if (body.assigned_to !== undefined) patch.assigned_to = String(body.assigned_to)
    if (Object.keys(patch).length === 0) return json({ error: 'nothing to update' }, 400)
    const { data, error } = await supabase.from('enquiries').update(patch).eq('id', id).select()
    if (error) return json({ error: error.message }, 500)
    return json({ enquiry: data?.[0] ?? null })
  }

  return json({ error: 'unknown action' }, 400)
})
