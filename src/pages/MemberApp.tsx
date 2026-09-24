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
  Dumbbell,
  Home,
  Lock,
  PartyPopper,
  ScanLine,
  ShieldCheck,
  User,
} from 'lucide-react'
import { asset } from '@/lib/utils'
import { requestVaultEntry } from '@/lib/vaultEntry'
import {
  getFrontdeskProfile,
  signMemberWaiver,
  type FrontdeskProfile,
} from '@/lib/memberAdmin'
import {
  createAccount,
  getCurrentAccount,
  signInAccount,
  signOutAccount,
  useMembershipPlans,
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
import {
  loadMyProgram,
  setSessionComplete,
  type ClientProgramSummary,
  type MyProgramResult,
} from '@/lib/programSave'

type Tab = 'home' | 'program' | 'schedule' | 'activity' | 'profile'

const TAB_ICONS = { home: Home, program: Dumbbell, schedule: CalendarDays, activity: ActivityIcon, profile: User } as const

/** Notation rides in exercise notes as `{"notation":"A1"}` JSON — same convention as the builder. */
const notationOf = (notes: string | null): string | null => {
  if (!notes) return null
  try {
    const parsed = JSON.parse(notes) as { notation?: unknown }
    return typeof parsed.notation === 'string' && parsed.notation ? parsed.notation : null
  } catch {
    return null
  }
}

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

/* ---- my program view --------------------------------------------------------- */

function MyProgramView({
  program,
  completions,
  week,
  onWeek,
  onToggle,
  toggling,
}: {
  program: ClientProgramSummary
  completions: { workout_id: string; week_number: number; completed_at: string }[]
  week: number
  onWeek: (w: number) => void
  onToggle: (workoutId: string) => void
  toggling: string | null
}) {
  const totalWeeks = Math.max(1, program.duration_weeks ?? 1)
  const doneThisWeek = program.workouts.filter((w) =>
    completions.some((c) => c.workout_id === w.id && c.week_number === week),
  ).length
  const pct = program.workouts.length ? Math.round((doneThisWeek / program.workouts.length) * 100) : 0

  return (
    <div className="mt-4 space-y-4">
      {/* header */}
      <div className="border border-gold/40 bg-gold/[0.06] p-4">
        <p className="text-[9px] uppercase tracking-[0.18em] text-vault-gold">Current program</p>
        <p className="mt-1 text-lg font-bold text-white" style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>
          {program.name}
        </p>
        {program.description && (
          <p className="mt-1 text-[11px] leading-relaxed text-vault-muted">{program.description}</p>
        )}
        <p className="tnum mt-2 text-[10px] uppercase tracking-[0.1em] text-vault-faint">
          {totalWeeks} weeks · {program.frequency_per_week ?? program.workouts.length}×/week
          {program.start_date ? ` · started ${new Date(program.start_date).toLocaleDateString()}` : ''}
        </p>
      </div>

      {/* week selector */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((w) => {
          const doneCount = program.workouts.filter((wo) =>
            completions.some((c) => c.workout_id === wo.id && c.week_number === w),
          ).length
          const complete = program.workouts.length > 0 && doneCount === program.workouts.length
          const active = w === week
          return (
            <button
              key={w}
              type="button"
              onClick={() => onWeek(w)}
              className={`tnum relative shrink-0 border px-3 py-2 text-[11px] uppercase tracking-[0.1em] transition-colors ${
                active
                  ? 'border-gold bg-gold/15 text-gold'
                  : complete
                    ? 'border-emerald-500/40 text-emerald-300'
                    : 'border-vault-border text-vault-muted hover:text-white'
              }`}
            >
              W{w}
              {complete && <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400" />}
            </button>
          )
        })}
      </div>

      {/* weekly progress */}
      <div>
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.12em] text-vault-muted">
          <span>Week {week} progress</span>
          <span className="tnum">{doneThisWeek}/{program.workouts.length} sessions</span>
        </div>
        <div className="mt-1.5 h-1 w-full bg-vault-surface-2">
          <div className="h-full bg-gold transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* sessions */}
      {program.workouts.length === 0 ? (
        <p className="border border-dashed border-vault-border px-4 py-6 text-center text-[12px] text-vault-faint">
          This program has no sessions yet.
        </p>
      ) : (
        <div className="space-y-3">
          {program.workouts.map((w) => {
            const done = completions.some((c) => c.workout_id === w.id && c.week_number === week)
            const busy = toggling === `${w.id}:${week}`
            return (
              <div key={w.id} className={`border ${done ? 'border-emerald-500/40' : 'border-vault-border'} bg-vault-surface/50`}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onToggle(w.id)}
                    disabled={busy}
                    aria-label={done ? `Mark ${w.name} not done` : `Mark ${w.name} done`}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center border transition-colors ${
                      done
                        ? 'border-emerald-400/60 bg-emerald-400/10 text-emerald-300'
                        : 'border-vault-border text-vault-faint hover:border-gold/60 hover:text-gold'
                    } ${busy ? 'opacity-50' : ''}`}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={`text-[13px] font-bold ${done ? 'text-emerald-200' : 'text-white'}`}>{w.name}</p>
                    <p className="text-[10px] uppercase tracking-[0.1em] text-vault-faint">
                      {w.exercises.length} exercises{w.notes ? ` · ${w.notes}` : ''}
                    </p>
                  </div>
                  <span className="text-[9px] uppercase tracking-[0.12em] text-vault-muted">
                    {done ? 'Done' : 'Tap ✓ when done'}
                  </span>
                </div>
                <div className="border-t border-vault-border/60 px-4 py-2">
                  {w.exercises.map((e, i) => {
                    const notation = notationOf(e.notes)
                    return (
                      <div key={i} className="flex items-baseline gap-2 py-1 text-[11px]">
                        <span className="w-7 shrink-0 text-vault-gold">{notation ?? ''}</span>
                        <span className="min-w-0 flex-1 truncate text-white">{e.name}</span>
                        <span className="tnum shrink-0 text-vault-muted">
                          {e.sets != null ? `${e.sets}×` : ''}{e.reps ?? '—'}
                          {e.rest_seconds != null ? ` · rest ${e.rest_seconds}s` : ''}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
      <p className="text-[10px] leading-relaxed text-vault-faint">
        Ticking a session records it against Week {week} — your trainer sees your progress in the coach portal.
      </p>
    </div>
  )
}

/* ---- main page ------------------------------------------------------------- */

export default function MemberApp() {
  const [account, setAccount] = useState<MemberAccount | null>(() => getCurrentAccount())
  // Live from `user_subscriptions` — null while the first fetch is in flight.
  const subscription = useSubscription(account)
  const plans = useMembershipPlans()
  const [tab, setTab] = useState<Tab>('home')
  const [bookError, setBookError] = useState<string | null>(null)
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

  /* ---- cloud profile (waiver / payment / birthday / bookings) -------------- */
  const [cloud, setCloud] = useState<FrontdeskProfile | null>(null)
  const [cloudState, setCloudState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [signingWaiver, setSigningWaiver] = useState(false)
  useEffect(() => {
    if (!account) return
    let live = true
    setCloudState('loading')
    getFrontdeskProfile(account.id)
      .then((p) => {
        if (!live) return
        setCloud(p)
        setCloudState('ready')
      })
      .catch(() => {
        if (live) setCloudState('error')
      })
    return () => {
      live = false
    }
  }, [account])
  const signWaiver = async () => {
    if (!account || signingWaiver) return
    setSigningWaiver(true)
    try {
      const at = await signMemberWaiver(account.id)
      setCloud((c) => (c ? { ...c, profile: { ...c.profile, waiver_signed_at: at } } : c))
    } catch {
      /* surfaced by the button simply re-enabling — the desk can also sign */
    } finally {
      setSigningWaiver(false)
    }
  }

  /* ---- my program (assigned by the trainer, from Supabase) ----------------- */
  const [myProg, setMyProg] = useState<MyProgramResult | null>(null)
  const [myProgState, setMyProgState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [progWeek, setProgWeek] = useState(1)
  const [toggling, setToggling] = useState<string | null>(null)
  useEffect(() => {
    if (!account) return
    let live = true
    setMyProgState('loading')
    loadMyProgram(account.email)
      .then((r) => {
        if (!live) return
        setMyProg(r)
        setMyProgState('ready')
        // Land on the current week of the program when it has a start date.
        if (r.program?.start_date && r.program.duration_weeks) {
          const days = Math.floor(
            (Date.now() - new Date(r.program.start_date).getTime()) / 86_400_000,
          )
          setProgWeek(Math.min(Math.max(1, Math.floor(days / 7) + 1), r.program.duration_weeks))
        }
      })
      .catch(() => {
        if (live) setMyProgState('error')
      })
    return () => {
      live = false
    }
  }, [account])
  const toggleSession = async (workoutId: string) => {
    if (!account || toggling) return
    const key = `${workoutId}:${progWeek}`
    const done = !myProg?.completions.some(
      (c) => c.workout_id === workoutId && c.week_number === progWeek,
    )
    setToggling(key)
    try {
      await setSessionComplete(account.email, workoutId, progWeek, done)
      setMyProg((prev) => {
        if (!prev) return prev
        const completions = done
          ? [...prev.completions, { workout_id: workoutId, week_number: progWeek, completed_at: new Date().toISOString() }]
          : prev.completions.filter(
              (c) => !(c.workout_id === workoutId && c.week_number === progWeek),
            )
        return { ...prev, completions }
      })
    } catch {
      /* leave unchecked — the button re-enables */
    } finally {
      setToggling(null)
    }
  }

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
              {bookError && (
                <p className="mt-3 border border-gold/50 bg-gold/10 px-3 py-2.5 text-[12px] leading-snug text-gold">
                  {bookError}
                </p>
              )}
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
                        onClick={() => {
                          setBookError(null)
                          const op = mine ? cancelBooking(c.id) : bookClass(c.id)
                          op.catch((e) => setBookError(e instanceof Error ? e.message : 'Something went wrong — try again.'))
                        }}
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

          {/* ————— MY PROGRAM ————— */}
          {tab === 'program' && (
            <div>
              <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>My Program</h2>

              {myProgState === 'loading' && (
                <p className="mt-4 border border-vault-border bg-vault-surface/50 px-4 py-6 text-center text-[12px] text-vault-muted">
                  Loading your program…
                </p>
              )}
              {myProgState === 'error' && (
                <p className="mt-4 border border-red-500/40 bg-red-500/10 px-4 py-6 text-center text-[12px] text-red-300">
                  Couldn't load your program — pull down to retry in a moment.
                </p>
              )}
              {myProgState === 'ready' && !myProg?.client && (
                <p className="mt-4 border border-vault-border bg-vault-surface/50 px-4 py-6 text-center text-[12px] leading-relaxed text-vault-muted">
                  Your member account isn't linked to a client profile yet — ask your
                  trainer or the front desk to link <span className="text-white">{account.email}</span> to your client record.
                </p>
              )}
              {myProgState === 'ready' && myProg?.client && !myProg.program && (
                <p className="mt-4 border border-vault-border bg-vault-surface/50 px-4 py-6 text-center text-[12px] text-vault-muted">
                  {myProg.client.full_name} — your trainer hasn't assigned a program yet.
                  It will appear here the moment it's sent.
                </p>
              )}

              {myProg?.client && myProg.program && (
                <MyProgramView
                  program={myProg.program}
                  completions={myProg.completions}
                  week={progWeek}
                  onWeek={setProgWeek}
                  onToggle={toggleSession}
                  toggling={toggling}
                />
              )}
            </div>
          )}

          {/* ————— PROFILE ————— */}
          {tab === 'profile' && (
            <div>
              <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>Profile</h2>

              {/* Birthday treat — surfaces on the member's day */}
              {cloud?.birthday_today && (
                <div className="mt-4 flex items-start gap-3 border border-gold/60 bg-gold/10 p-4">
                  <PartyPopper className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
                  <div>
                    <p className="text-[14px] font-bold text-gold">Happy birthday, {account.firstName}!</p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-vault-muted">
                      Everyone at The Vault wishes you a strong year ahead. Show this screen at the
                      front desk today for a birthday treat.
                    </p>
                  </div>
                </div>
              )}

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

              {/* Account status — waiver, payments, renewal, recent bookings */}
              <div className="mt-4 border border-vault-border bg-vault-surface/50 p-5">
                <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-vault-faint">
                  <ShieldCheck className="h-3.5 w-3.5 text-gold" /> Account status
                </p>
                {cloudState === 'loading' && (
                  <p className="mt-3 text-[12px] text-vault-muted">Loading your account…</p>
                )}
                {cloudState === 'error' && (
                  <p className="mt-3 text-[12px] leading-relaxed text-vault-muted">
                    Account details aren't available yet — ask the front desk to link your member
                    profile to this login.
                  </p>
                )}
                {cloud && (
                  <>
                    <dl className="mt-3 space-y-2.5 text-[12px]">
                      <div className="flex justify-between gap-4">
                        <dt className="text-vault-muted">Waiver</dt>
                        <dd className={cloud.profile.waiver_signed_at ? 'text-emerald-300' : 'text-gold'}>
                          {cloud.profile.waiver_signed_at
                            ? `Signed ${new Date(cloud.profile.waiver_signed_at).toLocaleDateString()}`
                            : 'Not signed'}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-vault-muted">Payments</dt>
                        <dd className={
                          cloud.payment.state === 'up_to_date'
                            ? 'text-emerald-300'
                            : cloud.payment.state === 'past_due'
                              ? 'text-red-300'
                              : 'text-white'
                        }>
                          {cloud.payment.state === 'up_to_date'
                            ? 'Up to date'
                            : cloud.payment.state === 'past_due'
                              ? 'Past due — see front desk'
                              : cloud.payment.state === 'canceled'
                                ? 'Canceled'
                                : 'No plan yet'}
                        </dd>
                      </div>
                      {cloud.payment.current_period_end && (
                        <div className="flex justify-between gap-4">
                          <dt className="text-vault-muted">Renews</dt>
                          <dd className="text-white">
                            {new Date(cloud.payment.current_period_end).toLocaleDateString()}
                          </dd>
                        </div>
                      )}
                      {cloud.payment.credits_remaining !== null && (
                        <div className="flex justify-between gap-4">
                          <dt className="text-vault-muted">Class credits</dt>
                          <dd className="tnum text-white">{cloud.payment.credits_remaining}</dd>
                        </div>
                      )}
                    </dl>
                    {cloud.payment.state === 'past_due' && (
                      <p className="mt-3 border border-red-400/40 bg-red-400/10 px-3 py-2 text-[11px] leading-snug text-red-200">
                        Your payment is past due — please settle it at the front desk to keep
                        booking classes.
                      </p>
                    )}
                    {!cloud.profile.waiver_signed_at && (
                      <button
                        type="button"
                        onClick={signWaiver}
                        disabled={signingWaiver}
                        className="mt-4 w-full border border-gold/60 px-4 py-2.5 text-[11px] uppercase tracking-[0.12em] text-gold transition-colors hover:bg-gold/10 disabled:opacity-50"
                      >
                        {signingWaiver ? 'Signing…' : 'Sign waiver now'}
                      </button>
                    )}
                    {cloud.bookings.length > 0 && (
                      <div className="mt-4 border-t border-vault-border pt-3">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-vault-faint">Recent bookings</p>
                        <div className="mt-2 space-y-1.5">
                          {cloud.bookings.slice(0, 5).map((b) => (
                            <div key={b.id} className="flex items-center justify-between gap-3 text-[12px]">
                              <span className="min-w-0 truncate text-white">{b.class_name}</span>
                              <span className="shrink-0 text-vault-muted">
                                {[b.day_of_week, b.time_label].filter(Boolean).join(' · ')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Plan catalog — public read; switching plans lands with the front desk for now */}
              <div className="mt-4 border border-vault-border bg-vault-surface/50 p-5">
                <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-vault-faint">
                  <Crown className="h-3.5 w-3.5 text-gold" /> Plans
                </p>
                <div className="mt-3 space-y-2">
                  {plans.length === 0 && (
                    <p className="text-[12px] text-vault-muted">Loading plans…</p>
                  )}
                  {plans.map((p) => {
                    const current = subscription?.planCode === p.code
                    return (
                      <div
                        key={p.code}
                        className={`flex items-center justify-between gap-3 border px-3 py-2.5 ${
                          current ? 'border-gold/60 bg-gold/5' : 'border-vault-border'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-white">
                            {p.name}
                            {current && <span className="ml-2 text-[9px] uppercase tracking-[0.14em] text-gold">Current</span>}
                          </p>
                          <p className="truncate text-[11px] text-vault-muted">
                            {p.blurb}
                            {p.monthlyCredits > 0 ? ` · ${p.monthlyCredits} class credits/mo` : ''}
                          </p>
                        </div>
                        <p className="tnum shrink-0 text-[13px] font-bold text-gold">
                          HK${p.priceHkd.toLocaleString()}
                          <span className="block text-right text-[9px] font-normal text-vault-faint">/month</span>
                        </p>
                      </div>
                    )
                  })}
                </div>
                <p className="mt-3 text-[10px] leading-relaxed text-vault-faint">
                  To switch plans, talk to the front desk — plan changes and renewals are handled
                  in the owner portal so your billing stays correct.
                </p>
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
