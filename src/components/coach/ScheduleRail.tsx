import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { SectionHeader } from './shared'
import {
  TODAY_SCHEDULE,
  NOW_LABEL_MINUTES,
  timeToMinutes,
  capacityOf,
} from './scheduleData'
import type { SessionKind } from './scheduleData'

function KindPill({ kind }: { kind: SessionKind }) {
  if (kind === 'class')
    return (
      <span className="bg-white px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-vault-btn-text">
        Class
      </span>
    )
  if (kind === 'group')
    return (
      <span className="border border-dashed border-viz-3 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-vault-muted">
        2:1 Group
      </span>
    )
  return (
    <span className="border border-white/70 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-white">
      1:1
    </span>
  )
}

export default function ScheduleRail() {
  const [bookings, setBookings] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      TODAY_SCHEDULE.filter((s) => s.classId).map((s) => [s.classId!, s.booked ?? 0]),
    ),
  )

  const simulateBooking = () => {
    setBookings((prev) => {
      const next = { ...prev }
      // fill the first class that still has space
      for (const s of TODAY_SCHEDULE) {
        if (!s.classId) continue
        const cap = capacityOf(s.classId)
        if ((next[s.classId] ?? 0) < cap) {
          next[s.classId] = (next[s.classId] ?? 0) + 1
          break
        }
      }
      return next
    })
  }

  return (
    <section className="app-card p-6">
      <SectionHeader
        eyebrow="Today · Tuesday 12 May"
        title="Schedule"
        right={
          <button
            onClick={simulateBooking}
            className="btn-ghost text-[11px]"
            title="Mock booking simulation"
          >
            <Plus className="h-3.5 w-3.5" /> Simulate booking
          </button>
        }
      />

      <div className="relative">
        {TODAY_SCHEDULE.map((s, i) => {
          const showNow =
            timeToMinutes(s.time) > NOW_LABEL_MINUTES &&
            (i === 0 || timeToMinutes(TODAY_SCHEDULE[i - 1].time) <= NOW_LABEL_MINUTES)
          const cap = s.classId ? capacityOf(s.classId) : 0
          const booked = s.classId ? (bookings[s.classId] ?? 0) : 0
          const full = s.classId ? booked >= cap : false
          return (
            <div key={s.time}>
              {showNow && (
                <div className="relative my-1 flex items-center gap-2 py-1">
                  <motion.span
                    className="h-px flex-1 bg-white"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <span className="text-[10px] uppercase tracking-[0.2em] text-white">
                    Now 12:00
                  </span>
                  <motion.span
                    className="h-px flex-1 bg-white"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </div>
              )}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.06, ease: 'easeOut' }}
                className="flex items-center gap-4 border-b border-vault-border/60 py-3.5 last:border-0"
              >
                <span className="tnum w-12 shrink-0 text-[13px] text-vault-muted">
                  {s.time}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-white">{s.label}</p>
                  <p className="mt-0.5 text-[12px] text-vault-faint">
                    {s.classId ? (
                      <>
                        <span className="tnum">
                          {booked}/{cap} booked{full ? ' — FULL' : ''}
                        </span>
                        {' · '}
                      </>
                    ) : null}
                    {s.note}
                  </p>
                </div>
                <KindPill kind={s.kind} />
              </motion.div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
