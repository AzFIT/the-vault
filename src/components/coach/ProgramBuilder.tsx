import { useEffect, useMemo, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Copy,
  GripVertical,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { coachClients, programs } from '@/data/mock'
import type { Client } from '@/data/mock'
import { SectionHeader } from './shared'
import { EASE } from './utils'

// ---------------------------------------------------------------------------
// Local program-builder model (local state only — design §4)
// ---------------------------------------------------------------------------
interface ExRow {
  id: string
  exercise: string
  sets: number
  reps: number
  kg: number
  rpe: number
}
interface Session {
  id: string
  title: string
  exercises: ExRow[]
}
interface DayCol {
  id: string
  label: string
  sessions: Session[]
}
interface Week {
  id: string
  days: DayCol[]
}
interface ProgramDraft {
  id: string
  name: string
  subtitle: string
  weeks: Week[]
  custom?: boolean
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Sat']
/** Which day columns sessions land on, keyed by sessions-per-week */
const PLACEMENT: Record<number, number[]> = { 2: [1, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4] }

const EXERCISE_POOLS: Record<string, string[]> = {
  'strength-foundation': [
    'Back Squat',
    'Deadlift',
    'Hip Thrust',
    'Bench Press',
    'Barbell Row',
    'Overhead Press',
    'Lat Pulldown',
    'Walking Lunge',
    'Leg Curl',
  ],
  'hyrox-engine': [
    'Sled Push',
    'Sled Pull',
    'Sandbag Lunge',
    'Wall Balls',
    'Ski Erg',
    'Row Erg',
    'Kettlebell Swing',
  ],
  'postnatal-return': [
    'Hip Thrust',
    'Kettlebell Swing',
    'Lat Pulldown',
    'Walking Lunge',
    'Leg Curl',
  ],
  'body-comp-reset': [
    'Back Squat',
    'Bench Press',
    'Sled Push',
    'Kettlebell Swing',
    'Barbell Row',
    'Ski Erg',
    'Hip Thrust',
  ],
}

const TITLE_POOLS: Record<string, string[]> = {
  'strength-foundation': ['Lower A', 'Upper A', 'Lower B', 'Upper B'],
  'hyrox-engine': ['Engine Intervals', 'Sled & Carry', 'Race Pace', 'Threshold Run'],
  'postnatal-return': ['Reconnect Session', 'Strength Rebuild', 'Core + Carry'],
  'body-comp-reset': ['Strength A', 'Conditioning', 'Strength B', 'Steps + Core'],
}

let uid = 0
const nextId = (p: string) => `${p}-${++uid}`

function makeSession(programId: string, weekIdx: number, slot: number): Session {
  const pool = EXERCISE_POOLS[programId] ?? EXERCISE_POOLS['strength-foundation']
  const titles = TITLE_POOLS[programId] ?? TITLE_POOLS['strength-foundation']
  const exercises: ExRow[] = Array.from({ length: 3 }, (_, i) => {
    const name = pool[(slot * 3 + i + weekIdx) % pool.length]
    const isErgo = /Erg|Run/.test(name)
    return {
      id: nextId('ex'),
      exercise: name,
      sets: 3 + ((weekIdx + i) % 2),
      reps: isErgo ? 1 : 6 + ((slot * 2 + i + weekIdx) % 6),
      kg: isErgo ? 0 : Math.round((30 + slot * 10 + i * 5 + weekIdx * 1.25) * 2) / 2,
      rpe: 7 + ((slot + i + weekIdx) % 3),
    }
  })
  return {
    id: nextId('sess'),
    title: titles[slot % titles.length],
    exercises,
  }
}

function makeDraft(programId: string): ProgramDraft {
  const p = programs.find((x) => x.id === programId)!
  const placement = PLACEMENT[p.sessionsPerWeek] ?? PLACEMENT[3]
  return {
    id: p.id,
    name: p.name,
    subtitle: `${p.durationWeeks} wk · ${p.phases.length} phases`,
    weeks: Array.from({ length: p.durationWeeks }, (_, w) => ({
      id: nextId('wk'),
      days: DAY_LABELS.map((label, d) => ({
        id: nextId('day'),
        label,
        sessions: placement.includes(d)
          ? [makeSession(p.id, w, placement.indexOf(d))]
          : [],
      })),
    })),
  }
}

function makeCustomDraft(n: number): ProgramDraft {
  return {
    id: nextId('custom'),
    name: `Untitled Program ${n}`,
    subtitle: '4 wk · draft',
    custom: true,
    weeks: Array.from({ length: 4 }, () => ({
      id: nextId('wk'),
      days: DAY_LABELS.map((label) => ({ id: nextId('day'), label, sessions: [] })),
    })),
  }
}

const cloneWeek = (w: Week): Week => JSON.parse(JSON.stringify(w))

interface Sel {
  weekIdx: number
  dayIdx: number
  sessionId: string
}

const effectiveProgramId = (c: Client, overrides: Record<string, string>) =>
  overrides[c.id] ?? c.programId

export default function ProgramBuilder({
  overrides,
  onAssign,
  focusProgramId,
  focusNonce,
}: {
  overrides: Record<string, string>
  onAssign: (clientId: string, programId: string | null) => void
  focusProgramId?: string | null
  focusNonce: number
}) {
  const [drafts, setDrafts] = useState<Record<string, ProgramDraft>>(() =>
    Object.fromEntries(programs.map((p) => [p.id, makeDraft(p.id)])),
  )
  const [order, setOrder] = useState<string[]>(() => programs.map((p) => p.id))
  const [selectedId, setSelectedId] = useState(programs[0].id)
  const [sel, setSel] = useState<Sel | null>(null)
  const [dropTarget, setDropTarget] = useState<{ weekIdx: number; dayIdx: number } | null>(
    null,
  )
  const [assignOpen, setAssignOpen] = useState(false)
  const customCount = useRef(0)

  useEffect(() => {
    if (focusProgramId && drafts[focusProgramId]) {
      setSelectedId(focusProgramId)
      setSel(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusNonce])

  const draft = drafts[selectedId]

  const assignedCount = (pid: string) =>
    coachClients.filter((c) => effectiveProgramId(c, overrides) === pid).length

  const findSession = (s: Sel) =>
    drafts[selectedId]?.weeks[s.weekIdx]?.days[s.dayIdx]?.sessions.find(
      (x) => x.id === s.sessionId,
    ) ?? null

  const selectedSession = sel ? findSession(sel) : null

  // ---- mutations -----------------------------------------------------------
  const mutateDraft = (pid: string, fn: (d: ProgramDraft) => ProgramDraft) =>
    setDrafts((prev) => ({ ...prev, [pid]: fn(prev[pid]) }))

  const moveSession = (from: Sel, toWeek: number, toDay: number) => {
    if (from.weekIdx === toWeek && from.dayIdx === toDay) return
    mutateDraft(selectedId, (d) => {
      const weeks = d.weeks.map((w) => ({
        ...w,
        days: w.days.map((day) => ({ ...day, sessions: [...day.sessions] })),
      }))
      const fromSessions = weeks[from.weekIdx].days[from.dayIdx].sessions
      const idx = fromSessions.findIndex((s) => s.id === from.sessionId)
      if (idx < 0) return d
      const [sess] = fromSessions.splice(idx, 1)
      weeks[toWeek].days[toDay].sessions.push(sess)
      return { ...d, weeks }
    })
    setSel({ weekIdx: toWeek, dayIdx: toDay, sessionId: from.sessionId })
  }

  const reorderSession = (s: Sel, dir: -1 | 1) => {
    mutateDraft(selectedId, (d) => {
      const weeks = d.weeks.map((w) => ({
        ...w,
        days: w.days.map((day) => ({ ...day, sessions: [...day.sessions] })),
      }))
      const arr = weeks[s.weekIdx].days[s.dayIdx].sessions
      const idx = arr.findIndex((x) => x.id === s.sessionId)
      const j = idx + dir
      if (idx < 0 || j < 0 || j >= arr.length) return d
      ;[arr[idx], arr[j]] = [arr[j], arr[idx]]
      return { ...d, weeks }
    })
  }

  const removeSession = (s: Sel) => {
    mutateDraft(selectedId, (d) => ({
      ...d,
      weeks: d.weeks.map((w, wi) =>
        wi === s.weekIdx
          ? {
              ...w,
              days: w.days.map((day, di) =>
                di === s.dayIdx
                  ? { ...day, sessions: day.sessions.filter((x) => x.id !== s.sessionId) }
                  : day,
              ),
            }
          : w,
      ),
    }))
    setSel(null)
  }

  const addSession = (weekIdx: number, dayIdx: number) => {
    const base = draft.custom ? 'strength-foundation' : draft.id
    const sess = makeSession(base, weekIdx, draft.weeks[weekIdx].days[dayIdx].sessions.length)
    mutateDraft(selectedId, (d) => ({
      ...d,
      weeks: d.weeks.map((w, wi) =>
        wi === weekIdx
          ? {
              ...w,
              days: w.days.map((day, di) =>
                di === dayIdx ? { ...day, sessions: [...day.sessions, sess] } : day,
              ),
            }
          : w,
      ),
    }))
    setSel({ weekIdx, dayIdx, sessionId: sess.id })
  }

  const updateSession = (s: Sel, fn: (sess: Session) => Session) =>
    mutateDraft(selectedId, (d) => ({
      ...d,
      weeks: d.weeks.map((w, wi) =>
        wi === s.weekIdx
          ? {
              ...w,
              days: w.days.map((day, di) =>
                di === s.dayIdx
                  ? {
                      ...day,
                      sessions: day.sessions.map((x) => (x.id === s.sessionId ? fn(x) : x)),
                    }
                  : day,
              ),
            }
          : w,
      ),
    }))

  const duplicateWeek = () => {
    if (!sel) return
    const src = sel.weekIdx
    const dst = src + 1
    if (dst >= draft.weeks.length) {
      toast('No following week to duplicate into')
      return
    }
    mutateDraft(selectedId, (d) => ({
      ...d,
      weeks: d.weeks.map((w, wi) => {
        if (wi !== dst) return w
        const copy = cloneWeek(d.weeks[src])
        return { ...w, days: copy.days.map((day, di) => ({ ...day, id: w.days[di].id })) }
      }),
    }))
    toast.success(`Week ${src + 1} duplicated into week ${dst + 1}`)
  }

  const addProgram = () => {
    customCount.current += 1
    const d = makeCustomDraft(customCount.current)
    setDrafts((prev) => ({ ...prev, [d.id]: d }))
    setOrder((prev) => [...prev, d.id])
    setSelectedId(d.id)
    setSel(null)
  }

  const save = () => {
    const n = assignedCount(selectedId)
    toast.success(`Program updated — ${n} client${n === 1 ? '' : 's'} notified`)
  }

  // ---- drag & drop ---------------------------------------------------------
  const onDragStart = (e: DragEvent, s: Sel) => {
    e.dataTransfer.setData('application/x-vault-session', JSON.stringify(s))
    e.dataTransfer.effectAllowed = 'move'
  }
  const onDrop = (e: DragEvent, weekIdx: number, dayIdx: number) => {
    e.preventDefault()
    setDropTarget(null)
    try {
      const s = JSON.parse(
        e.dataTransfer.getData('application/x-vault-session'),
      ) as Sel
      if (s?.sessionId) moveSession(s, weekIdx, dayIdx)
    } catch {
      /* invalid drop — card snaps back */
    }
  }

  const assignedClients = useMemo(
    () => coachClients.filter((c) => effectiveProgramId(c, overrides) === selectedId),
    [overrides, selectedId],
  )

  return (
    <section className="app-card p-6">
      <SectionHeader
        eyebrow="Program Builder"
        title="Build & assign programs"
        right={
          <div className="flex items-center gap-3">
            <button
              onClick={save}
              className="inline-flex items-center gap-2 border border-white/70 px-4 py-2 text-[11px] uppercase tracking-[0.08em] text-white transition-colors hover:bg-white/10"
            >
              <Save className="h-3.5 w-3.5" /> Save changes
            </button>
            <button
              onClick={addProgram}
              className="inline-flex items-center gap-2 bg-white px-4 py-2 text-[11px] uppercase tracking-[0.08em] text-vault-btn-text transition-colors hover:bg-vault-btn-hover"
            >
              <Plus className="h-3.5 w-3.5" /> New Program
            </button>
          </div>
        }
      />

      <div className="flex flex-col gap-5 lg:flex-row">
        {/* Library */}
        <div className="w-full shrink-0 lg:w-[280px]">
          <div className="space-y-2">
            {order.map((pid) => {
              const d = drafts[pid]
              const active = pid === selectedId
              return (
                <button
                  key={pid}
                  onClick={() => {
                    setSelectedId(pid)
                    setSel(null)
                    setAssignOpen(false)
                  }}
                  className={`relative w-full border px-4 py-3.5 text-left transition-colors ${
                    active
                      ? 'border-vault-border bg-vault-surface-2'
                      : 'border-transparent hover:bg-vault-surface-2/60'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="program-active-bar"
                      className="absolute left-0 top-0 h-full w-0.5 bg-white"
                    />
                  )}
                  <span className="flex items-start justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-medium text-white">
                        {d.name}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-vault-faint">
                        {d.subtitle}
                      </span>
                    </span>
                    <span className="tnum shrink-0 border border-vault-border px-1.5 py-0.5 text-[10px] text-vault-muted">
                      {assignedCount(pid)}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Week editor */}
        <div className="min-w-0 flex-1">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={selectedId}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: EASE }}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                {draft.custom ? (
                  <input
                    value={draft.name}
                    onChange={(e) =>
                      mutateDraft(selectedId, (d) => ({ ...d, name: e.target.value }))
                    }
                    className="w-64 border border-vault-border bg-vault-bg px-3 py-1.5 text-[14px] font-medium text-white focus:border-vault-surface-3 focus:outline-none"
                  />
                ) : (
                  <p className="text-[14px] font-medium text-white">{draft.name}</p>
                )}
                <p className="text-[11px] uppercase tracking-[0.14em] text-vault-faint">
                  {draft.weeks.length} weeks · drag sessions between days
                </p>
              </div>

              <div className="overflow-x-auto pb-2">
                <div className="flex gap-3" style={{ minWidth: draft.weeks.length * 176 }}>
                  {draft.weeks.map((week, wi) => (
                    <div
                      key={week.id}
                      className="w-44 shrink-0 border border-vault-border bg-vault-bg/60"
                    >
                      <p className="tnum border-b border-vault-border px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-vault-muted">
                        W{wi + 1}
                      </p>
                      <div className="space-y-2 p-2">
                        {week.days.map((day, di) => {
                          const isTarget =
                            dropTarget?.weekIdx === wi && dropTarget?.dayIdx === di
                          return (
                            <div
                              key={day.id}
                              onDragOver={(e) => {
                                e.preventDefault()
                                setDropTarget({ weekIdx: wi, dayIdx: di })
                              }}
                              onDragLeave={() =>
                                setDropTarget((t) =>
                                  t?.weekIdx === wi && t?.dayIdx === di ? null : t,
                                )
                              }
                              onDrop={(e) => onDrop(e, wi, di)}
                              className={`min-h-[52px] border p-1.5 transition-colors ${
                                isTarget
                                  ? 'border-dashed border-white bg-white/5'
                                  : 'border-vault-border/50'
                              }`}
                            >
                              <div className="mb-1 flex items-center justify-between">
                                <span className="text-[9px] uppercase tracking-[0.14em] text-vault-faint">
                                  {day.label}
                                </span>
                                <button
                                  onClick={() => addSession(wi, di)}
                                  aria-label={`Add session on ${day.label}`}
                                  className="text-vault-faint transition-colors hover:text-white"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                              <div className="space-y-1.5">
                                {day.sessions.map((sess) => {
                                  const isSel = sel?.sessionId === sess.id
                                  return (
                                    <motion.div key={sess.id} layout="position">
                                      <div
                                        draggable
                                        onDragStart={(e) =>
                                          onDragStart(e, {
                                            weekIdx: wi,
                                            dayIdx: di,
                                            sessionId: sess.id,
                                          })
                                        }
                                        onClick={() =>
                                          setSel({ weekIdx: wi, dayIdx: di, sessionId: sess.id })
                                        }
                                        className={`group cursor-grab border p-2 transition-all hover:scale-[1.03] active:cursor-grabbing ${
                                        isSel
                                          ? 'border-white bg-vault-surface-2 shadow-[0_0_12px_rgba(255,255,255,0.05)]'
                                          : 'border-vault-border bg-vault-surface hover:border-vault-surface-3'
                                      }`}
                                    >
                                      <div className="flex items-center gap-1.5">
                                        <GripVertical className="h-3 w-3 shrink-0 text-vault-faint" />
                                        <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-white">
                                          {sess.title}
                                        </span>
                                        <span className="hidden items-center gap-0.5 group-hover:flex">
                                          <button
                                            aria-label="Move up"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              reorderSession(
                                                { weekIdx: wi, dayIdx: di, sessionId: sess.id },
                                                -1,
                                              )
                                            }}
                                            className="text-vault-faint hover:text-white"
                                          >
                                            <ArrowUp className="h-3 w-3" />
                                          </button>
                                          <button
                                            aria-label="Move down"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              reorderSession(
                                                { weekIdx: wi, dayIdx: di, sessionId: sess.id },
                                                1,
                                              )
                                            }}
                                            className="text-vault-faint hover:text-white"
                                          >
                                            <ArrowDown className="h-3 w-3" />
                                          </button>
                                          <button
                                            aria-label="Remove session"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              removeSession({
                                                weekIdx: wi,
                                                dayIdx: di,
                                                sessionId: sess.id,
                                              })
                                            }}
                                            className="text-vault-faint hover:text-white"
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        </span>
                                      </div>
                                      <p className="mt-1 truncate text-[10px] text-vault-faint">
                                        {sess.exercises
                                          .map((x) => `${x.exercise} ${x.sets}×${x.reps}`)
                                          .slice(0, 2)
                                          .join(', ')}
                                        {sess.exercises.length > 2 ? '…' : ''}
                                      </p>
                                      </div>
                                    </motion.div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Detail panel */}
        <div className="w-full shrink-0 border-t border-vault-border pt-4 lg:w-[300px] lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          {selectedSession && sel ? (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-[0.16em] text-vault-muted">
                  Session detail
                </p>
                <button
                  onClick={() => setSel(null)}
                  aria-label="Clear selection"
                  className="text-vault-faint hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <input
                value={selectedSession.title}
                onChange={(e) =>
                  updateSession(sel, (s) => ({ ...s, title: e.target.value }))
                }
                className="mb-3 w-full border border-vault-border bg-vault-bg px-3 py-2 text-[14px] font-medium text-white focus:border-vault-surface-3 focus:outline-none"
              />

              {/* Exercise table */}
              <div className="space-y-1.5">
                <div className="grid grid-cols-[minmax(0,1fr)_34px_34px_46px_34px_20px] gap-1 text-[9px] uppercase tracking-[0.12em] text-vault-faint">
                  <span>Exercise</span>
                  <span className="text-center">Sets</span>
                  <span className="text-center">Reps</span>
                  <span className="text-center">Kg</span>
                  <span className="text-center">RPE</span>
                  <span />
                </div>
                {selectedSession.exercises.map((ex) => (
                  <div
                    key={ex.id}
                    className="grid grid-cols-[minmax(0,1fr)_34px_34px_46px_34px_20px] items-center gap-1"
                  >
                    <input
                      value={ex.exercise}
                      onChange={(e) =>
                        updateSession(sel, (s) => ({
                          ...s,
                          exercises: s.exercises.map((x) =>
                            x.id === ex.id ? { ...x, exercise: e.target.value } : x,
                          ),
                        }))
                      }
                      className="min-w-0 border border-vault-border/60 bg-vault-bg px-1.5 py-1 text-[11px] text-white focus:border-vault-surface-3 focus:outline-none"
                    />
                    {(['sets', 'reps', 'kg', 'rpe'] as const).map((field) => (
                      <input
                        key={field}
                        type="number"
                        value={ex[field]}
                        onChange={(e) =>
                          updateSession(sel, (s) => ({
                            ...s,
                            exercises: s.exercises.map((x) =>
                              x.id === ex.id
                                ? { ...x, [field]: Number(e.target.value) }
                                : x,
                            ),
                          }))
                        }
                        className="tnum w-full border border-vault-border/60 bg-vault-bg px-1 py-1 text-center text-[11px] text-white focus:border-vault-surface-3 focus:outline-none"
                      />
                    ))}
                    <button
                      aria-label="Remove exercise"
                      onClick={() =>
                        updateSession(sel, (s) => ({
                          ...s,
                          exercises: s.exercises.filter((x) => x.id !== ex.id),
                        }))
                      }
                      className="text-vault-faint hover:text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() =>
                    updateSession(sel, (s) => ({
                      ...s,
                      exercises: [
                        ...s.exercises,
                        { id: nextId('ex'), exercise: 'New exercise', sets: 3, reps: 8, kg: 20, rpe: 7 },
                      ],
                    }))
                  }
                  className="btn-ghost mt-1 text-[10px]"
                >
                  <Plus className="h-3 w-3" /> Add exercise
                </button>
              </div>

              {/* Assign dropdown */}
              <div className="relative mt-5">
                <button
                  onClick={() => setAssignOpen((v) => !v)}
                  className="flex w-full items-center justify-between border border-white/70 px-3 py-2.5 text-[11px] uppercase tracking-[0.08em] text-white transition-colors hover:bg-white/10"
                >
                  Assign to client
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${assignOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                <AnimatePresence>
                  {assignOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.18 }}
                      className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto border border-vault-border bg-vault-surface-2 shadow-lg"
                    >
                      {coachClients.map((c) => {
                        const checked = effectiveProgramId(c, overrides) === selectedId
                        return (
                          <label
                            key={c.id}
                            className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-[12px] text-white transition-colors hover:bg-vault-surface-3"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => onAssign(c.id, checked ? null : selectedId)}
                              className="h-3.5 w-3.5 accent-white"
                            />
                            <span className="flex-1 truncate">{c.name}</span>
                            {checked && (
                              <span className="text-[9px] uppercase tracking-[0.1em] text-vault-muted">
                                Assigned
                              </span>
                            )}
                          </label>
                        )
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="mt-4 flex items-center gap-4">
                <button onClick={duplicateWeek} className="btn-ghost text-[10px]">
                  <Copy className="h-3 w-3" /> Duplicate week
                </button>
                <button
                  onClick={() => removeSession(sel)}
                  className="btn-ghost text-[10px]"
                >
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[160px] flex-col items-start justify-center gap-2">
              <p className="text-[10px] uppercase tracking-[0.16em] text-vault-muted">
                Session detail
              </p>
              <p className="text-[13px] leading-relaxed text-vault-faint">
                Select a session card to edit exercises, assign clients, or duplicate its
                week.
              </p>
              <p className="tnum text-[12px] text-vault-muted">
                {assignedClients.length} client{assignedClients.length === 1 ? '' : 's'} on
                this program
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
