/**
 * Follow-ups (/portal/follow-ups) — the front-desk follow-up board. Two
 * queues in one place: shift reminders (call-backs, WhatsApps, renewal
 * nudges) and new enquiries awaiting first contact. Completing anything
 * logs a 'followup' event under the signed-in staff ID (+4 pts toward the
 * My shift productivity score); enquiry contacts also flip the CRM record
 * to 'contacted', keeping the Enquiries badge in sync.
 */
import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { BellPlus, Check, Phone } from 'lucide-react'
import { listEnquiries, markContacted } from '@/lib/enquiries'
import {
  EVENT_POINTS,
  addReminder,
  completeReminder,
  countToday,
  getCurrentProfile,
  listReminders,
  pointsToday,
  recordEvent,
} from '@/lib/staff'
import type { ShiftReminder } from '@/lib/staff'

type Tab = 'open' | 'done' | 'all'

const TABS: { key: Tab; label: string }[] = [
  { key: 'open', label: 'Open' },
  { key: 'done', label: 'Done' },
  { key: 'all', label: 'All' },
]

const DUE_OPTIONS = ['10:00', '12:00', '14:00', '15:00', '16:00', '18:00', 'Overdue']

function duePillCls(due: string) {
  return due === 'Overdue' ? 'border-[#ff6b6b] text-[#ff6b6b]' : 'border-gold text-gold'
}

