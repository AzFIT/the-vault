import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

// Class booking endpoint — the only write path for `bookings` (RLS grants
// public read only). Books a spot (confirmed when free, otherwise waitlisted)
// or cancels (which promotes the earliest waitlisted member when a confirmed
// spot frees up). All capacity decisions happen inside atomic DB functions,
// so concurrent members can never overbook the last spot.
//
// Same demo-grade gate as sync-sheets: a shared builder secret instead of
// real Supabase Auth. member_label is the tester-era identity; it becomes the
// auth user id when real auth ships.
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

  const action = String(body.action ?? '')
  const classCode = String(body.class_code ?? '').trim()
  const memberLabel = String(body.member_label ?? '').trim().toLowerCase()
  const memberName = body.member_name ? String(body.member_name).trim() : null
  if (!classCode || !memberLabel) return json({ error: 'class_code and member_label required' }, 400)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    if (action === 'book') {
      const { data, error } = await supabase.rpc('book_class', {
        p_class_code: classCode,
        p_member_label: memberLabel,
        p_member_name: memberName,
      })
      if (error) return json({ error: error.message }, 400)
      const row = (Array.isArray(data) ? data[0] : data) as Record<string, string>
      return json({ status: row.booking_status ?? row.status, class_id: row.booked_class_id ?? row.class_id })
    }
    if (action === 'cancel') {
      const { data, error } = await supabase.rpc('cancel_class_booking', {
        p_class_code: classCode,
        p_member_label: memberLabel,
      })
      if (error) return json({ error: error.message }, 400)
      return json({ canceled: Boolean(data) })
    }
    return json({ error: `unknown action: ${action || '(none)'} — use book | cancel` }, 400)
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
