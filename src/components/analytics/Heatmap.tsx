import { useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { SectionCard, VIZ } from './shared'
import { cellLevel, formatWeekdayDate, heatmapSummary, logsForWeekIdx, LOG_WEEKS } from './analyticsData'
import type { DayLog } from '@/data/mock'

const LEVEL_STYLES = [
  { background: VIZ.track },
  { background: 'rgba(255,255,255,0.15)' },
  { background: 'rgba(255,255,255,0.40)' },
  { background: 'rgba(255,255,255,0.70)' },
  { background: '#ffffff', border: '1px solid #ffffff' },
] as const

const LEVEL_LABELS = ['Rest', 'Logged', 'Trained', 'Trained + nutrition', 'Perfect day']

function cellTooltip(l: DayLog, level: number): string {
  const date = formatWeekdayDate(l.date)
  if (level === 4) return `${date} · ${l.workout?.type ?? 'Session'} + all targets hit ✦`
  if (level === 3) return `${date} · ${l.workout?.type ?? 'Session'} + nutrition on target`
  if (level === 2) return `${date} · ${l.workout?.type ?? 'Session'} (${l.workout?.durationMin ?? 0} min)`
  return `${date} · Rest — ${l.steps.toLocaleString()} steps`
}

export default function Heatmap({ onOpenDay }: { onOpenDay: (date: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.2 })
  const [tip, setTip] = useState<string | null>(null)
  const summary = heatmapSummary()

  return (
    <SectionCard
      eyebrow="Consistency"
      title="16 weeks of showing up"
      aside={
        <div className="flex items-center gap-2 text-[11px] text-vault-muted">
          <span>Less</span>
          {LEVEL_STYLES.map((s, i) => (
            <span
              key={i}
              className="h-[10px] w-[10px] rounded-[3px]"
              style={{ background: s.background }}
              title={LEVEL_LABELS[i]}
            />
          ))}
          <span>More</span>
        </div>
      }
    >
      <div ref={ref} className="overflow-x-auto pb-1">
        <div className="flex gap-[4px]" style={{ minWidth: 16 * 18 + 24 }}>
          {/* weekday labels — weeks start Monday in the mock series */}
          <div className="flex shrink-0 flex-col gap-[4px] pr-1 text-[10px] text-vault-muted">
            {['M', '', 'W', '', 'F', '', ''].map((d, i) => (
              <span key={i} className="flex h-[14px] items-center">
                {d}
              </span>
            ))}
          </div>
          {Array.from({ length: LOG_WEEKS }, (_, w) => (
            <div key={w} className="flex flex-col gap-[4px]">
              {logsForWeekIdx(w).map((l, row) => {
                const level = cellLevel(l)
                return (
                  <motion.button
                    key={l.date}
                    initial={{ scale: 0 }}
                    animate={inView ? { scale: 1 } : {}}
                    transition={{ delay: w * 0.05 + row * 0.02, duration: 0.25, ease: 'easeOut' }}
                    className="h-[14px] w-[14px] rounded-[3px] outline-offset-2 transition-transform hover:scale-125"
                    style={LEVEL_STYLES[level]}
                    aria-label={cellTooltip(l, level)}
                    onMouseEnter={() => setTip(cellTooltip(l, level))}
                    onMouseLeave={() => setTip(null)}
                    onFocus={() => setTip(cellTooltip(l, level))}
                    onBlur={() => setTip(null)}
                    onClick={() => onOpenDay(l.date)}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p className="h-4 text-[12px] text-vault-muted">{tip ?? 'Hover a cell for the day, click to open the full log.'}</p>
        <p className="tnum text-[12px] text-vault-faint">
          {summary.adherencePct}% adherence · {summary.sessions} sessions · longest streak {summary.longestStreak} days
        </p>
      </div>
    </SectionCard>
  )
}
