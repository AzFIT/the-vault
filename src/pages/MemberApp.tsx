/**
 * Member App — the new-member experience, modelled on the member PWA spec
 * in the platform brief: bottom navigation (Home · Schedule · Activity ·
 * Profile), a home screen dominated by the entry QR code with the next
 * booked class right under it, and 1-click booking on the schedule.
 *
 * Auth: real Supabase Auth — signup goes through the member-auth Edge
 * Function (auth user + member_profiles + starter user_subscriptions),
 * sign-in is a plain supabase.auth call, bookings are recorded under the
 * auth user id, and the membership card reads the live subscription row.
 */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import {
  Activity as ActivityIcon,
  CalendarDays,
  Check,
  Crown,
  Home,
  Lock,
  ScanLine,
  User,
} from 'lucide-react'
import { asset } from '@/lib/utils'
import { requestVaultEntry } from '@/lib/vaultEntry'
import {
  createAccount,
  getCurrentAccount,
  signInAccount,
  signOutAccount,
  useSubscription,
  type MemberAccount,
} from '@/lib/memberAccounts'
import {
  BOOKINGS_EVENT,
  WEEK_CLASSES,
  bookingFor,
  bookClass,
  cancelBooking,
  spotsLeft,
  waitlistCount,
} from '@/lib/classSchedule'

type Tab = 'home' | 'schedule' | 'activity' | 'profile'

const TAB_ICONS = { home: Home, schedule: CalendarDays, activity: ActivityIcon, profile: User } as const

/* ---- deterministic demo QR (real dynamic QR ships with the backend) -------- */

function drawDemoQr(canvas: HTMLCanvasElement, secret: string) {
  const N = 25
  const cell = 8
  canvas.width = N * cell
  canvas.height = N * cell
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  // mulberry32 PRNG seeded from the secret — same secret, same code
  let h = 2166136261
  for (let i = 0; i < secret.length; i++) h = Math.imul(h ^ secret.charCodeAt(i), 16777619)
  const rand = () => {
    h = Math.imul(h ^ (h >>> 15), h | 1)
    h ^= h + Math.imul(h ^ (h >>> 7), h | 61)
    return ((h ^ (h >>> 14)) >>> 0) / 4294967296
  }
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, N * cell, N * cell)
  ctx.fillStyle = '#0D0D0F'
  const inFinder = (x: number, y: number) =>
    (x < 8 && y < 8) || (x >= N - 8 && y < 8) || (x < 8 && y >= N - 8)
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      if (inFinder(x, y)) continue
      if (rand() > 0.52) ctx.fillRect(x * cell, y * cell, cell, cell)
    }
  // finder squares (3 corners)
  const finder = (fx: number, fy: number) => {
    ctx.fillRect(fx * cell, fy * cell, 7 * cell, 7 * cell)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect((fx + 1) * cell, (fy + 1) * cell, 5 * cell, 5 * cell)
    ctx.fillStyle = '#0D0D0F'
    ctx.fillRect((fx + 2) * cell, (fy + 2) * cell, 3 * cell, 3 * cell)
  }
  finder(0, 0)
  finder(N - 7, 0)
  finder(0, N - 7)
}

function QrCard({ account }: { account: MemberAccount }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (canvasRef.current) drawDemoQr(canvasRef.current, account.qrCodeSecret)
  }, [account.qrCodeSecret])
  return (
    <div className="border border-vault-border bg-white p-5 text-center">
      <div className="mx-auto inline-block border-4 border-[#0D0D0F]">
        <canvas ref={canvasRef} className="block h-44 w-44" aria-label="Your entry code" />
      </div>
      <p className="mt-4 flex items-center justify-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-[#0D0D0F]">
        <ScanLine className="h-4 w-4" /> Scan to enter
      </p>
      <p className="mt-1 text-[11px] text-neutral-500">
        {account.firstName} {account.lastName} · Demo code — dynamic QR ships with the backend
      </p>
    </div>
  )
}

/* ---- auth card ------------------------------------------------------------- */

