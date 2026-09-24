import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

// Subscription + member management — owner/staff tooling endpoint, consumed
// by the owner portal's Members page. Actions:
//   list_members    { query? }              → search member_profiles (name/phone), with subscription
//   member_detail   { user_id }             → profile + auth email + subscription + recent credit ledger
//   renew           { user_id }             → roll period forward, reset credits
//   change_plan     { user_id, plan_code }  → swap plan, reset allowance
//   adjust_credits  { user_id, delta, reason } → manual adjustment, clamped at 0
// All mutations are audited in credit_ledger by the DB functions themselves.
//
// Demo-grade gate like the rest of the build: the shared builder secret.
// Harden before real launch: restrict to owner/trainer JWTs.
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

const serviceClient = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

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

  const action = String(body.action ?? '')
  const supabase = serviceClient()

  try {
    if (action === 'list_members') {
      const q = String(body.query ?? '').trim()
      let query = supabase
        .from('member_profiles')
        .select('id,first_name,last_name,phone,created_at,user_subscriptions(plan_code,membership_name,status,credits_remaining,current_period_end)')
        .order('created_at', { ascending: false })
        .limit(50)
      if (q) {
        // name or phone fragment (email lives in auth.users — member_detail resolves it)
        const pattern = `%${q.replace(/[%_]/g, '')}%`
        query = query.or(`first_name.ilike.${pattern},last_name.ilike.${pattern},phone.ilike.${pattern}`)
      }
      const { data, error } = await query
      if (error) return json({ error: error.message }, 400)
      return json({
        members: (data ?? []).map((m: Record<string, unknown>) => {
          const subs = Array.isArray(m.user_subscriptions) ? m.user_subscriptions[0] : m.user_subscriptions
          const s = (subs ?? {}) as Record<string, unknown>
          return {
            id: m.id,
            first_name: m.first_name,
            last_name: m.last_name,
            phone: m.phone,
            created_at: m.created_at,
            plan_code: s.plan_code ?? null,
            membership_name: s.membership_name ?? null,
            status: s.status ?? null,
            credits_remaining: s.credits_remaining ?? null,
            current_period_end: s.current_period_end ?? null,
          }
        }),
      })
    }

    const userId = String(body.user_id ?? '').trim()
    if (action === 'member_detail') {
      if (!userId) return json({ error: 'user_id required' }, 400)
      const [{ data: profile, error: pErr }, { data: authData }, { data: sub }, { data: ledger }] =
        await Promise.all([
          supabase.from('member_profiles').select('*').eq('id', userId).maybeSingle(),
          supabase.auth.admin.getUserById(userId),
          supabase.from('user_subscriptions').select('*').eq('user_id', userId).maybeSingle(),
          supabase.from('credit_ledger').select('delta,reason,class_code,created_at').eq('user_id', userId)
            .order('created_at', { ascending: false }).limit(25),
        ])
      if (pErr) return json({ error: pErr.message }, 400)
      if (!profile) return json({ error: 'Member not found.' }, 404)
      return json({ profile, email: authData?.user?.email ?? null, subscription: sub, ledger: ledger ?? [] })
    }

    if (!userId) return json({ error: 'user_id required' }, 400)

    if (action === 'renew') {
      const { data, error } = await supabase.rpc('renew_subscription', { p_user_id: userId })
      if (error) return json({ error: mapError(error.message) }, 400)
      return json({ renewed: true, credits_remaining: data })
    }
    if (action === 'change_plan') {
      const planCode = String(body.plan_code ?? '').trim()
      if (!planCode) return json({ error: 'plan_code required' }, 400)
      const { data, error } = await supabase.rpc('change_plan', {
        p_user_id: userId,
        p_plan_code: planCode,
      })
      if (error) return json({ error: mapError(error.message) }, 400)
      return json({ changed: true, credits_remaining: data })
    }
    if (action === 'adjust_credits') {
      const delta = Math.round(Number(body.delta))
      const reason = String(body.reason ?? '').trim()
      if (!Number.isFinite(delta) || delta === 0) return json({ error: 'delta must be a non-zero number' }, 400)
      if (Math.abs(delta) > 100) return json({ error: 'delta too large (max ±100 per adjustment)' }, 400)
      if (!reason) return json({ error: 'reason required — this goes in the audit ledger' }, 400)
      const { data, error } = await supabase.rpc('adjust_credits', {
        p_user_id: userId,
        p_delta: delta,
        p_reason: reason,
      })
      if (error) return json({ error: mapError(error.message) }, 400)
      return json({ adjusted: true, credits_remaining: data })
    }
    return json({ error: `unknown action: ${action || '(none)'} — use list_members | member_detail | renew | change_plan | adjust_credits` }, 400)
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})

function mapError(message: string): string {
  if (message.includes('NO_SUBSCRIPTION')) return 'No subscription found for this member.'
  if (message.includes('PLAN_NOT_FOUND')) return 'Unknown or inactive plan code.'
  if (message.includes('DELTA_ZERO')) return 'Adjustment must be non-zero.'
  return message
}
