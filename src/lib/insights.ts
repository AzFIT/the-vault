/**
 * Insights data — shared between the /portal/insights page and the printable
 * monthly revenue report, so both surfaces always show identical numbers.
 * Revenue comes from the mock store; staff splits are deterministic weights
 * by seniority (Head Coach > Junior), not random.
 */
import { coachClients, coaches, monthlyRevenue } from '@/data/mock'

export const STREAMS = [
  { key: 'pt', label: 'PT Packages', color: 'var(--viz-1)', printCls: 'bg-neutral-900' },
  { key: 'memberships', label: 'Memberships', color: 'var(--viz-2)', printCls: 'bg-neutral-500' },
  { key: 'classes', label: 'Classes', color: 'var(--viz-3)', printCls: 'bg-neutral-300' },
] as const

export type StreamKey = (typeof STREAMS)[number]['key']

const STAFF_WEIGHTS = [0.3, 0.22, 0.2, 0.16, 0.12]
const STAFF_UTIL = [92, 84, 81, 76, 62]
const STAFF_ADHERENCE = [89, 91, 86, 84, 78]

export interface StaffPerformanceRow {
  coach: (typeof coaches)[number]
  sessions: number
  revenue: number
  utilisation: number
  adherence: number
  clients: number
}

/** Per-coach performance for the most recent month, ranked by revenue. */
export function staffPerformanceRows(): StaffPerformanceRow[] {
  const last = monthlyRevenue[monthlyRevenue.length - 1]
  const totalClients = coachClients.length
  return coaches.map((c, i) => ({
    coach: c,
    sessions: Math.round(last.sessionsDelivered * STAFF_WEIGHTS[i]),
    revenue: Math.round((last.pt * STAFF_WEIGHTS[i]) / 100) * 100,
    utilisation: STAFF_UTIL[i],
    adherence: STAFF_ADHERENCE[i],
    clients: Math.max(1, Math.round((totalClients * STAFF_WEIGHTS[i]) / 0.62) - (i > 2 ? 1 : 0)),
  }))
}

/** Trailing months newest-first with month-over-month total delta %. */
export function revenueRowsNewestFirst() {
  return [...monthlyRevenue].reverse().map((m, i, arr) => {
    const prev = arr[i + 1]
    return {
      ...m,
      mom: prev ? Math.round(((m.total - prev.total) / prev.total) * 100) : null,
    }
  })
}
