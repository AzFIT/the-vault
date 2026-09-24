/**
 * Check In (/portal/check-in) — the front-desk daily check-in surface.
 * Search the client directory by name and check members in with one click
 * (every check-in is logged under the signed-in staff ID — the same shift
 * log that feeds the My shift KPI cards and leaderboard). Walk-ins are
 * handled with a name + pass type, and today's check-in list shows who has
 * already come through the door.
 */
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Check, Search, UserPlus } from 'lucide-react'
import { GridAvatar } from '@/components/coach/shared'
import MemberProfileModal from '@/components/MemberProfileModal'
import { STATUS_LABELS, listClients } from '@/lib/clientDirectory'
import type { ClientRow } from '@/lib/clientDirectory'
import { listMembers, type MemberListRow } from '@/lib/memberAdmin'
import { getCurrentProfile, listTodayEvents, recordEvent } from '@/lib/staff'

const STATUS_PILL: Record<ClientRow['status'], string> = {
  member: 'border-[#7ec98f]/50 text-[#7ec98f]',
  visitor: 'border-white/30 text-white/70',
  frozen: 'border-vault-faint/60 text-vault-faint',
  lead: 'border-gold/50 text-gold',
}

const PASSES = ['Day pass HK$180', 'Trial class', 'Class drop-in HK$120']

