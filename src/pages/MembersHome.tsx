/**
 * Member Home — the landing surface for signed-in members (mock draft).
 * Homepage-style hub with three destination cards:
 *
 *   Group Classes    → full weekly class schedule with mock booking
 *   Personal Training→ trainer directory with profiles
 *   My Membership    → current plan + upgrade / downgrade packages
 *
 * Draft status: all data is local mock shaped to the target SQL schema
 * (classes / bookings / users with roles member·trainer·admin) so the
 * Supabase migration is a data-source swap, not a rewrite. Bookings here
 * are per-tab state only — no persistence yet.
 */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  Check,
  ChevronLeft,
  Crown,
  Dumbbell,
  Lock,
} from 'lucide-react'
import { asset } from '@/lib/utils'
import { getMemberProfile, getMemberSession, signOutMember } from '@/lib/member'

type View = 'home' | 'classes' | 'trainers' | 'membership'

/* ---- mock schedule (will come from the `classes` table) ------------------ */

interface ClassSlot {
  id: string
  name: string
  day: string
  time: string
  coach: string
  capacity: number
  booked: number
  tag: string
}

const WEEK_CLASSES: ClassSlot[] = [
  { id: 'c1', name: 'HYROX Race Prep', day: 'Mon', time: '07:00 – 08:00', coach: 'Dan Kan', capacity: 12, booked: 9, tag: 'Race Prep' },
  { id: 'c2', name: 'FitMama Strength', day: 'Mon', time: '10:30 – 11:30', coach: 'Ziggy Makant', capacity: 10, booked: 10, tag: "Women's Health" },
  { id: 'c3', name: 'Conditioning Circuit', day: 'Tue', time: '18:30 – 19:30', coach: 'Marcus Lau', capacity: 14, booked: 6, tag: 'Conditioning' },
  { id: 'c4', name: 'Olympic Lifting Club', day: 'Wed', time: '19:00 – 20:30', coach: 'Dan Kan', capacity: 8, booked: 5, tag: 'Strength' },
  { id: 'c5', name: 'HYROX Race Prep', day: 'Thu', time: '07:00 – 08:00', coach: 'Marcus Lau', capacity: 12, booked: 11, tag: 'Race Prep' },
  { id: 'c6', name: 'FitMama Strength', day: 'Fri', time: '10:30 – 11:30', coach: 'Ziggy Makant', capacity: 10, booked: 4, tag: "Women's Health" },
  { id: 'c7', name: 'Weekend Engine', day: 'Sat', time: '09:00 – 10:00', coach: 'Dan Kan', capacity: 16, booked: 8, tag: 'Conditioning' },
]

/* ---- mock trainers (will come from `users` where role = 'trainer') -------- */

interface Trainer {
  id: string
  name: string
  initials: string
  role: string
  years: number
  specialties: string[]
  bio: string
}

const TRAINERS: Trainer[] = [
  {
    id: 't1', name: 'Dan Kan', initials: 'DK', role: 'Head Coach · Owner', years: 15,
    specialties: ['HYROX', 'Strength & Conditioning', 'Olympic Lifting'],
    bio: 'Founded The Vault after 15 years coaching competitive athletes. Builds engines and fixes movement — usually both at once.',
  },
  {
    id: 't2', name: 'Ziggy Makant', initials: 'ZM', role: 'Coach · Women’s Health', years: 9,
    specialties: ['Pre & Postnatal', 'Strength', 'Mobility'],
    bio: 'Specialist in women’s strength through every life stage. FitMama programme lead — firm on form, big on encouragement.',
  },
  {
    id: 't3', name: 'Marcus Lau', initials: 'ML', role: 'Coach · Conditioning', years: 7,
    specialties: ['HYROX', 'Metabolic Conditioning', 'Sprint Work'],
    bio: 'Former track sprinter turned conditioning obsessive. If your engine needs building, his Thursday circuit will find it.',
  },
]

/* ---- mock membership packages --------------------------------------------- */

interface Package {
  id: string
  name: string
  priceHKD: number
  period: string
  includes: string[]
  current?: boolean
  bestValue?: boolean
}

const PACKAGES: Package[] = [
  {
    id: 'gym', name: 'Gym Access', priceHKD: 1288, period: '/mo',
    includes: ['Full gym floor access', 'Towels, lockers & showers', 'No contract · cancel anytime'],
  },
  {
    id: 'gym-classes', name: 'Gym + Group Classes', priceHKD: 1788, period: '/mo',
    includes: ['Everything in Gym Access', 'Unlimited group classes', 'HYROX, FitMama & conditioning'],
  },
  {
    id: 'gym-pt', name: 'Gym + Personal Training', priceHKD: 4500, period: '/mo',
    includes: ['Everything in Gym Access', '4 × 60-min PT sessions /mo', 'Quarterly assessment & testing'],
    current: true,
  },
  {
    id: 'all', name: 'The Full Vault', priceHKD: 5800, period: '/mo', bestValue: true,
    includes: ['Everything in Gym + Classes', '4 × 60-min PT sessions /mo', 'Priority booking & guest passes'],
  },
]

