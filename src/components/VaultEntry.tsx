/**
 * VaultEntry — App-level overlay for the sign-in → portal transition.
 *
 * No video: the sign-in button itself flips gold → green ("Vault Unlocked")
 * on the login page, then this overlay dips to black, the gold light line
 * sweeps across the screen (≈0.85s) with a green glow in its wake, the
 * navigation happens underneath, and the overlay fades up (≈0.7s).
 * Tap during the sweep skips straight to the reveal.
 * `prefers-reduced-motion` gets a quick black dip only.
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { VAULT_ENTRY_EVENT } from '@/lib/vaultEntry'

type Phase = 'closed' | 'sweep' | 'reveal'

const SWEEP_MS = 850
const REVEAL_MS = 700
const DIP_MS = 250

export default function VaultEntry() {
  const navigate = useNavigate()
  const [phase, setPhaseState] = useState<Phase>('closed')
  const phaseRef = useRef<Phase>('closed')
  const destinationRef = useRef('')
  const timersRef = useRef<number[]>([])

  // Single-subscription effect: deps are stable ([]), so the cleanup that
  // clears pending timers only runs on real unmount — NOT on every phase
  // change (which would wipe the sweep→reveal timer the moment it was set).
  const setPhase = (p: Phase) => {
    phaseRef.current = p
    setPhaseState(p)
  }

  const startReveal = () => {
    if (phaseRef.current !== 'sweep') return
    setPhase('reveal')
    timersRef.current.push(window.setTimeout(() => setPhase('closed'), REVEAL_MS))
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
      setPhase('sweep')
      // Navigate mid-sweep so the destination is underneath as the line
      // finishes crossing, then lift the overlay.
      timersRef.current.push(
        window.setTimeout(() => {
          if (destinationRef.current) navigate(destinationRef.current)
        }, SWEEP_MS * 0.55),
        window.setTimeout(startReveal, SWEEP_MS),
      )
    }
    window.addEventListener(VAULT_ENTRY_EVENT, onRequest)
    return () => {
      window.removeEventListener(VAULT_ENTRY_EVENT, onRequest)
      timersRef.current.forEach(clearTimeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (phase === 'closed') return null

  return (
    <motion.div
      className="fixed inset-0 z-[200] cursor-pointer bg-black"
      initial={false}
      animate={{ opacity: phase === 'sweep' ? 1 : 0 }}
      transition={{ duration: (phase === 'sweep' ? DIP_MS : REVEAL_MS) / 1000, ease: 'easeInOut' }}
      style={{ pointerEvents: phase === 'sweep' ? 'auto' : 'none' }}
      onClick={startReveal}
      aria-hidden
    >
      {/* Gold light sweep — the crack of light as the door opens, with a
          green glow in its wake (the "unlocked" accent) */}
      {phase === 'sweep' && (
        <motion.div
          className="pointer-events-none absolute left-0 right-0 top-1/2 h-px origin-left"
          style={{
            background: 'linear-gradient(90deg, transparent, #D4AF37 30%, #F5E7A8 50%, #D4AF37 70%, transparent)',
            boxShadow:
              '0 0 24px 4px rgba(212,175,55,0.55), 0 0 64px 12px rgba(16,185,129,0.28)',
          }}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: [0, 1, 1, 0.4] }}
          transition={{ duration: SWEEP_MS / 1000, ease: 'easeInOut' }}
        />
      )}
    </motion.div>
  )
}
