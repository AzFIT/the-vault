/**
 * Workouts tab — sheets.md §3. Session accordion: logged sessions (read-only
 * with Edit unlock) plus the planned upcoming session. Exercise combobox,
 * + Add set duplication, done checkboxes, live session volume tween and the
 * all-sets-complete white border flash.
 */
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Lock, Minus, Pencil, Plus } from 'lucide-react'
import { logsForWeek, LOG_WEEKS, volumeForWeek } from '@/data/mock'
import { cn } from '@/lib/utils'
import { CustomCell, EditableCell, HeaderCell } from './grid'
import { useSheetGrid } from './useSheetGrid'
import { ComboCell, TweenNumber } from './widgets'
import { exerciseLibrary } from './libraries'
import {
  PLANNED_SESSION_KEY,
  getSessionRows,
  isSessionReadOnly,
  sessionMeta,
  sessionVolume,
  useVault,
  vaultActions,
} from './store'
import type { SessionMeta, SetRow } from './store'

const parseNum = (s: string): number | null => {
  const n = parseFloat(s.replace(/,/g, ''))
  return Number.isFinite(n) && n >= 0 ? n : null
}

/**
 * Plan (web) view — the same set rows as the sheet grid, grouped by exercise
 * and rendered as clean dashboard-style blocks: exercise header with its
 * "N×reps @ kg" prescription, then one compact line per set. Done toggles
 * write through to the same shared store as the grid.
 */
