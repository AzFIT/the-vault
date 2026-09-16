/**
 * Centered popups for the coach KPI cards — the client database modals
 * (add / view all / status) and the privacy PIN prompt. All shells share
 * backdrop + ESC close; content is scrollable on small screens.
 */
import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import type { Client, ClientTier } from '@/data/mock'
import { GridAvatar, StatusPill, TierPill } from './shared'
import { isAtRisk } from './utils'

export function ModalShell({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean
  onClose: () => void
  label: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={label}
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="max-h-[85vh] w-full max-w-md overflow-y-auto border border-vault-border bg-vault-surface p-6 shadow-2xl shadow-black/60"
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ---------------------------------------------------------------------------
// PIN prompt — first use sets the trainer's PIN (stored locally), after that
// the same PIN is required to reveal a blurred card.
// ---------------------------------------------------------------------------

export function PinModal({
  open,
  hasPin,
  onClose,
  onSuccess,
}: {
  open: boolean
  /** true = PIN already set, prompt to enter; false = create a new PIN */
  hasPin: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  // Remount on every open so the form state starts fresh.
  if (!open) return null
  return <PinModalInner open={open} hasPin={hasPin} onClose={onClose} onSuccess={onSuccess} />
}

function PinModalInner({
  open,
  hasPin,
  onClose,
  onSuccess,
}: {
  open: boolean
  hasPin: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)

  const valid = (p: string) => /^\d{4,6}$/.test(p)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!valid(pin)) {
      setError('PIN must be 4–6 digits.')
      return
    }
    if (!hasPin) {
      if (confirm === '') {
        setConfirm(pin)
        setPin('')
        return
      }
      if (pin !== confirm) {
        setError('PINs do not match — start again.')
        setConfirm('')
        setPin('')
        return
      }
      localStorage.setItem('vault-coach-pin', confirm)
      onSuccess()
      return
    }
    if (pin === localStorage.getItem('vault-coach-pin')) {
      onSuccess()
    } else {
      setError('Wrong PIN — try again.')
      setPin('')
    }
  }

  return (
    <ModalShell open={open} onClose={onClose} label="Privacy PIN">
      <div className="flex items-start justify-between">
        <div>
          <p className="eyebrow">Privacy</p>
          <h3 className="mt-1 text-xl font-bold text-white">
            {!hasPin ? 'Set a privacy PIN' : confirm !== '' ? 'Confirm your PIN' : 'Enter PIN to reveal'}
          </h3>
        </div>
        <button type="button" aria-label="Close" onClick={onClose} className="p-1 text-vault-faint hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-2 text-[13px] text-vault-muted">
        {!hasPin
          ? 'This PIN protects sensitive figures (sessions, revenue) when the dashboard is visible to others. 4–6 digits.'
          : 'This value is hidden for privacy. Enter the PIN the trainer set to show it.'}
      </p>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <input
          autoFocus
          type="password"
          inputMode="numeric"
          autoComplete="off"
          value={pin}
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, '').slice(0, 6))
            setError(null)
          }}
          placeholder={confirm !== '' ? 'Repeat the same PIN' : 'PIN'}
          className="w-full border border-vault-border bg-vault-bg px-3 py-2.5 text-center text-[18px] tracking-[0.5em] text-white placeholder:text-vault-faint focus:border-vault-surface-3 focus:outline-none"
        />
        {error && <p className="text-[12px] text-vault-muted">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" className="flex-1 bg-white px-4 py-2 text-[12px] font-bold uppercase tracking-[0.12em] text-vault-btn-text">
            {hasPin ? 'Reveal' : confirm === '' ? 'Continue' : 'Save PIN'}
          </button>
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
        </div>
      </form>
    </ModalShell>
  )
}

// ---------------------------------------------------------------------------
// Client database modals — add / view all / status
// ---------------------------------------------------------------------------

const TIERS: ClientTier[] = ['PT 3x/wk', 'PT 2x/wk', "Women's Programme", 'Open Gym']

export function ClientModal({
  open,
  mode,
  clients,
  onClose,
  onAdd,
}: {
  open: boolean
  mode: 'add' | 'list' | 'status'
  clients: Client[]
  onClose: () => void
  onAdd: (c: Client) => void
}) {
  // Remount on every open so the form state starts fresh.
  if (!open) return null
  return <ClientModalInner open={open} mode={mode} clients={clients} onClose={onClose} onAdd={onAdd} />
}

