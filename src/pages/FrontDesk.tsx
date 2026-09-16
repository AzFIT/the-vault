/**
 * Front-desk staff dashboard (/portal/front-desk) — what Rachel sees.
 *
 * Everything on this screen is an action the front-desk role owns: six shift
 * KPI cards, a live shift summary, quick-add buttons that log under the
 * signed-in staff ID (auto-tagging), follow-up reminders, and a weekly
 * leaderboard. Baseline figures are mock; anything logged through the
 * quick-add buttons is stored in localStorage and counts toward today's
 * cards in real time.
 *
 * Guard: no session (or the wrong role) bounces to /portal/login.
 */
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BellPlus,
  CalendarClock,
  Phone,
  Receipt,
  UserPlus,
  Users,
  Package,
  Star,
  LogOut,
} from 'lucide-react'
import { countNewEnquiries } from '@/lib/enquiries'
import {
  addReminder,
  completeReminder,
  countToday,
  EVENT_POINTS,
  getCurrentProfile,
  listReminders,
  listTodayEvents,
  pointsToday,
  recordEvent,
  salesToday,
  signOut,
} from '@/lib/staff'
import type { ShiftEventType, StaffProfile } from '@/lib/staff'

/** Mock baselines for the current shift — live events add on top. */
const BASE = {
  checkins: 42,
  itemsSold: 18,
  salesHKD: 3200,
  stock: 3,
  messages: 12,
  signups: 4,
  score: 87,
}

const SEED_FEED: { time: string; label: string; pill: string; pillCls: string }[] = [
  { time: '12:42', label: 'Rachel Cheung — PT 3x/wk', pill: 'Member', pillCls: 'border-[#7ec98f] text-[#7ec98f]' },
  { time: '12:31', label: 'Walk-in — day pass HK$180', pill: 'Drop-in', pillCls: 'border-gold text-gold' },
  { time: '12:15', label: 'FITMAMA Strength — 4 checked in', pill: 'Class', pillCls: 'border-[#7ec98f] text-[#7ec98f]' },
  { time: '11:58', label: 'David Chan — 2:1 with Rachel C. 18:30', pill: 'PT', pillCls: 'border-[#7ec98f] text-[#7ec98f]' },
]

const LEADERBOARD = [
  { initials: 'RC', name: 'Rachel Cheung', meta: 'front desk', pts: 94, you: true },
  { initials: 'DK', name: 'Dan Kan', meta: 'owner', pts: 91, you: false },
  { initials: 'ZM', name: 'Ziggy Makant', meta: 'coach', pts: 88, you: false },
  { initials: 'TR', name: 'Teresa Riddle', meta: 'coach', pts: 82, you: false },
  { initials: 'TM', name: 'Tarryn Maree', meta: 'coach', pts: 79, you: false },
]

const SALE_ITEMS = [
  { label: 'Day pass', amount: 180 },
  { label: 'Class pack 10', amount: 1500 },
  { label: 'PT 3-pack', amount: 2100 },
  { label: 'Merch — tee', amount: 280 },
]

const TYPE_META: Record<ShiftEventType, { pill: string; cls: string }> = {
  checkin: { pill: 'Check-in', cls: 'border-[#7ec98f] text-[#7ec98f]' },
  sale: { pill: 'Sale', cls: 'border-white text-white' },
  stock: { pill: 'Stock', cls: 'border-vault-muted text-vault-muted' },
  message: { pill: 'Message', cls: 'border-white/70 text-white/70' },
  signup: { pill: 'Sign-up', cls: 'border-gold text-gold' },
  followup: { pill: 'Follow-up', cls: 'border-gold text-gold' },
}

function formatHKD(n: number): string {
  return `HK$${n.toLocaleString('en-HK')}`
}

function elapsedLabel(): string {
  const now = new Date()
  const start = new Date(now)
  start.setHours(7, 0, 0, 0)
  const ms = now.getTime() - start.getTime()
  if (ms < 0) return 'shift starts 07:00'
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return `${h}h ${String(m).padStart(2, '0')}m elapsed`
}

