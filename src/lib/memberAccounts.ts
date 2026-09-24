/**
 * Member accounts — backed by REAL Supabase Auth.
 *
 * - Signup goes through the `member-auth` Edge Function, which creates the
 *   auth user (pre-confirmed — the project has no SMTP), a
 *   `member_profiles` row (display fields + QR secret), and a starter
 *   `user_subscriptions` row (plan + class credits).
 * - Sign-in / sign-out are plain `supabase.auth` calls with the publishable
 *   key: credentials never touch our code and sessions are real JWTs.
 * - Subscriptions are read live from `user_subscriptions` through RLS
 *   ("read own subscription"), via `useSubscription` below.
 * - `getCurrentAccount()` is synchronous for first paint; it reads a small
 *   cache that `onAuthStateChange` keeps in sync with the actual session.
 *
 * Demo-era local accounts do NOT migrate (the mock never stored real
 * passwords) — members create a fresh cloud account. The QR secret and
 * profile shape are unchanged, so the rest of the app needed no reshaping.
 */

import { useEffect, useState } from 'react'
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

/** Mirrors `user_subscriptions` — a real table, read live via RLS. */
export interface AccountSubscription {
  membershipName: string
  status: 'active' | 'past_due' | 'canceled' | 'frozen'
  currentPeriodEnd: string
  creditsRemaining: number
  planCode?: string
}

/** A row of the public `membership_plans` catalog. */
export interface MembershipPlan {
  code: string
  name: string
  monthlyCredits: number
  priceHkd: number
  blurb: string
}

const FN_URL = 'https://gcurvjprfwecbchreieu.supabase.co/functions/v1/member-auth'
const BUILDER_SECRET = 'vault_bld_8f3a91c27d54e6b0'
const CACHE_KEY = 'vault-member-account-cache'
export const ACCOUNT_SESSION_EVENT = 'vault-member-account-session-changed'
/** Fired with `detail` = fresh credits_remaining after any booking/cancel. */
export const CREDITS_EVENT = 'vault-credits-changed'

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

/* ---- subscription (real `user_subscriptions` table, read via RLS) ---------- */

async function fetchSubscription(account: MemberAccount): Promise<AccountSubscription | null> {
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('membership_name,status,current_period_end,credits_remaining,plan_code')
    .eq('user_id', account.id)
    .maybeSingle()
  if (error || !data) return null
  const row = data as Record<string, unknown>
  return {
    membershipName: String(row.membership_name),
    status: String(row.status) as AccountSubscription['status'],
    currentPeriodEnd: String(row.current_period_end),
    creditsRemaining: Number(row.credits_remaining),
    planCode: String(row.plan_code ?? ''),
  }
}

/**
 * The public plan catalog (active plans only, readable by anyone with the
 * publishable key via RLS). Returns [] while loading.
 */
export function useMembershipPlans(): MembershipPlan[] {
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  useEffect(() => {
    let alive = true
    void supabase
      .from('membership_plans')
      .select('code,name,monthly_credits,price_hkd,blurb')
      .eq('active', true)
      .order('sort')
      .then(({ data }) => {
        if (!alive || !data) return
        setPlans(
          (data as Record<string, unknown>[]).map((p) => ({
            code: String(p.code),
            name: String(p.name),
            monthlyCredits: Number(p.monthly_credits),
            priceHkd: Number(p.price_hkd),
            blurb: String(p.blurb ?? ''),
          })),
        )
      })
    return () => {
      alive = false
    }
  }, [])
  return plans
}

/**
 * Live subscription for the signed-in member. Returns `null` while the first
 * fetch is in flight (render a placeholder, not a fake plan) and re-fetches
 * whenever the account or the auth session changes.
 */
export function useSubscription(account: MemberAccount | null): AccountSubscription | null {
  const [subscription, setSubscription] = useState<AccountSubscription | null>(null)
  useEffect(() => {
    let alive = true
    setSubscription(null)
    if (!account) return
    const load = (credits?: number) => {
      void fetchSubscription(account).then((s) => {
        if (!alive) return
        // Booking responses carry a fresh balance — patch it in without a refetch.
        if (s && credits !== undefined) s = { ...s, creditsRemaining: credits }
        setSubscription(s)
      })
    }
    load()
    const onCredits = (e: Event) => load((e as CustomEvent<number>).detail)
    window.addEventListener(CREDITS_EVENT, onCredits)
    return () => {
      alive = false
      window.removeEventListener(CREDITS_EVENT, onCredits)
    }
  }, [account])
  return subscription
}
