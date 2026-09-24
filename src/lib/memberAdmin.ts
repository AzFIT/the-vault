import { supabase } from '@/lib/supabase'

/**
 * Member management — owner portal client for the `manage-subscription`
 * Edge Function. Read paths (list/detail) and all mutations (renew,
 * change_plan, adjust_credits) go through the same secret-gated endpoint;
 * the DB functions audit every credit movement in `credit_ledger`.
 */

const BUILDER_SECRET = 'vault_bld_8f3a91c27d54e6b0'

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('manage-subscription', {
    body: { ...body, secret: BUILDER_SECRET },
  })
  if (error) throw new Error(error.message)
  if (data && typeof data === 'object' && 'error' in data) {
    throw new Error(String((data as { error: unknown }).error))
  }
  return data as T
}

export interface MemberListRow {
  id: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  created_at: string
  plan_code: string | null
  membership_name: string | null
  status: string | null
  credits_remaining: number | null
  current_period_end: string | null
}

export interface LedgerRow {
  delta: number
  reason: string
  class_code: string | null
  created_at: string
}

export interface MemberDetail {
  profile: {
    id: string
    first_name: string | null
    last_name: string | null
    phone: string | null
    role: string
    created_at: string
  }
  email: string | null
  subscription: {
    plan_code: string
    membership_name: string
    status: string
    credits_remaining: number
    current_period_end: string
  } | null
  ledger: LedgerRow[]
}

export interface CreditActivityRow {
  user_id: string
  member_name: string
  delta: number
  reason: string
  is_auto: boolean
  created_at: string
}

export async function listCreditActivity(): Promise<CreditActivityRow[]> {
  const data = await invoke<{ activity: CreditActivityRow[] }>({ action: 'credit_activity' })
  return data.activity
}

export async function listMembers(query?: string): Promise<MemberListRow[]> {
  const data = await invoke<{ members: MemberListRow[] }>({
    action: 'list_members',
    ...(query?.trim() ? { query: query.trim() } : {}),
  })
  return data.members
}

export async function getMemberDetail(userId: string): Promise<MemberDetail> {
  return invoke<MemberDetail>({ action: 'member_detail', user_id: userId })
}

export async function renewMember(userId: string): Promise<number> {
  const data = await invoke<{ credits_remaining: number }>({ action: 'renew', user_id: userId })
  return data.credits_remaining
}

export async function changeMemberPlan(userId: string, planCode: string): Promise<number> {
  const data = await invoke<{ credits_remaining: number }>({
    action: 'change_plan',
    user_id: userId,
    plan_code: planCode,
  })
  return data.credits_remaining
}

export async function adjustMemberCredits(userId: string, delta: number, reason: string): Promise<number> {
  const data = await invoke<{ credits_remaining: number }>({
    action: 'adjust_credits',
    user_id: userId,
    delta,
    reason,
  })
  return data.credits_remaining
}
