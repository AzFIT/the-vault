import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Copy, Download, Inbox, MessageCircle, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  ENQUIRIES_CHANGED_EVENT,
  exportCsv,
  listEnquiries,
  markContacted,
} from '@/lib/enquiries'
import type { Enquiry, EnquiryRoute } from '@/lib/enquiries'

type Filter = 'all' | EnquiryRoute | 'new'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'reception', label: 'Reception' },
  { key: 'senior', label: 'Senior' },
  { key: 'new', label: 'New only' },
]

function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return d === 1 ? '1 day ago' : `${d} days ago`
}

const CONTACT_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  call: 'Phone call',
  email: 'Email',
}

/** Prettify a form payload into labelled rows, skipping internal keys. */
function payloadRows(e: Enquiry): { label: string; value: string }[] {
  const LABELS: Record<string, string> = {
    name: 'Name',
    mobile: 'Mobile / WhatsApp',
    email: 'Email',
    preferredContact: 'Preferred contact',
    bestTime: 'Best time to reach',
    startDate: 'Preferred start date',
    trainedBefore: 'Trained at The Vault before',
    notes: 'Notes',
    trainingExperience: 'Training experience',
    goals: 'Main goals',
    personalTrainingInterest: 'PT interest',
    tourOrTrial: 'Tour or trial',
    preferredTrainingTimes: 'Preferred training times',
    injuries: 'Injuries / health',
    referredBy: 'Referred by',
    questions: 'Questions',
  }
  const rows: { label: string; value: string }[] = []
  for (const [k, v] of Object.entries(e.payload)) {
    if (k === 'form' || k === 'planId') continue
    if (v === null || v === undefined || v === '') continue
    if (Array.isArray(v) && v.length === 0) continue
    const label = LABELS[k] ?? k
    let value: string
    if (Array.isArray(v)) value = v.join(', ')
    else if (k === 'preferredContact') value = CONTACT_LABELS[String(v)] ?? String(v)
    else if (typeof v === 'string' && (v === 'yes' || v === 'no')) value = v === 'yes' ? 'Yes' : 'No'
    else value = String(v)
    rows.push({ label, value })
  }
  return rows
}

function RoutePill({ route }: { route: EnquiryRoute }) {
  return (
    <span className="border border-gold/60 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-gold">
      {route === 'reception' ? 'Reception' : 'Senior Team'}
    </span>
  )
}

