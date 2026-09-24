import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

// Class booking endpoint — the only write path for `bookings` (RLS grants
// public read only). Books a spot (confirmed when free, otherwise waitlisted)
// or cancels (which promotes the earliest waitlisted member when a confirmed
// spot frees up). All capacity decisions happen inside atomic DB functions,
// so concurrent members can never overbook the last spot.
//
// Same demo-grade gate as sync-sheets: a shared builder secret instead of
// real Supabase Auth gating the endpoint. Identity, however, is real: pass
// a member's access token as `user_token` and the booking is recorded under
// their auth user id; without it, member_label is the tester-era identity.
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
  let memberLabel = String(body.member_label ?? '').trim().toLowerCase()
  let memberName = body.member_name ? String(body.member_name).trim() : null
  if (!classCode) return json({ error: 'class_code required' }, 400)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Real-auth path: a member JWT wins over the tester label — verify it
  // server-side and book under the auth user id so bookings belong to the
  // signed-in account (and RLS "read own profile" stays meaningful).
  const userToken = body.user_token ? String(body.user_token) : ''
  if (userToken) {
    const { data: authData, error: authError } = await supabase.auth.getUser(userToken)
    if (authError || !authData.user) return json({ error: 'invalid or expired session — sign in again' }, 401)
    memberLabel = authData.user.id
    const { data: profile } = await supabase
      .from('member_profiles')
      .select('first_name, last_name')
      .eq('id', authData.user.id)
      .maybeSingle()
    memberName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : (memberName ?? authData.user.email ?? null)
  }
  if (!memberLabel) return json({ error: 'member_label required' }, 400)

  try {
    if (action === 'book') {
      const { data, error } = await supabase.rpc('book_class', {
        p_class_code: classCode,
        p_member_label: memberLabel,
        p_member_name: memberName,
      })
      if (error) return json({ error: friendlyError(error.message) }, 400)
      const row = (Array.isArray(data) ? data[0] : data) as Record<string, string>
      return json({
        status: row.booking_status ?? row.status,
        class_id: row.booked_class_id ?? row.class_id,
        credits_remaining: await fetchCredits(memberLabel),
      })
    }
    if (action === 'cancel') {
      const { data, error } = await supabase.rpc('cancel_class_booking', {
        p_class_code: classCode,
        p_member_label: memberLabel,
      })
      if (error) return json({ error: friendlyError(error.message) }, 400)
      return json({ canceled: Boolean(data), credits_remaining: await fetchCredits(memberLabel) })
    }
    return json({ error: `unknown action: ${action || '(none)'} — use book | cancel` }, 400)
  } catch (e) {
    return json({ error: e instanceof Error ? friendlyError(e.message) : String(e) }, 500)
  }
})

/** Map engine error codes to member-friendly copy. */
function friendlyError(message: string): string {
  if (/NO_CREDITS/i.test(message)) {
    return "You're out of class credits — your plan renews soon, or upgrade to book more classes."
  }
  return message
}

/** Fresh credit balance for a real member label (uuid), else null. */
async function fetchCredits(memberLabel: string): Promise<number | null> {
  if (!/^[0-9a-f-]{36}$/.test(memberLabel)) return null
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  const { data } = await supabase
    .from('user_subscriptions')
    .select('credits_remaining')
    .eq('user_id', memberLabel)
    .maybeSingle()
  return data ? Number(data.credits_remaining) : null
}
