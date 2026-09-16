import { formatHKD, membershipPlans } from '@/data/mock'
import type { EnquiryRoute } from '@/lib/enquiries'

/** Pass products route to reception; memberships route to senior staff. */
export const PASS_PLAN_IDS = ['day', 'week', 'month'] as const
export const MEMBERSHIP_PLAN_IDS = ['six-month', 'year', 'autopay'] as const

export function enquiryRouteForPlan(planId: string): EnquiryRoute {
  return (PASS_PLAN_IDS as readonly string[]).includes(planId) ? 'reception' : 'senior'
}

export function planLabel(planId: string): string {
  const p = membershipPlans.find((m) => m.id === planId)
  if (!p) return planId
  return `${p.name} — ${formatHKD(p.priceHKD)}${p.period ?? ''}`
}

export const passPlans = membershipPlans.filter((p) =>
  (PASS_PLAN_IDS as readonly string[]).includes(p.id),
)
export const membershipOnlyPlans = membershipPlans.filter((p) =>
  (MEMBERSHIP_PLAN_IDS as readonly string[]).includes(p.id),
)

export const planOptionLabel = (p: (typeof membershipPlans)[number]) =>
  `${p.name} — ${formatHKD(p.priceHKD)}${p.period ?? ''}`
