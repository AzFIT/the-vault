/**
 * VaultEntry — App-level overlay for the sign-in → portal transition.
 *
 * Phases:
 *   video  — black overlay fades in, intro clip plays (tap = skip)
 *   fade   — video fades out, gold light line sweeps across (≈0.85s)
 *   reveal — navigation happens underneath, overlay fades up (≈0.7s)
 *
 * Full 7.6s clip on the first entry of a browser session; a 2.2s "door
 * opens" cut on repeat entries. `prefers-reduced-motion` skips the video.
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { Volume2, VolumeX } from 'lucide-react'
import { asset } from '@/lib/utils'
import {
  VAULT_ENTRY_EVENT,
  entryPlayedThisSession,
  markEntryPlayed,
} from '@/lib/vaultEntry'

type Phase = 'closed' | 'video' | 'fade' | 'reveal'

const FADE_MS = 850
const REVEAL_MS = 700

export default function VaultEntry() {
  const navigate = useNavigate()
  const [phase, setPhaseState] = useState<Phase>('closed')
  const phaseRef = useRef<Phase>('closed')
  const [muted, setMuted] = useState(true)
  const [shortClip, setShortClip] = useState(false)
  const destinationRef = useRef('')
  const timersRef = useRef<number[]>([])

  // Single-subscription effect: deps are stable ([]), so the cleanup that
  // clears pending timers only runs on real unmount — NOT on every phase
  // change (which would wipe the fade→navigate timer the moment it was set).
  const setPhase = (p: Phase) => {
    phaseRef.current = p
    setPhaseState(p)
  }

  useEffect(() => {
    const onRequest = (e: Event) => {
      if (phaseRef.current !== 'closed') return
      const reduced =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      destinationRef.current = (e as CustomEvent<string>).detail ?? ''
      if (reduced) {
        // No ceremony — navigate with a quick black dip
        if (destinationRef.current) navigate(destinationRef.current)
        setPhase('reveal')
        timersRef.current.push(window.setTimeout(() => setPhase('closed'), REVEAL_MS))
        return
      }
      setShortClip(entryPlayedThisSession())
      setPhase('video')
    }
    window.addEventListener(VAULT_ENTRY_EVENT, onRequest)
    return () => {
      window.removeEventListener(VAULT_ENTRY_EVENT, onRequest)
      timersRef.current.forEach(clearTimeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (phase === 'closed') return null

  const startFade = () => {
    if (phaseRef.current !== 'video') return
    setPhase('fade')
    timersRef.current.push(
      window.setTimeout(() => {
        markEntryPlayed()
        if (destinationRef.current) navigate(destinationRef.current)
        setPhase('reveal')
        timersRef.current.push(window.setTimeout(() => setPhase('closed'), REVEAL_MS))
      }, FADE_MS),
    )
  }

  const toggleMute = () => {
    setMuted((m) => {
      const next = !m
      const v = document.querySelector<HTMLVideoElement>('[data-vault-entry-video]')
      if (v) v.muted = next
      return next
    })
  }

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black"
      initial={false}
      animate={{ opacity: phase === 'reveal' ? 0 : 1 }}
      transition={{ duration: REVEAL_MS / 1000, ease: 'easeInOut' }}
      style={{ pointerEvents: phase === 'reveal' ? 'none' : 'auto' }}
      aria-hidden
    >
      {/* Video stage — click to skip */}
      <motion.div
        className="relative flex h-full w-full cursor-pointer items-center justify-center px-6"
        onClick={startFade}
        initial={false}
        animate={{ opacity: phase === 'video' ? 1 : 0 }}
        transition={{ duration: FADE_MS / 1000, ease: 'easeInOut' }}
      >
        <video
          data-vault-entry-video
          src={asset(shortClip ? 'vault-entry-short.mp4' : 'vault-intro-2.mp4')}
          poster={asset('brand/vault-intro-2-poster.jpg')}
          muted
          playsInline
          autoPlay
          preload="auto"
          onEnded={startFade}
          className="max-h-[70dvh] w-auto max-w-full object-contain"
          style={{ filter: 'drop-shadow(0 24px 60px rgba(0,0,0,0.65))' }}
        />
        {/* Controls */}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-6 pb-6">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              toggleMute()
            }}
            className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-neutral-500 transition-colors hover:text-[#D4AF37]"
          >
            {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            {muted ? 'Sound off' : 'Sound on'}
          </button>
          <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-600">Tap to enter</p>
        </div>
      </motion.div>

      {/* Gold light sweep — the crack of light as the door opens */}
      {phase === 'fade' && (
        <motion.div
          className="pointer-events-none absolute left-0 right-0 top-1/2 h-px"
          style={{
            background: 'linear-gradient(90deg, transparent, #D4AF37 30%, #F5E7A8 50%, #D4AF37 70%, transparent)',
            boxShadow: '0 0 24px 4px rgba(212,175,55,0.55)',
          }}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: [0, 1, 1, 0.4] }}
          transition={{ duration: FADE_MS / 1000, ease: 'easeInOut' }}
        />
      )}
    </motion.div>
  )
}
