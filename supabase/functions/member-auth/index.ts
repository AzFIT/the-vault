import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

// Member signup — creates a REAL Supabase Auth user (email + password,
// pre-confirmed via the admin API so logins work without an SMTP server)
// plus a member_profiles row holding display fields and the QR secret.
//
// Sign-in and sign-out do NOT go through this function: the browser calls
// supabase.auth.signInWithPassword / signOut directly with the publishable
// key, so credentials never touch our code and sessions are real JWTs.
//
// Same demo-grade gate as the rest of the build: the shared builder secret
// ships in frontend JS. Harden (rate limit, CAPTCHA, or dashboard email
// provider) before real-member launch.
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

function qrSecret(): string {
  const bytes = new Uint8Array(20)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req: Request) => {
  try {
    return await handle(req)
  } catch (e) {
    console.error('member-auth unhandled error:', e)
    const msg = e instanceof Error ? e.message : String(e)
    return json({ error: `internal: ${msg}` }, 500)
  }
})

async function handle(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json' }, 400)
  }
  if (body?.secret !== BUILDER_SECRET) return json({ error: 'unauthorized' }, 401)
  if (String(body.action ?? '') !== 'signup') return json({ error: 'unknown action — use signup' }, 400)

  const firstName = String(body.first_name ?? '').trim()
  const lastName = String(body.last_name ?? '').trim()
  const email = String(body.email ?? '').trim().toLowerCase()
  const phone = String(body.phone ?? '').trim()
  const password = String(body.password ?? '')

  if (!firstName || !lastName) return json({ error: 'Enter your first and last name.' }, 400)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Enter a valid email address.' }, 400)
  if (password.length < 6) return json({ error: 'Password must be at least 6 characters.' }, 400)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Create the user; the admin API rejects duplicates, so map that to a
  // friendly 409 instead of pre-checking (getUserByEmail isn't available
  // in the edge runtime's supabase-js build).
  const qr = qrSecret()
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // no SMTP on the project — pre-confirm so sign-in works
    user_metadata: { first_name: firstName, last_name: lastName, phone },
  })
  if (error || !data.user) {
    const msg = error?.message ?? 'signup failed'
    if (/already (exists|been registered)/i.test(msg)) {
      return json({ error: 'An account with this email already exists — sign in instead.' }, 409)
    }
    return json({ error: msg }, 400)
  }

  const { error: profileError } = await supabase.from('member_profiles').insert({
    id: data.user.id,
    first_name: firstName,
    last_name: lastName,
    phone: phone || null,
    role: 'member',
    qr_code_secret: qr,
  })
  const { error: subError } = await supabase.from('user_subscriptions').insert({
    user_id: data.user.id,
  })
  if (profileError || subError) {
    // Roll the auth user back so a failed profile/subscription doesn't leave
    // an orphan (member_profiles and user_subscriptions cascade from it).
    await supabase.auth.admin.deleteUser(data.user.id)
    return json({ error: `profile failed: ${(profileError ?? subError)?.message}` }, 400)
  }

  return json({
    id: data.user.id,
    email,
    first_name: firstName,
    last_name: lastName,
    phone,
    qr_code_secret: qr,
  })
}