// ---------------------------------------------------------------------------
// Quick-add panel — one compact form per action, all tagged to the staff ID
// ---------------------------------------------------------------------------

type QuickKind = 'sale' | 'call' | 'dropin' | 'reminder'

const QUICK_BUTTONS: { kind: QuickKind; label: string; icon: typeof Receipt }[] = [
  { kind: 'sale', label: 'Record sale', icon: Receipt },
  { kind: 'call', label: 'Log call', icon: Phone },
  { kind: 'dropin', label: 'Add drop-in', icon: UserPlus },
  { kind: 'reminder', label: 'Follow-up reminder', icon: BellPlus },
]

function QuickAdd({ profile, onLogged }: { profile: StaffProfile; onLogged: () => void }) {
  const [kind, setKind] = useState<QuickKind | null>(null)
  const [saleItem, setSaleItem] = useState(0)
  const [who, setWho] = useState('')
  const [channel, setChannel] = useState<'Call' | 'WhatsApp'>('Call')
  const [pass, setPass] = useState('Day pass HK$180')
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('14:00')

  const close = () => setKind(null)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (kind === 'sale') {
      const item = SALE_ITEMS[saleItem]
      recordEvent(profile.id, 'sale', `Sale — ${item.label} ${formatHKD(item.amount)}`)
    } else if (kind === 'call') {
      if (!who.trim()) return
      recordEvent(profile.id, 'message', `${channel} — ${who.trim()}`)
      setWho('')
    } else if (kind === 'dropin') {
      if (!who.trim()) return
      recordEvent(profile.id, 'checkin', `Drop-in — ${who.trim()} (${pass})`)
      setWho('')
    } else if (kind === 'reminder') {
      if (!title.trim()) return
      addReminder(title, due)
      setTitle('')
    }
    onLogged()
    close()
  }

  const inputCls =
    'w-full border border-vault-border bg-vault-bg px-3 py-2.5 text-[14px] text-white placeholder:text-vault-faint focus:border-white/60 focus:outline-none'
  const selectCls = `${inputCls} appearance-none`

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {QUICK_BUTTONS.map(({ kind: k, label, icon: Icon }) => (
          <button
            key={k}
            type="button"
            aria-pressed={kind === k}
            onClick={() => setKind((cur) => (cur === k ? null : k))}
            className={`flex items-center gap-2 border px-4 py-2.5 text-[12px] font-bold uppercase tracking-[0.1em] transition-colors ${
              kind === k
                ? 'border-white bg-white text-vault-btn-text'
                : k === 'sale'
                  ? 'border-white bg-white text-vault-btn-text'
                  : 'border-vault-border bg-vault-surface text-vault-muted hover:border-white/60 hover:text-white'
            }`}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {kind && (
          <motion.form
            onSubmit={submit}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="mt-3 flex flex-wrap items-end gap-3 border border-vault-border bg-vault-surface p-4"
          >
            {kind === 'sale' && (
              <>
                <label className="min-w-[200px] flex-1">
                  <span className="wf-label mb-1.5 block text-[10px] uppercase tracking-[0.14em] text-vault-muted">Item</span>
                  <select value={saleItem} onChange={(e) => setSaleItem(Number(e.target.value))} className={selectCls}>
                    {SALE_ITEMS.map((s, i) => (
                      <option key={s.label} value={i}>
                        {s.label} — {formatHKD(s.amount)}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="pb-3 text-[12px] text-vault-faint">tags {profile.staffNo} · +{EVENT_POINTS.sale} pts</p>
              </>
            )}
            {kind === 'call' && (
              <>
                <label className="min-w-[180px] flex-1">
                  <span className="mb-1.5 block text-[10px] uppercase tracking-[0.14em] text-vault-muted">Client</span>
                  <input value={who} onChange={(e) => setWho(e.target.value)} placeholder="Jessica Mok" className={inputCls} autoFocus />
                </label>
                <label className="w-[140px]">
                  <span className="mb-1.5 block text-[10px] uppercase tracking-[0.14em] text-vault-muted">Channel</span>
                  <select value={channel} onChange={(e) => setChannel(e.target.value as 'Call' | 'WhatsApp')} className={selectCls}>
                    <option>Call</option>
                    <option>WhatsApp</option>
                  </select>
                </label>
              </>
            )}
            {kind === 'dropin' && (
              <>
                <label className="min-w-[180px] flex-1">
                  <span className="mb-1.5 block text-[10px] uppercase tracking-[0.14em] text-vault-muted">Name</span>
                  <input value={who} onChange={(e) => setWho(e.target.value)} placeholder="Walk-in name" className={inputCls} autoFocus />
                </label>
                <label className="w-[180px]">
                  <span className="mb-1.5 block text-[10px] uppercase tracking-[0.14em] text-vault-muted">Pass</span>
                  <select value={pass} onChange={(e) => setPass(e.target.value)} className={selectCls}>
                    <option>Day pass HK$180</option>
                    <option>Trial class</option>
                  </select>
                </label>
              </>
            )}
            {kind === 'reminder' && (
              <>
                <label className="min-w-[220px] flex-1">
                  <span className="mb-1.5 block text-[10px] uppercase tracking-[0.14em] text-vault-muted">Reminder</span>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Call back…" className={inputCls} autoFocus />
                </label>
                <label className="w-[110px]">
                  <span className="mb-1.5 block text-[10px] uppercase tracking-[0.14em] text-vault-muted">Due</span>
                  <select value={due} onChange={(e) => setDue(e.target.value)} className={selectCls}>
                    {['10:00', '12:00', '14:00', '15:00', '16:00', '18:00'].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
              </>
            )}
            <button
              type="submit"
              className="bg-white px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-vault-btn-text transition-opacity hover:opacity-85"
            >
              Save
            </button>
            <button
              type="button"
              onClick={close}
              className="border border-vault-border px-4 py-2.5 text-[11px] uppercase tracking-[0.12em] text-vault-muted transition-colors hover:text-white"
            >
              Cancel
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function FrontDesk() {
  const navigate = useNavigate()
  const profile = getCurrentProfile()
  const [tick, setTick] = useState(0)
  const [reminders, setReminders] = useState(() => listReminders())
  const [newEnquiries] = useState(() => countNewEnquiries())

  // Guard: signed-in front desk only; everyone else back to the login gate.
  useEffect(() => {
    if (!profile) navigate('/portal/login', { replace: true })
    else if (profile.role !== 'front-desk') navigate(profile.home, { replace: true })
  }, [profile, navigate])

  const refresh = () => {
    setTick((t) => t + 1)
    setReminders(listReminders())
  }

  const live = useMemo(
    () => ({
      checkins: countToday(profile?.id ?? '', 'checkin'),
      sales: salesToday(profile?.id ?? ''),
      messages: countToday(profile?.id ?? '', 'message'),
      followupsDone: countToday(profile?.id ?? '', 'followup'),
      pts: pointsToday(profile?.id ?? ''),
      events: listTodayEvents(profile?.id ?? '').slice(-12).reverse(),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, profile?.id],
  )

  if (!profile || profile.role !== 'front-desk') {
    return (
      <div className="app-black flex min-h-[100dvh] items-center justify-center bg-vault-bg" role="status" aria-label="Loading">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-vault-border border-t-gold" />
      </div>
    )
  }

  const todayLabel = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const kpis = [
    { label: 'Total check-ins', icon: Users, value: BASE.checkins + live.checkins, sub: 'members · PT · drop-ins' },
    { label: 'Items sold', icon: Receipt, value: BASE.itemsSold + live.events.filter((e) => e.type === 'sale').length, sub: `POS · ${formatHKD(BASE.salesHKD + live.sales)}` },
    { label: 'Stock adjustments', icon: Package, value: BASE.stock, sub: '2 restock · 1 transfer' },
    { label: 'Calls & messages', icon: Phone, value: BASE.messages + live.messages, sub: 'calls · WhatsApp replies' },
    { label: 'Sign-ups / trials', icon: UserPlus, value: BASE.signups, sub: '2 memberships · 2 trials' },
    { label: 'Productivity score', icon: Star, value: BASE.score, sub: '▲ 6 pts vs yesterday', gold: true, live: live.pts },
  ]

  const signOutAndLeave = () => {
    signOut()
    navigate('/portal/login', { replace: true })
  }

  const doneReminder = (id: string, title: string) => {
    completeReminder(id)
    recordEvent(profile.id, 'followup', `Follow-up done — ${title}`)
    refresh()
  }

  interface NavItem {
    label: string
    active?: boolean
    soon?: boolean
    href?: string
    badge?: number
  }

  const NAV_TODAY: NavItem[] = [
    { label: 'My shift', active: true },
    { label: 'Check In', soon: true },
    { label: 'POS', soon: true },
    { label: 'Follow-ups', href: '#reminders', badge: reminders.filter((r) => !r.done).length || undefined },
  ]
  const NAV_STUDIO: NavItem[] = [
    { label: 'Schedule', soon: true },
    { label: 'Clients', soon: true },
    { label: 'Enquiries', href: '/admin/enquiries', badge: newEnquiries || undefined },
  ]

  const navBtn = (item: NavItem) =>
    item.href ? (
      <Link
        key={item.label}
        to={item.href}
        onClick={(e) => {
          if (item.href?.startsWith('#')) {
            e.preventDefault()
            document.querySelector(item.href)?.scrollIntoView({ behavior: 'smooth' })
          }
        }}
        className="relative flex items-center gap-3 px-3 py-2.5 text-[13px] text-vault-muted transition-colors hover:bg-white/[0.04] hover:text-white"
      >
        <span className="h-1.5 w-1.5 border border-vault-faint" />
        {item.label}
        {item.badge ? (
          <span className="ml-auto rounded-full bg-gold px-1.5 py-0.5 text-[10px] font-medium leading-none text-black">{item.badge}</span>
        ) : null}
      </Link>
    ) : (
      <button
        key={item.label}
        type="button"
        disabled
        title="Coming in a later phase"
        className="relative flex w-full cursor-not-allowed items-center gap-3 px-3 py-2.5 text-left text-[13px] text-vault-faint"
      >
        <span className="h-1.5 w-1.5 border border-vault-faint/60" />
        {item.label}
        <span className="ml-auto text-[9px] uppercase tracking-[0.14em] text-vault-faint">Soon</span>
      </button>
    )

  return (
    <div className="app-black min-h-[100dvh] bg-vault-bg text-white">
      <div className="flex">
        {/* Sidebar */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-vault-border bg-vault-surface p-3 lg:flex">
          <div className="flex items-center gap-3 border-b border-vault-border px-2 pb-4 pt-1">
            <span className="flex h-9 w-9 items-center justify-center border border-gold text-[13px] font-bold text-gold">V</span>
            <span className="text-[13px] font-bold uppercase tracking-[0.18em]">The Vault</span>
          </div>
          <p className="navsec px-3 pb-1 pt-4 text-[10px] uppercase tracking-[0.2em] text-vault-faint">Today</p>
          {NAV_TODAY.map((item) =>
            item.active ? (
              <span key={item.label} className="relative flex items-center gap-3 bg-white/[0.08] px-3 py-2.5 text-[13px] text-white">
                <span className="absolute left-0 top-0 h-full w-0.5 bg-gold" aria-hidden />
                <span className="h-1.5 w-1.5 bg-gold" />
                {item.label}
              </span>
            ) : (
              navBtn(item)
            ),
          )}
          <p className="px-3 pb-1 pt-4 text-[10px] uppercase tracking-[0.2em] text-vault-faint">Studio</p>
          {NAV_STUDIO.map(navBtn)}
          <div className="mt-auto flex items-center gap-3 border-t border-vault-border px-2 pt-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-vault-border bg-vault-surface-2 text-[11px] text-vault-muted">
              {profile.initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">{profile.name}</p>
              <p className="text-[11px] text-vault-muted">
                {profile.roleLabel} · {profile.staffNo}
              </p>
            </div>
            <button
              type="button"
              onClick={signOutAndLeave}
              aria-label="Sign out"
              title="Sign out"
              className="p-1.5 text-vault-muted transition-colors hover:text-white"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </aside>

        {/* Main */}
        <div className="min-w-0 flex-1 lg:pl-60">
          {/* Topbar */}
          <header className="sticky top-0 z-30 flex h-16 flex-wrap items-center gap-3 border-b border-vault-border bg-vault-bg/90 px-4 backdrop-blur-md md:px-8">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-vault-muted">Staff</p>
              <h1 className="text-lg font-bold leading-tight">My shift</h1>
            </div>
            <span className="ml-auto border border-gold/50 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-gold">
              Tester mode — signed in as {profile.name}
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-vault-border bg-vault-surface-2 text-[11px] text-vault-muted">
              {profile.initials}
            </span>
          </header>

          <main className="mx-auto w-full max-w-[1280px] space-y-6 p-4 md:p-8">
            {/* Greeting + shift summary */}
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Front desk</p>
                <h2 className="mt-1 text-2xl font-bold md:text-3xl">Hi {profile.name.split(' ')[0]} — shift 07:00–15:00</h2>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-vault-muted">
                  <CalendarClock className="h-3.5 w-3.5" /> {todayLabel} · {elapsedLabel()} · everything you log is tagged{' '}
                  <span className="font-bold text-white">{profile.staffNo}</span>
                </p>
              </div>
              <div className="app-card px-5 py-3 text-[13px] text-vault-muted">
                Shift so far: <b className="text-white">{BASE.checkins + live.checkins} served</b> ·{' '}
                <b className="text-white">{formatHKD(BASE.salesHKD + live.sales)} sales</b> ·{' '}
                <b className="text-white">{live.followupsDone} follow-ups done</b>
              </div>
            </div>

            {/* Quick add */}
            <QuickAdd profile={profile} onLogged={refresh} />

            {/* KPI row */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
              {kpis.map((k, i) => (
                <motion.div
                  key={k.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.05, ease: 'easeOut' }}
                  className={`app-card p-4 ${k.gold ? 'border-gold/50' : ''}`}
                >
                  <p className={`flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] ${k.gold ? 'text-gold' : 'text-vault-muted'}`}>
                    <k.icon className="h-3.5 w-3.5" strokeWidth={1.5} /> {k.label}
                  </p>
                  <p className={`tnum mt-2 text-[24px] font-bold leading-none ${k.gold ? 'text-gold' : 'text-white'}`}>
                    {k.value.toLocaleString()}
                    {k.live ? <span className="ml-1 text-[12px] text-gold">+{k.live}</span> : null}
                  </p>
                  <p className="mt-2 text-[11px] text-vault-muted">{k.sub}</p>
                </motion.div>
              ))}
            </div>

            {/* Canvas + rail */}
            <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
              <div className="min-w-0 space-y-6">
                {/* Live feed */}
                <section className="app-card p-5 md:p-6" aria-label="Recent activity">
                  <h3 className="mb-3 flex items-center justify-between text-[15px] font-bold">
                    Recent activity
                    {live.events.length > 0 && (
                      <span className="text-[10px] uppercase tracking-[0.14em] text-gold">live · tagged {profile.staffNo}</span>
                    )}
                  </h3>
                  <ul>
                    {live.events.map((e) => (
                      <motion.li
                        key={e.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3 border-b border-vault-border/60 py-2.5 text-[13px] last:border-0"
                      >
                        <span className="tnum w-11 shrink-0 text-vault-faint">
                          {new Date(e.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-white/90">{e.label}</span>
                        <span className={`border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em] ${TYPE_META[e.type].cls}`}>
                          {TYPE_META[e.type].pill}
                        </span>
                        {e.points > 0 && <span className="tnum text-[10px] text-gold">+{e.points}</span>}
                      </motion.li>
                    ))}
                    {SEED_FEED.map((r) => (
                      <li key={r.time + r.label} className="flex items-center gap-3 border-b border-vault-border/60 py-2.5 text-[13px] text-vault-muted last:border-0">
                        <span className="tnum w-11 shrink-0 text-vault-faint">{r.time}</span>
                        <span className="min-w-0 flex-1 truncate">{r.label}</span>
                        <span className={`border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em] ${r.pillCls}`}>{r.pill}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* Reminders */}
                <section id="reminders" className="app-card scroll-mt-24 p-5 md:p-6" aria-label="Follow-up reminders">
                  <h3 className="mb-3 text-[15px] font-bold">Follow-up reminders</h3>
                  <ul>
                    {reminders.map((r) => (
                      <li
                        key={r.id}
                        className={`flex flex-wrap items-center gap-3 border-b border-vault-border/60 py-3 text-[13px] last:border-0 ${
                          r.done ? 'opacity-40' : ''
                        }`}
                      >
                        <span className={`border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em] ${r.due === 'Overdue' ? 'border-[#ff6b6b] text-[#ff6b6b]' : 'border-gold text-gold'}`}>
                          {r.due}
                        </span>
                        <span className={`min-w-0 flex-1 ${r.done ? 'line-through' : 'text-white/90'}`}>{r.title}</span>
                        {!r.done && (
                          <button
                            type="button"
                            onClick={() => doneReminder(r.id, r.title)}
                            className="border border-vault-border px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] text-vault-muted transition-colors hover:border-white hover:text-white"
                          >
                            Done +{EVENT_POINTS.followup} pts
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              </div>

              {/* Rail */}
              <div className="space-y-6">
                <section className="app-card p-5" aria-label="Leaderboard">
                  <h3 className="mb-3 flex items-baseline justify-between text-[15px] font-bold">
                    This week’s leaderboard <span className="text-[10px] uppercase tracking-[0.14em] text-vault-faint">wk 38</span>
                  </h3>
                  <ul>
                    {LEADERBOARD.map((row, i) => {
                      const pts = row.you ? row.pts + live.pts : row.pts
                      return (
                        <li
                          key={row.initials}
                          className={`flex items-center gap-3 border-b border-vault-border/60 py-2.5 text-[13px] last:border-0 ${
                            row.you ? 'border-l-2 border-l-gold pl-2' : ''
                          }`}
                        >
                          <span className={`tnum w-6 ${row.you ? 'font-bold text-gold' : 'text-vault-faint'}`}>{i + 1}</span>
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-vault-surface-3 text-[9px] text-vault-muted">
                            {row.initials}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={row.you ? 'font-bold text-white' : 'text-white/80'}>{row.name}</span>{' '}
                            <span className="text-[11px] text-vault-faint">{row.meta}</span>
                          </span>
                          <span className={`tnum ${row.you ? 'font-bold text-gold' : 'text-vault-muted'}`}>{pts} pts</span>
                        </li>
                      )
                    })}
                  </ul>
                </section>
                <section className="app-card p-5" aria-label="How the productivity score works">
                  <h3 className="mb-3 text-[15px] font-bold">How your score works</h3>
                  <ul className="space-y-2 text-[12px] text-vault-muted">
                    {(Object.keys(EVENT_POINTS) as ShiftEventType[])
                      .filter((t) => EVENT_POINTS[t] > 0)
                      .map((t) => (
                        <li key={t} className="flex justify-between">
                          <span className="capitalize">{TYPE_META[t].pill.toLowerCase()}</span>
                          <b className={t === 'signup' ? 'text-gold' : 'text-white'}>{EVENT_POINTS[t]} pt{EVENT_POINTS[t] > 1 ? 's' : ''}</b>
                        </li>
                      ))}
                  </ul>
                </section>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