function PlanView({
  rows,
  readOnly,
  update,
}: {
  rows: SetRow[]
  readOnly: boolean
  update: (row: SetRow, patch: Partial<SetRow>) => void
}) {
  const groups: { name: string; rows: SetRow[] }[] = []
  for (const r of rows) {
    const g = groups.find((g) => g.name === r.exercise)
    if (g) g.rows.push(r)
    else groups.push({ name: r.exercise, rows: [r] })
  }

  return (
    <div className="space-y-5 px-4 py-4 md:px-5">
      {groups.map((g) => {
        const { reps, kg } = g.rows[0]
        return (
          <div key={g.name}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[14px] font-medium">{g.name}</p>
              <p className="text-[12px] text-vault-muted tabular-nums">
                {g.rows.length}×{reps}
                {kg > 0 ? ` @ ${kg}kg` : ''}
              </p>
            </div>
            <ul className="mt-1.5 divide-y divide-vault-border/40 border border-vault-border/60">
              {g.rows.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center gap-3 px-3 py-1.5 text-[13px] tabular-nums"
                >
                  <span className="w-6 text-vault-muted">{row.set}</span>
                  <span className={row.done ? 'text-white/40 line-through' : 'text-white'}>
                    {row.reps} reps
                  </span>
                  <span className={row.done ? 'text-white/40 line-through' : 'text-white'}>
                    {row.kg > 0 ? `${row.kg} kg` : '—'}
                  </span>
                  <span className={`ml-auto text-[12px] ${row.done ? 'text-white/40' : 'text-vault-muted'}`}>
                    RPE {row.rpe > 0 ? row.rpe : '—'}
                  </span>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={row.done}
                    aria-label={`Mark ${row.exercise} set ${row.set} done`}
                    disabled={readOnly}
                    onClick={() => update(row, { done: !row.done })}
                    className={cn(
                      'flex h-[18px] w-[18px] shrink-0 items-center justify-center border transition-colors',
                      row.done ? 'border-white bg-white' : 'border-white/60 bg-transparent hover:border-white',
                      readOnly && 'cursor-default opacity-60',
                    )}
                  >
                    {row.done && <Check className="h-3 w-3 text-vault-bg" strokeWidth={3} />}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

function SessionPanel({
  meta,
  open,
  onToggle,
  addSetHandlers,
}: {
  meta: SessionMeta
  open: boolean
  onToggle: () => void
  addSetHandlers: { current: Map<string, () => void> }
}) {
  const vault = useVault()
  const rows = getSessionRows(vault, meta.key)
  const readOnly = isSessionReadOnly(vault, meta.key)
  const volume = sessionVolume(rows)
  const allDone = rows.length > 0 && rows.every((r) => r.done)

  // Restrained celebration: white border flash once when a session completes
  const [flash, setFlash] = useState(false)
  const [prevAllDone, setPrevAllDone] = useState(allDone)
  if (allDone !== prevAllDone) {
    setPrevAllDone(allDone)
    if (allDone) setFlash(true)
  }
  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(false), 1000)
    return () => clearTimeout(t)
  }, [flash])

  // Google Sheets-style exercise grouping: consecutive rows of the same
  // exercise sit behind one name cell with a small +/− toggle. Collapsed
  // groups render only their last row ("Sandbag Lunge · Set 4 …").
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  const groups: { name: string; start: number; count: number }[] = []
  rows.forEach((row, i) => {
    const last = groups[groups.length - 1]
    if (last && last.name === row.exercise) last.count += 1
    else groups.push({ name: row.exercise, start: i, count: 1 })
  })
  const groupAt = (i: number) => groups.find((g) => i >= g.start && i < g.start + g.count)!
  const isHidden = (i: number) => {
    const g = groupAt(i)
    return collapsed.has(g.name) && i !== g.start + g.count - 1
  }

  const ctl = useSheetGrid(rows.length, 6, (r, c) => {
    if (isHidden(r)) return { focusable: false, editable: false }
    if (readOnly) return { focusable: true, editable: false }
    if (c === 1) return { focusable: false, editable: false } // set number
    if (c === 5) return { focusable: true, editable: false } // done checkbox
    return { focusable: true, editable: true }
  })

  const toggleGroup = (name: string) => {
    if (!collapsed.has(name)) ctl.blur() // the active cell may be inside the rows about to hide
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  // + Add set duplicates the focused row (same exercise, reps, kg, RPE),
  // inserted right after it — like copying a row in Sheets. Falls back to
  // the session's last row when no cell is focused.
  const addSet = () => {
    const activeId = ctl.active != null ? rows[ctl.active.r]?.id : undefined
    vaultActions.addSetRow(meta.key, activeId ?? rows[rows.length - 1]?.id ?? null)
  }
  useEffect(() => {
    const handlers = addSetHandlers.current
    handlers.set(meta.key, addSet)
    return () => {
      handlers.delete(meta.key)
    }
  })

  // Sheet (grid) ⇄ Plan (web-style blocks) view toggle
  const [view, setView] = useState<'sheet' | 'plan'>('sheet')

  const update = (row: SetRow, patch: Partial<SetRow>) =>
    vaultActions.updateSetRow(meta.key, row.id, patch)

  const commitNum = (row: SetRow, field: 'reps' | 'kg' | 'rpe') => (raw: string) => {
    const n = parseNum(raw)
    if (n === null) return
    update(row, { [field]: field === 'reps' ? Math.round(n) : Math.round(n * 2) / 2 })
  }

  const dow = new Date(`${meta.date}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short' })

  return (
    <div
      className={cn(
        'app-card overflow-hidden transition-colors duration-500',
        flash && 'border-white',
      )}
    >
      {/* Session header */}
      <div className="flex w-full items-center gap-3 px-4 py-3 md:px-5">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          aria-expanded={open}
        >
          <ChevronDown
            className={cn('h-4 w-4 shrink-0 text-vault-muted transition-transform', open && 'rotate-180')}
          />
          <span className="min-w-0 flex-1 truncate text-[14px] font-medium">
            <span className="text-vault-muted">{dow} · </span>
            {meta.label}
            {meta.coach && <span className="text-vault-muted"> — with {meta.coach.split(' ')[0]}</span>}
            {meta.planned && <span className="text-vault-muted"> (planned)</span>}
          </span>
          {meta.durationMin && (
            <span className="hidden text-[12px] text-vault-muted tabular-nums sm:inline">
              {meta.durationMin} min
            </span>
          )}
          <span className="shrink-0 text-[14px] font-bold tabular-nums">
            <TweenNumber value={volume} /> <span className="text-[11px] font-normal text-vault-muted">kg</span>
          </span>
        </button>
        {open && (
          <div
            role="group"
            aria-label="Session view"
            className="mr-1 flex shrink-0 items-center border border-vault-border/70 text-[10px] uppercase tracking-[0.08em]"
          >
            <button
              type="button"
              aria-pressed={view === 'sheet'}
              onClick={() => setView('sheet')}
              className={cn(
                'px-2 py-1 transition-colors',
                view === 'sheet' ? 'bg-white text-vault-btn-text' : 'text-vault-muted hover:text-white',
              )}
            >
              Sheet
            </button>
            <button
              type="button"
              aria-pressed={view === 'plan'}
              onClick={() => setView('plan')}
              className={cn(
                'px-2 py-1 transition-colors',
                view === 'plan' ? 'bg-white text-vault-btn-text' : 'text-vault-muted hover:text-white',
              )}
            >
              Plan
            </button>
          </div>
        )}
        {readOnly ? (
          <button
            type="button"
            onClick={() => vaultActions.toggleSessionLock(meta.key)}
            className="btn-ghost shrink-0 text-[11px]"
          >
            <Lock className="h-3 w-3" /> Edit
          </button>
        ) : (
          !meta.planned && (
            <button
              type="button"
              onClick={() => vaultActions.toggleSessionLock(meta.key)}
              className="btn-ghost shrink-0 text-[11px]"
              title="Lock session"
            >
              <Pencil className="h-3 w-3" /> Editing
            </button>
          )
        )}
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            {view === 'sheet' ? (
              <div {...ctl.containerProps} className="overflow-x-auto outline-none">
              <table className="w-full min-w-[640px] border-collapse" role="grid" aria-label={`${meta.label} sets`}>
                <thead>
                  <tr>
                    <HeaderCell>Exercise</HeaderCell>
                    <HeaderCell className="w-14 text-center">Set</HeaderCell>
                    <HeaderCell className="w-20 text-right">Reps</HeaderCell>
                    <HeaderCell className="w-20 text-right">Kg</HeaderCell>
                    <HeaderCell className="w-20 text-right">RPE</HeaderCell>
                    <HeaderCell className="w-14 text-center">✓</HeaderCell>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, r) => {
                    if (isHidden(r)) return null
                    const g = groupAt(r)
                    const gCollapsed = collapsed.has(g.name)
                    const isStart = r === g.start
                    return (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.25, delay: Math.min(r * 0.03, 0.4) }}
                      className={cn('transition-colors hover:bg-vault-surface-2', r % 2 === 1 && 'bg-vault-surface')}
                    >
                      <ComboCell
                        ctl={ctl}
                        r={r}
                        c={0}
                        value={isStart || gCollapsed ? row.exercise : ''}
                        blank={!isStart && !gCollapsed}
                        options={exerciseLibrary}
                        getLabel={(x) => x}
                        disabled={readOnly}
                        onSelect={(name) => update(row, { exercise: name })}
                        placeholder="Search exercises…"
                        trailer={
                          g.count > 1 ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleGroup(g.name)
                              }}
                              aria-expanded={!gCollapsed}
                              aria-label={
                                gCollapsed
                                  ? `Show all ${g.count} sets of ${g.name}`
                                  : `Collapse ${g.name} to one row`
                              }
                              title={gCollapsed ? `Show all ${g.count} sets` : 'Collapse group'}
                              className="flex h-4 w-4 shrink-0 items-center justify-center border border-vault-border text-vault-muted transition-colors hover:border-white hover:text-white"
                            >
                              {gCollapsed ? <Plus className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                            </button>
                          ) : undefined
                        }
                      />
                      <td className="h-11 border border-vault-border/60 px-3 text-center text-[13px] text-vault-muted tabular-nums">
                        {row.set}
                      </td>
                      <EditableCell
                        ctl={ctl} r={r} c={2}
                        value={String(row.reps)}
                        editable={!readOnly}
                        className={row.done ? 'font-bold text-white' : 'text-vault-muted'}
                        onCommit={commitNum(row, 'reps')}
                      />
                      <EditableCell
                        ctl={ctl} r={r} c={3}
                        value={String(row.kg)}
                        editable={!readOnly}
                        className={row.done ? 'font-bold text-white' : 'text-vault-muted'}
                        onCommit={commitNum(row, 'kg')}
                      />
                      <EditableCell
                        ctl={ctl} r={r} c={4}
                        value={String(row.rpe)}
                        editable={!readOnly}
                        className={row.done ? 'text-white' : 'text-vault-muted'}
                        onCommit={commitNum(row, 'rpe')}
                      />
                      <CustomCell ctl={ctl} r={r} c={5}>
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={row.done}
                          aria-label={`Mark ${row.exercise} set ${row.set} done`}
                          disabled={readOnly}
                          onClick={(e) => {
                            e.stopPropagation()
                            update(row, { done: !row.done })
                          }}
                          className={cn(
                            'mx-auto flex h-[18px] w-[18px] items-center justify-center border transition-colors',
                            row.done ? 'border-white bg-white' : 'border-white/60 bg-transparent',
                            readOnly && 'cursor-default opacity-60',
                          )}
                        >
                          {row.done && <Check className="h-3 w-3 text-vault-bg" strokeWidth={3} />}
                        </button>
                      </CustomCell>
                    </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            ) : (
              <PlanView rows={rows} readOnly={readOnly} update={update} />
            )}
            {!readOnly && view === 'sheet' && (
              <div className="border-t border-vault-border/60 px-4 py-2.5">
                <button
                  type="button"
                  onClick={addSet}
                  title="Duplicate the selected row — select any cell in a row first (defaults to the last row)"
                  className="btn-ghost text-[11px]"
                >
                  <Plus className="h-3.5 w-3.5" /> Add set
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function WorkoutsTab({
  weekDates,
  weekIndex,
  registerAddRow,
}: {
  weekDates: string[]
  weekIndex: number
  registerAddRow: (fn: (() => void) | null) => void
}) {
  const vault = useVault()
  const metas: SessionMeta[] = []
  for (const d of weekDates) {
    const m = sessionMeta(d)
    if (m) metas.push(m)
  }
  const isLatest = weekIndex === LOG_WEEKS - 1
  if (isLatest) {
    const planned = sessionMeta(PLANNED_SESSION_KEY)
    if (planned) metas.push(planned)
  }

  const [openKey, setOpenKey] = useState<string | null>(
    isLatest ? PLANNED_SESSION_KEY : (metas[0]?.key ?? null),
  )
  // Each SessionPanel registers its own add-set handler here so the toolbar
  // "Add row" duplicates the row focused inside that panel.
  const addSetHandlers = useRef(new Map<string, () => void>())

  useEffect(() => {
    registerAddRow(() => {
      if (!openKey || isSessionReadOnly(vault, openKey)) return
      const handler = addSetHandlers.current.get(openKey)
      if (handler) {
        handler()
      } else {
        const rows = getSessionRows(vault, openKey)
        vaultActions.addSetRow(openKey, rows[rows.length - 1]?.id ?? null)
      }
    })
    return () => registerAddRow(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openKey, vault])

  // Live week summary (right rail)
  const allRows = metas.flatMap((m) => getSessionRows(vault, m.key))
  const doneSessions = metas.filter((m) => {
    const rows = getSessionRows(vault, m.key)
    return !m.planned && rows.length > 0 && rows.every((r) => r.done)
  }).length
  const totalVolume = sessionVolume(allRows)
  const prevVolume = volumeForWeek(Math.max(0, weekIndex - 1))
  const deltaPct = prevVolume > 0 ? Math.round(((totalVolume - prevVolume) / prevVolume) * 100) : 0
  const workoutsLogged = logsForWeek(weekIndex).filter((l) => l.workout).length

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="min-w-0 flex-1 space-y-4">
        {metas.length === 0 && (
          <div className="app-card p-8 text-center text-[14px] text-vault-muted">
            No sessions logged this week.
          </div>
        )}
        {metas.map((m) => (
          <SessionPanel
            key={m.key}
            meta={m}
            open={openKey === m.key}
            onToggle={() => setOpenKey(openKey === m.key ? null : m.key)}
            addSetHandlers={addSetHandlers}
          />
        ))}
      </div>

      {/* Right rail — THIS WEEK summary */}
      <aside className="w-full shrink-0 lg:w-[280px]">
        <div className="app-card p-5">
          <p className="eyebrow">This week</p>
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-[13px] text-vault-muted">Sessions done</p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums">
                {doneSessions}
                <span className="text-base font-normal text-vault-muted"> / {workoutsLogged + (isLatest ? 1 : 0)}</span>
              </p>
            </div>
            <div>
              <p className="text-[13px] text-vault-muted">Total volume</p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums">
                <TweenNumber value={totalVolume} />
                <span className="text-base font-normal text-vault-muted"> kg</span>
              </p>
            </div>
            <div className="border-t border-vault-border/60 pt-3">
              <p className="text-[13px] text-vault-muted">vs last week</p>
              <p className="mt-0.5 text-[15px] font-bold tabular-nums" style={{ color: 'var(--viz-2)' }}>
                {deltaPct >= 0 ? '+' : ''}
                {deltaPct}%
              </p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}