export default function FrontDeskFollowUps() {
  const profile = getCurrentProfile()
  const [tab, setTab] = useState<Tab>('open')
  const [reminders, setReminders] = useState<ShiftReminder[]>(() => listReminders())
  const [enquiries, setEnquiries] = useState(() => listEnquiries())
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('14:00')
  const [tick, setTick] = useState(0)

  const refresh = () => {
    setReminders(listReminders())
    setEnquiries(listEnquiries())
    setTick((t) => t + 1)
  }

  const visibleReminders = useMemo(() => {
    if (tab === 'open') return reminders.filter((r) => !r.done)
    if (tab === 'done') return reminders.filter((r) => r.done)
    return reminders
  }, [reminders, tab])

  const newEnquiries = useMemo(() => enquiries.filter((e) => e.status === 'new'), [enquiries])

  const followupsDone = useMemo(
    () => countToday(profile?.id ?? '', 'followup'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, profile?.id],
  )
  const pts = useMemo(
    () => pointsToday(profile?.id ?? ''),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, profile?.id],
  )

  if (!profile) return null

  const doneReminder = (r: ShiftReminder) => {
    completeReminder(r.id)
    recordEvent(profile.id, 'followup', `Follow-up done — ${r.title}`)
    refresh()
  }

  const contactEnquiry = (id: string, name: string) => {
    markContacted(id)
    recordEvent(profile.id, 'followup', `Follow-up done — enquiry: ${name}`)
    refresh()
  }

  const submitReminder = (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    addReminder(title, due)
    setTitle('')
    setTab('open')
    refresh()
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Front desk · Follow-ups</p>
        <h2 className="mt-1 text-2xl font-bold text-white md:text-3xl">Follow-ups</h2>
        <p className="mt-1 text-[13px] text-vault-muted">
          Reminders and new enquiries in one queue — completing one logs +{EVENT_POINTS.followup} pts
          under <b className="text-white">{profile.staffNo}</b>.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          {/* Shift reminders */}
          <section className="app-card p-5 md:p-6" aria-label="Follow-up reminders">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-[15px] font-bold">Reminders</h3>
              <div className="flex gap-1 border-b border-vault-border" role="tablist" aria-label="Reminder filter">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    role="tab"
                    aria-selected={tab === t.key}
                    onClick={() => setTab(t.key)}
                    className={`px-3 py-1.5 text-[12px] transition-colors ${
                      tab === t.key
                        ? 'border-b-2 border-gold font-semibold text-white'
                        : 'border-b-2 border-transparent text-vault-muted hover:text-white'
                    }`}
                  >
                    {t.label}{' '}
                    <span className="tnum text-vault-faint">
                      {t.key === 'open' ? reminders.filter((r) => !r.done).length : t.key === 'done' ? reminders.filter((r) => r.done).length : reminders.length}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <ul>
              {visibleReminders.map((r) => (
                <li
                  key={r.id}
                  className={`flex flex-wrap items-center gap-3 border-b border-vault-border/60 py-3 text-[13px] last:border-0 ${
                    r.done ? 'opacity-40' : ''
                  }`}
                >
                  <span className={`border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em] ${duePillCls(r.due)}`}>
                    {r.due}
                  </span>
                  <span className={`min-w-0 flex-1 ${r.done ? 'line-through' : 'text-white/90'}`}>{r.title}</span>
                  {!r.done && (
                    <button
                      type="button"
                      onClick={() => doneReminder(r)}
                      className="border border-vault-border px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] text-vault-muted transition-colors hover:border-white hover:text-white"
                    >
                      Done +{EVENT_POINTS.followup} pts
                    </button>
                  )}
                  {r.done && (
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.1em] text-[#7ec98f]">
                      <Check className="h-3 w-3" /> Done
                    </span>
                  )}
                </li>
              ))}
              {visibleReminders.length === 0 && (
                <li className="py-6 text-center text-[13px] text-vault-faint">Nothing here — queue is clear.</li>
              )}
            </ul>
            <form onSubmit={submitReminder} className="mt-4 flex flex-wrap items-end gap-3 border-t border-vault-border pt-4">
              <label className="min-w-[220px] flex-1">
                <span className="mb-1.5 block text-[10px] uppercase tracking-[0.14em] text-vault-muted">New reminder</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Call back…"
                  className="w-full border border-vault-border bg-vault-bg px-3 py-2.5 text-[14px] text-white placeholder:text-vault-faint focus:border-gold focus:outline-none"
                />
              </label>
              <label className="w-[130px]">
                <span className="mb-1.5 block text-[10px] uppercase tracking-[0.14em] text-vault-muted">Due</span>
                <select
                  value={due}
                  onChange={(e) => setDue(e.target.value)}
                  className="w-full appearance-none border border-vault-border bg-vault-bg px-3 py-2.5 text-[14px] text-white focus:border-gold focus:outline-none"
                >
                  {DUE_OPTIONS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className="inline-flex items-center gap-2 bg-white px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-vault-btn-text transition-opacity hover:opacity-85"
              >
                <BellPlus className="h-3.5 w-3.5" /> Add
              </button>
            </form>
          </section>

          {/* Enquiry follow-ups */}
          <section className="app-card p-5 md:p-6" aria-label="Enquiry follow-ups">
            <h3 className="mb-3 flex items-baseline justify-between text-[15px] font-bold">
              Enquiry follow-ups{' '}
              <span className="tnum text-[11px] font-normal text-vault-faint">{newEnquiries.length} awaiting contact</span>
            </h3>
            <ul>
              {newEnquiries.map((e) => {
                const name = String(e.payload.name ?? 'Member enquiry')
                const mobile = String(e.payload.mobile ?? '')
                return (
                  <li key={e.id} className="flex flex-wrap items-center gap-3 border-b border-vault-border/60 py-3 text-[13px] last:border-0">
                    <span className={`border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em] ${e.route === 'reception' ? 'border-white/30 text-white/70' : 'border-gold/50 text-gold'}`}>
                      {e.route === 'reception' ? 'Pass · reception' : 'Membership · senior'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="text-white/90">{name}</span>
                      <span className="text-vault-muted"> — {e.planLabel}</span>
                      {mobile && <span className="tnum text-[11px] text-vault-faint"> · {mobile}</span>}
                    </span>
                    <span className="tnum text-[11px] text-vault-faint">
                      {new Date(e.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                    <button
                      type="button"
                      onClick={() => contactEnquiry(e.id, name)}
                      className="inline-flex items-center gap-1.5 border border-vault-border px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] text-vault-muted transition-colors hover:border-white hover:text-white"
                    >
                      <Phone className="h-3 w-3" /> Mark contacted
                    </button>
                  </li>
                )
              })}
              {newEnquiries.length === 0 && (
                <li className="py-6 text-center text-[13px] text-vault-faint">
                  No new enquiries — the CRM queue is clear.
                </li>
              )}
            </ul>
          </section>
        </div>

        {/* Summary rail */}
        <div className="space-y-6">
          <section className="app-card p-5" aria-label="Today summary">
            <h3 className="mb-3 text-[15px] font-bold">Today</h3>
            <ul className="space-y-3 text-[13px]">
              <li className="flex items-baseline justify-between">
                <span className="text-vault-muted">Follow-ups done</span>
                <b className="tnum text-white">{followupsDone}</b>
              </li>
              <li className="flex items-baseline justify-between">
                <span className="text-vault-muted">Points earned today</span>
                <b className="tnum text-gold">+{pts}</b>
              </li>
              <li className="flex items-baseline justify-between">
                <span className="text-vault-muted">Open reminders</span>
                <b className="tnum text-white">{reminders.filter((r) => !r.done).length}</b>
              </li>
              <li className="flex items-baseline justify-between">
                <span className="text-vault-muted">Enquiries awaiting contact</span>
                <b className="tnum text-white">{newEnquiries.length}</b>
              </li>
            </ul>
            <p className="mt-4 border-t border-vault-border pt-3 text-[11px] text-vault-faint">
              Points feed the weekly leaderboard on My shift — sign-ups and trials are worth the most
              at {EVENT_POINTS.signup} pts each.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
