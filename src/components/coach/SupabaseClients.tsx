import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity as ActivityIcon,
  CalendarDays,
  CheckCircle2,
  Dumbbell,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import {
  loadClientDetail,
  loadClientsFromSupabase,
} from '@/lib/programSave'
import type {
  ClientDetailResult,
  ClientProgramSummary,
  ClientSummary,
} from '@/lib/programSave'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Notation rides in exercise notes as `{"notation":"A1"}` JSON — same convention as the builder. */
const notationOf = (notes: string | null): string | null => {
  if (!notes) return null
  try {
    const parsed = JSON.parse(notes) as { notation?: unknown }
    return typeof parsed.notation === 'string' && parsed.notation ? parsed.notation : null
  } catch {
    return null
  }
}

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

/* ---- client dashboard drawer ------------------------------------------------ */

function DashboardDrawer({
  result,
  loading,
  error,
  onClose,
}: {
  result: ClientDetailResult | null
  loading: boolean
  error: string | null
  onClose: () => void
}) {
  const c = result?.client
  return (
    <AnimatePresence>
      {(result || loading || error) && (
        <>
          <motion.button
            aria-label="Close client dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 cursor-default bg-black/60 backdrop-blur-[2px]"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-vault-border bg-vault-bg"
          >
            <div className="flex items-center justify-between border-b border-vault-border px-5 py-3.5">
              <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-vault-muted">
                <UserRound className="h-3.5 w-3.5 text-vault-gold" />
                Client dashboard · Supabase
              </p>
              <button onClick={onClose} aria-label="Close" className="p-1 text-vault-faint transition-colors hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {loading && (
                <div className="flex items-center gap-2 py-10 text-[12px] text-vault-muted">
                  <Loader2 className="h-4 w-4 animate-spin text-vault-gold" /> Loading client data…
                </div>
              )}
              {error && !loading && <p className="py-6 text-[12px] text-red-300">Load failed: {error}</p>}

              {c && result && (
                <div className="space-y-5">
                  {/* identity */}
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gold/50 bg-gold/10 font-serif text-gold">
                      {initialsOf(c.full_name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[16px] font-medium text-white">{c.full_name}</p>
                      <p className="flex items-center gap-1.5 truncate text-[11px] text-vault-muted">
                        <Mail className="h-3 w-3 shrink-0" /> {c.email ?? 'no email on file'}
                      </p>
                    </div>
                    <span
                      className={`ml-auto shrink-0 border px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] ${
                        c.status === 'active'
                          ? 'border-emerald-500/40 text-emerald-300'
                          : 'border-vault-border text-vault-muted'
                      }`}
                    >
                      {c.status ?? 'unknown'}
                    </span>
                  </div>

                  {/* stats */}
                  <div className="grid grid-cols-2 gap-px border border-vault-border bg-vault-border sm:grid-cols-3">
                    {[
                      ['Goal', c.fitness_goal ?? '—'],
                      ['Experience', c.experience_level ?? '—'],
                      ['Gender', c.gender ?? '—'],
                      ['Date of birth', fmtDate(c.date_of_birth)],
                      ['Height', c.height_cm ? `${c.height_cm} cm` : '—'],
                      ['Weight', c.weight_kg ? `${c.weight_kg} kg` : '—'],
                      ['Body fat', c.body_fat_percentage != null ? `${c.body_fat_percentage}%` : '—'],
                      ['Phone', c.phone ?? '—'],
                      ['Client since', fmtDate(c.created_at)],
                    ].map(([k, v]) => (
                      <div key={k} className="bg-vault-bg px-3 py-2.5">
                        <p className="text-[9px] uppercase tracking-[0.14em] text-vault-faint">{k}</p>
                        <p className="tnum mt-0.5 truncate text-[12px] text-white">{v}</p>
                      </div>
                    ))}
                  </div>

                  {c.notes && (
                    <div className="border border-vault-border bg-vault-surface-2/30 px-3 py-2.5">
                      <p className="text-[9px] uppercase tracking-[0.14em] text-vault-faint">Coach notes</p>
                      <p className="mt-1 text-[12px] leading-relaxed text-vault-muted">{c.notes}</p>
                    </div>
                  )}

                  {/* training activity — member check-ins */}
                  <ActivitySection result={result} />

                  {/* programs */}
                  <section>
                    <p className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-vault-muted">
                      <Dumbbell className="h-3.5 w-3.5 text-vault-gold" />
                      Programs · <span className="tnum">{result.programs.length}</span>
                    </p>
                    {result.programs.length === 0 ? (
                      <p className="border border-dashed border-vault-border px-3 py-3 text-[11px] text-vault-faint">
                        No program assigned yet — assign one from the program builder.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {result.programs.map((p) => (
                          <ProgramCard key={p.id} program={p} />
                        ))}
                      </div>
                    )}
                  </section>

                  {/* bookings */}
                  <section>
                    <p className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-vault-muted">
                      <CalendarDays className="h-3.5 w-3.5 text-vault-gold" />
                      Recent class bookings · <span className="tnum">{result.bookings.length}</span>
                    </p>
                    {result.bookings.length === 0 ? (
                      <p className="border border-dashed border-vault-border px-3 py-3 text-[11px] text-vault-faint">
                        No class bookings match this client's email.
                      </p>
                    ) : (
                      <div className="divide-y divide-vault-border border border-vault-border">
                        {result.bookings.map((b) => (
                          <div key={b.id} className="flex items-center gap-3 px-3 py-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[12px] text-white">{b.classes?.name ?? 'Class'}</p>
                              <p className="text-[10px] text-vault-faint">
                                {b.classes?.day_of_week != null ? `${DAY_NAMES[(b.classes.day_of_week + 6) % 7]} · ` : ''}
                                {b.classes?.time_label ?? ''}
                                {b.classes?.coach_name ? ` · ${b.classes.coach_name}` : ''}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 border px-2 py-0.5 text-[9px] uppercase tracking-[0.1em] ${
                                b.status === 'confirmed'
                                  ? 'border-emerald-500/40 text-emerald-300'
                                  : b.status === 'waitlisted'
                                    ? 'border-amber-500/40 text-amber-300'
                                    : 'border-vault-border text-vault-muted'
                              }`}
                            >
                              {b.status ?? 'booked'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

/* ---- training activity (member check-ins) ----------------------------------- */

function ActivitySection({ result }: { result: ClientDetailResult }) {
  const { completions, programs } = result
  // The current program is the most recently updated one with sessions.
  const program = programs.find((p) => p.workouts.length > 0) ?? null

  const stats = (() => {
    if (!program) return null
    const ids = new Set(program.workouts.map((w) => w.id))
    const total = program.workouts.length
    const perWeek = new Map<number, number>()
    let latest: string | null = null
    for (const c of completions) {
      if (!ids.has(c.workout_id)) continue
      perWeek.set(c.week_number, (perWeek.get(c.week_number) ?? 0) + 1)
      if (!latest || c.completed_at > latest) latest = c.completed_at
    }
    // Streak: consecutive weeks (ending at the most recent completed week)
    // with at least one session checked in.
    const weeksDone = [...perWeek.keys()].sort((a, b) => a - b)
    let streak = 0
    if (weeksDone.length) {
      streak = 1
      for (let w = weeksDone[weeksDone.length - 1] - 1; w >= 1; w--) {
        if (perWeek.has(w) && (perWeek.get(w) ?? 0) > 0) streak++
        else break
      }
    }
    const totalDone = [...perWeek.values()].reduce((a, b) => a + b, 0)
    return { ids, total, perWeek, latest, streak, totalDone, weeks: Math.max(1, program.duration_weeks ?? 1) }
  })()

  const workoutName = (id: string) =>
    program?.workouts.find((w) => w.id === id)?.name ?? 'Session'

  const recent = completions
    .filter((c) => stats?.ids.has(c.workout_id))
    .slice(0, 6)

  return (
    <section>
      <p className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-vault-muted">
        <ActivityIcon className="h-3.5 w-3.5 text-vault-gold" />
        Training activity
      </p>
      {!stats || stats.totalDone === 0 ? (
        <p className="border border-dashed border-vault-border px-3 py-3 text-[11px] text-vault-faint">
          No sessions checked in yet{program ? ` on “${program.name}”` : ' — the client sees a ✓ button on each session in the member app'}.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-px border border-vault-border bg-vault-border">
            <div className="bg-vault-bg px-3 py-2.5 text-center">
              <p className="tnum text-lg font-bold text-white">{stats.totalDone}</p>
              <p className="text-[8px] uppercase tracking-[0.14em] text-vault-faint">Sessions done</p>
            </div>
            <div className="bg-vault-bg px-3 py-2.5 text-center">
              <p className="tnum text-lg font-bold text-vault-gold">{stats.streak}</p>
              <p className="text-[8px] uppercase tracking-[0.14em] text-vault-faint">Week streak</p>
            </div>
            <div className="bg-vault-bg px-3 py-2.5 text-center">
              <p className="tnum text-lg font-bold text-white">
                {stats.latest ? new Date(stats.latest).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '—'}
              </p>
              <p className="text-[8px] uppercase tracking-[0.14em] text-vault-faint">Last check-in</p>
            </div>
          </div>

          {/* per-week grid for the current program */}
          <div className="mt-2 flex flex-wrap gap-1">
            {Array.from({ length: stats.weeks }, (_, i) => i + 1).map((w) => {
              const done = stats.perWeek.get(w) ?? 0
              const full = done >= stats.total && stats.total > 0
              const part = done > 0 && !full
              return (
                <span
                  key={w}
                  title={`Week ${w}: ${done}/${stats.total} sessions`}
                  className={`tnum border px-2 py-1 text-[9px] uppercase tracking-[0.08em] ${
                    full
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                      : part
                        ? 'border-gold/50 bg-gold/10 text-vault-gold'
                        : 'border-vault-border text-vault-faint'
                  }`}
                >
                  W{w} {done}/{stats.total}
                </span>
              )
            })}
          </div>

          {recent.length > 0 && (
            <div className="mt-2 divide-y divide-vault-border border border-vault-border">
              {recent.map((c, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  <p className="min-w-0 flex-1 truncate text-[11px] text-white">{workoutName(c.workout_id)}</p>
                  <p className="tnum shrink-0 text-[10px] text-vault-faint">
                    W{c.week_number} · {new Date(c.completed_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}

function ProgramCard({ program: p }: { program: ClientProgramSummary }) {  const [open, setOpen] = useState(false)
  const exCount = p.workouts.reduce((n, w) => n + w.exercises.length, 0)
  return (
    <div className="border border-vault-border">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-vault-surface-2/50"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-white">{p.name}</p>
          <p className="tnum text-[10px] text-vault-faint">
            {p.duration_weeks ?? '?'} wk · {p.frequency_per_week ?? '?'}×/wk · {p.workouts.length} sessions ·{' '}
            {exCount} exercises · updated {fmtDate(p.updated_at)}
          </p>
        </div>
        <span className="shrink-0 text-[9px] uppercase tracking-[0.1em] text-vault-muted">{open ? 'Hide' : 'View'}</span>
      </button>
      {open && (
        <div className="border-t border-vault-border">
          {p.workouts.map((w) => (
            <div key={w.id} className="border-b border-vault-border/60 px-3 py-2 last:border-b-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-vault-gold">{w.name}</p>
              <table className="mt-1 w-full">
                <tbody>
                  {w.exercises.map((e, i) => {
                    const notation = notationOf(e.notes)
                    return (
                      <tr key={i} className="text-[11px]">
                        <td className="w-8 py-0.5 pr-1 text-vault-gold">{notation ?? ''}</td>
                        <td className="py-0.5 pr-2 text-white">{e.name}</td>
                        <td className="tnum w-20 py-0.5 text-right text-vault-muted">
                          {e.sets != null ? `${e.sets}×` : ''}
                          {e.reps ?? '—'}
                          {e.rest_seconds != null ? ` · ${e.rest_seconds}s` : ''}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---- roster section ---------------------------------------------------------- */

export default function SupabaseClients() {
  const [clients, setClients] = useState<ClientSummary[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [drawer, setDrawer] = useState<{ clientId: string } | null>(null)
  const [detail, setDetail] = useState<ClientDetailResult | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    loadClientsFromSupabase()
      .then(setClients)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const filtered = useMemo(() => {
    if (!clients) return []
    const q = query.trim().toLowerCase()
    if (!q) return clients
    return clients.filter(
      (c) => c.full_name.toLowerCase().includes(q) || (c.email ?? '').toLowerCase().includes(q),
    )
  }, [clients, query])

  const openDashboard = (clientId: string) => {
    setDrawer({ clientId })
    setDetail(null)
    setDetailError(null)
    setDetailLoading(true)
    loadClientDetail(clientId)
      .then(setDetail)
      .catch((e: unknown) => setDetailError(e instanceof Error ? e.message : String(e)))
      .finally(() => setDetailLoading(false))
  }

  return (
    <div className="border border-vault-border">
      <div className="flex items-center justify-between border-b border-vault-border px-4 py-2.5">
        <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-vault-muted">
          <Users className="h-3.5 w-3.5 text-vault-gold" />
          Cloud clients · Supabase
          {clients && <span className="tnum text-vault-faint">({clients.length})</span>}
        </p>
        <button onClick={load} aria-label="Refresh clients" className="text-vault-faint transition-colors hover:text-white">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="p-3">
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-vault-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clients by name or email…"
            aria-label="Search Supabase clients"
            className="w-full border border-vault-border bg-vault-bg py-2 pl-8 pr-3 text-[12px] text-white placeholder:text-vault-faint focus:border-vault-surface-3 focus:outline-none"
          />
        </div>

        {error && (
          <div className="py-2">
            <p className="text-[11px] text-red-300">Load failed: {error}</p>
            <button onClick={load} className="mt-1 text-[10px] uppercase tracking-[0.1em] text-vault-muted hover:text-white">
              Retry
            </button>
          </div>
        )}
        {!clients && !error && <p className="px-1 py-3 text-[11px] text-vault-faint">Loading…</p>}
        {clients && filtered.length === 0 && (
          <p className="px-1 py-3 text-[11px] text-vault-faint">
            {query ? `No matches for “${query}”.` : 'No clients on Supabase yet.'}
          </p>
        )}

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => openDashboard(c.id)}
              className="group flex items-center gap-3 border border-vault-border px-3 py-2.5 text-left transition-colors hover:border-vault-surface-3 hover:bg-vault-surface-2/50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-vault-border bg-vault-surface-2 font-serif text-[11px] text-vault-muted transition-colors group-hover:border-gold/50 group-hover:text-vault-gold">
                {initialsOf(c.full_name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] text-white">{c.full_name}</span>
                <span className="block truncate text-[10px] text-vault-faint">{c.email ?? 'no email'}</span>
                {c.activity && (
                  <span className="mt-1 block">
                    <span
                      className={`tnum inline-flex items-center gap-1 border px-1.5 py-px text-[8px] uppercase tracking-[0.1em] ${
                        c.activity.done >= c.activity.total
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                          : c.activity.done > 0
                            ? 'border-gold/50 bg-gold/10 text-vault-gold'
                            : 'border-vault-border text-vault-faint'
                      }`}
                    >
                      W{c.activity.week} · {c.activity.done}/{c.activity.total} done
                    </span>
                    <span className="mt-1 block h-0.5 w-full bg-vault-surface-2">
                      <span
                        className={`block h-full transition-all duration-300 ${
                          c.activity.done >= c.activity.total ? 'bg-emerald-400' : 'bg-gold'
                        }`}
                        style={{
                          width: `${Math.round((c.activity.done / Math.max(1, c.activity.total)) * 100)}%`,
                        }}
                      />
                    </span>
                  </span>
                )}
              </span>
              <span
                className={`shrink-0 border px-1.5 py-0.5 text-[8px] uppercase tracking-[0.1em] ${
                  c.status === 'active' ? 'border-emerald-500/40 text-emerald-300' : 'border-vault-border text-vault-muted'
                }`}
              >
                {c.status ?? '—'}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-vault-faint">Click a client to open their full dashboard — stats, programs and bookings.</p>
      </div>

      {drawer && (
        <DashboardDrawer
          result={detail}
          loading={detailLoading}
          error={detailError}
          onClose={() => setDrawer(null)}
        />
      )}
    </div>
  )
}