function ClientModalInner({
  open,
  mode,
  clients,
  onClose,
  onAdd,
}: {
  open: boolean
  mode: 'add' | 'list' | 'status'
  clients: Client[]
  onClose: () => void
  onAdd: (c: Client) => void
}) {
  const [name, setName] = useState('')
  const [tier, setTier] = useState<ClientTier>('PT 3x/wk')
  const [goal, setGoal] = useState('')

  const atRisk = clients.filter(isAtRisk)
  const onTrack = clients.filter((c) => !isAtRisk(c))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onAdd({
      id: `added-${Date.now()}`,
      name: name.trim(),
      age: 30,
      goal: goal.trim() || 'General fitness',
      tier,
      adherence: 85,
      coachId: 'dan-kan',
      programId: '',
      memberSince: new Date().toISOString().slice(0, 10),
      trend: 'flat',
    })
  }

  const listRow = (c: Client) => (
    <li key={c.id} className="flex items-center gap-3 border-b border-vault-border/60 px-2 py-2.5 last:border-0">
      <GridAvatar name={c.name} size={30} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-white">{c.name}</span>
        <span className="mt-0.5 block truncate text-[11px] text-vault-faint">{c.goal}</span>
      </span>
      <span className="tnum text-[12px] text-vault-muted">{c.adherence}%</span>
      <TierPill tier={c.tier} />
      <StatusPill atRisk={isAtRisk(c)} />
    </li>
  )

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      label={mode === 'add' ? 'Add new client' : mode === 'list' ? 'All clients' : 'Client status'}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="eyebrow">Clients database</p>
          <h3 className="mt-1 text-xl font-bold text-white">
            {mode === 'add' ? 'Add new client' : mode === 'list' ? `All clients · ${clients.length}` : 'Client status'}
          </h3>
        </div>
        <button type="button" aria-label="Close" onClick={onClose} className="p-1 text-vault-faint hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      {mode === 'add' && (
        <form onSubmit={submit} className="mt-4 space-y-3">
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.14em] text-vault-muted">Full name</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Wong"
              className="mt-1 w-full border border-vault-border bg-vault-bg px-3 py-2 text-[13px] text-white placeholder:text-vault-faint focus:border-vault-surface-3 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.14em] text-vault-muted">Membership tier</span>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value as ClientTier)}
              className="mt-1 w-full border border-vault-border bg-vault-bg px-3 py-2 text-[13px] text-white focus:border-vault-surface-3 focus:outline-none"
            >
              {TIERS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.14em] text-vault-muted">Goal</span>
            <input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. Hyrox in November"
              className="mt-1 w-full border border-vault-border bg-vault-bg px-3 py-2 text-[13px] text-white placeholder:text-vault-faint focus:border-vault-surface-3 focus:outline-none"
            />
          </label>
          <div className="flex gap-2 pt-1">
            <button type="submit" className="flex-1 bg-white px-4 py-2 text-[12px] font-bold uppercase tracking-[0.12em] text-vault-btn-text">
              Add client
            </button>
            <button type="button" onClick={onClose} className="btn-ghost">
              Cancel
            </button>
          </div>
        </form>
      )}

      {mode === 'list' && <ul className="mt-4 -mx-2 max-h-[55vh] overflow-y-auto">{clients.map(listRow)}</ul>}

      {mode === 'status' && (
        <div className="mt-4 space-y-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-vault-muted">
              On track · {onTrack.length}
            </p>
            <ul className="mt-1.5 -mx-2 max-h-[28vh] overflow-y-auto">{onTrack.map(listRow)}</ul>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-vault-muted">
              At risk · {atRisk.length}
            </p>
            <ul className="mt-1.5 -mx-2 max-h-[28vh] overflow-y-auto">
              {atRisk.length > 0 ? atRisk.map(listRow) : <li className="px-2 py-2 text-[13px] text-vault-faint">None — everyone is on track.</li>}
            </ul>
          </div>
        </div>
      )}
    </ModalShell>
  )
}
