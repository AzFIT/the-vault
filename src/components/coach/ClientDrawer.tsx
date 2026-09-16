import { useEffect } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, MessageSquare, PenLine, X } from 'lucide-react'
import type { Client } from '@/data/mock'
import { getProgramById, getCoachById } from '@/data/mock'
import { GridAvatar, TierPill, StatusPill, ProgressRing } from './shared'
import { isAtRisk, hashString, clamp } from './utils'

/** Deterministic derived 8-point sparkline for the drawer's weight trend */
function sparklineFor(client: Client): number[] {
  const h = hashString(client.id)
  const base = 58 + (h % 24)
  const drift = client.trend === 'down' ? 0.9 : client.trend === 'up' ? -0.7 : -0.1
  return Array.from({ length: 8 }, (_, i) => {
    const jitter = ((h >> (i + 2)) % 7) - 3
    return Math.round((base + drift * i + jitter * 0.4) * 10) / 10
  })
}

function Sparkline({ points }: { points: number[] }) {
  const w = 100
  const h = 36
  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1
  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w
      const y = h - 4 - ((p - min) / span) * (h - 8)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  const delta = Math.round((points[points.length - 1] - points[0]) * 10) / 10
  return (
    <div className="border border-vault-border p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-[10px] uppercase tracking-[0.16em] text-vault-muted">
          Weight · 8 weeks
        </p>
        <p className="tnum text-[12px] text-viz-2">
          {delta >= 0 ? '+' : ''}
          {delta} kg
        </p>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-16 w-full" preserveAspectRatio="none">
        <motion.path
          d={path}
          fill="none"
          stroke="var(--viz-1)"
          strokeWidth={1.5}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="tnum mt-1 flex justify-between text-[10px] text-vault-faint">
        <span>{max} kg</span>
        <span>{min} kg</span>
      </div>
    </div>
  )
}

export default function ClientDrawer({
  client,
  programId,
  onClose,
  onMessage,
  onEditProgram,
}: {
  client: Client | null
  programId?: string
  onClose: () => void
  onMessage: (c: Client) => void
  onEditProgram: (c: Client) => void
}) {
  // ESC closes the drawer
  useEffect(() => {
    if (!client) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [client, onClose])

  return (
    <AnimatePresence>
      {client && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[70] bg-black/60"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: 480 }}
            animate={{ x: 0 }}
            exit={{ x: 480 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-[71] flex w-full max-w-[480px] flex-col overflow-y-auto border-l border-vault-border bg-vault-surface"
            role="dialog"
            aria-modal="true"
            aria-label={`Client — ${client.name}`}
          >
            {(() => {
              const program = getProgramById(programId ?? client.programId)
              const coach = getCoachById(client.coachId)
              const h = hashString(client.id)
              const rings = [
                { label: 'Score', value: client.adherence },
                { label: 'Macros', value: clamp(client.adherence - 8 + (h % 14), 0, 100) },
                { label: 'Steps', value: clamp(52 + (h % 42), 0, 100) },
                { label: 'Sleep', value: clamp(48 + ((h >> 3) % 46), 0, 100) },
              ]
              const timeline = [
                {
                  when: 'Last session',
                  text: `Completed ${program?.name ?? 'program'} — week ${
                    2 + (h % 6)
                  } block`,
                },
                {
                  when: 'Check-in',
                  text: `Adherence ${client.adherence}% over trailing 4 weeks`,
                },
                {
                  when: 'Note',
                  text: `Goal: ${client.goal}. Coach: ${coach?.name ?? '—'}.`,
                },
              ]
              return (
                <>
                  {/* Header */}
                  <div className="flex items-start justify-between border-b border-vault-border bg-vault-surface-2 p-6">
                    <div className="flex items-center gap-4">
                      <GridAvatar name={client.name} size={56} ring />
                      <div>
                        <h3 className="text-lg font-bold text-white">{client.name}</h3>
                        <div className="mt-1.5 flex items-center gap-2">
                          <TierPill tier={client.tier} />
                          <StatusPill atRisk={isAtRisk(client)} />
                        </div>
                        <p className="mt-1.5 text-[12px] text-vault-faint">
                          Member since {client.memberSince} · {client.age} yrs
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={onClose}
                      aria-label="Close client panel"
                      className="p-1 text-vault-muted transition-colors hover:text-white"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="flex-1 space-y-6 p-6">
                    {/* Rings */}
                    <div className="grid grid-cols-4 gap-2">
                      {rings.map((r) => (
                        <ProgressRing key={r.label} value={r.value} label={r.label} size={52} />
                      ))}
                    </div>

                    <Sparkline points={sparklineFor(client)} />

                    {/* Timeline */}
                    <div>
                      <p className="mb-3 text-[10px] uppercase tracking-[0.16em] text-vault-muted">
                        Recent activity
                      </p>
                      <div className="space-y-0">
                        {timeline.map((t, i) => (
                          <motion.div
                            key={t.when}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 + i * 0.06, duration: 0.35 }}
                            className="border-b border-vault-border/60 py-3 last:border-0"
                          >
                            <p className="text-[10px] uppercase tracking-[0.14em] text-vault-faint">
                              {t.when}
                            </p>
                            <p className="mt-1 text-[13px] leading-relaxed text-white">
                              {t.text}
                            </p>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-3 border-t border-vault-border p-6">
                    <Link
                      to="/analytics"
                      className="inline-flex items-center gap-1.5 bg-white px-4 py-2.5 text-[11px] uppercase tracking-[0.08em] text-vault-btn-text transition-colors hover:bg-vault-btn-hover"
                    >
                      View analytics <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                    <button
                      onClick={() => onMessage(client)}
                      className="inline-flex items-center gap-1.5 border border-white/70 px-4 py-2.5 text-[11px] uppercase tracking-[0.08em] text-white transition-colors hover:bg-white/10"
                    >
                      <MessageSquare className="h-3.5 w-3.5" /> Message
                    </button>
                    <button
                      onClick={() => onEditProgram(client)}
                      className="btn-ghost text-[11px]"
                    >
                      <PenLine className="h-3.5 w-3.5" /> Edit program
                    </button>
                  </div>
                </>
              )
            })()}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
