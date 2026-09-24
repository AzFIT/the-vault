/**
 * Member accounts — backed by REAL Supabase Auth.
 *
 * - Signup goes through the `member-auth` Edge Function, which creates the
 *   auth user (pre-confirmed — the project has no SMTP) plus a
 *   `member_profiles` row holding display fields and the QR secret.
 * - Sign-in / sign-out are plain `supabase.auth` calls with the publishable
 *   key: credentials never touch our code and sessions are real JWTs.
 * - `getCurrentAccount()` is synchronous for first paint; it reads a small
 *   cache that `onAuthStateChange` keeps in sync with the actual session.
 *
 * Demo-era local accounts do NOT migrate (the mock never stored real
 * passwords) — members create a fresh cloud account. The QR secret and
 * profile shape are unchanged, so the rest of the app needed no reshaping.
 */

import { supabase } from '@/lib/supabase'

export interface MemberAccount {
  /** The auth user's id — bookings are recorded under this same id. */
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  role: 'member'
  qrCodeSecret: string
  createdAt: string
}

/** Mirrors `user_subscriptions` — still a stub until that table ships. */
export interface AccountSubscription {
  membershipName: string
  status: 'active' | 'past_due' | 'canceled' | 'frozen'
  currentPeriodEnd: string
  creditsRemaining: number
}

const FN_URL = 'https://gcurvjprfwecbchreieu.supabase.co/functions/v1/member-auth'
const BUILDER_SECRET = 'vault_bld_8f3a91c27d54e6b0'
const CACHE_KEY = 'vault-member-account-cache'
export const ACCOUNT_SESSION_EVENT = 'vault-member-account-session-changed'

function notify() {
  window.dispatchEvent(new Event(ACCOUNT_SESSION_EVENT))
}

/* ---- session cache --------------------------------------------------------- */

let cached: MemberAccount | null = null
let cacheLoaded = false

function readCache(): MemberAccount | null {
  if (cacheLoaded) return cached
  cacheLoaded = true
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    cached = raw ? (JSON.parse(raw) as MemberAccount) : null
  } catch {
    cached = null
  }
  return cached
}

function writeCache(account: MemberAccount | null) {
  cached = account
  cacheLoaded = true
  try {
    if (account) localStorage.setItem(CACHE_KEY, JSON.stringify(account))
    else localStorage.removeItem(CACHE_KEY)
  } catch {
    /* storage full / private mode — the in-memory cache still works */
  }
  notify()
}

interface ProfileRow {
  id: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  qr_code_secret: string | null
  created_at: string
}

function accountFromProfile(row: ProfileRow, email: string): MemberAccount {
  return {
    id: row.id,
    firstName: row.first_name ?? '',
    lastName: row.last_name ?? '',
    email,
    phone: row.phone ?? '',
    role: 'member',
    qrCodeSecret: row.qr_code_secret ?? '',
    createdAt: row.created_at,
  }
}

async function fetchProfile(userId: string, email: string): Promise<MemberAccount> {
  const { data } = await supabase.from('member_profiles').select('*').eq('id', userId).maybeSingle()
  if (data) return accountFromProfile(data as ProfileRow, email)
  // Profile missing (shouldn't happen — the function inserts it atomically);
  // synthesize a minimal account so the UI never dead-ends.
  return {
    id: userId,
    firstName: '',
    lastName: '',
    email,
    phone: '',
    role: 'member',
    qrCodeSecret: '',
    createdAt: new Date().toISOString(),
  }
}

// Keep the cache honest across tab refreshes, token refreshes and sign-out.
supabase.auth.onAuthStateChange((_event, session) => {
  if (!session?.user) {
    writeCache(null)
    return
  }
  void fetchProfile(session.user.id, session.user.email ?? '').then(writeCache)
})

/* ---- signup / sign-in ------------------------------------------------------ */

export interface SignupInput {
  firstName: string
  lastName: string
  email: string
  phone: string
  password: string
}

export async function createAccount(input: SignupInput): Promise<{ account?: MemberAccount; error?: string }> {
  const firstName = input.firstName.trim()
  const lastName = input.lastName.trim()
  const email = input.email.trim().toLowerCase()
  const phone = input.phone.trim()
  const password = input.password

  if (!firstName || !lastName) return { error: 'Enter your first and last name.' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Enter a valid email address.' }
  if (password.length < 6) return { error: 'Password must be at least 6 characters.' }

  const res = await fetch(FN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: BUILDER_SECRET,
      action: 'signup',
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      password,
    }),
  })
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok || body.error) {
    return { error: String(body.error ?? `Signup failed (HTTP ${res.status})`) }
  }

  // Sign the fresh account in so the session exists immediately.
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError) return { error: `Account created but sign-in failed: ${signInError.message}` }

  const account: MemberAccount = {
    id: String(body.id),
    firstName,
    lastName,
    email,
    phone,
    role: 'member',
    qrCodeSecret: String(body.qr_code_secret ?? ''),
    createdAt: new Date().toISOString(),
  }
  writeCache(account)
  return { account }
}

export async function signInAccount(email: string, password: string): Promise<{ account?: MemberAccount; error?: string }> {
  if (password.length < 6) return { error: 'Password must be at least 6 characters.' }
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })
  if (error || !data.user) {
    return {
      error: error?.message.toLowerCase().includes('invalid')
        ? 'Wrong email or password — or no account exists for this email yet.'
        : (error?.message ?? 'Sign-in failed.'),
    }
  }
  const account = await fetchProfile(data.user.id, data.user.email ?? email.trim().toLowerCase())
  writeCache(account)
  return { account }
}

/* ---- session --------------------------------------------------------------- */

export function getAccountSessionId(): string | null {
  return readCache()?.id ?? null
}

export function getCurrentAccount(): MemberAccount | null {
  return readCache()
}

/** Kept for API compatibility — sessions now live in Supabase Auth. */
export function setAccountSession(_id: string) {
  /* no-op: the auth state listener owns the cache now */
}

export function signOutAccount() {
  writeCache(null)
  void supabase.auth.signOut()
}

/** STUB until the `user_subscriptions` table ships — clearly labeled mock. */
export function getSubscription(_account: MemberAccount): AccountSubscription {
  const end = new Date()
  end.setMonth(end.getMonth() + 1)
  return {
    membershipName: 'Gym + Group Classes',
    status: 'active',
    currentPeriodEnd: end.toISOString(),
    creditsRemaining: 8,
  }
}
