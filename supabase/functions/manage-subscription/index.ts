import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

// Subscription + member management — owner/staff tooling endpoint, consumed
// by the owner portal's Members page. Actions:
//   list_members    { query? }              → search member_profiles (name/phone), with subscription
//   member_detail   { user_id }             → profile + auth email + subscription + recent credit ledger
//   credit_activity {}                      → latest ledger rows across ALL members (renewals + adjustments)
//   frontdesk_profile { user_id }           → check-in card: payment state, waiver, recent bookings, birthday flag
//   sign_waiver     { user_id }             → mark the liability waiver signed (front desk)
//   set_birthday    { user_id, date_of_birth } → set/correct a member's birthday (YYYY-MM-DD)
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

    if (action === 'credit_activity') {
      // Latest ledger rows across every member — auto-renewals and owner
      // adjustments in one feed so the owner can watch the cron working.
      const { data: rows, error } = await supabase
        .from('credit_ledger')
        .select('user_id,delta,reason,class_code,created_at')
        .order('created_at', { ascending: false })
        .limit(25)
      if (error) return json({ error: error.message }, 400)
      const ids = [...new Set((rows ?? []).map((r: Record<string, unknown>) => r.user_id))]
      const { data: profiles } = await supabase
        .from('member_profiles')
        .select('id,first_name,last_name')
        .in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])
      const nameById = new Map<string, string>(
        (profiles ?? []).map((p: Record<string, unknown>) => [
          String(p.id),
          `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || '(unnamed)',
        ]),
      )
      return json({
        activity: (rows ?? []).map((r: Record<string, unknown>) => ({
          user_id: r.user_id,
          member_name: nameById.get(String(r.user_id)) ?? '(removed member)',
          delta: r.delta,
          reason: r.reason,
          is_auto: typeof r.reason === 'string' && /^monthly renewal \(/.test(r.reason),
          created_at: r.created_at,
        })),
      })
    }

    const userId = String(body.user_id ?? '').trim()

    if (action === 'frontdesk_profile') {
      if (!userId) return json({ error: 'user_id required' }, 400)
      const [{ data: profile, error: pErr }, { data: authData }, { data: sub }] = await Promise.all([
        supabase.from('member_profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.auth.admin.getUserById(userId),
        supabase.from('user_subscriptions').select('*').eq('user_id', userId).maybeSingle(),
      ])
      if (pErr) return json({ error: pErr.message }, 400)
      if (!profile) return json({ error: 'Member not found.' }, 404)

      // Bookings link either by auth user_id or by the local profile slug
      // ('prof-rachel-cheung'). Match both so every member's history shows.
      const slug =
        'prof-' +
        `${profile.first_name ?? ''}-${profile.last_name ?? ''}`
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id,class_id,status,created_at')
        .or(`member_label.eq.${userId},member_label.eq.${slug}`)
        .order('created_at', { ascending: false })
        .limit(5)
      const classIds = [...new Set((bookings ?? []).map((b: Record<string, unknown>) => b.class_id))]
      const { data: classes } = classIds.length
        ? await supabase.from('classes').select('id,name,day_of_week,time_label,coach_name').in('id', classIds)
        : { data: [] }
      const classById = new Map<string, Record<string, unknown>>(
        (classes ?? []).map((c: Record<string, unknown>) => [String(c.id), c]),
      )

      // Birthday is judged in Hong Kong time — that's where the front desk is.
      const hkParts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Hong_Kong',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(new Date())
      const hkMonth = Number(hkParts.find((p) => p.type === 'month')?.value)
      const hkDay = Number(hkParts.find((p) => p.type === 'day')?.value)
      const dob = profile.date_of_birth ? new Date(`${profile.date_of_birth}T00:00:00Z`) : null
      const birthdayToday = dob ? dob.getUTCMonth() + 1 === hkMonth && dob.getUTCDate() === hkDay : false

      const periodEnd = sub?.current_period_end ? new Date(sub.current_period_end) : null
      const paymentState = !sub
        ? 'none'
        : sub.status === 'canceled'
          ? 'canceled'
          : periodEnd && periodEnd > new Date()
            ? 'up_to_date'
            : 'past_due'

      return json({
        profile,
        email: authData?.user?.email ?? null,
        subscription: sub,
        payment: {
          state: paymentState,
          plan_name: sub?.membership_name ?? null,
          status: sub?.status ?? null,
          credits_remaining: sub?.credits_remaining ?? null,
          current_period_end: sub?.current_period_end ?? null,
        },
        waiver_signed_at: profile.waiver_signed_at ?? null,
        birthday_today: birthdayToday,
        bookings: (bookings ?? []).map((b: Record<string, unknown>) => {
          const cls = classById.get(String(b.class_id)) ?? {}
          return {
            id: b.id,
            status: b.status,
            created_at: b.created_at,
            class_name: cls.name ?? 'Class',
            day_of_week: cls.day_of_week ?? null,
            time_label: cls.time_label ?? null,
            coach_name: cls.coach_name ?? null,
          }
        }),
      })
    }

    if (action === 'sign_waiver') {
      if (!userId) return json({ error: 'user_id required' }, 400)
      const { data, error } = await supabase
        .from('member_profiles')
        .update({ waiver_signed_at: new Date().toISOString() })
        .eq('id', userId)
        .select('waiver_signed_at')
        .maybeSingle()
      if (error) return json({ error: error.message }, 400)
      if (!data) return json({ error: 'Member not found.' }, 404)
      return json({ signed: true, waiver_signed_at: data.waiver_signed_at })
    }

    if (action === 'set_birthday') {
      if (!userId) return json({ error: 'user_id required' }, 400)
      const dob = String(body.date_of_birth ?? '').trim()
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
        return json({ error: 'date_of_birth must be YYYY-MM-DD' }, 400)
      }
      const { data, error } = await supabase
        .from('member_profiles')
        .update({ date_of_birth: dob })
        .eq('id', userId)
        .select('date_of_birth')
        .maybeSingle()
      if (error) return json({ error: error.message }, 400)
      if (!data) return json({ error: 'Member not found.' }, 404)
      return json({ set: true, date_of_birth: data.date_of_birth })
    }

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
    return json({ error: `unknown action: ${action || '(none)'} — use list_members | member_detail | credit_activity | frontdesk_profile | sign_waiver | set_birthday | renew | change_plan | adjust_credits` }, 400)
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
