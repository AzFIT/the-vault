/**
 * Greeting strip — dashboard.md §1. Eyebrow + staggered H1 + context pills.
 */
import { motion } from 'framer-motion'
import { demoClient, getCoachById, getProgramById, latestLog, logsForWeek, LOG_WEEKS } from '@/data/mock'
import { formatDateLong, gymHoursLabel, plannedSessionDate } from '@/components/sheets/store'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.03 } },
}

const word = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
}

export default function GreetingStrip() {
  const today = latestLog()
  const firstName = demoClient.name.split(' ')[0]
  const program = getProgramById(demoClient.programId)
  const coach = getCoachById(demoClient.coachId)
  const sessionsThisWeek = logsForWeek(LOG_WEEKS - 1).filter((l) => l.workout).length
  const nextDay = new Date(`${plannedSessionDate}T00:00:00`)
    .toLocaleDateString('en-GB', { weekday: 'short' })
    .toUpperCase()

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="section-head">Welcome back · {formatDateLong(today.date)}</p>
        <motion.h1
          variants={container}
          initial="hidden"
          animate="show"
          className="h-display mt-2 text-[34px] leading-tight"
          style={{ color: 'var(--gold-light)' }}
        >
          {`Good morning, ${firstName}`.split(' ').map((w, i) => (
            <motion.span key={i} variants={word} className="inline-block">
              {w}
              {i < 2 ? ' ' : ''}
            </motion.span>
          ))}
        </motion.h1>
        <p className="mt-2 text-[15px] text-vault-muted">
          Let's crush this week — Week {LOG_WEEKS} of {program?.name} · {sessionsThisWeek} sessions in · Coach:{' '}
          {coach?.name} · {demoClient.location}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[`Gym open · ${gymHoursLabel(today.date)}`, `Next session: ${nextDay} 6:30am — ${coach?.name}`].map(
          (label, i) => (
            <motion.span
              key={label}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 + i * 0.1, ease: 'easeOut' }}
              className="border border-vault-border px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] text-vault-muted"
            >
              {label}
            </motion.span>
          ),
        )}
      </div>
    </div>
  )
}
