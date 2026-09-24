import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

// Subscription management — owner/staff tooling endpoint (Phase B framework,
// consumed by the owner portal in Phase D). Actions:
//   renew        { user_id }                 → roll period forward, reset credits
//   change_plan  { user_id, plan_code }      → swap plan, reset allowance
// Both are audited in credit_ledger by the DB functions themselves.
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
  const userId = String(body.user_id ?? '').trim()
  if (!userId) return json({ error: 'user_id required' }, 400)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
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
    return json({ error: `unknown action: ${action || '(none)'} — use renew | change_plan` }, 400)
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})

function mapError(message: string): string {
  if (message.includes('NO_SUBSCRIPTION')) return 'No subscription found for this member.'
  if (message.includes('PLAN_NOT_FOUND')) return 'Unknown or inactive plan code.'
  return message
}
