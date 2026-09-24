/**
 * UnlockButton — the sign-in CTA with the vault-unlock animation.
 *
 * Idle: gold button (the vault's golden accent). On click it smoothly
 * transitions to green, the label crossfades to "Vault Unlocked" with a
 * check, and after a short hold `onEnter` fires — the App-level VaultEntry
 * overlay picks up from there with the black dip + gold light sweep.
 *
 * `onArm` runs first (create the session, validate). Return `false` from it
 * to abort the unlock (e.g. unknown account) — the button stays gold.
 */
import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Check } from 'lucide-react'

interface UnlockButtonProps {
  onArm: () => boolean | void
  onEnter: () => void
  idleLabel: string
  holdMs?: number
  className?: string
}

export default function UnlockButton({
  onArm,
  onEnter,
  idleLabel,
  holdMs = 900,
  className = '',
}: UnlockButtonProps) {
  const [unlocked, setUnlocked] = useState(false)
  const timerRef = useRef<number | undefined>(undefined)

  const handle = () => {
    if (unlocked) return
    if (onArm() === false) return
    setUnlocked(true)
    timerRef.current = window.setTimeout(onEnter, holdMs)
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={unlocked}
      aria-live="polite"
      className={`flex w-full items-center justify-center gap-2 px-6 text-[12px] font-bold uppercase tracking-[0.14em] transition-all duration-500 ${
        unlocked
          ? 'bg-emerald-600 text-white shadow-[0_0_28px_rgba(16,185,129,0.5)]'
          : 'bg-[#D4AF37] text-black hover:bg-[#E7C86B]'
      } ${className}`}
    >
      <motion.span
        key={unlocked ? 'unlocked' : 'idle'}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="flex items-center gap-2"
      >
        {unlocked ? (
          <>
            <Check className="h-4 w-4" /> Vault Unlocked
          </>
        ) : (
          <>
            {idleLabel} <ArrowRight className="h-4 w-4" />
          </>
        )}
      </motion.span>
    </button>
  )
}
