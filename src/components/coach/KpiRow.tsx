import { motion } from 'framer-motion'
import { Users, CalendarClock, Banknote, Activity } from 'lucide-react'
import { coachStats, coachClients, monthlyRevenue, formatHKD } from '@/data/mock'
import { CountUp } from './shared'
import { TODAY_SCHEDULE, NOW_LABEL_MINUTES, timeToMinutes } from './scheduleData'

export default function KpiRow() {
  const stats = coachStats()
  const ptCount = coachClients.filter((c) => c.tier.startsWith('PT')).length
  const womensCount = coachClients.filter((c) => c.tier === "Women's Programme").length
  const openCount = coachClients.filter((c) => c.tier === 'Open Gym').length

  const sessionsThisWeek = Math.round(stats.sessionsThisMonth / 4.33)
  const remaining = TODAY_SCHEDULE.filter(
    (s) => timeToMinutes(s.time) >= NOW_LABEL_MINUTES,
  ).length

  const last = monthlyRevenue[monthlyRevenue.length - 1]
  const prev = monthlyRevenue[monthlyRevenue.length - 2]
  const delta = Math.round(((last.total - prev.total) / prev.total) * 100)

  const cards = [
    {
      icon: Users,
      label: 'Active Clients',
      value: stats.activeClients,
      format: (v: number) => String(Math.round(v)),
      sub: `${ptCount} PT · ${womensCount} Women's · ${openCount} Open Gym`,
    },
    {
      icon: CalendarClock,
      label: 'Sessions This Week',
      value: sessionsThisWeek,
      format: (v: number) => String(Math.round(v)),
      sub: `${remaining} remaining today · VIP Studio`,
    },
    {
      icon: Banknote,
      label: 'Month Revenue',
      value: stats.revenueThisMonth,
      format: (v: number) => formatHKD(Math.round(v)),
      sub: `${delta >= 0 ? '+' : ''}${delta}% vs ${prev.label}`,
    },
    {
      icon: Activity,
      label: 'Avg Adherence',
      value: stats.avgAdherence,
      format: (v: number) => `${Math.round(v)}%`,
      sub: 'across all clients',
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: i * 0.08, ease: 'easeOut' }}
          className="app-card p-6"
        >
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.18em] text-vault-muted">
              {card.label}
            </p>
            <card.icon className="h-4 w-4 text-vault-faint" strokeWidth={1.5} />
          </div>
          <CountUp
            value={card.value}
            format={card.format}
            className="tnum mt-3 block text-[32px] font-bold leading-none text-white md:text-[38px]"
          />
          <p className="mt-2.5 text-[13px] text-vault-muted">{card.sub}</p>
        </motion.div>
      ))}
    </div>
  )
}