/* --------------------------------------------------------------------------- */

const viewTitle: Record<Exclude<View, 'home'>, string> = {
  classes: 'Group Class Schedule',
  trainers: 'Personal Trainers',
  membership: 'My Membership',
}

export default function MembersHome() {
  const navigate = useNavigate()
  const [view, setView] = useState<View>('home')
  const [bookedIds, setBookedIds] = useState<Set<string>>(new Set())
  const session = getMemberSession()
  const member = session ? getMemberProfile(session.memberId) : undefined

  const lockOut = () => {
    signOutMember()
    navigate('/portal/login', { replace: true })
  }

  const toggleBook = (id: string) =>
    setBookedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div className="app-black min-h-[100dvh] bg-vault-bg text-white" style={{ background: '#0D0D0F' }}>
      {/* Topbar */}
      <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-vault-border bg-[#0D0D0F]/90 px-4 backdrop-blur-md md:px-8">
        <Link to="/" aria-label="Back to website" className="flex items-center gap-3">
          <img src={asset('brand/THEVAULT-logo-transparent.png')} alt="The Vault Fitness" className="h-8 w-auto" />
        </Link>
        <span className="hidden border border-gold/50 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-gold sm:inline-block">
          Member Home · Draft
        </span>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-[12px] text-vault-muted md:inline">
            {member ? member.name : 'Member'}
          </span>
          <button
            type="button"
            onClick={lockOut}
            aria-label="Lock out — sign out"
            title="Lock out"
            className="flex h-9 w-9 items-center justify-center border border-vault-border text-vault-muted transition-colors hover:border-gold/60 hover:text-gold"
          >
            <Lock className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8 md:py-12">
        <motion.div key={view} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: 'easeOut' }}>
          {view === 'home' && (
            <div>
              <p className="eyebrow">Welcome back{member ? `, ${member.name.split(' ')[0]}` : ''}</p>
              <h1 className="gold-metal-text mt-3 text-3xl md:text-4xl" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.06em' }}>
                THE VAULT, OPENED FOR YOU
              </h1>
              <p className="mt-3 max-w-lg text-[13px] leading-relaxed text-vault-muted">
                Classes, coaching and your membership — everything in one place.
                Pick a door below.
              </p>

              {/* Destination cards */}
              <div className="mt-8 grid gap-3 md:grid-cols-3">
                {[
                  { v: 'classes' as View, icon: CalendarDays, title: 'Group Classes', desc: 'Full weekly schedule — book or join the waitlist.' },
                  { v: 'trainers' as View, icon: Dumbbell, title: 'Personal Training', desc: 'Meet the coaches, their specialties and bios.' },
                  { v: 'membership' as View, icon: Crown, title: 'My Membership', desc: 'Current plan, upgrade or downgrade packages.' },
                ].map((c) => (
                  <button
                    key={c.v}
                    type="button"
                    onClick={() => setView(c.v as Exclude<View, 'home'>)}
                    className="group flex flex-col border border-vault-border bg-vault-surface/60 p-5 text-left transition-colors hover:border-gold/70 hover:bg-white/[0.04]"
                  >
                    <span className="flex h-10 w-10 items-center justify-center border border-vault-border text-vault-muted transition-colors group-hover:border-gold/60 group-hover:text-gold">
                      <c.icon className="h-4.5 w-4.5" strokeWidth={1.5} />
                    </span>
                    <span className="mt-4 flex items-center gap-2 text-[15px] font-bold text-white">
                      {c.title} <ArrowUpRight className="h-4 w-4 text-gold opacity-0 transition-opacity group-hover:opacity-100" />
                    </span>
                    <span className="mt-1 text-[12px] leading-relaxed text-vault-muted">{c.desc}</span>
                  </button>
                ))}
              </div>

              {/* Next up strip */}
              <div className="mt-8 border border-vault-border bg-vault-surface/40 p-5">
                <p className="text-[10px] uppercase tracking-[0.2em] text-vault-faint">Next up for you</p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[15px] font-bold text-white">HYROX Race Prep — Mon 07:00</p>
                    <p className="text-[12px] text-vault-muted">Coach Dan Kan · 3 spots left</p>
                  </div>
                  <button type="button" onClick={() => setView('classes')} className="btn-outline !px-4 !py-2 text-[11px]">
                    View schedule <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {view !== 'home' && (
            <div>
              <button
                type="button"
                onClick={() => setView('home')}
                className="mb-6 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-vault-muted transition-colors hover:text-white"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Member home
              </button>
              <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.04em' }}>
                {viewTitle[view]}
              </h2>

              {/* ————— CLASSES ————— */}
              {view === 'classes' && (
                <div className="mt-6 space-y-2">
                  {WEEK_CLASSES.map((c) => {
                    const spotsLeft = c.capacity - c.booked
                    const isBooked = bookedIds.has(c.id)
                    return (
                      <div key={c.id} className="flex flex-wrap items-center gap-3 border border-vault-border bg-vault-surface/50 px-4 py-3.5">
                        <div className="min-w-[86px]">
                          <p className="text-[13px] font-bold text-white">{c.day}</p>
                          <p className="text-[11px] text-vault-muted">{c.time}</p>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-bold text-white">{c.name}</p>
                          <p className="text-[11px] text-vault-muted">Coach {c.coach}</p>
                        </div>
                        <span className="hidden border border-vault-border px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-vault-muted sm:inline-block">
                          {c.tag}
                        </span>
                        <span className={`text-[11px] ${spotsLeft <= 2 ? 'text-gold' : 'text-vault-muted'}`}>
                          {isBooked ? 'Booked ✓' : spotsLeft > 0 ? `${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left` : 'Full — waitlist'}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleBook(c.id)}
                          className={`px-4 py-2 text-[11px] uppercase tracking-[0.1em] transition-colors ${
                            isBooked
                              ? 'border border-gold/60 text-gold hover:border-gold'
                              : spotsLeft > 0
                                ? 'bg-gold text-vault-btn-text hover:opacity-90'
                                : 'border border-vault-border text-vault-muted hover:border-gold/50 hover:text-gold'
                          }`}
                        >
                          {isBooked ? 'Cancel' : spotsLeft > 0 ? 'Book' : 'Waitlist'}
                        </button>
                      </div>
                    )
                  })}
                  <p className="pt-2 text-[11px] text-vault-faint">
                    Mock schedule — bookings confirm in this tab only until the backend ships.
                  </p>
                </div>
              )}

              {/* ————— TRAINERS ————— */}
              {view === 'trainers' && (
                <div className="mt-6 grid gap-3 md:grid-cols-3">
                  {TRAINERS.map((t) => (
                    <div key={t.id} className="flex flex-col border border-vault-border bg-vault-surface/50 p-5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-gold/50 bg-gold/10 text-[13px] text-gold">
                          {t.initials}
                        </span>
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 text-[15px] font-bold text-white">
                            {t.name} <BadgeCheck className="h-4 w-4 text-gold" />
                          </p>
                          <p className="truncate text-[11px] text-vault-muted">{t.role}</p>
                        </div>
                      </div>
                      <p className="mt-4 flex-1 text-[12px] leading-relaxed text-vault-muted">{t.bio}</p>
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {t.specialties.map((s) => (
                          <span key={s} className="border border-vault-border px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-vault-muted">
                            {s}
                          </span>
                        ))}
                      </div>
                      <p className="mt-3 text-[11px] text-vault-faint">{t.years} years coaching</p>
                      <Link to="/intake?mode=training" className="btn-outline mt-4 w-full !px-4 !py-2 text-[11px]">
                        Enquire about PT <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  ))}
                </div>
              )}

              {/* ————— MEMBERSHIP ————— */}
              {view === 'membership' && (
                <div className="mt-6">
                  <div className="mb-5 flex items-center gap-2 border border-gold/50 bg-gold/5 px-4 py-3">
                    <Crown className="h-4 w-4 text-gold" />
                    <p className="text-[12px] text-vault-muted">
                      Current plan: <span className="font-bold text-white">Gym + Personal Training — HK$ 4,500/mo</span>
                    </p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {PACKAGES.map((p) => (
                      <div
                        key={p.id}
                        className={`relative flex flex-col border p-5 ${
                          p.current ? 'border-gold/70 bg-gold/5' : 'border-vault-border bg-vault-surface/50'
                        }`}
                      >
                        {p.current && (
                          <span className="absolute -top-2.5 left-4 bg-gold px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-vault-btn-text">
                            Current
                          </span>
                        )}
                        {p.bestValue && !p.current && (
                          <span className="absolute -top-2.5 left-4 border border-gold/60 bg-[#0D0D0F] px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-gold">
                            Best value
                          </span>
                        )}
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="text-[15px] font-bold text-white">{p.name}</p>
                          <p className="text-[15px] font-bold text-gold">
                            HK$ {p.priceHKD.toLocaleString()}
                            <span className="text-[11px] font-normal text-vault-muted">{p.period}</span>
                          </p>
                        </div>
                        <ul className="mt-4 flex-1 space-y-1.5">
                          {p.includes.map((inc) => (
                            <li key={inc} className="flex items-start gap-2 text-[12px] text-vault-muted">
                              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" /> {inc}
                            </li>
                          ))}
                        </ul>
                        <button
                          type="button"
                          disabled={p.current}
                          className={`mt-5 w-full px-4 py-2.5 text-[11px] uppercase tracking-[0.1em] transition-colors ${
                            p.current
                              ? 'cursor-default border border-gold/40 text-gold/60'
                              : 'bg-gold text-vault-btn-text hover:opacity-90'
                          }`}
                        >
                          {p.current ? 'Your plan' : p.priceHKD > 4500 ? 'Upgrade' : 'Downgrade'}
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-[11px] text-vault-faint">
                    Packages are a mock draft — pricing and inclusions will be confirmed with the owners before go-live.
                  </p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </main>

      <footer className="border-t border-vault-border px-4 py-6 text-center text-[11px] text-vault-faint">
        © 2026 The Vault Fitness · Member Home
      </footer>
    </div>
  )
}