function AuthCard({ onAuthed }: { onAuthed: () => void }) {
  const [mode, setMode] = useState<'signup' | 'signin'>('signup')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setError(null)
    const result =
      mode === 'signup'
        ? await createAccount({ firstName, lastName, email, phone, password })
        : await signInAccount(email, password)
    if (result.error) setError(result.error)
    else {
      onAuthed()
      // Play the vault-entry ceremony over the app home appearing —
      // empty destination: no navigation, the overlay just covers the reveal.
      requestVaultEntry('')
    }
  }

  const FIELD =
    'w-full border border-vault-border bg-vault-bg px-3 py-2.5 text-[13px] text-white placeholder:text-vault-faint focus:border-vault-surface-3 focus:outline-none'
  const LABEL = 'mb-1 block text-[10px] uppercase tracking-[0.16em] text-vault-muted'

  return (
    <div className="w-full max-w-md">
      <div className="mb-5 flex border border-vault-border">
        {(['signup', 'signin'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m)
              setError(null)
            }}
            className={`flex-1 px-4 py-2.5 text-[11px] uppercase tracking-[0.14em] transition-colors ${
              mode === m ? 'bg-gold text-vault-btn-text' : 'text-vault-muted hover:text-white'
            }`}
          >
            {m === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {mode === 'signup' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL} htmlFor="ma-first">First name</label>
              <input id="ma-first" className={FIELD} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <label className={LABEL} htmlFor="ma-last">Last name</label>
              <input id="ma-last" className={FIELD} value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
        )}
        <div>
          <label className={LABEL} htmlFor="ma-email">Email</label>
          <input id="ma-email" type="email" className={FIELD} placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {mode === 'signup' && (
          <div>
            <label className={LABEL} htmlFor="ma-phone">Phone (optional)</label>
            <input id="ma-phone" className={FIELD} placeholder="+852 …" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        )}
        <div>
          <label className={LABEL} htmlFor="ma-pass">Password</label>
          <input id="ma-pass" type="password" className={FIELD} placeholder="At least 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
        </div>
        {error && <p className="border border-red-500/40 bg-red-500/10 px-3 py-2 text-[11px] leading-snug text-red-300">{error}</p>}
        <button type="button" onClick={submit} className="w-full bg-white px-4 py-3 text-[12px] font-bold uppercase tracking-[0.14em] text-vault-btn-text transition-opacity hover:opacity-85">
          {mode === 'signup' ? 'Join the Vault' : 'Sign in'}
        </button>
        <p className="text-center text-[10px] text-vault-faint">
          Real cloud accounts — your sign-in works on any device.
        </p>
      </div>
    </div>
  )
}

/* ---- main page ------------------------------------------------------------- */

