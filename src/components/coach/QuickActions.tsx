import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { CopyPlus, Download, Mail, UserPlus, X } from 'lucide-react'
import { toast } from 'sonner'
import { programs, coachClients } from '@/data/mock'
import type { ClientTier } from '@/data/mock'
import { isAtRisk } from './utils'

const TIERS: ClientTier[] = ['PT 3x/wk', 'PT 2x/wk', "Women's Programme", 'Open Gym']

function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  // ESC closes the modal
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/60"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed left-1/2 top-1/2 z-[81] w-[calc(100%-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 border border-vault-border bg-vault-surface p-6"
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">{title}</h3>
              <button
                onClick={onClose}
                aria-label="Close"
                className="text-vault-muted transition-colors hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

const inputCls =
  'w-full border border-vault-border bg-vault-bg px-3 py-2.5 text-[13px] text-white placeholder:text-vault-faint focus:border-vault-surface-3 focus:outline-none'

export default function QuickActions({ onNewProgram }: { onNewProgram: () => void }) {
  const navigate = useNavigate()
  const [clientOpen, setClientOpen] = useState(false)
  const [broadcastOpen, setBroadcastOpen] = useState(false)

  // New client form
  const [name, setName] = useState('')
  const [tier, setTier] = useState<ClientTier>('PT 2x/wk')
  const [programId, setProgramId] = useState(programs[0].id)

  // Broadcast form
  const [groups, setGroups] = useState<string[]>(['ALL'])
  const [message, setMessage] = useState('')

  const toggleGroup = (g: string) =>
    setGroups((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev.filter((x) => x !== 'ALL'), g],
    )

  const broadcastCount = () => {
    if (groups.includes('ALL')) return coachClients.length
    return coachClients.filter((c) => {
      if (groups.includes('AT RISK') && isAtRisk(c)) return true
      if (groups.includes('PT 3X') && c.tier === 'PT 3x/wk') return true
      if (groups.includes('PT 2X') && c.tier === 'PT 2x/wk') return true
      if (groups.includes("WOMEN'S") && c.tier === "Women's Programme") return true
      return false
    }).length
  }

  const tiles = [
    {
      icon: UserPlus,
      label: 'New Client',
      action: () => setClientOpen(true),
    },
    { icon: CopyPlus, label: 'New Program', action: onNewProgram },
    {
      icon: Mail,
      label: 'Broadcast Message',
      action: () => setBroadcastOpen(true),
    },
    {
      icon: Download,
      label: 'Export Report',
      action: () => navigate('/plan-summary'),
    },
  ]

  return (
    <section>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t, i) => (
          <motion.button
            key={t.label}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
            onClick={t.action}
            className="flex items-center justify-center gap-2.5 border border-vault-border px-4 py-5 text-[12px] uppercase tracking-[0.1em] text-vault-muted transition-all hover:-translate-y-[3px] hover:border-white/40 hover:text-white"
          >
            <t.icon className="h-4 w-4" strokeWidth={1.5} />
            {t.label}
          </motion.button>
        ))}
      </div>

      {/* New client modal */}
      <Modal open={clientOpen} onClose={() => setClientOpen(false)} title="Onboard new client">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!name.trim()) return
            toast.success(`${name.trim()} added — onboarding pack sent`)
            setClientOpen(false)
            setName('')
          }}
        >
          <div>
            <label className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-vault-muted">
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Client name"
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-vault-muted">
              Tier
            </label>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value as ClientTier)}
              className={inputCls}
            >
              {TIERS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-vault-muted">
              Program
            </label>
            <select
              value={programId}
              onChange={(e) => setProgramId(e.target.value)}
              className={inputCls}
            >
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="w-full bg-white px-4 py-3 text-[12px] uppercase tracking-[0.08em] text-vault-btn-text transition-colors hover:bg-vault-btn-hover"
          >
            Add client
          </button>
        </form>
      </Modal>

      {/* Broadcast modal */}
      <Modal open={broadcastOpen} onClose={() => setBroadcastOpen(false)} title="Broadcast message">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!message.trim()) return
            toast.success(`Broadcast sent to ${broadcastCount()} client${broadcastCount() === 1 ? '' : 's'}`)
            setBroadcastOpen(false)
            setMessage('')
          }}
        >
          <div>
            <label className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-vault-muted">
              Audience
            </label>
            <div className="flex flex-wrap gap-2">
              {['ALL', 'PT 3X', 'PT 2X', "WOMEN'S", 'AT RISK'].map((g) => {
                const active = groups.includes(g)
                return (
                  <button
                    type="button"
                    key={g}
                    onClick={() =>
                      g === 'ALL' ? setGroups(['ALL']) : toggleGroup(g)
                    }
                    className={`border px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] transition-colors ${
                      active
                        ? 'border-white bg-white text-vault-btn-text'
                        : 'border-vault-border text-vault-muted hover:text-white'
                    }`}
                  >
                    {g}
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-vault-muted">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Write your broadcast…"
              className={`${inputCls} resize-none`}
            />
          </div>
          <button
            type="submit"
            className="w-full bg-white px-4 py-3 text-[12px] uppercase tracking-[0.08em] text-vault-btn-text transition-colors hover:bg-vault-btn-hover"
          >
            Send to {broadcastCount()} client{broadcastCount() === 1 ? '' : 's'}
          </button>
        </form>
      </Modal>
    </section>
  )
}
