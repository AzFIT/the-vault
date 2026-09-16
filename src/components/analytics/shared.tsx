/**
 * Shared chart primitives for the Analytics page — monochrome viz ramp
 * only (design.md §2). No hue anywhere.
 */
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

/**
 * Monochrome viz ramp read from CSS variables so the app-black
 * reskin (AppShell) re-tones tracks/grids automatically.
 */
export const VIZ = {
  1: 'var(--viz-1)',
  2: 'var(--viz-2)',
  3: 'var(--viz-3)',
  4: 'var(--viz-4)',
  track: 'var(--viz-track)',
  grid: 'var(--viz-grid)',
  muted: 'var(--vault-muted)',
} as const

/** Recharts tooltip — #353031 card, 1px white 20% border, tabular numbers */
export function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: ReadonlyArray<{ name?: string; value?: number | string; color?: string; payload?: Record<string, unknown> }>
  label?: string | number
}) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="tnum rounded-lg border border-white/20 bg-vault-surface-2 px-3 py-2 text-[12px] shadow-xl shadow-black/40">
      {label != null && <p className="mb-1 text-[11px] uppercase tracking-[0.14em] text-vault-muted">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-2 text-white">
          <span
            className="inline-block h-2 w-2"
            style={{ background: p.color ?? '#fff' }}
            aria-hidden
          />
          <span className="text-vault-muted">{p.name}:</span>
          <span className="font-medium">{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</span>
        </p>
      ))}
    </div>
  )
}

/** Count-up number, 1.2s tabular (design.md §6) */
export function AnimatedNumber({
  value,
  decimals = 0,
  duration = 1.2,
  prefix = '',
  suffix = '',
  className = '',
}: {
  value: number
  decimals?: number
  duration?: number
  prefix?: string
  suffix?: string
  className?: string
}) {
  const [display, setDisplay] = useState('0')
  const prev = useRef(0)

  useEffect(() => {
    const from = prev.current
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / (duration * 1000))
      const eased = 1 - Math.pow(1 - t, 3)
      const v = from + (value - from) * eased
      setDisplay(
        v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }),
      )
      if (t < 1) raf = requestAnimationFrame(tick)
      else prev.current = value
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, decimals, duration])

  return (
    <span className={`tnum ${className}`}>
      {prefix}
      {display}
      {suffix}
    </span>
  )
}

/** Standard analytics card with eyebrow + title + optional aside */
export function SectionCard({
  eyebrow,
  title,
  aside,
  children,
  className = '',
}: {
  eyebrow: string
  title: string
  aside?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={`app-card p-6 ${className}`}
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h3 className="mt-1 text-xl font-bold text-white">{title}</h3>
        </div>
        {aside}
      </div>
      {children}
    </motion.section>
  )
}