export default function MemberApp() {
  const [account, setAccount] = useState<MemberAccount | null>(() => getCurrentAccount())
  // Live from `user_subscriptions` — null while the first fetch is in flight.
  const subscription = useSubscription(account)
  const [tab, setTab] = useState<Tab>('home')
  const [bookTick, setBookTick] = useState(0)
  useEffect(() => {
    const refresh = () => setBookTick((t) => t + 1)
    window.addEventListener(BOOKINGS_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(BOOKINGS_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])
  void bookTick

  if (!account) {
    return (
      <div className="app-black grid min-h-[100dvh] bg-vault-bg text-white lg:grid-cols-2" style={{ background: '#141518' }}>
        <div className="relative flex flex-col items-center justify-center overflow-hidden border-b border-vault-border p-8 text-center lg:border-b-0 lg:border-r">
          <div className="steel-texture pointer-events-none absolute inset-0" />
          <div className="relative">
            <div className="gold-ring pointer-events-none absolute inset-0 rounded-full" />
            <img src={asset('brand/vault-door-gold.png')} alt="The Vault door" className="vault-door-spin relative w-44 md:w-56" style={{ filter: 'drop-shadow(0 18px 42px rgba(0,0,0,0.6))' }} />
          </div>
          <h1 className="gold-metal-text relative mt-8 text-3xl md:text-4xl" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.08em' }}>
            JOIN THE VAULT
          </h1>
          <p className="relative mt-3 max-w-xs text-[13px] leading-relaxed text-vault-muted">
            Create your account and the door opens — your code, your classes, your plan.
          </p>
          <Link to="/" className="relative mt-8 text-[12px] text-vault-muted transition-colors hover:text-white">
            ← Back to website
          </Link>
        </div>
        <div className="flex items-center justify-center p-8">
          <AuthCard onAuthed={() => setAccount(getCurrentAccount())} />
        </div>
      </div>
    )
  }

  const bookings = WEEK_CLASSES.filter((c) => bookingFor(c.id))
  const nextClass = bookings.find((c) => bookingFor(c.id)?.status === 'confirmed')
  const lockOut = () => {
    signOutAccount()
    setAccount(null)
    setTab('home')
  }

  return (
    <div className="app-black min-h-[100dvh] bg-vault-bg pb-24 text-white" style={{ background: '#0D0D0F' }}>
      {/* Topbar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-vault-border bg-[#0D0D0F]/90 px-4 backdrop-blur-md">
        <img src={asset('brand/THEVAULT-logo-transparent.png')} alt="The Vault Fitness" className="h-7 w-auto" />
        <span className="text-[10px] uppercase tracking-[0.18em] text-vault-muted">Member App · Preview</span>
      </header>

      <main className="mx-auto w-full max-w-lg px-4 pt-6">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
          {/* ————— HOME ————— */}
          {tab === 'home' && (
            <div className="space-y-4">
              <p className="eyebrow">Welcome, {account.firstName}</p>
              <QrCard account={account} />

              {/* Next booked class */}
              <div className="border border-vault-border bg-vault-surface/50 p-4">
                <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-vault-faint">
                  <CalendarDays className="h-3.5 w-3.5 text-gold" /> Next class
                </p>
                {nextClass ? (
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[15px] font-bold text-white">{nextClass.name}</p>
                      <p className="text-[12px] text-vault-muted">
                        {nextClass.day} · {nextClass.time} · Coach {nextClass.coach}
                      </p>
                    </div>
                    <span className="border border-gold/60 px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-gold">Confirmed</span>
                  </div>
                ) : (
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="text-[13px] text-vault-muted">Nothing booked yet — grab a spot.</p>
                    <button type="button" onClick={() => setTab('schedule')} className="bg-gold px-3 py-2 text-[10px] uppercase tracking-[0.1em] text-vault-btn-text hover:opacity-90">
                      Book
                    </button>
                  </div>
                )}
              </div>

              {/* Membership */}
              <div className="border border-vault-border bg-vault-surface/50 p-4">
                <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-vault-faint">
                  <Crown className="h-3.5 w-3.5 text-gold" /> Membership
                </p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[15px] font-bold text-white">{subscription?.membershipName ?? 'Loading plan…'}</p>
                    <p className="text-[12px] text-vault-muted">
                      {subscription
                        ? `Renews ${new Date(subscription.currentPeriodEnd).toLocaleDateString()} · ${subscription.creditsRemaining} class credits left`
                        : 'Fetching your membership from the Vault…'}
                    </p>
                  </div>
                  <span className={`border px-2 py-1 text-[10px] uppercase tracking-[0.1em] ${
                    subscription?.status === 'active'
                      ? 'border-emerald-400/50 text-emerald-300'
                      : 'border-gold/50 text-gold'
                  }`}>
                    {subscription?.status ?? '…'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ————— SCHEDULE ————— */}
          {tab === 'schedule' && (
            <div>
              <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>This Week</h2>
              <div className="mt-4 space-y-2">
                {WEEK_CLASSES.map((c) => {
                  const mine = bookingFor(c.id)
                  const left = spotsLeft(c)
                  const waiting = waitlistCount(c.id)
                  return (
                    <div key={c.id} className="flex items-center gap-3 border border-vault-border bg-vault-surface/50 px-3 py-3">
                      <div className="min-w-[64px]">
                        <p className="text-[13px] font-bold text-white">{c.day}</p>
                        <p className="text-[10px] text-vault-muted">{c.time}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-bold text-white">{c.name}</p>
                        <p className="text-[10px] text-vault-muted">
                          {mine?.status === 'confirmed' ? 'Booked ✓' : mine?.status === 'waitlisted' ? `Waitlisted · #${waiting}` : left > 0 ? `${left} left` : 'Full'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => (mine ? cancelBooking(c.id) : bookClass(c.id))}
                        className={`shrink-0 px-3 py-2 text-[10px] uppercase tracking-[0.1em] transition-colors ${
                          mine
                            ? 'border border-vault-border text-vault-muted hover:border-red-400/60 hover:text-red-300'
                            : left > 0
                              ? 'bg-gold text-vault-btn-text hover:opacity-90'
                              : 'border border-vault-border text-vault-muted hover:border-gold/60 hover:text-gold'
                        }`}
                      >
                        {mine ? 'Cancel' : left > 0 ? 'Book' : 'Waitlist'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ————— ACTIVITY ————— */}
          {tab === 'activity' && (
            <div>
              <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>Activity</h2>
              <div className="mt-4 space-y-2">
                {bookings.length === 0 && (
                  <p className="border border-vault-border bg-vault-surface/50 px-4 py-6 text-center text-[12px] text-vault-muted">
                    No sessions yet — book your first class on the Schedule tab.
                  </p>
                )}
                {bookings.map((c) => {
                  const b = bookingFor(c.id)
                  return (
                    <div key={c.id} className="flex items-center gap-3 border border-vault-border bg-vault-surface/50 px-4 py-3">
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center border ${b?.status === 'confirmed' ? 'border-emerald-400/50 text-emerald-300' : 'border-gold/50 text-gold'}`}>
                        <Check className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-bold text-white">{c.name}</p>
                        <p className="text-[11px] text-vault-muted">{c.day} · {c.time}</p>
                      </div>
                      <span className="text-[10px] uppercase tracking-[0.1em] text-vault-muted">
                        {b?.status === 'confirmed' ? 'Upcoming' : 'Waitlisted'}
                      </span>
                    </div>
                  )
                })}
              </div>
              <p className="mt-3 text-[11px] text-vault-faint">
                Attendance history (attended / no-show) populates once check-in scanning goes live.
              </p>
            </div>
          )}

          {/* ————— PROFILE ————— */}
          {tab === 'profile' && (
            <div>
              <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>Profile</h2>
              <div className="mt-4 border border-vault-border bg-vault-surface/50 p-5">
                <div className="flex items-center gap-4">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full border border-gold/50 bg-gold/10 text-[16px] text-gold">
                    {account.firstName[0]}{account.lastName[0]}
                  </span>
                  <div>
                    <p className="text-[16px] font-bold text-white">{account.firstName} {account.lastName}</p>
                    <p className="text-[12px] text-vault-muted">{subscription?.membershipName ?? '—'}</p>
                  </div>
                </div>
                <dl className="mt-5 space-y-2.5 text-[12px]">
                  <div className="flex justify-between gap-4"><dt className="text-vault-muted">Email</dt><dd className="text-white">{account.email}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-vault-muted">Phone</dt><dd className="text-white">{account.phone || '—'}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-vault-muted">Member since</dt><dd className="text-white">{new Date(account.createdAt).toLocaleDateString()}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-vault-muted">Entry code</dt><dd className="tnum text-white">{account.qrCodeSecret.slice(0, 8)}…</dd></div>
                </dl>
                <button
                  type="button"
                  onClick={lockOut}
                  className="mt-6 flex w-full items-center justify-center gap-2 border border-vault-border px-4 py-3 text-[11px] uppercase tracking-[0.14em] text-vault-muted transition-colors hover:border-gold/60 hover:text-gold"
                >
                  <Lock className="h-4 w-4" /> Lock out
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </main>

      {/* Bottom navigation (PWA spec) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-vault-border bg-[#0D0D0F]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg">
          {(Object.keys(TAB_ICONS) as Tab[]).map((t) => {
            const Icon = TAB_ICONS[t]
            const active = tab === t
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                aria-label={t}
                className={`flex flex-1 flex-col items-center gap-1 py-3 text-[9px] uppercase tracking-[0.14em] transition-colors ${active ? 'text-gold' : 'text-vault-faint hover:text-vault-muted'}`}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2 : 1.5} />
                {t}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
