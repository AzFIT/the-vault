/**
 * Member accounts — local stand-in for the `users` + `user_subscriptions`
 * tables in the target schema. Signing up creates a record shaped exactly
 * like the SQL row (id, role 'member', qr_code_secret, created_at) plus a
 * subscription stub (status 'active', credits), so the Supabase migration
 * is an API swap, not a reshape.
 *
 * Passwords are stored in plain localStorage — acceptable ONLY because this
 * is a front-end mock. Real auth (hashed passwords, JWT) arrives with the
 * backend, per the schema's password_hash field.
 */

export interface MemberAccount {
  /** UUID-shaped id, matching the SQL type */
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  role: 'member'
  qrCodeSecret: string
  createdAt: string
}

/** Mirrors `user_subscriptions` for the mock. */
export interface AccountSubscription {
  membershipName: string
  status: 'active' | 'past_due' | 'canceled' | 'frozen'
  currentPeriodEnd: string
  creditsRemaining: number
}

const ACCOUNTS_KEY = 'vault-member-accounts'
const SESSION_KEY = 'vault-member-account-session'
export const ACCOUNT_SESSION_EVENT = 'vault-member-account-session-changed'

function notify() {
  window.dispatchEvent(new Event(ACCOUNT_SESSION_EVENT))
}

/* ---- helpers --------------------------------------------------------------- */

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

function qrSecret(): string {
  const bytes = new Uint8Array(20)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function listAccounts(): MemberAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY)
    return raw ? (JSON.parse(raw) as MemberAccount[]) : []
  } catch {
    return []
  }
}

function save(accounts: MemberAccount[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts))
}

export function findAccountByEmail(email: string): MemberAccount | undefined {
  const key = email.trim().toLowerCase()
  return listAccounts().find((a) => a.email.toLowerCase() === key)
}

/* ---- signup / sign-in ------------------------------------------------------ */

export interface SignupInput {
  firstName: string
  lastName: string
  email: string
  phone: string
  password: string
}

export function createAccount(input: SignupInput): { account?: MemberAccount; error?: string } {
  const email = input.email.trim().toLowerCase()
  if (!input.firstName.trim() || !input.lastName.trim()) return { error: 'Enter your first and last name.' }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Enter a valid email address.' }
  if (input.password.length < 6) return { error: 'Password must be at least 6 characters.' }
  if (findAccountByEmail(email)) return { error: 'An account with this email already exists — sign in instead.' }

  const account: MemberAccount = {
    id: uuid(),
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    email,
    phone: input.phone.trim(),
    role: 'member',
    qrCodeSecret: qrSecret(),
    createdAt: new Date().toISOString(),
  }
  save([...listAccounts(), account])
  setAccountSession(account.id)
  return { account }
}

export function signInAccount(email: string, password: string): { account?: MemberAccount; error?: string } {
  const account = findAccountByEmail(email)
  // Mock: any password ≥6 chars passes for any existing account.
  if (!account) return { error: 'No account found for this email — create one below.' }
  if (password.length < 6) return { error: 'Password must be at least 6 characters.' }
  setAccountSession(account.id)
  return { account }
}

/* ---- session --------------------------------------------------------------- */

export function getAccountSessionId(): string | null {
  return localStorage.getItem(SESSION_KEY)
}

export function getCurrentAccount(): MemberAccount | null {
  const id = getAccountSessionId()
  return (id && listAccounts().find((a) => a.id === id)) || null
}

export function setAccountSession(id: string) {
  localStorage.setItem(SESSION_KEY, id)
  notify()
}

export function signOutAccount() {
  localStorage.removeItem(SESSION_KEY)
  notify()
}

/** The mock subscription every new account starts on. */
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
