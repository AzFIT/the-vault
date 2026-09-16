/**
 * Week snapshot strip — dashboard.md §6. Seven day-columns of micro-bars:
 * steps (white, vs 9k tick), sleep (viz-2, vs 8h tick), calorie dot
 * (white = within target, hollow = over). Today highlighted.
 */
import { motion } from 'framer-motion'
import { latestLog, logsForDays, macroTargets } from '@/data/mock'
import { formatSleep } from '@/components/sheets/store'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const STEP_TARGET = 9000
const STEP_SCALE = 12000
const SLEEP_TARGET = 8
const SLEEP_SCALE = 10

export default function WeekSnapshot() {
  const days = logsForDays(7)
  const todayDate = latestLog().date

  return (
    <section className="app-card p-6">
      <p className="eyebrow">Week snapshot</p>
      <div className="mt-5 grid grid-cols-7 gap-2 md:gap-4">
        {days.map((d, i) => {
          const dow = new Date(`${d.date}T00:00:00`)
            .toLocaleDateString('en-GB', { weekday: 'narrow' })
          const isToday = d.date === todayDate
          const stepH = Math.min(1, d.steps / STEP_SCALE)
          const sleepH = Math.min(1, d.sleepHrs / SLEEP_SCALE)
          const withinCal = d.calories <= macroTargets.calories

          return (
            <Tooltip key={d.date}>
              <TooltipTrigger asChild>
                <div
                  className={`flex cursor-default flex-col items-center gap-2 pt-1 ${
                    isToday ? 'border-t-2 border-white' : 'border-t-2 border-transparent'
                  }`}
                >
                  <span
                    className={`text-[11px] uppercase tracking-[0.15em] ${
                      isToday ? 'text-white' : 'text-vault-muted'
                    }`}
                  >
                    {dow}
                  </span>
                  <div className="flex h-20 items-end gap-1.5">
                    {/* steps bar with 9k target tick */}
                    <div
                      className="relative flex h-full w-3 items-end overflow-visible"
                      style={{ background: 'var(--viz-track)' }}
                    >
                      <motion.span
                        className="w-full bg-white"
                        initial={{ height: 0 }}
                        whileInView={{ height: `${stepH * 100}%` }}
                        viewport={{ once: true, amount: 0.3 }}
                        transition={{ duration: 0.6, delay: i * 0.04, ease: 'easeOut' }}
                      />
                      <span
                        className="absolute left-0 h-px w-full bg-white/60"
                        style={{ bottom: `${(STEP_TARGET / STEP_SCALE) * 100}%` }}
                      />
                    </div>
                    {/* sleep bar with 8h target tick */}
                    <div
                      className="relative flex h-full w-3 items-end"
                      style={{ background: 'var(--viz-track)' }}
                    >
                      <motion.span
                        className="w-full"
                        style={{ background: 'var(--viz-2)' }}
                        initial={{ height: 0 }}
                        whileInView={{ height: `${sleepH * 100}%` }}
                        viewport={{ once: true, amount: 0.3 }}
                        transition={{ duration: 0.6, delay: 0.05 + i * 0.04, ease: 'easeOut' }}
                      />
                      <span
                        className="absolute left-0 h-px w-full bg-white/60"
                        style={{ bottom: `${(SLEEP_TARGET / SLEEP_SCALE) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span
                    className={`h-2 w-2 rounded-full ${
                      withinCal ? 'bg-white' : 'border border-white/70 bg-transparent'
                    }`}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent className="border-vault-border bg-vault-surface-2 text-[12px] tabular-nums">
                {new Date(`${d.date}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short' })} ·{' '}
                {d.steps.toLocaleString('en-HK')} steps · {formatSleep(d.sleepHrs)} ·{' '}
                {d.calories.toLocaleString('en-HK')} kcal {withinCal ? '· on target' : '· over'}
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-vault-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 bg-white" /> Steps (target 9,000)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2" style={{ background: 'var(--viz-2)' }} /> Sleep (target 8h)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-white" /> Calories within target
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full border border-white/70" /> Calories over
        </span>
      </div>
    </section>
  )
}
