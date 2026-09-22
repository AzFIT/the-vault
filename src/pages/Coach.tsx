import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, X } from 'lucide-react'
import type { Client } from '@/data/mock'
import { coachClients, getCoachById } from '@/data/mock'
import { isAtRisk } from '@/components/coach/utils'
import KpiRow from '@/components/coach/KpiRow'
import ClientRoster from '@/components/coach/ClientRoster'
import type { RosterFilter } from '@/components/coach/ClientRoster'
import ClientDrawer from '@/components/coach/ClientDrawer'
import ScheduleRail from '@/components/coach/ScheduleRail'
import ProgramBuilder from '@/components/coach/ProgramBuilder'
import MessagingPanel from '@/components/coach/MessagingPanel'
import RevenueAnalytics from '@/components/coach/RevenueAnalytics'
import QuickActions from '@/components/coach/QuickActions'

const scrollToId = (id: string) =>
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

export default function Coach() {
  const dan = getCoachById('dan-kan')
  const atRisk = coachClients.filter(isAtRisk)

  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [filter, setFilter] = useState<RosterFilter>('ALL')
  const [drawerClient, setDrawerClient] = useState<Client | null>(null)
  const [range, setRange] = useState<'4W' | '12W' | '6M'>('4W')

  /** Shared mock store: builder assignments update roster program cells */
  const [programOverrides, setProgramOverrides] = useState<Record<string, string>>({})

  /** Cross-panel jumps */
  const [requestedThread, setRequestedThread] = useState<{
    id: string
    nonce: number
  } | null>(null)
  const [builderFocus, setBuilderFocus] = useState<{
    programId: string | null
    nonce: number
  }>({ programId: null, nonce: 0 })

  const assignProgram = (clientId: string, programId: string | null) =>
    setProgramOverrides((prev) => {
      const next = { ...prev }
      if (programId === null) delete next[clientId]
      else next[clientId] = programId
      return next
    })

  const openThread = (c: Client) => {
    setRequestedThread({ id: c.id, nonce: Date.now() })
    setDrawerClient(null)
    scrollToId('coach-messaging')
  }

  const editProgram = (c: Client) => {
    setBuilderFocus({
      programId: programOverrides[c.id] ?? c.programId,
      nonce: Date.now(),
    })
    setDrawerClient(null)
    scrollToId('coach-builder')
  }

  return (
    <div className="space-y-6 md:space-y-8">

      {/* Greeting row */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            aria-label="Dan Kan"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gold/50 bg-gold/10"
          >
            <span className="font-serif text-lg text-gold">DK</span>
          </div>
          <div>
            <p className="section-head">Trainer portal</p>
            <h2
              className="h-display mt-2 text-2xl md:text-3xl"
              style={{ color: 'var(--gold)' }}
            >
              Good morning, Dan
            </h2>
            <p className="mt-1 text-[13px] text-vault-muted">
              {dan?.role} · Sheung Wan
            </p>
          </div>
        </div>
        <div className="flex border border-vault-border">
          {(['4W', '12W', '6M'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`tnum px-3.5 py-1.5 text-[11px] uppercase tracking-[0.12em] transition-colors ${
                range === r
                  ? 'bg-white text-vault-btn-text'
                  : 'text-vault-muted hover:text-white'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* At-risk banner */}
      <AnimatePresence>
        {!bannerDismissed && atRisk.length > 0 && (
          <motion.button
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            onClick={() => {
              setFilter('AT RISK')
              scrollToId('coach-roster')
            }}
            className="flex w-full items-center justify-between gap-3 border border-dashed border-[#7a2e2e] bg-[#7a2e2e]/[0.06] px-5 py-3.5 text-left transition-colors hover:bg-vault-surface-2"
          >
            <span className="text-[13px] text-white">
              <span className="tnum font-bold">{atRisk.length}</span> client
              {atRisk.length === 1 ? '' : 's'} need
              {atRisk.length === 1 ? 's' : ''} attention this week —{' '}
              <span className="text-vault-muted">
                {atRisk.map((c) => c.name.split(' ')[0]).join(', ')}
              </span>
            </span>
            <span className="flex items-center gap-3">
              <span className="hidden items-center gap-1 text-[11px] uppercase tracking-[0.1em] text-vault-muted sm:flex">
                Filter roster <ArrowRight className="h-3.5 w-3.5" />
              </span>
              <span
                role="button"
                aria-label="Dismiss"
                onClick={(e) => {
                  e.stopPropagation()
                  setBannerDismissed(true)
                }}
                className="p-1 text-vault-faint transition-colors hover:text-white"
              >
                <X className="h-4 w-4" />
              </span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Section 1 — KPIs */}
      <KpiRow />

      {/* Sections 2 + 3 — roster + schedule rail */}
      <div className="grid gap-6 xl:grid-cols-3">
        <div id="coach-roster" className="scroll-mt-24 xl:col-span-2">
          <ClientRoster
            programOverrides={programOverrides}
            filter={filter}
            onFilterChange={setFilter}
            onSelect={setDrawerClient}
          />
        </div>
        <ScheduleRail />
      </div>

      {/* Section 4 — program builder */}
      <div id="coach-builder" className="scroll-mt-24">
        <ProgramBuilder
          overrides={programOverrides}
          onAssign={assignProgram}
          focusProgramId={builderFocus.programId}
          focusNonce={builderFocus.nonce}
        />
      </div>

      {/* Section 5 — messaging */}
      <div id="coach-messaging" className="scroll-mt-24">
        <MessagingPanel requestedThread={requestedThread} />
      </div>

      {/* Section 6 — revenue analytics */}
      <div id="coach-revenue" className="scroll-mt-24">
        <RevenueAnalytics />
      </div>

      {/* Section 7 — quick actions */}
      <QuickActions onNewProgram={() => scrollToId('coach-builder')} />

      {/* Client detail drawer */}
      <ClientDrawer
        client={drawerClient}
        programId={drawerClient ? programOverrides[drawerClient.id] : undefined}
        onClose={() => setDrawerClient(null)}
        onMessage={openThread}
        onEditProgram={editProgram}
      />
    </div>
  )
}