export default function Enquiries() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>(() => listEnquiries())
  const [filter, setFilter] = useState<Filter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Refresh when a submission lands (custom event from lib/enquiries) or
  // another tab writes to storage.
  useEffect(() => {
    const refresh = () => setEnquiries(listEnquiries())
    window.addEventListener(ENQUIRIES_CHANGED_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(ENQUIRIES_CHANGED_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  // The open enquiry is derived from the store, so "Mark as contacted"
  // updates the drawer in place.
  const selected = selectedId ? (enquiries.find((e) => e.id === selectedId) ?? null) : null

  // ESC closes the detail drawer
  useEffect(() => {
    if (!selected) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedId(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [selected])

  const filtered = useMemo(() => {
    const sorted = [...enquiries].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    if (filter === 'all') return sorted
    if (filter === 'new') return sorted.filter((e) => e.status === 'new')
    return sorted.filter((e) => e.route === filter)
  }, [enquiries, filter])

  const newCount = enquiries.filter((e) => e.status === 'new').length

  const copyDetails = (e: Enquiry) => {
    const text = [
      `${e.planLabel} enquiry — ${e.payload.name ?? ''}`,
      ...payloadRows(e).map((r) => `${r.label}: ${r.value}`),
    ].join('\n')
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1600)
      })
      .catch(() => toast.error('Copy failed — select the text manually'))
  }

  const whatsappHref = (e: Enquiry) => {
    const digits = String(e.payload.mobile ?? '').replace(/\D/g, '')
    return digits ? `https://wa.me/${digits}` : null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Enquiries</h2>
          <p className="mt-1 text-[13px] text-vault-muted">
            {enquiries.length} total · <span className="text-gold">{newCount} new</span>
          </p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={enquiries.length === 0}
          className="inline-flex items-center gap-2 border border-vault-border px-3 py-2 text-[11px] uppercase tracking-[0.1em] text-vault-muted transition-colors hover:border-white/40 hover:text-white disabled:opacity-40"
        >
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            aria-pressed={filter === f.key}
            className={`border px-3.5 py-2 text-[11px] uppercase tracking-[0.12em] transition-colors ${
              filter === f.key
                ? 'border-gold bg-gold/10 text-gold'
                : 'border-vault-border text-vault-muted hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="app-card relative flex flex-col items-center justify-center overflow-hidden px-6 py-20 text-center">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center justify-center font-serif text-[220px] leading-none text-gold/[0.05]"
          >
            V
          </span>
          <Inbox className="relative h-8 w-8 text-vault-faint" strokeWidth={1.5} />
          <p className="relative mt-4 max-w-xs text-[14px] leading-relaxed text-vault-muted">
            No enquiries yet — submissions from the membership forms will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((e, i) => (
            <motion.button
              key={e.id}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.3) }}
              onClick={() => setSelectedId(e.id)}
              className="app-card flex w-full flex-wrap items-center gap-x-4 gap-y-2 p-4 text-left transition-colors hover:border-white/25"
            >
              {e.status === 'new' && (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold" aria-label="New" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium text-white">
                  {String(e.payload.name ?? 'Unknown')}
                </p>
                <p className="mt-0.5 truncate text-[12px] text-vault-muted">{e.planLabel}</p>
              </div>
              <RoutePill route={e.route} />
              <span className="text-[12px] text-vault-muted">
                {CONTACT_LABELS[String(e.payload.preferredContact)] ?? '—'}
              </span>
              <span className="tnum text-[12px] text-vault-faint">{timeAgo(e.createdAt)}</span>
            </motion.button>
          ))}
        </div>
      )}

      {/* Detail drawer */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[70] bg-black/60"
              onClick={() => setSelectedId(null)}
            />
            <motion.aside
              initial={{ x: 440 }}
              animate={{ x: 0 }}
              exit={{ x: 440 }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              className="fixed inset-y-0 right-0 z-[71] flex w-[min(440px,100vw)] flex-col border-l border-vault-border bg-vault-surface"
              role="dialog"
              aria-modal="true"
              aria-label={`Enquiry from ${String(selected.payload.name ?? 'unknown')}`}
            >
              <div className="flex items-start justify-between border-b border-vault-border p-6">
                <div>
                  <p className="eyebrow">Enquiry · {timeAgo(selected.createdAt)}</p>
                  <h3 className="mt-1 text-xl font-bold text-white">
                    {String(selected.payload.name ?? 'Unknown')}
                  </h3>
                  <div className="mt-2 flex items-center gap-2">
                    <RoutePill route={selected.route} />
                    {selected.status === 'contacted' && (
                      <span className="text-[11px] uppercase tracking-[0.12em] text-vault-faint">
                        Contacted
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedId(null)}
                  aria-label="Close enquiry"
                  className="p-1 text-vault-muted transition-colors hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <p className="text-[15px] font-medium text-gold">{selected.planLabel}</p>
                <dl className="mt-5 space-y-3.5">
                  {payloadRows(selected).map((r) => (
                    <div key={r.label} className="border-b border-vault-border/60 pb-3 last:border-0">
                      <dt className="text-[11px] uppercase tracking-[0.14em] text-vault-muted">
                        {r.label}
                      </dt>
                      <dd className="mt-1 whitespace-pre-wrap text-[14px] text-white">{r.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="space-y-3 border-t border-vault-border p-6">
                <div className="grid grid-cols-2 gap-3">
                  {whatsappHref(selected) ? (
                    <a
                      href={whatsappHref(selected)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-gold inline-flex items-center justify-center gap-2 text-[12px]"
                    >
                      <MessageCircle className="h-4 w-4" /> WhatsApp
                    </a>
                  ) : (
                    <span className="btn-gold pointer-events-none inline-flex items-center justify-center gap-2 text-[12px] opacity-40">
                      <MessageCircle className="h-4 w-4" /> WhatsApp
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => copyDetails(selected)}
                    className="inline-flex items-center justify-center gap-2 border border-vault-border px-4 py-3 text-[12px] uppercase tracking-[0.08em] text-white transition-colors hover:border-white/40"
                  >
                    {copied ? <Check className="h-4 w-4 text-gold" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copied' : 'Copy details'}
                  </button>
                </div>
                {selected.status === 'new' && (
                  <button
                    type="button"
                    onClick={() => markContacted(selected.id)}
                    className="w-full border border-gold/60 px-4 py-3 text-[12px] uppercase tracking-[0.08em] text-gold transition-colors hover:bg-gold/10"
                  >
                    Mark as contacted
                  </button>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
