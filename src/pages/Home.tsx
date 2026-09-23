import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import gsap from 'gsap'
import {
  Activity,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Crown,
  Dumbbell,
  HeartPulse,
  Leaf,
  Star,
  TrendingUp,
  Users,
} from 'lucide-react'
import { asset } from '@/lib/utils'
import { membershipPlans, introPackage, formatHKD } from '@/data/mock'
import EnquiryModal from '@/components/enquiry/EnquiryModal'
import ClassBookingModal from '@/components/enquiry/ClassBookingModal'

const scrollToId = (id: string) =>
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* ------------------------------------------------------------------ */
/* Motion helpers (Phase 2: replaces the old GSAP scroll choreography  */
/* with one observer-driven fade-up + count-ups; functionality intact) */
/* ------------------------------------------------------------------ */

function Rise({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-in')
          obs.disconnect()
        }
      },
      { threshold: 0.12 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return (
    <div ref={ref} className={`rise ${className}`} style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}

function useCountUp(target: number) {
  const [val, setVal] = useState(() => (reducedMotion() ? target : 0))
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || reducedMotion()) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        obs.disconnect()
        const start = performance.now()
        const tick = (now: number) => {
          const p = Math.min((now - start) / 1400, 1)
          setVal(target * (1 - Math.pow(1 - p, 3)))
          if (p < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      },
      { threshold: 0.4 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [target])
  return { ref, value: Math.round(val) }
}

/* ------------------------------------------------------------------ */
/* Hero slideshow — fade-to-black crossfade, 5s per slide              */
/*                                                                     */
/* Timing per 5s cycle (matches the user's spec):                      */
/*   0–2s  fade in from black (CSS 0% → 40%)                           */
/*   2–4s  fully visible hold                                          */
/*   4–5s  fade out to black (CSS 80% → 95%), brief black beat, next    */
/* ------------------------------------------------------------------ */

const HERO_SLIDES = [
  { src: 'hero-home.jpg', alt: 'A woman performing a barbell deadlift while being coached by a personal trainer at The Vault Fitness' },
  { src: 'hero-slide-1.jpg', alt: 'The Vault training floor with the vault door' },
  { src: 'hero-slide-2.jpg', alt: 'Weightlifting platform and racks at The Vault' },
  { src: 'hero-slide-3.jpg', alt: 'Small-group class training at The Vault' },
  { src: 'hero-slide-4.jpg', alt: 'Battle-rope conditioning session' },
  { src: 'hero-slide-5.jpg', alt: 'Cardio and machine area at The Vault' },
]

const FACILITY_SLIDES = [
  { src: 'gym-facilities.jpg', alt: 'The Vault Fitness gym floor' },
  { src: 'facility-slide-2.jpg', alt: 'Strength and conditioning equipment at The Vault' },
  { src: 'facility-slide-3.jpg', alt: 'Personal training studio space at The Vault' },
  { src: 'facility-slide-4.jpg', alt: 'Strength class training at The Vault' },
  { src: 'facility-slide-5.jpg', alt: 'Spacious changing facilities at The Vault' },
]

const SLIDE_MS = 5000

type Slide = { src: string; alt: string }

/**
 * Shared fade-to-black slideshow: one slide visible at a time on a 5s
 * cycle (fade in 0–2s, hold, fade out 4–5s, brief black beat), endless
 * loop. Arrows + dots bottom-right let visitors cycle manually — the
 * timer resets after every manual pick. Reduced-motion users get a
 * static first image.
 */
function FadeSlideshow({ slides }: { slides: Slide[] }) {
  const [index, setIndex] = useState(0)
  /** Bumped on every manual change so the CSS cycle restarts on the new slide */
  const [nonce, setNonce] = useState(0)
  const timer = useRef<number | null>(null)
  const staticMode = reducedMotion()

  const go = (next: number) => {
    setIndex(((next % slides.length) + slides.length) % slides.length)
    setNonce((n) => n + 1)
  }

  useEffect(() => {
    if (staticMode) return
    timer.current = window.setTimeout(() => go(index + 1), SLIDE_MS)
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, nonce, staticMode])

  if (staticMode) {
    return (
      <img
        src={asset(slides[0].src)}
        alt={slides[0].alt}
        className="absolute inset-0 h-full w-full object-cover"
      />
    )
  }

  const slide = slides[index]
  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <img
        key={`${index}-${nonce}`}
        src={asset(slide.src)}
        alt={slide.alt}
        loading="lazy"
        className="hero-slide-img absolute inset-0 h-full w-full object-cover"
      />

      {/* Manual controls — arrows + clickable dots, bottom right */}
      <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2">
        <button
          type="button"
          aria-label="Previous photo"
          onClick={() => go(index - 1)}
          className="flex h-8 w-8 items-center justify-center border border-white/25 bg-black/45 text-white/80 backdrop-blur-sm transition-colors hover:border-gold hover:text-gold"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-1.5 px-1">
          {slides.map((s, i) => (
            <button
              key={s.src}
              type="button"
              aria-label={`Go to photo ${i + 1}`}
              onClick={() => go(i)}
              className={`h-1.5 transition-all duration-300 ${
                i === index ? 'w-5 bg-gold' : 'w-1.5 bg-white/40 hover:bg-white/75'
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          aria-label="Next photo"
          onClick={() => go(index + 1)}
          className="flex h-8 w-8 items-center justify-center border border-white/25 bg-black/45 text-white/80 backdrop-blur-sm transition-colors hover:border-gold hover:text-gold"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

const HeroSlideshow = () => <FadeSlideshow slides={HERO_SLIDES} />

/* ------------------------------------------------------------------ */
/* Section 1 — Split hero (Phase 2 spec)                                */
/* ------------------------------------------------------------------ */

function Hero() {
  const root = useRef<HTMLElement>(null)
  useEffect(() => {
    if (reducedMotion()) return
    const q = root.current?.querySelectorAll('.hero-item')
    if (!q?.length) return
    gsap.from(q, { y: 28, opacity: 0, stagger: 0.12, duration: 0.9, delay: 0.2, ease: 'power3.out' })
  }, [])

  return (
    <section ref={root} className="grid lg:grid-cols-[45%_55%]">
      {/* Left — pure black headline panel */}
      <div
        className="flex items-center bg-[#0D0D0F] px-5 py-16 md:px-12 md:py-24 lg:min-h-[calc(100svh-108px)] lg:py-0"
      >
        <div className="w-full max-w-xl">
          {/* Golden vault — the staff entrance. Clicking it is the same as the
              navbar's Staff button: straight to the portal sign-in. */}
          <Link
            to="/portal/login"
            aria-label="Staff sign-in — open the management portal"
            title="Staff sign-in"
            className="hero-item group mb-8 inline-block"
          >
            <img
              src={asset('brand/vault-door-gold.png')}
              alt="The Vault door — staff entrance"
              className="w-[clamp(88px,22vw,280px)] transition-all duration-500 group-hover:scale-105 group-hover:drop-shadow-[0_0_28px_rgba(212,175,55,0.35)]"
            />
          </Link>
          <h1 className="hero-item h-display text-[34px] leading-[1.1] md:text-[56px]">
            Unlock your fitness <span className="gold-text">Potential</span>
          </h1>
          <p className="hero-item mt-4 max-w-md text-[15px] leading-[1.7]" style={{ color: 'var(--text-secondary)' }}>
            Sheung Wan's premier personal training gym — state-of-the-art equipment,
            Hong Kong's first VIP personal training studio, and coaches with a
            combined 30 years of experience.
          </p>
          <div className="hero-item mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
            <button type="button" className="btn-gold w-full sm:w-auto" onClick={() => scrollToId('memberships')}>
              Become a Member
            </button>
            <button type="button" className="btn-outline w-full sm:w-auto" onClick={() => scrollToId('classes')}>
              Explore Classes
            </button>
          </div>
        </div>
      </div>

      {/* Right — moody gym photography slideshow, fading into the black panel */}
      <div className="relative min-h-[46vh] lg:min-h-[calc(100svh-108px)]">
        <HeroSlideshow />
        <div className="hero-photo-fade absolute inset-0" />
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Section 2 — Class cards strip (Phase 2 spec)                         */
/* ------------------------------------------------------------------ */

const CLASSES = [
  { name: 'Hyrox Class', chip: 'chip-teal', chipLabel: 'Race Prep', Icon: Activity },
  { name: 'FITMAMA Strength', chip: 'chip-maroon', chipLabel: "Women's Health", Icon: HeartPulse },
  { name: 'VIP 1-on-1', chip: 'chip-gold', chipLabel: 'Personal Training', Icon: Crown },
]

function ClassStrip() {
  const [activeClass, setActiveClass] = useState<string | null>(null)
  return (
    <section id="classes" className="bg-[#0D0D0F] py-14 md:py-20">
      <div className="mx-auto max-w-[1600px] px-4 md:px-6">
        <Rise>
          <p className="section-head mb-6">Train With Us</p>
        </Rise>
        <div className="strip-no-bar flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible">
          {CLASSES.map(({ name, chip, chipLabel, Icon }, i) => (
            <Rise key={name} delay={i * 90} className="w-[70vw] shrink-0 snap-start lg:w-auto">
              <button
                type="button"
                onClick={() => setActiveClass(name)}
                className="card group flex h-full w-full flex-col gap-5 text-left transition-colors duration-300 hover:!border-[rgba(212,175,55,0.4)]"
              >
                <div className="flex items-center justify-between">
                  <Icon size={26} strokeWidth={1.5} color="#D4AF37" aria-hidden />
                  <span className={`chip ${chip}`}>{chipLabel}</span>
                </div>
                <div>
                  <h3 className="h-display text-lg">{name}</h3>
                  <span
                    className="mt-2 inline-flex items-center gap-1.5 text-[12px] uppercase tracking-[0.1em] transition-transform duration-300 group-hover:translate-x-1"
                    style={{ color: 'var(--gold)' }}
                  >
                    Book now <ArrowRight size={13} aria-hidden />
                  </span>
                </div>
              </button>
            </Rise>
          ))}
        </div>
      </div>
      {activeClass && <ClassBookingModal cardName={activeClass} onClose={() => setActiveClass(null)} />}
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Section 3 — Stats band (Phase 2 spec)                                */
/* ------------------------------------------------------------------ */

const STATS_BAND = [
  { value: 12, suffix: 'K+', label: 'Sessions Delivered' },
  { value: 127, suffix: '', label: 'Active Members' },
  { value: 97, suffix: '%', label: 'Retention' },
]

function StatCard({ value, suffix, label }: (typeof STATS_BAND)[number]) {
  const { ref, value: shown } = useCountUp(value)
  return (
    <div className="card flex flex-col items-center gap-2 py-8 text-center md:py-10">
      <p className="gold-text tnum text-[34px] font-bold leading-none md:text-[52px]">
        <span ref={ref}>{shown}</span>
        {suffix}
      </p>
      <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
    </div>
  )
}

function StatsBand() {
  return (
    <section className="bg-[#0D0D0F] pb-14 md:pb-20">
      <div className="mx-auto grid max-w-[1600px] grid-cols-3 gap-3 px-4 md:gap-6 md:px-6">
        {STATS_BAND.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Section 4 — Services grid (Phase 2 spec)                             */
/* ------------------------------------------------------------------ */

const SERVICES = [
  { Icon: Dumbbell, title: 'Personal Training', blurb: '1:1 tailored coaching', action: () => scrollToId('personal-training') },
  { Icon: Users, title: 'Group Classes', blurb: 'Small group · max 6', action: () => scrollToId('group-classes') },
  { Icon: Leaf, title: 'Nutrition Coaching', blurb: 'Protocols that fit your training', action: () => scrollToId('personal-training') },
  { Icon: TrendingUp, title: 'Progress Tracking', blurb: 'Metrics, reviewed with your coach', action: () => (window.location.href = '/dashboard') },
]

function ServicesGrid() {
  return (
    <section className="bg-[#0D0D0F] pb-16 md:pb-24">
      <div className="mx-auto max-w-[1600px] px-4 md:px-6">
        <Rise>
          <p className="section-head mb-6">What We Do</p>
        </Rise>
        <div className="grid grid-cols-2 gap-3 md:gap-6 lg:grid-cols-4">
          {SERVICES.map(({ Icon, title, blurb, action }, i) => (
            <Rise key={title} delay={i * 80}>
              <button
                type="button"
                onClick={action}
                className="card flex h-full w-full flex-col items-start gap-4 text-left transition-colors duration-300 hover:!border-[rgba(212,175,55,0.4)]"
              >
                <Icon size={24} strokeWidth={1.5} color="#D4AF37" aria-hidden />
                <span>
                  <span className="h-display block text-[13px] md:text-sm">{title}</span>
                  <span className="mt-1.5 block text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {blurb}
                  </span>
                </span>
              </button>
            </Rise>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Section 5 — Your Progress (Phase 2 spec)                             */
/* ------------------------------------------------------------------ */

const RANGES = ['1M', '3M', '6M', '1Y'] as const
const PROGRESS_DATA: Record<(typeof RANGES)[number], number[]> = {
  '1M': [10, 14, 12, 18, 16, 22, 20, 26],
  '3M': [8, 12, 10, 16, 14, 20, 18, 25, 22, 28, 26, 31],
  '6M': [6, 10, 9, 14, 12, 17, 15, 21, 19, 24, 22, 27, 25, 30, 28, 33, 31, 36],
  '1Y': [4, 8, 7, 11, 10, 14, 13, 17, 16, 20, 19, 23, 22, 26, 25, 29, 28, 32, 31, 35, 34, 38, 37, 42],
}

function ProgressChart() {
  const [range, setRange] = useState<(typeof RANGES)[number]>('6M')
  const points = PROGRESS_DATA[range]
  const W = 640
  const H = 220
  const max = Math.max(...points)
  const stepX = W / (points.length - 1)
  const coords = points.map((v, i) => ({
    x: i * stepX,
    y: H - (v / max) * (H - 28) - 10,
  }))
  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ')
  const area = `${line} L${W},${H} L0,${H} Z`

  return (
    <section className="bg-[#0D0D0F] pb-16 md:pb-24">
      <div className="mx-auto max-w-[1100px] px-4 md:px-6">
        <Rise>
          <div className="card">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <h2 className="h-display text-xl md:text-2xl">Your Progress</h2>
              <div className="flex gap-2">
                {RANGES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    className="range-chip"
                    data-active={range === r}
                    onClick={() => setRange(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <svg className="gold-line-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Illustrative progress trend line" preserveAspectRatio="none">
              <defs>
                <linearGradient id="goldLineGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0.25, 0.5, 0.75].map((f) => (
                <line key={f} className="gold-line-chart__grid" x1="0" x2={W} y1={H * f} y2={H * f} />
              ))}
              <path className="gold-line-chart__area" d={area} />
              <path className="gold-line-chart__line" d={line} />
              {coords.map((c, i) => (
                <circle key={i} className="gold-line-chart__dot" cx={c.x} cy={c.y} r="3.5" />
              ))}
            </svg>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
              <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                Illustrative progression — members track real numbers in the app.
              </p>
              <Link to="/intake?mode=trial" className="btn-outline !px-5 !py-2.5">
                Start Tracking
              </Link>
            </div>
          </div>
        </Rise>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Section 6 — Brand statement (existing copy, re-themed)               */
/* ------------------------------------------------------------------ */

function BrandStatement() {
  return (
    <section className="bg-[#111214] py-[70px] md:py-[110px]">
      <div className="mx-auto max-w-[760px] px-5 text-center">
        <Rise>
          <p className="section-head">The Vault Fitness · Sheung Wan</p>
          <h2 className="mt-6 text-[24px] font-semibold leading-[1.25] md:text-[32px]" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            A premier Hong Kong training facility offering state-of-the-art equipment,
            a VIP personal training studio and spacious changing facilities — every
            detail designed with holistic wellness, quality movement and performance
            in mind.
          </h2>
          <div className="mx-auto mt-8 h-px w-12" style={{ background: 'var(--gold)' }} />
          <p className="mt-8 text-[13px]" style={{ color: 'var(--text-muted)' }}>
            Open gym memberships · One-to-one personal training · Corporate training
          </p>
        </Rise>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Section 7 — Facilities (existing copy, re-themed)                    */
/* ------------------------------------------------------------------ */

const CHIPS: { label: string; tip: string }[] = [
  { label: '60KG Dumbbells', tip: 'Rare for Hong Kong' },
  { label: 'Ski Erg', tip: 'Concept 2' },
  { label: 'HIIT Mill', tip: 'Curve treadmill' },
  { label: 'Hip Thrust', tip: 'PANATA' },
  { label: 'Platforms', tip: 'Wooden lifting platforms' },
  { label: 'Cables', tip: 'Full cable line' },
  { label: 'Rowers', tip: 'Concept 2' },
  { label: 'Atlantis', tip: 'Nautilus & Atlantis strength' },
]

function Facilities() {
  return (
    <section id="the-gym" className="bg-[#111214] pb-[80px] md:pb-[110px]">
      <div className="flex flex-col lg:flex-row">
        <div className="relative min-h-[46vh] overflow-hidden bg-black lg:min-h-[70vh] lg:w-[55%]">
          <FadeSlideshow slides={FACILITY_SLIDES} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(17,18,20,0.25), rgba(17,18,20,0))' }} />
        </div>
        <div className="flex items-center bg-[#111214] lg:w-[45%]">
          <div className="px-6 py-14 md:px-14 md:py-20 lg:px-16">
            <Rise>
              <p className="section-head">Our Facilities</p>
              <h2 className="h-display mt-5 text-2xl md:text-3xl">High-quality, high-impact</h2>
              <p className="mt-6 max-w-xl text-[15px] leading-[1.7]" style={{ color: 'var(--text-secondary)' }}>
                The gym features state-of-the-art equipment including treadmills,
                step machines, Stairmaster, HIIT mill, HIIT bikes, cross-trainers,
                rowing machines, Concept 2 Ski Erg, glute-specific machines, PANATA
                Master Gluteus, PANATA Hip Thrust, a free weights area with
                dumbbells up to 60kg, resistance and cable machines, and NAUTILUS
                &amp; ATLANTIS strength equipment.
              </p>
              <div className="mt-8 flex flex-wrap gap-2.5">
                {CHIPS.map((c) => (
                  <span key={c.label} className="equip-chip" title={c.tip}>
                    {c.label}
                  </span>
                ))}
              </div>
              <div className="mt-10">
                <button type="button" className="btn-gold" onClick={() => scrollToId('memberships')}>
                  Join Gym
                </button>
              </div>
            </Rise>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Section 8 — VIP Studio (existing copy, re-themed)                    */
/* ------------------------------------------------------------------ */

function VipStudio() {
  return (
    <section id="vip" className="relative flex min-h-[70vh] items-center overflow-hidden">
      <img
        src={asset('vip-studio.jpg')}
        alt="Hong Kong's first VIP personal training studio"
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(90deg, rgba(13,13,15,0.92) 25%, rgba(13,13,15,0.3))' }}
      />
      <div className="relative z-10 mx-auto w-full max-w-[1600px] px-6 py-20 md:px-16 lg:px-20">
        <Rise>
          <div className="max-w-[720px]">
            <p className="section-head">Hong Kong's First</p>
            <h2 className="h-display mt-5 text-[28px] leading-[1.15] md:text-[40px]">
              VIP Personal<br />Training Studio
            </h2>
            <p className="mt-6 max-w-xl text-[15px] leading-[1.7]" style={{ color: 'var(--text-secondary)' }}>
              Fully equipped with strength and conditioning equipment — power racks,
              cable machines, a free weights area with dumbbells up to 40kg and
              ATLANTIS strength equipment — accessible through tailored personal
              training sessions with one of our qualified coaches.
            </p>
            <div className="mt-9">
              <Link to="/intake?mode=training" className="btn-gold">
                Book a Personal Trainer
              </Link>
            </div>
          </div>
        </Rise>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Section 9 — Personal Training (existing copy, re-themed)             */
/* ------------------------------------------------------------------ */

const PT_STATS = [
  { value: 30, suffix: '', label: 'Yrs combined coaching experience' },
  { value: 60, suffix: 'KG', label: 'Dumbbells — rare in HK' },
  { value: 78, suffix: '', label: 'Five-star Google reviews' },
  { value: 6, suffix: '', label: 'Max per group class' },
]

const COACH_CARDS: { name: string; role: string }[] = [
  { name: 'Dan Kan', role: 'Head Coach & Co-Founder' },
  { name: 'Ziggy Makant', role: "Head of Women's Health" },
  { name: 'Teresa Riddle', role: 'Personal Trainer' },
  { name: 'Tarryn Maree', role: "Women's Health Trainer" },
]

function PtStat({ value, suffix, label }: (typeof PT_STATS)[number]) {
  const { ref, value: shown } = useCountUp(value)
  return (
    <div className="text-center">
      <p className="gold-text tnum text-[40px] font-bold leading-none md:text-[52px]">
        <span ref={ref}>{shown}</span>
        {suffix && <span className="text-[20px] md:text-[26px]">{suffix}</span>}
      </p>
      <p className="mt-3 text-[11px] uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
    </div>
  )
}

function PersonalTraining() {
  return (
    <section id="personal-training" className="bg-[#111214] py-[80px] md:py-[110px]">
      <div className="mx-auto max-w-[760px] px-5 text-center">
        <Rise>
          <p className="section-head">Personal Training</p>
          <h2 className="h-display mt-5 text-2xl md:text-3xl">Unlock Peak Performance</h2>
          <p className="mt-6 text-[15px] leading-[1.7]" style={{ color: 'var(--text-secondary)' }}>
            Become your best, strongest self with expert personal training. From
            strength and conditioning and bodybuilding prep to rehab and functional
            medicine — book 1-2-1 tailored training with one of our qualified
            coaches. Test, don't guess: diagnostic testing, fat-storage pattern
            analysis, and personalised training, nutrition and supplement protocols.
          </p>
        </Rise>
      </div>

      <div className="mx-auto mt-14 max-w-[1600px] px-5">
        <div
          className="grid grid-cols-2 gap-y-10 border-t py-12 lg:grid-cols-4"
          style={{ borderColor: 'rgba(212,175,55,0.15)' }}
        >
          {PT_STATS.map((s) => (
            <PtStat key={s.label} {...s} />
          ))}
        </div>
      </div>

      <div className="mx-auto mt-6 max-w-[1600px] px-5">
        <div className="strip-no-bar flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 lg:grid lg:grid-cols-4 lg:overflow-visible">
          {COACH_CARDS.map((c) => (
            <div key={c.name} className="w-[240px] shrink-0 snap-start lg:w-auto">
              <div
                className="flex aspect-[3/4] items-center justify-center border"
                style={{ background: 'var(--bg-card)', borderColor: 'rgba(212,175,55,0.15)' }}
              >
                <span className="h-display text-5xl" style={{ color: 'var(--gold-muted)' }}>
                  {c.name.split(' ').map((n) => n[0]).join('')}
                </span>
              </div>
              <h3 className="mt-4 text-[17px] font-semibold" style={{ color: 'var(--text-primary)' }}>{c.name}</h3>
              <p className="mt-1.5 text-[11px] uppercase tracking-[0.14em]" style={{ color: 'var(--gold)' }}>{c.role}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-14 max-w-[720px] px-5">
        <Rise>
          <div className="card !border-[rgba(212,175,55,0.4)]">
            <p className="section-head">Get Started</p>
            <h3 className="h-display mt-3 text-xl md:text-2xl">
              {introPackage.name} — <span className="gold-text tnum">{formatHKD(introPackage.priceHKD)}</span>
            </h3>
            <ul className="mt-5 space-y-2.5">
              {introPackage.includes.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
                  <Check size={15} className="mt-0.5 shrink-0" color="#D4AF37" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-7">
              <button type="button" className="btn-gold" onClick={() => scrollToId('memberships')}>
                Start Training
              </button>
            </div>
          </div>
        </Rise>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Section 10 — Group Classes (existing copy, re-themed)                */
/* ------------------------------------------------------------------ */

const CLASS_CARDS = [
  {
    name: 'Strength',
    body: 'A 60-minute class using dumbbells, barbells and bodyweight movements to build strength and improve body composition. Suitable for all levels.',
  },
  {
    name: 'Hyrox',
    body: 'Prepare for Hyrox singles, doubles or relay — sandbags, sled track, treadmills, wall balls and ski erg. Everything you need to condition for race day.',
  },
]

function GroupClasses() {
  return (
    <section id="group-classes" className="bg-[#0D0D0F] py-[80px] md:py-[110px]">
      <div className="mx-auto grid max-w-[1600px] gap-14 px-6 md:px-16 lg:grid-cols-2 lg:px-20">
        <Rise>
          <div>
            <p className="section-head">For All Fitness Levels</p>
            <h2 className="h-display mt-5 text-2xl md:text-3xl">Group Classes</h2>
            <p className="mt-6 max-w-xl text-[15px] leading-[1.7]" style={{ color: 'var(--text-secondary)' }}>
              Small group training in our VIP Room, limited to 6 people per class to
              ensure quality of coaching.
            </p>
            <p className="mt-10 text-[13px]" style={{ color: 'var(--text-muted)' }}>
              Drop-in · Members HK$150 / Non-members HK$350
            </p>
          </div>
        </Rise>
        <div className="space-y-5">
          {CLASS_CARDS.map((c, i) => (
            <Rise key={c.name} delay={i * 100}>
              <div className="card transition-colors duration-300 hover:!border-[rgba(212,175,55,0.4)]">
                <h3 className="h-display text-lg">{c.name}</h3>
                <p className="mt-3 text-[14px] leading-[1.7]" style={{ color: 'var(--text-secondary)' }}>{c.body}</p>
                <Link
                  to="/intake?mode=trial"
                  className="group mt-5 inline-flex items-center gap-1.5 text-[12px] uppercase tracking-[0.1em]"
                  style={{ color: 'var(--gold)' }}
                >
                  Book now
                  <ArrowRight size={13} className="transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
                </Link>
              </div>
            </Rise>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Section 11 — Women's Health (existing copy, re-themed)               */
/* ------------------------------------------------------------------ */

function WomensHealth() {
  return (
    <section id="womens-health" className="relative flex min-h-[70vh] items-end overflow-hidden">
      <img
        src={asset('card-womens.jpg')}
        alt="Women training at The Vault"
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, rgba(13,13,15,0.35), rgba(13,13,15,0.92))' }}
      />
      <div className="relative z-10 mx-auto w-full max-w-[1600px] px-6 pb-16 md:px-16 md:pb-20 lg:px-20">
        <Rise>
          <div className="max-w-[720px]">
            <p className="section-head">Women's Health</p>
            <h2 className="h-display mt-5 text-2xl md:text-3xl">Strong at every stage</h2>
            <p className="mt-6 text-[15px] leading-[1.7]" style={{ color: 'var(--text-secondary)' }}>
              Classes and programmes led by experts in pelvic health, birth
              preparation, postnatal rehabilitation and the menopause transition —
              from FITMAMA Strength and FITMAMA Restore to The Women's Programme
              with weekly coach check-ins and a WhatsApp community.
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <button type="button" className="btn-gold" onClick={() => scrollToId('group-classes')}>
                Classes
              </button>
              <Link to="/intake?mode=training" className="btn-outline">
                Programme
              </Link>
            </div>
          </div>
        </Rise>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Section 12 — Memberships & Pricing (Phase 2 spec layout, real plans) */
/* ------------------------------------------------------------------ */

/** Spec tiers → real plan ids. Every plan stays reachable (strip below). */
const TIERS = [
  {
    tier: 'Silver',
    planId: 'month',
    featured: false,
    features: ['No joining fees', 'Towels, lockers, showers included', 'Main gym access', 'Classes at member price'],
  },
  {
    tier: 'Gold',
    planId: 'autopay',
    featured: true,
    features: ['Rolling — cancel anytime', 'No contract, no joining fees', 'Main gym access', 'Classes at member price'],
  },
  {
    tier: 'Vault Access',
    planId: 'year',
    featured: false,
    features: ['Payable up front', 'Best value per month', 'Main gym access', 'Classes at member price'],
  },
] as const

const PASS_PLAN_IDS = ['day', 'week', 'six-month'] as const

function Memberships({ onEnquire }: { onEnquire: (planId: string) => void }) {
  const planOf = (id: string) => membershipPlans.find((p) => p.id === id)!

  return (
    <section id="memberships" className="bg-[#111214] py-[80px] md:py-[110px]">
      <div className="mx-auto max-w-[720px] px-5 text-center">
        <Rise>
          <p className="section-head">Day Passes &amp; Gym Memberships</p>
          <h2 className="h-display mt-5 text-2xl md:text-3xl">The Vault Fitness</h2>
          <p className="mt-4 text-[15px]" style={{ color: 'var(--text-muted)' }}>
            Buy Day Passes, Monthly Passes or 12-Month Memberships.
          </p>
        </Rise>
      </div>

      <div className="mx-auto mt-14 max-w-[1200px] px-4 md:px-5">
        {/* Mobile: horizontal snap ~80% · Desktop: 3 across · NEVER stacked */}
        <div className="strip-no-bar flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible">
          {TIERS.map(({ tier, planId, featured, features }, i) => {
            const plan = planOf(planId)
            return (
              <Rise key={tier} delay={i * 90} className="w-[80vw] shrink-0 snap-start lg:w-auto">
                <div className={`pricing-card relative flex h-full flex-col p-7 md:p-8 ${featured ? 'pricing-card--featured' : ''}`}>
                  {featured && (
                    <span
                      className="absolute -top-3 left-7 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
                      style={{ background: 'var(--gold)', color: '#000' }}
                    >
                      Most Popular
                    </span>
                  )}
                  <p className="h-display text-sm" style={{ color: featured ? 'var(--gold)' : 'var(--text-secondary)' }}>
                    {tier}
                  </p>
                  <p className="tnum mt-4 text-[40px] font-bold leading-none" style={{ color: 'var(--text-primary)' }}>
                    {formatHKD(plan.priceHKD)}
                    {plan.period && (
                      <span className="text-[15px] font-normal" style={{ color: 'var(--text-muted)' }}>{plan.period}</span>
                    )}
                  </p>
                  <ul className="mt-6 flex-1 space-y-2.5">
                    {features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                        <Check size={14} className="mt-0.5 shrink-0" color="#D4AF37" aria-hidden />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <p
                    className="mt-5 border-t pt-4 text-[12px]"
                    style={{ borderColor: 'rgba(212,175,55,0.15)', color: 'var(--text-muted)' }}
                  >
                    {plan.note}
                  </p>
                  <div className="mt-6">
                    <button type="button" className="btn-gold w-full" onClick={() => onEnquire(plan.id)}>
                      Join Gym
                    </button>
                  </div>
                </div>
              </Rise>
            )
          })}
        </div>

        {/* Remaining passes stay reachable (re-theme keeps all plans) */}
        <Rise>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {PASS_PLAN_IDS.map((id) => {
              const plan = planOf(id)
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onEnquire(plan.id)}
                  className="group inline-flex items-center gap-2 text-[13px]"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <span className="transition-colors group-hover:text-[#D4AF37]">
                    {plan.name} · <span className="tnum">{formatHKD(plan.priceHKD)}</span>
                  </span>
                  <ArrowRight size={13} color="#D4AF37" className="transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
                </button>
              )
            })}
          </div>
        </Rise>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Section 13 — Reviews (existing copy, re-themed)                      */
/* ------------------------------------------------------------------ */

const REVIEWS = [
  {
    quote: "Best-equipped gym in Hong Kong — 60kg dumbbells you won't find anywhere else.",
    name: 'Marcus L.',
  },
  {
    quote: 'Clean, quiet, and the coaching from Dan is world-class.',
    name: 'Karen N.',
  },
  {
    quote: "The women's programme changed how I train — knowledgeable and welcoming.",
    name: 'Sophie L.',
  },
]

function Reviews() {
  return (
    <section className="bg-[#0D0D0F] py-[80px] md:py-[110px]">
      <div className="mx-auto max-w-[720px] px-5 text-center">
        <Rise>
          <p className="section-head">Google Reviews</p>
          <h2 className="h-display mt-5 text-2xl md:text-3xl">78 five-star reviews</h2>
        </Rise>
      </div>
      <div className="mx-auto mt-14 max-w-[1200px] px-5">
        <div className="strip-no-bar flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 md:grid md:grid-cols-3 md:overflow-visible">
          {REVIEWS.map((r, i) => (
            <Rise key={r.name} delay={i * 90} className="w-[300px] shrink-0 snap-start md:w-auto">
              <figure className="card h-full">
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, si) => (
                    <Star key={si} className="h-4 w-4" color="#D4AF37" fill="#D4AF37" aria-hidden />
                  ))}
                </div>
                <blockquote className="mt-5 text-[15px] leading-[1.7]" style={{ color: 'var(--text-primary)' }}>
                  “{r.quote}”
                </blockquote>
                <figcaption className="mt-5 text-[13px]" style={{ color: 'var(--text-muted)' }}>
                  — {r.name}
                </figcaption>
              </figure>
            </Rise>
          ))}
        </div>
        <p className="mt-8 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>
          <span style={{ color: 'var(--gold)' }}>★★★★★</span> 78 Google Reviews
        </p>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Section 14 — Location / Visit (existing copy, re-themed)             */
/* ------------------------------------------------------------------ */

function Location() {
  return (
    <section className="bg-[#0D0D0F] pb-[80px] md:pb-[110px]">
      <div className="mx-auto grid max-w-[1600px] items-center gap-12 px-6 md:px-16 lg:grid-cols-2 lg:px-20">
        <Rise>
          <div>
            <p className="section-head">Find Us</p>
            <h2 className="h-display mt-5 text-2xl md:text-3xl">Sheung Wan, Hong Kong</h2>
            <div className="mt-8 space-y-5 text-[15px] leading-[1.7]" style={{ color: 'var(--text-secondary)' }}>
              <p>
                3/F Alliance Building, 133 Connaught Road,
                <br />
                Sheung Wan, Hong Kong
              </p>
              <p>
                Mon–Fri · 6:30am–11:30pm
                <br />
                Sat, Sun &amp; Public Holidays · 8am–8pm
              </p>
              <p>WhatsApp / Phone · +852 2885 9300</p>
            </div>
            <div className="mt-9 flex flex-wrap gap-4">
              <a
                href="https://maps.google.com/?q=Alliance+Building,+133+Connaught+Road,+Sheung+Wan,+Hong+Kong"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline"
              >
                Directions
              </a>
              <a href="https://wa.me/85228859300" target="_blank" rel="noopener noreferrer" className="btn-outline">
                Contact Us
              </a>
            </div>
          </div>
        </Rise>
        <Rise delay={120}>
          <div className="overflow-hidden">
            <img
              src={asset('entrance.jpg')}
              alt="The Vault Fitness reception"
              loading="lazy"
              className="h-[40vh] w-full object-cover lg:h-[60vh]"
              style={{ border: '1px solid rgba(212,175,55,0.15)', borderRadius: 'var(--radius-card)' }}
            />
          </div>
        </Rise>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Section 15 — Final CTA (existing copy, re-themed)                    */
/* ------------------------------------------------------------------ */

function FinalCta() {
  return (
    <section
      className="py-[100px] md:py-[150px]"
      style={{ background: 'radial-gradient(ellipse 60% 55% at 50% 50%, #17181B 0%, #0D0D0F 75%)' }}
    >
      <div className="mx-auto max-w-[760px] px-5 text-center">
        <Rise>
          <h2 className="h-display text-[30px] leading-[1.15] md:text-[52px]">
            Unlock your <span className="gold-text">fitness potential</span>
          </h2>
          <p className="mt-6 text-[15px]" style={{ color: 'var(--text-muted)' }}>
            No contract. No joining fees. Cancel anytime.
          </p>
          <div className="mt-10 flex flex-col items-stretch justify-center gap-4 sm:flex-row sm:items-center">
            <Link to="/intake?mode=trial" className="btn-gold">
              Start Training
            </Link>
            <button type="button" className="btn-outline" onClick={() => scrollToId('memberships')}>
              Join Gym
            </button>
          </div>
        </Rise>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Page                                                                 */
/* ------------------------------------------------------------------ */

export default function Home() {
  const [enquiryPlan, setEnquiryPlan] = useState<string | null>(null)

  return (
    <div className="tv2" style={{ background: 'var(--bg-deep)' }}>
      <Hero />
      <ClassStrip />
      <StatsBand />
      <ServicesGrid />
      <ProgressChart />
      <BrandStatement />
      <Facilities />
      <VipStudio />
      <PersonalTraining />
      <GroupClasses />
      <WomensHealth />
      <Memberships onEnquire={setEnquiryPlan} />
      <Reviews />
      <Location />
      <FinalCta />
      <EnquiryModal planId={enquiryPlan} onClose={() => setEnquiryPlan(null)} />
    </div>
  )
}
