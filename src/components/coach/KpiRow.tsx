/**
 * Coach KPI cards. Each card navigates to its section on click. The Active
 * Clients card carries three small icon buttons (add / view all / status)
 * that open centered client-database popups; Sessions and Revenue carry a
 * privacy eye that blurs the figure until the trainer's PIN is entered.
 * Added clients persist in localStorage and feed the roster too.
 */
import { useEffect, useState } from 'react'
import type { ComponentType, ReactNode } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  Activity,
  Banknote,
  CalendarClock,
  Eye,
  EyeOff,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react'
import type { Client } from '@/data/mock'
import { coachClients, coachStats, monthlyRevenue, formatHKD } from '@/data/mock'
import { CountUp } from './shared'
import { ClientModal, PinModal } from './KpiModals'
import { TODAY_SCHEDULE, NOW_LABEL_MINUTES, timeToMinutes } from './scheduleData'

const ADDED_KEY = 'vault-added-clients'

const loadAdded = (): Client[] => {
  try {
    return JSON.parse(localStorage.getItem(ADDED_KEY) ?? '[]') as Client[]
  } catch {
    return []
  }
}

const goTo = (id: string) =>
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

/** Small bordered icon button with a hover tooltip. */
function TipBtn({
  icon: Icon,
  tip,
  onClick,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
  tip: string
  onClick: () => void
}) {
  return (
    <span className="group/tip relative">
      <button
        type="button"
        aria-label={tip}
        title=""
        onClick={(e) => {
          e.stopPropagation()
          onClick()
        }}
        className="flex h-7 w-7 items-center justify-center border border-vault-border/70 text-vault-faint transition-colors hover:border-white hover:text-white"
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute right-0 top-full z-30 mt-1.5 whitespace-nowrap border border-vault-border bg-vault-surface-2 px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-white opacity-0 shadow-lg shadow-black/40 transition-opacity duration-150 group-hover/tip:opacity-100"
      >
        {tip}
      </span>
    </span>
  )
}

type PrivacyKey = 'sessions' | 'revenue'

