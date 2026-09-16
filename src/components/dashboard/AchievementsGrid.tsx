/**
 * Achievement badges — dashboard.md §5. 12-tile grid: the 8 achievements from
 * mock.ts plus 4 locked long-haul badges defined by the design doc. Unlocked
 * badges spring-pop in; locked sit at 40% with a dashed ring.
 */
import { memo } from 'react'
import { motion } from 'framer-motion'
import {
  Award,
  CalendarCheck,
  Crosshair,
  Crown,
  Dumbbell,
  Flag,
  Medal,
  Star,
  Sunrise,
  Flame,
  Timer,
  TrendingDown,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { achievements } from '@/data/mock'
import type { Achievement } from '@/data/mock'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/** Locked long-haul badges from dashboard.md §5 not carried by mock.ts */
const EXTRA_BADGES: Achievement[] = [
  { id: 'thirty-day', name: '30-Day Logger', description: 'Log 30 consecutive days', earned: false },
  { id: 'macro-master', name: 'Macro Master', description: 'Hit every macro target 7 days straight', earned: false },
  { id: 'vip-50', name: 'VIP 50', description: 'Complete 50 sessions in the VIP Studio', earned: false },
  { id: 'centennial', name: 'Centennial Club', description: 'Complete 100 tracked sessions', earned: false },
]

const ICONS: Record<string, LucideIcon> = {
  'first-session': Flag,
  'ten-sessions': Medal,
  'seven-day-streak': Flame,
  'five-kg': TrendingDown,
  'deadlift-100': Dumbbell,
  'hyrox-ready': Timer,
  'early-bird': Sunrise,
  consistency: Crown,
  'thirty-day': CalendarCheck,
  'macro-master': Crosshair,
  'vip-50': Star,
  centennial: Award,
}

/** Pulsing "NEW" dot — isolated so the loop never re-renders the grid. */
const PulseDot = memo(function PulseDot() {
  return (
    <motion.span
      aria-hidden
      className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-white"
      animate={{ opacity: [1, 0.25, 1] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
})

export default function AchievementsGrid() {
  const all = [...achievements, ...EXTRA_BADGES]
  const earned = all.filter((a) => a.earned)
  const newestId = earned.reduce<Achievement | null>(
    (acc, a) => (a.earnedDate && (!acc || (acc.earnedDate ?? '') < a.earnedDate) ? a : acc),
    null,
  )?.id

  return (
    <section className="app-card p-6">
      <p className="eyebrow">Achievements</p>
      <p className="mt-1 text-[13px] text-vault-muted tabular-nums">
        {earned.length} of {all.length} unlocked
      </p>

      <div className="mt-5 grid grid-cols-3 gap-x-2 gap-y-5">
        {all.map((a, i) => {
          const Icon = ICONS[a.id] ?? Award
          return (
            <Tooltip key={a.id}>
              <TooltipTrigger asChild>
                <motion.div
                  initial={a.earned ? { scale: 0, opacity: 0 } : { opacity: 0 }}
                  animate={a.earned ? { scale: 1, opacity: 1 } : { opacity: 0.4 }}
                  transition={
                    a.earned
                      ? { type: 'spring', stiffness: 260, damping: 18, delay: 0.2 + i * 0.06 }
                      : { duration: 0.4, delay: 0.2 + i * 0.06 }
                  }
                  whileHover={{ scale: 1.06 }}
                  className="flex cursor-default flex-col items-center gap-2"
                >
                  <span
                    className={`relative flex h-14 w-14 items-center justify-center rounded-full ${
                      a.earned
                        ? 'border border-white bg-vault-surface-2'
                        : 'border border-dashed'
                    }`}
                    style={a.earned ? undefined : { borderColor: 'var(--viz-4)' }}
                  >
                    <Icon
                      className="h-5 w-5"
                      strokeWidth={1.5}
                      style={{ color: a.earned ? '#fff' : 'var(--vault-faint)' }}
                    />
                    {a.id === newestId && <PulseDot />}
                  </span>
                  <span className="text-center text-[10px] uppercase leading-tight tracking-[0.08em] text-vault-muted">
                    {a.name}
                  </span>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent className="border-vault-border bg-vault-surface-2 text-[12px]">
                {a.earned
                  ? `Earned ${new Date(`${a.earnedDate}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
                  : a.description}
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </section>
  )
}
