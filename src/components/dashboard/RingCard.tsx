/**
 * Progress ring card — dashboard.md §2. SVG ring (120px, 10px stroke, round
 * caps, --viz-track track, --viz-1 white progress) animating stroke-dashoffset
 * from empty on mount, with a synced tabular count-up. Hover reveals a 7-day
 * mini sparkline tooltip; click deep-links to /analytics.
 */
import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export interface RingTick {
  frac: number
  color: string
}

interface RingCardProps {
  label: string
  /** 0–100 ring fill */
  pct: number
  centerValue: number
  formatCenter: (v: number) => string
  caption: string
  /** 7 values, oldest → newest */
  spark: number[]
  sparkLabel: string
  formatSpark?: (v: number) => string
  /** macro split micro-ticks under the ring (P/C/F in viz-2/3/4) */
  ticks?: RingTick[]
  delay?: number
}

const SIZE = 120
const STROKE = 10
const R = (SIZE - STROKE) / 2
const C = 2 * Math.PI * R

function Sparkline({ values }: { values: number[] }) {
  const w = 148
  const h = 36
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * w},${h - 4 - ((v - min) / span) * (h - 8)}`)
    .join(' ')
  return (
    <svg width={w} height={h} className="block">
      <polyline
        points={pts}
        fill="none"
        stroke="var(--viz-1)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function RingCard({
  label,
  pct,
  centerValue,
  formatCenter,
  caption,
  spark,
  sparkLabel,
  formatSpark = (v) => String(Math.round(v)),
  ticks,
  delay = 0,
}: RingCardProps) {
  const navigate = useNavigate()
  const clamped = Math.max(0, Math.min(100, pct))
  const count = useMotionValue(0)
  const centerText = useTransform(count, (v) => formatCenter(v))

  useEffect(() => {
    const controls = animate(count, centerValue, {
      duration: 1.2,
      delay,
      ease: 'easeOut',
    })
    return () => controls.stop()
  }, [count, centerValue, delay])

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.button
          type="button"
          onClick={() => navigate('/analytics')}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay, ease: 'easeOut' }}
          whileHover={{ y: -2 }}
          className="app-card group flex w-full cursor-pointer flex-col items-center p-6 text-left transition-colors hover:border-white/25"
        >
          <div className="relative transition-[filter] duration-300 group-hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.08)]">
            <svg width={SIZE} height={SIZE} className="-rotate-90">
              <circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                fill="none"
                stroke="var(--viz-track)"
                strokeWidth={STROKE}
              />
              <motion.circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                fill="none"
                stroke="var(--viz-1)"
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={C}
                initial={{ strokeDashoffset: C }}
                animate={{ strokeDashoffset: C * (1 - clamped / 100) }}
                transition={{ duration: 1.2, delay, ease: 'easeOut' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.span className="text-[32px] font-bold tabular-nums leading-none">
                {centerText}
              </motion.span>
            </div>
          </div>

          {ticks && (
            <div className="mt-3 flex h-1 w-full max-w-[120px] gap-0.5">
              {ticks.map((t, i) => (
                <span
                  key={i}
                  className="h-full"
                  style={{ width: `${t.frac * 100}%`, background: t.color }}
                />
              ))}
            </div>
          )}

          <p className="mt-4 text-[11px] uppercase tracking-[0.2em] text-vault-muted">{label}</p>
          <p className="mt-1 text-[13px] text-vault-muted tabular-nums">{caption}</p>
        </motion.button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="border-vault-border bg-vault-surface-2 p-3">
        <p className="mb-2 text-[10px] uppercase tracking-[0.15em] text-vault-muted">
          {sparkLabel} · last 7 days
        </p>
        <Sparkline values={spark} />
        <div className="mt-1 flex justify-between text-[10px] text-vault-faint tabular-nums">
          <span>{formatSpark(spark[0])}</span>
          <span>{formatSpark(spark[spark.length - 1])}</span>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