export default function KpiRow() {
  const stats = coachStats()
  const [added, setAdded] = useState<Client[]>(loadAdded)
  const allClients = [...coachClients, ...added]

  // Centered client-database popup
  const [clientModal, setClientModal] = useState<'add' | 'list' | 'status' | null>(null)

  // Privacy: hidden flags persist; revealed flags last for this tab session only
  const [privacy, setPrivacy] = useState<Record<PrivacyKey, boolean>>(() => {
    try {
      // Figures start blurred — safe to open the dashboard in public.
      return { sessions: true, revenue: true, ...JSON.parse(localStorage.getItem('vault-coach-privacy') ?? '{}') }
    } catch {
      return { sessions: true, revenue: true }
    }
  })
  const [revealed, setRevealed] = useState<Record<PrivacyKey, boolean>>({ sessions: false, revenue: false })
  const [pinFor, setPinFor] = useState<PrivacyKey | null>(null)

  useEffect(() => {
    localStorage.setItem('vault-coach-privacy', JSON.stringify(privacy))
  }, [privacy])

  const togglePrivacy = (key: PrivacyKey) => {
    if (privacy[key] && revealed[key]) {
      // visible → hide
      setRevealed((r) => ({ ...r, [key]: false }))
      setPrivacy((p) => ({ ...p, [key]: true }))
    } else if (privacy[key]) {
      // hidden → PIN prompt to reveal
      setPinFor(key)
    } else {
      // visible (never hidden) → hide
      setPrivacy((p) => ({ ...p, [key]: true }))
    }
  }

  const addClient = (c: Client) => {
    const next = [...added, c]
    setAdded(next)
    localStorage.setItem(ADDED_KEY, JSON.stringify(next))
    window.dispatchEvent(new Event('vault-clients-changed'))
    setClientModal(null)
    toast.success(`${c.name} added to clients`)
  }

  const ptCount = allClients.filter((c) => c.tier.startsWith('PT')).length
  const womensCount = allClients.filter((c) => c.tier === "Women's Programme").length
  const openCount = allClients.filter((c) => c.tier === 'Open Gym').length

  const sessionsThisWeek = Math.round(stats.sessionsThisMonth / 4.33)
  const remaining = TODAY_SCHEDULE.filter(
    (s) => timeToMinutes(s.time) >= NOW_LABEL_MINUTES,
  ).length

  const last = monthlyRevenue[monthlyRevenue.length - 1]
  const prev = monthlyRevenue[monthlyRevenue.length - 2]
  const delta = Math.round(((last.total - prev.total) / prev.total) * 100)

  type Card = {
    label: string
    target: string
    value: number
    format: (v: number) => string
    sub: string
    icon: ComponentType<{ className?: string; strokeWidth?: number }>
    privacyKey?: PrivacyKey
    right?: ReactNode
  }

  const eyeBtn = (key: PrivacyKey, hidden: boolean) => (
    <TipBtn
      icon={hidden ? Eye : EyeOff}
      tip={hidden ? 'Show figure (PIN required)' : 'Hide figure'}
      onClick={() => togglePrivacy(key)}
    />
  )

  const cards: Card[] = [
    {
      icon: Users,
      label: 'Active Clients',
      target: 'coach-roster',
      value: allClients.length,
      format: (v: number) => String(Math.round(v)),
      sub: `${ptCount} PT · ${womensCount} Women's · ${openCount} Open Gym`,
      right: (
        <span className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <TipBtn icon={UserPlus} tip="Add new client" onClick={() => setClientModal('add')} />
          <TipBtn icon={Users} tip="View all clients" onClick={() => setClientModal('list')} />
          <TipBtn icon={UserCheck} tip="Client status" onClick={() => setClientModal('status')} />
        </span>
      ),
    },
    {
      icon: CalendarClock,
      label: 'Sessions This Week',
      target: 'coach-schedule',
      value: sessionsThisWeek,
      format: (v: number) => String(Math.round(v)),
      sub: `${remaining} remaining today · VIP Studio`,
      privacyKey: 'sessions',
      right: eyeBtn('sessions', privacy.sessions && !revealed.sessions),
    },
    {
      icon: Banknote,
      label: 'Month Revenue',
      target: 'coach-revenue',
      value: stats.revenueThisMonth,
      format: (v: number) => formatHKD(Math.round(v)),
      sub: `${delta >= 0 ? '+' : ''}${delta}% vs ${prev.label}`,
      privacyKey: 'revenue',
      right: eyeBtn('revenue', privacy.revenue && !revealed.revenue),
    },
    {
      icon: Activity,
      label: 'Avg Adherence',
      target: 'coach-roster',
      value: stats.avgAdherence,
      format: (v: number) => `${Math.round(v)}%`,
      sub: 'across all clients',
    },
  ]

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card, i) => {
          const hidden = card.privacyKey ? privacy[card.privacyKey] && !revealed[card.privacyKey] : false
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: 'easeOut' }}
              role="button"
              tabIndex={0}
              onClick={() => goTo(card.target)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') goTo(card.target)
              }}
              className="app-card cursor-pointer p-6 transition-colors hover:border-white/40"
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-[0.18em] text-vault-muted">
                  {card.label}
                </p>
                <span className="flex items-center gap-1.5">
                  {card.right ?? <card.icon className="h-4 w-4 text-vault-faint" strokeWidth={1.5} />}
                </span>
              </div>
              <span
                className={
                  hidden
                    ? 'tnum mt-3 block select-none text-[32px] font-bold leading-none text-white blur-[7px] md:text-[38px]'
                    : 'tnum mt-3 block text-[32px] font-bold leading-none text-white md:text-[38px]'
                }
                aria-hidden={hidden}
              >
                <CountUp value={card.value} format={card.format} />
              </span>
              <p className="mt-2.5 text-[13px] text-vault-muted">{card.sub}</p>
            </motion.div>
          )
        })}
      </div>

      <ClientModal
        open={clientModal !== null}
        mode={clientModal ?? 'list'}
        clients={allClients}
        onClose={() => setClientModal(null)}
        onAdd={addClient}
      />
      <PinModal
        open={pinFor !== null}
        hasPin={!!localStorage.getItem('vault-coach-pin')}
        onClose={() => setPinFor(null)}
        onSuccess={() => {
          if (pinFor) setRevealed((r) => ({ ...r, [pinFor]: true }))
          setPinFor(null)
        }}
      />
    </>
  )
}
