/**
 * Members (/portal/members) — the owner portal's member management surface.
 * Search cloud member accounts, open a member, and run the operations the
 * front desk needs day to day: renew a plan, switch plans, and adjust class
 * credits. Every credit movement is audited in `credit_ledger` server-side;
 * the last 25 movements are shown here as the member's paper trail.
 *
 * Data flows through the secret-gated `manage-subscription` Edge Function
 * (memberAdmin.ts) — the owner portal never touches member tables directly.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Coins, Crown, Minus, Plus, RefreshCcw, Search, User } from 'lucide-react'
import {
  adjustMemberCredits,
  changeMemberPlan,
  getMemberDetail,
  listMembers,
  renewMember,
  type MemberDetail,
  type MemberListRow,
} from '@/lib/memberAdmin'
import { useMembershipPlans } from '@/lib/memberAccounts'

const STATUS_STYLES: Record<string, string> = {
  active: 'border-emerald-400/50 text-emerald-300',
  past_due: 'border-amber-400/50 text-amber-300',
  frozen: 'border-sky-400/50 text-sky-300',
  canceled: 'border-red-400/50 text-red-300',
}

export default function PortalMembers() {
  const plans = useMembershipPlans()
  const [query, setQuery] = useState('')
  const [members, setMembers] = useState<MemberListRow[]>([])
  const [listError, setListError] = useState<string | null>(null)
  const [loadingList, setLoadingList] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<MemberDetail | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [planPick, setPlanPick] = useState('')
  const [delta, setDelta] = useState('1')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)
  const debounceRef = useRef<number | undefined>(undefined)

  const refreshList = useCallback(async (q: string) => {
    setLoadingList(true)
    setListError(null)
    try {
      setMembers(await listMembers(q))
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Failed to load members.')
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => {
    window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => void refreshList(query), 250)
    return () => window.clearTimeout(debounceRef.current)
  }, [query, refreshList])

  const openMember = useCallback(async (id: string) => {
    setSelectedId(id)
    setDetail(null)
    setDetailError(null)
    setNotice(null)
    try {
      const d = await getMemberDetail(id)
      setDetail(d)
      setPlanPick(d.subscription?.plan_code ?? '')
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : 'Failed to load member.')
    }
  }, [])

  const run = async (fn: () => Promise<unknown>, successText: (r: unknown) => string) => {
    if (!selectedId || busy) return
    setBusy(true)
    setNotice(null)
    try {
      const result = await fn()
      await openMember(selectedId) // re-pull detail + ledger (clears the notice)
      await refreshList(query)
      setNotice({ ok: true, text: successText(result) }) // set after refresh so it survives
    } catch (e) {
      setNotice({ ok: false, text: e instanceof Error ? e.message : 'Action failed.' })
    } finally {
      setBusy(false)
    }
  }

  const nameOf = (m: MemberListRow) => `${m.first_name ?? ''} ${m.last_name ?? ''}`.trim() || '(unnamed)'

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Manage · Members</p>
          <h2 className="mt-1 text-2xl font-bold text-white">Members</h2>
          <p className="mt-1 text-[13px] text-vault-muted">
            Cloud member accounts with their plans, class credits and audit trail. Renew, switch
            plans, or adjust credits — every movement is written to the ledger.
          </p>
        </div>
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-vault-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or phone…"
            className="w-60 border border-vault-border bg-vault-surface py-2 pl-9 pr-3 text-[13px] text-white placeholder:text-vault-faint focus:border-gold focus:outline-none"
          />
        </label>
      </div>

      {listError && <p className="border border-red-500/40 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">{listError}</p>}

      <div className="grid gap-5 lg:grid-cols-[minmax(320px,2fr)_3fr]">
        {/* ————— Member list ————— */}
        <div className="border border-vault-border">
          <div className="flex items-center justify-between border-b border-vault-border px-4 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-vault-faint">
              {loadingList ? 'Searching…' : `${members.length} member${members.length === 1 ? '' : 's'}`}
            </p>
            <button
              type="button"
              onClick={() => void refreshList(query)}
              className="text-vault-faint transition-colors hover:text-gold"
              aria-label="Refresh list"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="max-h-[540px] overflow-y-auto">
            {members.length === 0 && !loadingList && (
              <p className="px-4 py-8 text-center text-[12px] text-vault-muted">
                {query ? 'No members match this search.' : 'No member accounts yet.'}
              </p>
            )}
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => void openMember(m.id)}
                className={`flex w-full items-center gap-3 border-b border-vault-border px-4 py-3 text-left transition-colors ${
                  selectedId === m.id ? 'bg-gold/5' : 'hover:bg-vault-surface/60'
                }`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-gold/40 bg-gold/10 text-[11px] text-gold">
                  {(m.first_name?.[0] ?? '')}{(m.last_name?.[0] ?? '')}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-bold text-white">{nameOf(m)}</span>
                  <span className="block truncate text-[11px] text-vault-muted">
                    {m.membership_name ?? 'No plan'} · {m.credits_remaining ?? '—'} credits
                  </span>
                </span>
                <span
                  className={`shrink-0 border px-1.5 py-0.5 text-[9px] uppercase tracking-[0.1em] ${
                    STATUS_STYLES[m.status ?? ''] ?? 'border-vault-border text-vault-muted'
                  }`}
                >
                  {m.status ?? '—'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ————— Detail panel ————— */}
        <div className="border border-vault-border">
          {!selectedId && (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 p-8 text-center">
              <User className="h-8 w-8 text-vault-faint" />
              <p className="max-w-xs text-[12px] text-vault-muted">
                Select a member to see their subscription, adjust credits, or review their ledger.
              </p>
            </div>
          )}
          {selectedId && detailError && (
            <p className="m-4 border border-red-500/40 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">{detailError}</p>
          )}
          {selectedId && !detail && !detailError && (
            <p className="p-8 text-center text-[12px] text-vault-muted">Loading member…</p>
          )}

          {detail && (
            <div className="space-y-5 p-5">
              {/* Identity */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[16px] font-bold text-white">
                    {detail.profile.first_name} {detail.profile.last_name}
                  </p>
                  <p className="text-[12px] text-vault-muted">
                    {detail.email ?? 'no email'} · {detail.profile.phone || 'no phone'}
                  </p>
                  <p className="mt-0.5 text-[11px] text-vault-faint">
                    Member since {new Date(detail.profile.created_at).toLocaleDateString()}
                  </p>
                </div>
                {detail.subscription && (
                  <span
                    className={`border px-2 py-1 text-[10px] uppercase tracking-[0.1em] ${
                      STATUS_STYLES[detail.subscription.status] ?? 'border-vault-border text-vault-muted'
                    }`}
                  >
                    {detail.subscription.status}
                  </span>
                )}
              </div>

              {notice && (
                <p
                  className={`border px-3 py-2 text-[12px] ${
                    notice.ok
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                      : 'border-red-500/40 bg-red-500/10 text-red-300'
                  }`}
                >
                  {notice.text}
                </p>
              )}

              {detail.subscription ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Plan + renewal */}
                  <div className="border border-vault-border p-4">
                    <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-vault-faint">
                      <Crown className="h-3.5 w-3.5 text-gold" /> Plan
                    </p>
                    <p className="mt-2 text-[14px] font-bold text-white">{detail.subscription.membership_name}</p>
                    <p className="text-[11px] text-vault-muted">
                      Renews {new Date(detail.subscription.current_period_end).toLocaleDateString()}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <select
                        value={planPick}
                        onChange={(e) => setPlanPick(e.target.value)}
                        className="min-w-0 flex-1 border border-vault-border bg-vault-surface px-2 py-2 text-[12px] text-white focus:border-gold focus:outline-none"
                      >
                        {plans.map((p) => (
                          <option key={p.code} value={p.code}>
                            {p.name} · HK${p.priceHkd.toLocaleString()}/mo
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={busy || !planPick || planPick === detail.subscription.plan_code}
                        onClick={() =>
                          void run(
                            () => changeMemberPlan(detail.profile.id, planPick),
                            () => `Plan changed — allowance reset to the new plan.`,
                          )
                        }
                        className="border border-gold/60 px-3 py-2 text-[11px] uppercase tracking-[0.1em] text-gold transition-colors hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Change
                      </button>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void run(
                          () => renewMember(detail.profile.id),
                          (r) => `Renewed — credits reset to ${r}.`,
                        )
                      }
                      className="mt-2 w-full border border-vault-border px-3 py-2 text-[11px] uppercase tracking-[0.1em] text-vault-muted transition-colors hover:border-gold/60 hover:text-gold disabled:opacity-40"
                    >
                      Renew now (roll period + reset credits)
                    </button>
                  </div>

                  {/* Credits */}
                  <div className="border border-vault-border p-4">
                    <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-vault-faint">
                      <Coins className="h-3.5 w-3.5 text-gold" /> Class credits
                    </p>
                    <p className="tnum mt-2 text-3xl font-bold text-white">
                      {detail.subscription.credits_remaining}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        aria-label="Add 1 credit"
                        disabled={busy}
                        onClick={() =>
                          void run(
                            () => adjustMemberCredits(detail.profile.id, 1, 'owner quick +1'),
                            (r) => `Added 1 credit — balance ${r}.`,
                          )
                        }
                        className="flex items-center gap-1 border border-vault-border px-3 py-2 text-[11px] uppercase tracking-[0.1em] text-vault-muted transition-colors hover:border-gold/60 hover:text-gold disabled:opacity-40"
                      >
                        <Plus className="h-3.5 w-3.5" /> 1
                      </button>
                      <button
                        type="button"
                        aria-label="Remove 1 credit"
                        disabled={busy}
                        onClick={() =>
                          void run(
                            () => adjustMemberCredits(detail.profile.id, -1, 'owner quick -1'),
                            (r) => `Removed 1 credit — balance ${r}.`,
                          )
                        }
                        className="flex items-center gap-1 border border-vault-border px-3 py-2 text-[11px] uppercase tracking-[0.1em] text-vault-muted transition-colors hover:border-gold/60 hover:text-gold disabled:opacity-40"
                      >
                        <Minus className="h-3.5 w-3.5" /> 1
                      </button>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <input
                        value={delta}
                        onChange={(e) => setDelta(e.target.value.replace(/[^0-9-]/g, ''))}
                        placeholder="+/-"
                        aria-label="Credit delta"
                        className="w-16 border border-vault-border bg-vault-surface px-2 py-2 text-center text-[12px] text-white focus:border-gold focus:outline-none"
                      />
                      <input
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Reason (required — goes in the ledger)"
                        className="min-w-0 flex-1 border border-vault-border bg-vault-surface px-2 py-2 text-[12px] text-white placeholder:text-vault-faint focus:border-gold focus:outline-none"
                      />
                      <button
                        type="button"
                        disabled={busy || !reason.trim() || !Number(delta) || Number(delta) === 0}
                        onClick={() =>
                          void run(
                            () => adjustMemberCredits(detail.profile.id, Number(delta), reason.trim()),
                            (r) => `Adjusted — balance ${r}.`,
                          )
                        }
                        className="border border-gold/60 px-3 py-2 text-[11px] uppercase tracking-[0.1em] text-gold transition-colors hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="border border-vault-border p-4 text-[12px] text-vault-muted">
                  This member has no subscription row.
                </p>
              )}

              {/* Ledger */}
              <div className="border border-vault-border">
                <p className="border-b border-vault-border px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] text-vault-faint">
                  Credit ledger · last {detail.ledger.length}
                </p>
                {detail.ledger.length === 0 ? (
                  <p className="px-4 py-6 text-center text-[12px] text-vault-muted">No movements yet.</p>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    {detail.ledger.map((row, i) => (
                      <div
                        key={`${row.created_at}-${i}`}
                        className="flex items-center gap-3 border-b border-vault-border px-4 py-2 last:border-b-0"
                      >
                        <span
                          className={`tnum w-10 shrink-0 text-right text-[13px] font-bold ${
                            row.delta > 0 ? 'text-emerald-300' : 'text-red-300'
                          }`}
                        >
                          {row.delta > 0 ? `+${row.delta}` : row.delta}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[12px] text-white">{row.reason}</span>
                        <span className="shrink-0 text-[10px] text-vault-faint">
                          {new Date(row.created_at).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
