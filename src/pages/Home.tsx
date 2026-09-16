import { Fragment, useRef, useState } from 'react'
import { Link } from 'react-router'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { Star } from 'lucide-react'
import { asset } from '@/lib/utils'
import {
  membershipPlans,
  introPackage,
  formatHKD,
} from '@/data/mock'
import EnquiryModal from '@/components/enquiry/EnquiryModal'

gsap.registerPlugin(ScrollTrigger)

const scrollToId = (id: string) =>
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* ------------------------------------------------------------------ */
/* Small presentational helpers                                        */
/* ------------------------------------------------------------------ */

function Eyebrow({ children, onPhoto = false }: { children: string; onPhoto?: boolean }) {
  return (
    <p className={`eyebrow ${onPhoto ? 'eyebrow-on-photo' : ''}`}>{children}</p>
  )
}

/** Character-level split for short headlines (GSAP targets .split-char) */
function SplitChars({ text, className = '' }: { text: string; className?: string }) {
  return (
    <span className={className} aria-label={text}>
      {text.split('').map((ch, i) => (
        <span key={i} aria-hidden className="split-char inline-block will-change-transform">
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
    </span>
  )
}

/**
 * Character split wrapped per word — chars animate individually
 * (.split-char, same GSAP reveal) but words are atomic
 * (whitespace-nowrap inline-block), so line breaks only occur
 * between words, never mid-word.
 */
function SplitCharsByWord({ text, className = '' }: { text: string; className?: string }) {
  const words = text.split(' ')
  return (
    <span className={className} aria-label={text}>
      {words.map((word, wi) => (
        <Fragment key={wi}>
          <span aria-hidden className="inline-block whitespace-nowrap">
            {word.split('').map((ch, ci) => (
              <span key={ci} className="split-char inline-block will-change-transform">
                {ch}
              </span>
            ))}
          </span>
          {/* Plain space between word wrappers: the only break
              opportunity, trimmed cleanly at wrapped line ends */}
          {wi < words.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </span>
  )
}

/** Word-level split for longer statements (GSAP targets .split-word) */
function SplitWords({ text, className = '' }: { text: string; className?: string }) {
  return (
    <span className={className} aria-label={text}>
      {text.split(' ').map((w, i) => (
        <span key={i} aria-hidden className="split-word inline-block will-change-transform">
          {w}
          {i < text.split(' ').length - 1 ? ' ' : ''}
        </span>
      ))}
    </span>
  )
}

function ArrowBtn({
  children,
  variant = 'primary',
  onClick,
  to,
}: {
  children: string
  variant?: 'primary' | 'outline' | 'gold'
  onClick?: () => void
  to?: string
}) {
  const cls =
    variant === 'primary' ? 'btn-primary' : variant === 'gold' ? 'btn-gold' : 'btn-outline'
  const inner = (
    <>
      {children} <span className="btn-arrow">→</span>
    </>
  )
  if (to)
    return (
      <Link to={to} className={cls}>
        {inner}
      </Link>
    )
  return (
    <button onClick={onClick} className={cls}>
      {inner}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Section 1 — Hero                                                    */
/* ------------------------------------------------------------------ */
function Hero() {
  return (
    <section className="relative flex min-h-[100svh] items-center justify-center overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={asset('hero-home.jpg')}
          alt="Coach guiding a deadlift at The Vault Fitness"
          className="kenburns h-full w-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(rgba(35,31,32,0.45), rgba(35,31,32,0.78))',
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-[15em] px-5 text-center">
        <h1 className="hero-h1 text-[40px] font-bold leading-[1.05] md:text-[84px]">
          <SplitCharsByWord text="Unlock your fitness potential" />
        </h1>
        <p className="hero-fade mx-auto mt-6 max-w-xl text-[15px] leading-[1.6] text-white/85">
          Sheung Wan's premier personal training gym — state-of-the-art equipment,
          Hong Kong's first VIP personal training studio, and coaches with a
          combined 30 years of experience.
        </p>
        <div className="hero-fade mt-9 flex flex-wrap items-center justify-center gap-4">
          <ArrowBtn onClick={() => scrollToId('memberships')}>Start Training</ArrowBtn>
          <ArrowBtn variant="outline" onClick={() => scrollToId('memberships')}>
            Join Gym
          </ArrowBtn>
        </div>
      </div>

      {/* Scroll cue */}
      <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2">
        <div className="relative h-12 w-px bg-white/30">
          <span className="scroll-cue-dot absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-white" />
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Section 2 — Brand Statement                                         */
/* ------------------------------------------------------------------ */
function BrandStatement() {
  return (
    <section className="bg-vault-bg py-[70px] md:py-[110px]">
      <div className="mx-auto max-w-[720px] px-5 text-center">
        <Eyebrow>The Vault Fitness · Sheung Wan</Eyebrow>
        <h2 className="stmt mt-6 text-[27px] font-bold leading-[1.15] md:text-[34px]">
          <SplitWords text="A premier Hong Kong training facility offering state-of-the-art equipment, a VIP personal training studio and spacious changing facilities — every detail designed with holistic wellness, quality movement and performance in mind." />
        </h2>
        <div className="stmt-rule mx-auto mt-8 h-px w-12 origin-center bg-white" />
        <p className="stmt-sub mt-8 text-[13px] text-vault-muted">
          Open gym memberships · One-to-one personal training · Corporate training
        </p>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Section 3 — Services Grid                                           */
/* ------------------------------------------------------------------ */
const SERVICES = [
  {
    img: asset('card-pt.jpg'),
    eyebrow: '1:1 Coaching',
    title: 'Personal Training',
    link: 'Start training →',
    anchor: 'personal-training',
  },
  {
    img: asset('card-classes.jpg'),
    eyebrow: 'Small Group · Max 6',
    title: 'Group Classes',
    link: 'Learn more →',
    anchor: 'group-classes',
  },
  {
    img: asset('card-womens.jpg'),
    eyebrow: 'Pre & Postnatal · Menopause',
    title: "Women's Health",
    link: 'Learn more →',
    anchor: 'womens-health',
  },
  {
    img: asset('card-membership.jpg'),
    eyebrow: 'No Contract · No Joining Fees',
    title: 'Memberships',
    link: 'Access gym →',
    anchor: 'memberships',
  },
]

function ServicesGrid() {
  return (
    <section className="bg-vault-bg pb-[80px] md:pb-[110px]">
      <div className="mx-auto max-w-[1600px] px-4 md:px-5">
        <div className="services-grid grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {SERVICES.map((s) => (
            <button
              key={s.title}
              onClick={() => scrollToId(s.anchor)}
              className="service-card group relative block aspect-[4/3] overflow-hidden text-left"
            >
              <img
                src={s.img}
                alt={s.title}
                loading="lazy"
                // inline style: arbitrary duration/ease classes get dropped by TW 3.4
                style={{ transitionDuration: '600ms', transitionTimingFunction: 'cubic-bezier(0.22,1,0.36,1)' }}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[rgba(35,31,32,0.92)] via-[rgba(35,31,32,0.25)] to-transparent transition-opacity duration-500 group-hover:opacity-100" />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <Eyebrow onPhoto>{s.eyebrow}</Eyebrow>
                <h3 className="mt-2 text-2xl font-bold">{s.title}</h3>
                <span className="mt-3 inline-block text-[13px] uppercase tracking-[0.08em] text-white/85 transition-transform duration-300 group-hover:translate-x-1.5">
                  {s.link}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Section 4 — The Gym / Facilities                                    */
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
    <section id="the-gym" className="bg-vault-bg">
      <div className="flex flex-col lg:flex-row">
        <div className="relative min-h-[50vh] overflow-hidden lg:min-h-[70vh] lg:w-[55%]">
          <img
            src={asset('gym-facilities.jpg')}
            alt="The Vault Fitness gym floor"
            loading="lazy"
            className="facilities-img absolute inset-0 h-[120%] w-full object-cover"
          />
        </div>
        <div className="facilities-copy flex items-center bg-vault-bg lg:w-[45%]">
          <div className="px-6 py-16 md:px-16 md:py-20 lg:px-20">
            <Eyebrow>Our Facilities</Eyebrow>
            <h2 className="mt-5 text-[27px] font-bold leading-[1.15] md:text-[38px]">
              High-quality, high-impact
            </h2>
            <p className="mt-6 max-w-xl text-[15px] leading-[1.7] text-white/85">
              The gym features state-of-the-art equipment including treadmills,
              step machines, Stairmaster, HIIT mill, HIIT bikes, cross-trainers,
              rowing machines, Concept 2 Ski Erg, glute-specific machines, PANATA
              Master Gluteus, PANATA Hip Thrust, a free weights area with
              dumbbells up to 60kg, resistance and cable machines, and NAUTILUS
              &amp; ATLANTIS strength equipment.
            </p>
            <div className="chip-row mt-8 flex flex-wrap gap-2.5">
              {CHIPS.map((c) => (
                <span key={c.label} className="equip-chip" title={c.tip}>
                  {c.label}
                </span>
              ))}
            </div>
            <div className="mt-10">
              <ArrowBtn onClick={() => scrollToId('memberships')}>Join Gym</ArrowBtn>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Section 5 — VIP Studio Band (pinned)                                */
/* ------------------------------------------------------------------ */
function VipStudio() {
  return (
    <section id="vip" className="relative flex min-h-[80vh] items-center overflow-hidden">
      <img
        src={asset('vip-studio.jpg')}
        alt="Hong Kong's first VIP personal training studio"
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(35,31,32,0.88) 30%, rgba(35,31,32,0.25))',
        }}
      />
      <div className="relative z-10 mx-auto w-full max-w-[1600px] px-6 md:px-16 lg:px-20">
        <div className="max-w-[720px]">
          <Eyebrow onPhoto>Hong Kong's First</Eyebrow>
          <div className="mt-5 flex items-stretch gap-6">
            <div id="vip-rule" className="w-px self-stretch bg-white" style={{ height: 120 }} />
            <h2 id="vip-h2" className="text-[30px] font-bold leading-[1.1] md:text-[44px]">
              VIP Personal
              <br />
              Training Studio
            </h2>
          </div>
          <p id="vip-copy" className="mt-6 max-w-xl text-[15px] leading-[1.7] text-white/85">
            Fully equipped with strength and conditioning equipment — power racks,
            cable machines, a free weights area with dumbbells up to 40kg and
            ATLANTIS strength equipment — accessible through tailored personal
            training sessions with one of our qualified coaches.
          </p>
          <div id="vip-cta" className="mt-9">
            <ArrowBtn to="/dashboard">Book a Personal Trainer</ArrowBtn>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Section 6 — Personal Training                                       */
/* ------------------------------------------------------------------ */
const STATS = [
  { value: 30, suffix: '', label: 'Yrs combined coaching experience' },
  { value: 60, suffix: 'KG', label: 'Dumbbells — rare in HK' },
  { value: 78, suffix: '', label: 'Five-star Google reviews' },
  { value: 6, suffix: '', label: 'Max per group class' },
]

const COACH_CARDS: { name: string; role: string; img?: string }[] = [
  { name: 'Dan Kan', role: 'Head Coach & Co-Founder' },
  { name: 'Ziggy Makant', role: "Head of Women's Health" },
  { name: 'Teresa Riddle', role: 'Personal Trainer' },
  { name: 'Tarryn Maree', role: "Women's Health Trainer" },
]

function PersonalTraining() {
  return (
    <section id="personal-training" className="bg-vault-bg py-[80px] md:py-[110px]">
      <div className="mx-auto max-w-[720px] px-5 text-center">
        <Eyebrow>Personal Training</Eyebrow>
        <h2 className="mt-5 text-[27px] font-bold leading-[1.15] md:text-[38px]">
          Unlock Peak Performance
        </h2>
        <p className="mt-6 text-[15px] leading-[1.7] text-white/85">
          Become your best, strongest self with expert personal training. From
          strength and conditioning and bodybuilding prep to rehab and functional
          medicine — book 1-2-1 tailored training with one of our qualified
          coaches. Test, don't guess: diagnostic testing, fat-storage pattern
          analysis, and personalised training, nutrition and supplement protocols.
        </p>
      </div>

      {/* Stat strip */}
      <div className="mx-auto mt-16 max-w-[1600px] px-5">
        <div className="grid grid-cols-2 gap-y-10 border-t border-vault-border py-12 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="tnum text-[48px] font-bold leading-none text-gold md:text-[60px]">
                <span className="stat-num" data-target={s.value}>
                  0
                </span>
                {s.suffix && <span className="text-[24px] md:text-[30px]">{s.suffix}</span>}
              </p>
              <p className="eyebrow mt-3">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Coach strip */}
      <div className="mx-auto mt-6 max-w-[1600px] px-5">
        <div className="coach-strip flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 lg:grid lg:grid-cols-4 lg:overflow-visible">
          {COACH_CARDS.map((c) => (
            <div key={c.name} className="coach-card w-[260px] shrink-0 snap-start lg:w-auto">
              <div className="aspect-[3/4] overflow-hidden bg-vault-surface">
                {c.img ? (
                  <img src={c.img} alt={c.name} loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center border border-vault-border">
                    <span className="font-serif text-6xl text-vault-faint">
                      {c.name.split(' ').map((n) => n[0]).join('')}
                    </span>
                  </div>
                )}
              </div>
              <h3 className="mt-4 text-[18px] font-bold">{c.name}</h3>
              <p className="eyebrow mt-1.5">{c.role}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Introductory Package */}
      <div className="mx-auto mt-14 max-w-[720px] px-5">
        <div className="package-card relative bg-vault-surface p-6 md:p-8">
          <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
            <rect
              className="package-border"
              x="0.5"
              y="0.5"
              width="calc(100% - 1px)"
              height="calc(100% - 1px)"
              fill="none"
              stroke="rgba(255,255,255,0.7)"
              strokeWidth="1"
              pathLength={100}
              style={{ width: 'calc(100% - 1px)', height: 'calc(100% - 1px)' }}
            />
          </svg>
          <Eyebrow>Get Started</Eyebrow>
          <h3 className="mt-3 text-[22px] font-bold md:text-2xl">
            {introPackage.name} — {formatHKD(introPackage.priceHKD)}
          </h3>
          <ul className="mt-5 space-y-2.5">
            {introPackage.includes.map((item) => (
              <li key={item} className="flex items-start gap-3 text-[14px] text-white/85">
                <span className="mt-[9px] h-px w-4 shrink-0 bg-white/60" />
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-7">
            <ArrowBtn onClick={() => scrollToId('memberships')}>Start Training</ArrowBtn>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Section 7 — Group Classes                                           */
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
    <section id="group-classes" className="relative overflow-hidden bg-vault-bg py-[80px] md:py-[110px]">
      <div
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-2/5 opacity-40 lg:block"
        aria-hidden
      >
        <img src={asset('card-classes.jpg')} alt="" loading="lazy" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-vault-bg via-vault-bg/40 to-transparent" />
      </div>

      <div className="relative mx-auto grid max-w-[1600px] gap-14 px-6 md:px-16 lg:grid-cols-2 lg:px-20">
        <div>
          <Eyebrow>For All Fitness Levels</Eyebrow>
          <h2 className="mt-5 text-[27px] font-bold leading-[1.15] md:text-[38px]">
            Group Classes
          </h2>
          <p className="mt-6 max-w-xl text-[15px] leading-[1.7] text-white/85">
            Small group training in our VIP Room, limited to 6 people per class to
            ensure quality of coaching.
          </p>
          <p className="mt-10 text-[13px] text-vault-muted">
            Drop-in · Members HK$150 / Non-members HK$350
          </p>
        </div>

        <div className="class-cards space-y-5">
          {CLASS_CARDS.map((c) => (
            <div
              key={c.name}
              className="class-card border border-vault-border bg-vault-surface p-7 transition-all duration-300 hover:-translate-y-1 hover:border-white/60"
            >
              <h3 className="text-xl font-bold">{c.name}</h3>
              <p className="mt-3 text-[14px] leading-[1.7] text-white/80">{c.body}</p>
              <Link
                to="/dashboard"
                className="group mt-5 inline-flex items-center gap-1 text-[13px] uppercase tracking-[0.08em] text-white"
              >
                Book now
                <span className="transition-transform duration-200 group-hover:translate-x-1.5">→</span>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Section 8 — Women's Health                                          */
/* ------------------------------------------------------------------ */
function WomensHealth() {
  return (
    <section id="womens-health" className="relative flex min-h-[70vh] items-end overflow-hidden">
      <img
        src={asset('card-womens.jpg')}
        alt="Women training at The Vault"
        loading="lazy"
        className="womens-bg absolute inset-0 h-[115%] w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[rgba(35,31,32,0.92)] via-[rgba(35,31,32,0.35)] to-transparent" />
      <div className="womens-panel relative z-10 mx-auto w-full max-w-[1600px] px-6 pb-16 md:px-16 md:pb-20 lg:px-20">
        <div className="max-w-[720px]">
          <Eyebrow onPhoto>Women's Health</Eyebrow>
          <h2 className="mt-5 text-[27px] font-bold leading-[1.15] md:text-[38px]">
            Strong at every stage
          </h2>
          <p className="mt-6 text-[15px] leading-[1.7] text-white/85">
            Classes and programmes led by experts in pelvic health, birth
            preparation, postnatal rehabilitation and the menopause transition —
            from FITMAMA Strength and FITMAMA Restore to The Women's Programme
            with weekly coach check-ins and a WhatsApp community.
          </p>
          <div className="womens-ctas mt-9 flex flex-wrap gap-4">
            <ArrowBtn onClick={() => scrollToId('group-classes')}>Classes</ArrowBtn>
            <ArrowBtn variant="outline" to="/dashboard">
              Programme
            </ArrowBtn>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Section 9 — Memberships & Pricing                                   */
/* ------------------------------------------------------------------ */
function Memberships({ onEnquire }: { onEnquire: (planId: string) => void }) {
  return (
    <section id="memberships" className="bg-vault-bg py-[80px] md:py-[110px]">
      <div className="mx-auto max-w-[720px] px-5 text-center">
        <Eyebrow>Day Passes &amp; Gym Memberships</Eyebrow>
        <h2 className="mt-5 text-[27px] font-bold leading-[1.15] md:text-[38px]">
          The Vault Fitness
        </h2>
        <p className="mt-4 text-[15px] text-vault-muted">
          Buy Day Passes, Monthly Passes or 12-Month Memberships.
        </p>
      </div>

      <div className="mx-auto mt-14 max-w-[1200px] px-5">
        <div className="pricing-grid grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {membershipPlans.map((p) => (
            <div
              key={p.id}
              className={`pricing-card relative flex flex-col p-8 transition-transform duration-300 hover:-translate-y-1.5 ${
                p.featured
                  ? 'featured-pulse border border-gold bg-vault-surface'
                  : 'border border-vault-border bg-vault-surface hover:border-white/40'
              }`}
            >
              {p.badge && (
                <span className="absolute -top-3 left-8 bg-gold px-3 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-black">
                  {p.badge}
                </span>
              )}
              <p className={`eyebrow ${p.featured ? '' : '!text-vault-muted'}`}>{p.name}</p>
              <p
                className={`tnum mt-4 text-[44px] font-bold leading-none ${
                  p.featured ? 'text-gold' : ''
                }`}
              >
                {formatHKD(p.priceHKD)}
                {p.period && (
                  <span className="text-[16px] font-normal text-vault-muted">{p.period}</span>
                )}
              </p>
              <p className="mt-4 flex-1 text-[13px] leading-[1.7] text-vault-muted">{p.note}</p>
              <p
                className={`mt-5 border-t pt-4 text-[12px] ${
                  p.featured
                    ? 'border-gold-dim/50 text-gold-dim'
                    : 'border-vault-border text-vault-faint'
                }`}
              >
                Main gym access · classes at member price
              </p>
              <div className="mt-6">
                <ArrowBtn
                  variant={p.featured ? 'gold' : 'outline'}
                  onClick={() => onEnquire(p.id)}
                >
                  Join Gym
                </ArrowBtn>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Section 10 — Reviews                                                */
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
    <section className="bg-vault-bg py-[80px] md:py-[110px]">
      <div className="mx-auto max-w-[720px] px-5 text-center">
        <Eyebrow>Google Reviews</Eyebrow>
        <h2 className="mt-5 text-[27px] font-bold leading-[1.15] md:text-[38px]">
          78 five-star reviews
        </h2>
      </div>
      <div className="mx-auto mt-14 max-w-[1200px] px-5">
        <div className="reviews-row flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 md:grid md:grid-cols-3 md:overflow-visible">
          {REVIEWS.map((r) => (
            <figure
              key={r.name}
              className="review-card w-[300px] shrink-0 snap-start border border-vault-border bg-vault-surface p-8 md:w-auto"
            >
              <div className="review-stars flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="review-star h-4 w-4 fill-white text-white" />
                ))}
              </div>
              <blockquote className="mt-5 text-[15px] leading-[1.7] text-white/90">
                “{r.quote}”
              </blockquote>
              <figcaption className="mt-5 text-[13px] text-vault-muted">— {r.name}</figcaption>
            </figure>
          ))}
        </div>
        <p className="mt-8 text-center text-[13px] text-vault-muted">
          <span className="tnum text-white">★★★★★</span> 78 Google Reviews
        </p>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Section 11 — Location / Visit                                       */
/* ------------------------------------------------------------------ */
function Location() {
  return (
    <section className="bg-vault-bg pb-[80px] md:pb-[110px]">
      <div className="mx-auto grid max-w-[1600px] items-center gap-12 px-6 md:px-16 lg:grid-cols-2 lg:px-20">
        <div className="location-copy">
          <Eyebrow>Find Us</Eyebrow>
          <h2 className="mt-5 text-[27px] font-bold leading-[1.15] md:text-[38px]">
            Sheung Wan, Hong Kong
          </h2>
          <div className="mt-8 space-y-5 text-[15px] leading-[1.7] text-white/85">
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
              className="btn-primary"
            >
              Directions <span className="btn-arrow">→</span>
            </a>
            <a href="https://wa.me/85228859300" target="_blank" rel="noopener noreferrer" className="btn-outline">
              Contact Us <span className="btn-arrow">→</span>
            </a>
          </div>
        </div>
        <div className="location-img-wrap overflow-hidden">
          <img
            src={asset('entrance.jpg')}
            alt="The Vault Fitness reception"
            loading="lazy"
            className="location-img h-[40vh] w-full object-cover lg:h-[60vh]"
          />
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Section 12 — Final CTA                                              */
/* ------------------------------------------------------------------ */
function FinalCta() {
  return (
    <section
      className="py-[100px] md:py-[160px]"
      style={{
        background:
          'radial-gradient(ellipse 60% 55% at 50% 50%, #2c2728 0%, #231f20 70%)',
      }}
    >
      <div className="mx-auto max-w-[720px] px-5 text-center">
        <h2 className="final-h2 text-[34px] font-bold leading-[1.1] md:text-[60px]">
          <SplitChars text="Unlock your fitness potential" />
        </h2>
        <p className="final-fade mt-6 text-[15px] text-vault-muted">
          No contract. No joining fees. Cancel anytime.
        </p>
        <div className="final-fade mt-10 flex flex-wrap items-center justify-center gap-4">
          <ArrowBtn to="/dashboard">Start Training</ArrowBtn>
          <ArrowBtn variant="outline" onClick={() => scrollToId('memberships')}>
            Join Gym
          </ArrowBtn>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Page + GSAP scroll animation orchestration (design.md §6, home.md)  */
/* ------------------------------------------------------------------ */
export default function Home() {
  const root = useRef<HTMLDivElement>(null)
  const [enquiryPlan, setEnquiryPlan] = useState<string | null>(null)

  useGSAP(
    () => {
      if (reducedMotion()) return
      const q = gsap.utils.selector(root)

      // --- Hero: char reveal → subline/CTAs fade up (home.md §1) ---
      gsap.from(q('.hero-h1 .split-char'), {
        y: 30,
        opacity: 0,
        stagger: 0.025,
        duration: 0.9,
        delay: 0.3,
        ease: 'power3.out',
      })
      gsap.from(q('.hero-fade'), {
        y: 24,
        opacity: 0,
        duration: 0.8,
        delay: 1.4,
        stagger: 0.15,
        ease: 'power2.out',
      })

      // --- Brand statement: word reveal + rule grow (§2) ---
      gsap.from(q('.stmt .split-word'), {
        scrollTrigger: { trigger: q('.stmt')[0], start: 'top 75%' },
        y: 12,
        opacity: 0,
        stagger: 0.02,
        duration: 0.6,
        ease: 'power2.out',
      })
      gsap.from(q('.stmt-rule'), {
        scrollTrigger: { trigger: q('.stmt')[0], start: 'top 75%' },
        scaleX: 0,
        duration: 0.6,
        delay: 0.4,
        ease: 'power2.out',
      })
      gsap.from(q('.stmt-sub'), {
        scrollTrigger: { trigger: q('.stmt')[0], start: 'top 75%' },
        opacity: 0,
        y: 12,
        duration: 0.6,
        delay: 0.6,
      })

      // --- Services grid: card stagger (§3) ---
      gsap.from(q('.service-card'), {
        scrollTrigger: { trigger: q('.services-grid')[0], start: 'top 80%' },
        y: 40,
        opacity: 0,
        stagger: 0.12,
        duration: 0.7,
        ease: 'power3.out',
      })

      // --- Facilities: parallax image + copy stagger + chips (§4) ---
      gsap.to(q('.facilities-img'), {
        scrollTrigger: {
          trigger: '#the-gym',
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
        yPercent: -15,
        ease: 'none',
      })
      gsap.from(q('.facilities-copy > div > *'), {
        scrollTrigger: { trigger: q('.facilities-copy')[0], start: 'top 75%' },
        y: 30,
        opacity: 0,
        stagger: 0.12,
        duration: 0.8,
        ease: 'power3.out',
      })
      gsap.from(q('.equip-chip'), {
        scrollTrigger: { trigger: q('.chip-row')[0], start: 'top 85%' },
        scale: 0.9,
        opacity: 0,
        stagger: 0.05,
        duration: 0.4,
        ease: 'back.out(1.6)',
      })

      // --- VIP band: pinned scrub (§5) ---
      const vipTl = gsap.timeline({
        scrollTrigger: {
          trigger: '#vip',
          start: 'top top',
          end: '+=150%',
          pin: true,
          scrub: true,
        },
      })
      vipTl
        .fromTo(q('#vip-h2'), { x: -60 }, { x: 0, duration: 1, ease: 'none' }, 0)
        .fromTo(q('#vip-rule'), { height: 0 }, { height: 120, duration: 1, ease: 'none' }, 0)
        .fromTo(q('#vip-copy'), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.4 }, 0)
        .fromTo(q('#vip-cta'), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.3 }, 0.7)

      // --- PT stats count-up (§6) ---
      gsap.utils.toArray<HTMLElement>(q('.stat-num')).forEach((el) => {
        const target = Number(el.dataset.target ?? 0)
        const obj = { v: 0 }
        gsap.to(obj, {
          scrollTrigger: { trigger: el, start: 'top 85%' },
          v: target,
          duration: 1.4,
          ease: 'power2.out',
          onUpdate: () => {
            el.textContent = String(Math.round(obj.v))
          },
        })
      })
      gsap.from(q('.coach-card'), {
        scrollTrigger: { trigger: q('.coach-strip')[0], start: 'top 80%' },
        x: 60,
        opacity: 0,
        stagger: 0.15,
        duration: 0.7,
        ease: 'power3.out',
      })
      gsap.fromTo(
        q('.package-border'),
        { strokeDasharray: 100, strokeDashoffset: 100 },
        {
          scrollTrigger: { trigger: q('.package-card')[0], start: 'top 80%' },
          strokeDashoffset: 0,
          duration: 1,
          ease: 'power2.inOut',
        },
      )

      // --- Group classes: cards from right (§7) ---
      gsap.from(q('.class-card'), {
        scrollTrigger: { trigger: q('.class-cards')[0], start: 'top 78%' },
        x: 60,
        opacity: 0,
        stagger: 0.15,
        duration: 0.7,
        ease: 'power3.out',
      })

      // --- Women's health: bg parallax + panel rise (§8) ---
      gsap.to(q('.womens-bg'), {
        scrollTrigger: {
          trigger: '#womens-health',
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
        yPercent: -10,
        ease: 'none',
      })
      gsap.from(q('.womens-panel'), {
        scrollTrigger: { trigger: '#womens-health', start: 'top 70%' },
        y: 60,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
      })
      gsap.from(q('.womens-ctas > *'), {
        scrollTrigger: { trigger: '#womens-health', start: 'top 70%' },
        y: 20,
        opacity: 0,
        stagger: 0.1,
        duration: 0.5,
        delay: 0.4,
      })

      // --- Pricing: card stagger (§9) ---
      gsap.from(q('.pricing-card'), {
        scrollTrigger: { trigger: q('.pricing-grid')[0], start: 'top 80%' },
        y: 30,
        opacity: 0,
        stagger: 0.08,
        duration: 0.6,
        ease: 'power3.out',
      })

      // --- Reviews: stars pop + cards fade (§10) ---
      gsap.from(q('.review-card'), {
        scrollTrigger: { trigger: q('.reviews-row')[0], start: 'top 78%' },
        y: 24,
        opacity: 0,
        stagger: 0.12,
        duration: 0.6,
        ease: 'power3.out',
      })
      gsap.from(q('.review-star'), {
        scrollTrigger: { trigger: q('.reviews-row')[0], start: 'top 78%' },
        scale: 0,
        stagger: 0.05,
        duration: 0.35,
        ease: 'back.out(2)',
      })

      // --- Location: clip-path reveal + copy stagger (§11) ---
      gsap.fromTo(
        q('.location-img-wrap'),
        { clipPath: 'inset(0 0 100% 0)' },
        {
          scrollTrigger: { trigger: q('.location-img-wrap')[0], start: 'top 80%' },
          clipPath: 'inset(0 0 0% 0)',
          duration: 1,
          ease: 'power3.inOut',
        },
      )
      gsap.from(q('.location-copy > *'), {
        scrollTrigger: { trigger: q('.location-copy')[0], start: 'top 78%' },
        y: 30,
        opacity: 0,
        stagger: 0.12,
        duration: 0.8,
        ease: 'power3.out',
      })

      // --- Final CTA: char split on scroll (§12) ---
      gsap.from(q('.final-h2 .split-char'), {
        scrollTrigger: { trigger: q('.final-h2')[0], start: 'top 80%' },
        y: 24,
        opacity: 0,
        stagger: 0.02,
        duration: 0.7,
        ease: 'power3.out',
      })
      gsap.from(q('.final-fade'), {
        scrollTrigger: { trigger: q('.final-h2')[0], start: 'top 80%' },
        y: 20,
        opacity: 0,
        stagger: 0.15,
        duration: 0.6,
        delay: 0.5,
      })
    },
    { scope: root },
  )

  return (
    <div ref={root}>
      <Hero />
      <BrandStatement />
      <ServicesGrid />
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