export default function FrontDeskCheckIn() {
  const profile = getCurrentProfile()
  const [query, setQuery] = useState('')
  const [walkName, setWalkName] = useState('')
  const [pass, setPass] = useState(PASSES[0])
  const [tick, setTick] = useState(0)
  const [cloudMembers, setCloudMembers] = useState<MemberListRow[]>([])
  const [profileUserId, setProfileUserId] = useState<string | null>(null)

  const clients = useMemo(() => listClients(), [])
  const refresh = () => setTick((t) => t + 1)

  // Cloud member lookup — powers the check-in profile card. Debounced so we
  // don't hit the edge function on every keystroke.
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setCloudMembers([])
      return
    }
    const t = window.setTimeout(() => {
      listMembers(q)
        .then(setCloudMembers)
        .catch(() => setCloudMembers([]))
    }, 250)
    return () => window.clearTimeout(t)
  }, [query])

  const todaysCheckins = useMemo(
    () =>
      listTodayEvents(profile?.id ?? '')
        .filter((e) => e.type === 'checkin')
        .slice(-30)
        .reverse(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, profile?.id],
  )

  const checkedNames = useMemo(
    () => new Set(todaysCheckins.map((e) => e.label.toLowerCase())),
    [todaysCheckins],
  )

  const isCheckedIn = (c: ClientRow) =>
    [...checkedNames].some((label) => label.includes(c.name.toLowerCase()))

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return clients
      .filter((c) => `${c.name} ${c.subtitle}`.toLowerCase().includes(q))
      .slice(0, 8)
  }, [clients, query])

  // Cloud members whose names aren't already in the local directory results
  const extraCloud = useMemo(() => {
    const localNames = new Set(results.map((c) => c.name.toLowerCase()))
    return cloudMembers.filter((m) => !localNames.has(`${m.first_name ?? ''} ${m.last_name ?? ''}`.trim().toLowerCase()))
  }, [cloudMembers, results])

  const logCheckIn = (label: string) => {
    if (!profile) return
    recordEvent(profile.id, 'checkin', label)
    refresh()
  }

  const checkIn = (c: ClientRow) => {
    if (isCheckedIn(c)) return
    logCheckIn(`Check-in — ${c.name} (${c.subtitle.split('·')[0].trim()})`)
  }

  const addWalkIn = (e: FormEvent) => {
    e.preventDefault()
    if (!profile || !walkName.trim()) return
    recordEvent(profile.id, 'checkin', `Drop-in — ${walkName.trim()} (${pass})`)
    setWalkName('')
    refresh()
  }

  if (!profile) return null

  const todayLabel = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Front desk · Check in</p>
        <h2 className="mt-1 text-2xl font-bold text-white md:text-3xl">Check in</h2>
        <p className="mt-1 text-[13px] text-vault-muted">
          {todayLabel} · every check-in is tagged <b className="text-white">{profile.staffNo}</b> and
          feeds the My shift KPIs.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-6">
          {/* Member search */}
          <section className="app-card p-5 md:p-6" aria-label="Member search">
            <h3 className="mb-3 text-[15px] font-bold">Find a member</h3>
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-vault-faint" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search first or last name…"
                className="w-full border border-vault-border bg-vault-bg py-3 pl-10 pr-3 text-[14px] text-white placeholder:text-vault-faint focus:border-gold focus:outline-none"
              />
            </label>
            <ul className="mt-3">
              {results.map((c) => {
                const done = isCheckedIn(c)
                return (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center gap-3 border-b border-vault-border/60 py-3 text-[13px] last:border-0"
                  >
                    <GridAvatar name={c.name} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-white">{c.name}</p>
                      <p className="max-w-[300px] truncate text-[11px] text-vault-faint">{c.subtitle}</p>
                    </div>
                    <span className={`border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em] ${STATUS_PILL[c.status]}`}>
                      {STATUS_LABELS[c.status].replace(/s$/, '')}
                    </span>
                    {done ? (
                      <span className="inline-flex items-center gap-1 border border-[#7ec98f]/50 px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] text-[#7ec98f]">
                        <Check className="h-3 w-3" /> Checked in
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => checkIn(c)}
                        className="bg-gold px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-black transition-colors hover:bg-gold-2"
                      >
                        Check in
                      </button>
                    )}
                  </li>
                )
              })}
              {query.trim() && results.length === 0 && extraCloud.length === 0 && (
                <li className="py-6 text-center text-[13px] text-vault-faint">
                  No member matches “{query.trim()}”.
                </li>
              )}
              {extraCloud.length > 0 && (
                <>
                  <li className="pt-3 text-[9px] uppercase tracking-[0.2em] text-vault-faint">Cloud member accounts</li>
                  {extraCloud.map((m) => {
                    const fullName = `${m.first_name ?? ''} ${m.last_name ?? ''}`.trim() || '(unnamed)'
                    return (
                      <li
                        key={m.id}
                        className="flex flex-wrap items-center gap-3 border-b border-vault-border/60 py-3 text-[13px] last:border-0"
                      >
                        <GridAvatar name={fullName} size={32} />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-white">{fullName}</p>
                          <p className="max-w-[300px] truncate text-[11px] text-vault-faint">
                            {m.membership_name ?? 'No plan'} · {m.credits_remaining ?? '—'} credits
                          </p>
                        </div>
                        <span className={`border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em] ${STATUS_PILL[m.status === 'active' ? 'member' : 'frozen']}`}>
                          {m.status ?? '—'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setProfileUserId(m.id)}
                          className="bg-gold px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-black transition-colors hover:bg-gold-2"
                        >
                          Check in
                        </button>
                      </li>
                    )
                  })}
                </>
              )}
              {!query.trim() && (
                <li className="py-4 text-[12px] text-vault-faint">
                  Type a name to search the client directory — members, visitors, frozen accounts, and
                  leads all show up here.
                </li>
              )}
            </ul>
          </section>

          {/* Walk-in */}
          <section className="app-card p-5 md:p-6" aria-label="Walk-in">
            <h3 className="mb-3 text-[15px] font-bold">Walk-in</h3>
            <form onSubmit={addWalkIn} className="flex flex-wrap items-end gap-3">
              <label className="min-w-[200px] flex-1">
                <span className="mb-1.5 block text-[10px] uppercase tracking-[0.14em] text-vault-muted">Name</span>
                <input
                  value={walkName}
                  onChange={(e) => setWalkName(e.target.value)}
                  placeholder="Walk-in name"
                  className="w-full border border-vault-border bg-vault-bg px-3 py-2.5 text-[14px] text-white placeholder:text-vault-faint focus:border-gold focus:outline-none"
                />
              </label>
              <label className="w-[200px]">
                <span className="mb-1.5 block text-[10px] uppercase tracking-[0.14em] text-vault-muted">Pass</span>
                <select
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  className="w-full appearance-none border border-vault-border bg-vault-bg px-3 py-2.5 text-[14px] text-white focus:border-gold focus:outline-none"
                >
                  {PASSES.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className="inline-flex items-center gap-2 bg-white px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-vault-btn-text transition-opacity hover:opacity-85"
              >
                <UserPlus className="h-3.5 w-3.5" /> Add drop-in
              </button>
            </form>
          </section>
        </div>

        {/* Today's check-ins */}
        <section className="app-card h-fit p-5" aria-label="Checked in today">
          <h3 className="mb-3 flex items-baseline justify-between text-[15px] font-bold">
            Checked in today <span className="tnum text-[11px] font-normal text-vault-faint">{todaysCheckins.length}</span>
          </h3>
          <ul>
            {todaysCheckins.map((e) => {
              const isDropIn = e.label.startsWith('Drop-in')
              return (
                <li key={e.id} className="flex items-center gap-3 border-b border-vault-border/60 py-2.5 text-[13px] last:border-0">
                  <span className="tnum w-11 shrink-0 text-vault-faint">
                    {new Date(e.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-white/90">{e.label}</span>
                  <span
                    className={`border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em] ${
                      isDropIn ? 'border-gold text-gold' : 'border-[#7ec98f] text-[#7ec98f]'
                    }`}
                  >
                    {isDropIn ? 'Drop-in' : 'Member'}
                  </span>
                </li>
              )
            })}
            {todaysCheckins.length === 0 && (
              <li className="py-6 text-center text-[13px] text-vault-faint">No check-ins logged yet today.</li>
            )}
          </ul>
        </section>
      </div>

      {/* Check-in profile card — payment status, waiver, bookings, birthday */}
      {profileUserId && profile && (
        <MemberProfileModal
          userId={profileUserId}
          staffName={profile.staffNo}
          onCheckIn={logCheckIn}
          onClose={() => setProfileUserId(null)}
        />
      )}
    </div>
  )
}
