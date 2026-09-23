/**
 * The Vault Gate — cinematic entry point wired to the navbar's Login / Staff
 * links. The vault intro video plays full-screen; when it ends (or is
 * skipped) the "vault opens" into a destination menu listing everything a
 * visitor might want to see or do.
 *
 * Autoplay is muted (browser policy); if autoplay is still blocked, a gold
 * "Open the Vault" button appears — one click starts the intro.
 */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  CalendarCheck,
  CreditCard,
  Dumbbell,
  Home,
  KeyRound,
  LayoutDashboard,
  Play,
  Sheet,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { asset } from '@/lib/utils'

const DESTINATIONS = [
  {
    to: '/portal/login',
    icon: KeyRound,
    label: 'Operations Portal',
    desc: 'Owner, front desk & coach sign-in',
  },
  {
    to: '/members',
    icon: LayoutDashboard,
    label: 'Member Home',
    desc: 'Classes, personal training & your plan',
  },
  {
    to: '/coach',
    icon: Dumbbell,
    label: 'Coaching Studio',
    desc: 'Program builder & client programming',
  },
  {
    to: '/sheets',
    icon: Sheet,
    label: 'Performance Records',
    desc: 'Workouts, measurements & testing',
  },
  {
    to: '/intake?mode=trial',
    icon: CalendarCheck,
    label: 'Book a Trial Session',
    desc: 'First-session intake & assessment',
  },
  {
    to: '/#memberships',
    icon: CreditCard,
    label: 'Membership Plans',
    desc: 'Plans, pricing & what is included',
  },
  {
    to: '/',
    icon: Home,
    label: 'Return to Website',
    desc: 'Back to the main site',
  },
]

export default function PortalGate() {
  const videoRef = useRef<HTMLVideoElement>(null)
  /** 'intro' = video stage · 'menu' = destination list */
  const [phase, setPhase] = useState<'intro' | 'menu'>('intro')
  /** true when the browser blocked even muted autoplay — show a play button */
  const [blocked, setBlocked] = useState(false)
  /** audio starts muted (browser autoplay policy); user can unmute any time */
  const [muted, setMuted] = useState(true)

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (reducedMotion) {
      setPhase('menu')
      return
    }
    const v = videoRef.current
    if (!v) return
    // React doesn't reliably apply the muted prop before the first play
    // attempt — set the property imperatively so muted autoplay is never
    // blocked by the browser's sound policy.
    v.muted = true
    const attempt = v.play()
    if (attempt) {
      attempt.catch(() => setBlocked(true))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startFromButton = () => {
    const v = videoRef.current
    setBlocked(false)
    setMuted(false) // a user gesture unlocks audio — play the intro with sound
    if (v) {
      v.muted = false
      v.play().catch(() => setBlocked(true))
    }
  }

  const toggleMute = () => {
    const v = videoRef.current
    const next = !muted
    setMuted(next)
    if (v) v.muted = next
  }

  return (
    <div
      className="app-black relative flex min-h-[100dvh] flex-col overflow-hidden bg-vault-bg text-white"
      style={{ background: '#0a0a0c' }}
    >
      {/* Ambient gold glow behind everything */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[80vmin] w-[80vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.10) 0%, transparent 62%)' }}
      />

      {/* Logo — top center on every phase */}
      <header className="relative z-20 flex justify-center pt-8">
        <Link to="/" aria-label="The Vault Fitness — home">
          <img src={asset('brand/vault-logo-full.png')} alt="The Vault Fitness" className="h-12 w-auto" />
        </Link>
      </header>

      <AnimatePresence mode="wait">
        {phase === 'intro' ? (
          <motion.div
            key="intro"
            className="relative z-10 flex min-h-0 flex-1 flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.7, ease: 'easeInOut' }}
          >
            {/* Video stage */}
            <div className="relative flex min-h-0 flex-1 items-center justify-center px-6">
              <video
                ref={videoRef}
                src={asset('vault-intro-2.mp4')}
                poster={asset('brand/vault-intro-2-poster.jpg')}
                muted={muted}
                playsInline
                autoPlay
                preload="auto"
                onEnded={() => setPhase('menu')}
                className="max-h-[62dvh] w-auto max-w-full object-contain"
                style={{ filter: 'drop-shadow(0 24px 60px rgba(0,0,0,0.65))' }}
              />
              {blocked && (
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={startFromButton}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/40"
                  aria-label="Play the vault intro"
                >
                  <span className="flex h-20 w-20 items-center justify-center rounded-full border border-gold/60 bg-black/50 text-gold transition-transform hover:scale-105">
                    <Play className="h-8 w-8" />
                  </span>
                  <span className="gold-metal-text text-[13px] uppercase tracking-[0.28em]">
                    Open the Vault
                  </span>
                </motion.button>
              )}
            </div>

            {/* Caption + sound toggle + skip */}
            <div className="relative z-20 flex items-end justify-between gap-4 px-6 pb-8 md:px-10">
              <p className="text-[11px] uppercase tracking-[0.22em] text-vault-faint">
                The Vault Fitness · Hong Kong
              </p>
              <div className="flex items-center gap-5">
                <button
                  onClick={toggleMute}
                  aria-label={muted ? 'Unmute intro audio' : 'Mute intro audio'}
                  className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-vault-muted transition-colors hover:text-gold"
                >
                  {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                  {muted ? 'Sound off' : 'Sound on'}
                </button>
                <button
                  onClick={() => setPhase('menu')}
                  className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-vault-muted transition-colors hover:text-gold"
                >
                  Skip intro <SkipForward className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="menu"
            className="relative z-10 flex flex-1 flex-col items-center px-6 pb-10 pt-6"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            {/* Vault door seal, small, above the heading */}
            <motion.img
              src={asset('brand/vault-door-gold.png')}
              alt=""
              aria-hidden
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="w-24 md:w-28"
              style={{ filter: 'drop-shadow(0 10px 28px rgba(0,0,0,0.6))' }}
            />
            <h1
              className="gold-metal-text mt-5 text-center text-3xl md:text-4xl"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.06em' }}
            >
              The Vault Is Open
            </h1>
            <p className="mt-3 text-[13px] text-vault-muted">
              Choose where you would like to go.
            </p>

            {/* Destination list */}
            <div className="mt-8 grid w-full max-w-3xl grid-cols-1 gap-2 sm:grid-cols-2">
              {DESTINATIONS.map((d, i) => (
                <motion.div
                  key={d.to}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.06, duration: 0.4, ease: 'easeOut' }}
                >
                  <Link
                    to={d.to}
                    className="group flex items-center gap-3 border border-vault-border bg-vault-surface/60 px-4 py-3.5 transition-colors hover:border-gold/70 hover:bg-white/[0.04]"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-vault-border text-vault-muted transition-colors group-hover:border-gold/60 group-hover:text-gold">
                      <d.icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-bold text-white">{d.label}</span>
                      <span className="block truncate text-[12px] text-vault-muted">{d.desc}</span>
                    </span>
                  </Link>
                </motion.div>
              ))}
            </div>

            <Link
              to="/"
              className="mt-8 flex items-center gap-2 text-[12px] text-vault-muted transition-colors hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to homepage
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
