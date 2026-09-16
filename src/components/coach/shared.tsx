import { useEffect, useState } from 'react'
import { animate, motion } from 'framer-motion'
import type { Client } from '@/data/mock'
import { EASE, clamp } from './utils'

/** Count-up number, 1.2s, tabular (design §6) */
export function CountUp({
  value,
  format = (v: number) => String(Math.round(v)),
  duration = 1.2,
  className,
}: {
  value: number
  format?: (v: number) => string
  duration?: number
  className?: string
}) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    const controls = animate(0, value, {
      duration,
      ease: EASE,
      onUpdate: (v) => setDisplay(v),
    })
    return () => controls.stop()
  }, [value, duration])
  return <span className={className}>{format(display)}</span>
}

/** Client monogram avatar — 2-letter initials (first + last name), matching coach monograms */
export function GridAvatar({
  name,
  size = 32,
  ring = false,
}: {
  name: string
  size?: number
  ring?: boolean
}) {
  const parts = name.trim().split(/\s+/)
  const initials = (parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')
  return (
    <div
      role="img"
      aria-label={name}
      className={`flex shrink-0 items-center justify-center rounded-full bg-vault-surface-3 ${
        ring ? 'border border-vault-border' : ''
      }`}
      style={{ width: size, height: size }}
    >
      <span className="font-serif text-vault-muted" style={{ fontSize: size * 0.38 }}>
        {initials.toUpperCase()}
      </span>
    </div>
  )
}

/** Mini progress ring — animates stroke on mount (design §6) */
export function ProgressRing({
  value,
  size = 56,
  stroke = 4,
  label,
}: {
  value: number
  size?: number
  stroke?: number
  label?: string
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--viz-track)"
            strokeWidth={stroke}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--viz-1)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c * (1 - clamp(value, 0, 100) / 100) }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </svg>
        <span className="tnum absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white">
          {Math.round(value)}
        </span>
      </div>
      {label && (
        <span className="text-[10px] uppercase tracking-[0.14em] text-vault-muted">
          {label}
        </span>
      )}
    </div>
  )
}

/** Tier pill — monochrome; Open Gym rendered dashed */
export function TierPill({ tier }: { tier: Client['tier'] }) {
  const dashed = tier === 'Open Gym'
  return (
    <span
      className={`inline-block whitespace-nowrap px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] ${
        dashed
          ? 'border border-dashed border-viz-3 text-vault-muted'
          : 'bg-vault-surface-3 text-white'
      }`}
    >
      {tier}
    </span>
  )
}

/** Status pill — ON TRACK solid, AT RISK dashed (never red) */
export function StatusPill({ atRisk }: { atRisk: boolean }) {
  return atRisk ? (
    <span className="inline-block border border-dashed border-viz-3 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-vault-muted">
      At Risk
    </span>
  ) : (
    <span className="inline-block bg-viz-track px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-white">
      On Track
    </span>
  )
}

export function SectionHeader({
  eyebrow,
  title,
  right,
}: {
  eyebrow: string
  title: string
  right?: React.ReactNode
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h3 className="mt-1 text-xl font-bold text-white md:text-2xl">{title}</h3>
      </div>
      {right}
    </div>
  )
}
