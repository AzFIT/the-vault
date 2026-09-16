/**
 * Right rail of dashboard §3 — Next 1:1 session card + coach note card.
 */
import { motion } from 'framer-motion'
import { CalendarPlus } from 'lucide-react'
import { getCoachById, demoClient } from '@/data/mock'
import { formatDayShort, plannedSessionDate } from '@/components/sheets/store'

/** Minimal ICS builder — folds long lines and escapes text per RFC 5545. */
function buildIcs({ start, end, summary, location, description }: {
  start: Date
  end: Date
  summary: string
  location: string
  description: string
}) {
  const stamp = (d: Date) =>
    `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(
      d.getDate(),
    ).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}${String(
      d.getMinutes(),
    ).padStart(2, '0')}00`
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//The Vault Fitness//EN',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@thevault-fitness.com`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(summary)}`,
    `LOCATION:${esc(location)}`,
    `DESCRIPTION:${esc(description)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  // fold lines > 75 octets
  const folded = lines.flatMap((l) => {
    const out = [l.slice(0, 75)]
    let rest = l.slice(75)
    while (rest.length) {
      out.push(' ' + rest.slice(0, 74))
      rest = rest.slice(74)
    }
    return out
  })
  return folded.join('\r\n')
}

function downloadIcs() {
  // Next 1:1 session — 6:30am with Dan Kan at The Vault, on the planned day.
  const start = new Date(`${plannedSessionDate}T06:30:00`)
  const end = new Date(start.getTime() + 60 * 60 * 1000)
  const ics = buildIcs({
    start,
    end,
    summary: '1:1 Session with Dan Kan — The Vault Fitness',
    location: 'The Vault Fitness, 3/F Alliance Building, 133 Connaught Road, Sheung Wan',
    description: 'VIP Studio. Bring water — towels provided.',
  })
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'vault-1to1-session.ics'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function CoachColumn() {
  const coach = getCoachById(demoClient.coachId)
  const nextDay = new Date(`${plannedSessionDate}T00:00:00`).toLocaleDateString('en-GB', {
    weekday: 'long',
  })

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
        className="app-card p-6 transition-colors hover:border-white/25"
      >
        <p className="eyebrow">Next 1:1 session</p>
        <p className="mt-3 text-2xl font-bold">
          {nextDay} 6:30am
        </p>
        <p className="mt-1 text-[13px] text-vault-muted">
          with {coach?.name} · VIP Studio · {formatDayShort(plannedSessionDate)}
        </p>
        <div className="mt-4 flex items-center gap-3">
          {coach && (
            <div
              aria-label={coach.name}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-vault-border bg-vault-surface-2"
            >
              <span className="font-serif text-sm text-vault-muted">
                {coach.name.split(' ').map((n) => n[0]).join('')}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={downloadIcs}
            className="inline-flex items-center gap-2 border border-white/80 px-3 py-1.5 text-[11px] uppercase tracking-[0.08em] text-white transition-colors hover:bg-white/[0.08]"
          >
            <CalendarPlus className="h-3.5 w-3.5" /> Add to calendar
          </button>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.25, ease: 'easeOut' }}
        className="app-card p-6 transition-colors hover:border-white/25"
      >
        <p className="eyebrow">Note from Dan</p>
        <blockquote className="mt-3 text-[15px] italic leading-relaxed text-white/90">
          “Sleep's trending up — keep protein above 130g on training days. We'll retest your bench
          on Thursday.”
        </blockquote>
        <p className="mt-3 text-[13px] text-vault-muted">Mon 9:14pm</p>
      </motion.section>
    </div>
  )
}
