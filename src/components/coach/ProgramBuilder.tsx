import { useEffect, useMemo, useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  CloudDownload,
  Database,
  Download,
  ExternalLink,
  FileSpreadsheet,
  GripVertical,
  Link2,
  Maximize2,
  Minimize2,
  Plus,
  RefreshCw,
  Save,
  Upload,
  Wand2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { coachClients, programs } from '@/data/mock'
import type { Client } from '@/data/mock'
import { loadExerciseLibrary } from '@/lib/exerciseLibrary'
import type { LibraryExercise } from '@/lib/exerciseLibrary'
import {
  assignProgramToClient,
  loadClientsFromSupabase,
  loadProgramsFromSupabase,
  saveProgramToSupabase,
} from '@/lib/programSave'
import type {
  ClientSummary,
  LoadedProgram,
  SaveProgramPayload,
  SaveWorkout,
} from '@/lib/programSave'
import { PLANNED_SESSION_KEY, vaultActions } from '@/components/sheets/store'
import type { SetRow } from '@/components/sheets/store'
import {
  createSheetForProgram,
  getSheetsStatus,
  linkSheetToProgram,
  pullProgramFromSheet,
  pushProgramToSheet,
  sheetUrl,
} from '@/lib/sheetsSync'
import GenerateProgramDialog from './GenerateProgramDialog'
import type { GeneratedProgram } from '@/lib/programGenerator'
import TemplateSyncCard from './TemplateSyncCard'
import { SectionHeader } from './shared'
import { EASE } from './utils'

// ---------------------------------------------------------------------------
// Local program-builder model (local state only — design §4)
// ---------------------------------------------------------------------------
import {
  DAY_LABELS,
  MARKER_LABELS,
  nextId,
  PLACEMENT,
} from './builderModel'
import type { DayMarker, ExRow, ProgramDraft, Session, Week } from './builderModel'
import SessionEditor from './SessionEditor'

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
  onAssign: _onAssign,
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
  const [saving, setSaving] = useState(false)
  const [dbPrograms, setDbPrograms] = useState<LoadedProgram[] | null>(null)
  const [dbLoading, setDbLoading] = useState(false)
  const [dbError, setDbError] = useState<string | null>(null)
  const [clients, setClients] = useState<ClientSummary[]>([])
  const [sheetBusy, setSheetBusy] = useState<string | null>(null)
  const [sheetsConfigured, setSheetsConfigured] = useState<boolean | null>(null)
  const [genOpen, setGenOpen] = useState(false)
  const [fullView, setFullView] = useState(false)
  /** Exercise-name → coaching cue, from the seeded library (loaded once). */
  const [cues, setCues] = useState<Map<string, string> | null>(null)
  useEffect(() => {
    let live = true
    loadExerciseLibrary()
      .then((rows) => {
        if (!live) return
        setCues(
          new Map(
            rows
              .filter((r) => r.coaching_cues)
              .map((r) => [r.name.toLowerCase(), r.coaching_cues as string]),
          ),
        )
      })
      .catch(() => setCues(null))
    return () => {
      live = false
    }
  }, [])
  const cueFor = (name: string) => cues?.get(name.toLowerCase()) ?? null
  /** Week index whose full stacked plan is shown in the right panel. */
  const [weekView, setWeekView] = useState<number | null>(null)
  /** Day cell whose "+" menu is open. */
  const [dayMenu, setDayMenu] = useState<{ weekIdx: number; dayIdx: number } | null>(null)
  /** Pending duplicate-exercise decision. */
  const [dupPending, setDupPending] = useState<{
    exercise: LibraryExercise
    alternatives: LibraryExercise[]
  } | null>(null)
  const customCount = useRef(0)

  /** Fetch the trainer's Supabase programs (incl. seeded GBC template). */
  const loadDbPrograms = async () => {
    setDbLoading(true)
    setDbError(null)
    try {
      setDbPrograms(await loadProgramsFromSupabase())
    } catch (e) {
      setDbError(e instanceof Error ? e.message : 'unknown error')
    } finally {
      setDbLoading(false)
    }
  }

  useEffect(() => {
    loadDbPrograms()
    loadClientsFromSupabase()
      .then(setClients)
      .catch(() => setClients([]))
    getSheetsStatus()
      .then((s) => setSheetsConfigured(s.configured))
      .catch(() => setSheetsConfigured(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Patch sheet link fields on one Supabase program row (local state). */
  const syncSheetFields = (
    programId: string,
    fields: { sheet_id?: string | null; sheet_synced_at?: string | null },
  ) =>
    setDbPrograms(
      (prev) => prev?.map((p) => (p.id === programId ? { ...p, ...fields } : p)) ?? prev,
    )

  const sheetAction = async (p: LoadedProgram, label: string, fn: () => Promise<void>) => {
    if (sheetBusy) return
    setSheetBusy(p.id)
    try {
      await fn()
    } catch (e) {
      toast.error(`${label} failed: ${e instanceof Error ? e.message : 'unknown error'}`)
    } finally {
      setSheetBusy(null)
    }
  }

  const sheetCreate = (p: LoadedProgram) =>
    sheetAction(p, 'Sheet create', async () => {
      const email = window.prompt(
        'Your Google email to share the new sheet with (optional — leave blank to skip):',
      )
      const r = await createSheetForProgram(p.id, email?.trim() || undefined)
      syncSheetFields(p.id, { sheet_id: r.sheet_id, sheet_synced_at: r.sheet_synced_at ?? null })
      if (r.share_warning) {
        toast.warning(`Sheet created — ${r.sheet_url} (sharing failed: ${r.share_warning})`)
      } else {
        toast.success(`Google Sheet created — ${r.sheet_url}`)
      }
    })

  const sheetLink = (p: LoadedProgram) =>
    sheetAction(p, 'Sheet link', async () => {
      const ref = window.prompt('Paste the Google Sheet URL or spreadsheet ID:')
      if (!ref?.trim()) return
      const r = await linkSheetToProgram(p.id, ref.trim())
      syncSheetFields(p.id, { sheet_id: r.sheet_id })
      toast.success(`Linked to Google Sheet — ${r.sheet_url}`)
    })

  const sheetPush = (p: LoadedProgram) =>
    sheetAction(p, 'Push to Sheets', async () => {
      const r = await pushProgramToSheet(p.id)
      syncSheetFields(p.id, { sheet_id: r.sheet_id, sheet_synced_at: r.sheet_synced_at ?? null })
      toast.success(`Pushed "${p.name}" to Google Sheets — ${r.sheet_url}`)
    })

  const sheetPull = (p: LoadedProgram) =>
    sheetAction(p, 'Import from Sheets', async () => {
      const r = await pullProgramFromSheet(p.id)
      syncSheetFields(p.id, { sheet_synced_at: r.sheet_synced_at ?? null })
      await loadDbPrograms()
      toast.success(
        `Imported ${r.workouts_imported} sessions · ${r.exercises_imported} exercises from Sheets — click Load to refresh the editor`,
      )
    })


  /** Project a program's first session into the shared Today's Plan store. */
  const projectToTodaysPlan = (p: LoadedProgram): string | null => {
    const w = p.workouts.find((x) => x.exercises.length > 0)
    if (!w) return null
    const rows: SetRow[] = []
    let seq = 0
    for (const e of w.exercises) {
      const sets = Math.min(Math.max(e.sets ?? 3, 1), 12)
      for (let s = 1; s <= sets; s++) {
        rows.push({
          id: `${PLANNED_SESSION_KEY}-asg-${++seq}`,
          exercise: e.name,
          set: s,
          reps: parseInt(e.reps ?? '', 10) || 0,
          kg: 0,
          rpe: 0,
          done: false,
        })
      }
    }
    vaultActions.setSessionRows(PLANNED_SESSION_KEY, rows)
    return w.name
  }

  /** Assign/unassign a Supabase program to a real client row. */
  const toggleAssign = async (client: ClientSummary) => {
    const prog = dbPrograms?.find((p) => `db-${p.id}` === selectedId)
    if (!prog) return
    const next = prog.client_id === client.id ? null : client.id
    try {
      await assignProgramToClient(prog.id, next)
      setDbPrograms((prev) =>
        prev?.map((p) =>
          p.id === prog.id ? { ...p, client_id: next, client_name: next ? client.full_name : null } : p,
        ) ?? prev,
      )
      if (next) {
        const sessionName = projectToTodaysPlan(prog)
        toast.success(
          `Assigned to ${client.full_name}${
            sessionName ? ` — "${sessionName}" is now in their Today's Plan` : ''
          }`,
        )
      } else {
        toast.success(`Unassigned ${client.full_name}`)
      }
    } catch (e) {
      toast.error(`Assign failed: ${e instanceof Error ? e.message : 'unknown error'}`)
    }
  }

  /** Convert a Supabase program into an editable builder draft. */
  const loadDbProgram = (p: LoadedProgram) => {
    const id = `db-${p.id}`
    const weeksCount = Math.min(Math.max(p.duration_weeks ?? 4, 1), 16)
    const templates: Session[] = p.workouts.map((w) => ({
      id: nextId('sess'),
      title: w.name,
      exercises: [...w.exercises]
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
        .map((e) => ({
          id: nextId('ex'),
          exercise: e.name,
          sets: e.sets ?? 3,
          reps: parseInt(e.reps ?? '', 10) || 0,
          kg: 0,
          rpe: 7,
          rest: e.rest_seconds ?? null,
        })),
    }))
    const cloneForWeek = (): Week => ({
      id: nextId('wk'),
      days: DAY_LABELS.map((label, d) => ({
        id: nextId('day'),
        label,
        sessions: templates
          .map((s, i) => ({ s, i }))
          .filter(({ i }) => i % DAY_LABELS.length === d)
          .map(({ s }) => ({
            ...s,
            id: nextId('sess'),
            exercises: s.exercises.map((e) => ({ ...e, id: nextId('ex') })),
          })),
      })),
    })
    const draft: ProgramDraft = {
      id,
      name: p.name,
      subtitle: `${weeksCount} wk · from Supabase`,
      custom: true,
      weeks: Array.from({ length: weeksCount }, cloneForWeek),
    }
    setDrafts((prev) => ({ ...prev, [id]: draft }))
    setOrder((prev) => (prev.includes(id) ? prev : [...prev, id]))
    setSelectedId(id)
    setSel(null)
    setAssignOpen(false)
    toast.success(`Loaded "${p.name}" — edits write back on Save`)
  }

  useEffect(() => {
    if (focusProgramId && drafts[focusProgramId]) {
      setSelectedId(focusProgramId)
      setSel(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusNonce])

  const draft = drafts[selectedId]

  /** Fullscreen keyboard: ESC exits, arrows move the week panel. */
  useEffect(() => {
    if (!fullView) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullView(false)
      else if (e.key === 'ArrowRight')
        setWeekView((w) => Math.min((w ?? 0) + 1, draft.weeks.length - 1))
      else if (e.key === 'ArrowLeft') setWeekView((w) => Math.max((w ?? 0) - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullView, selectedId])

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

  /** Turn a generated program into a new editable custom draft. */
  const applyGenerated = (g: GeneratedProgram) => {
    customCount.current += 1
    const id = `gen-${customCount.current}`
    const makeWeek = (): Week => ({
      id: nextId('wk'),
      days: DAY_LABELS.map((label, d) => {
        const session = g.weeks[0][d]
        return {
          id: nextId('day'),
          label,
          sessions: session
            ? [
                {
                  id: nextId('sess'),
                  title: session.title,
                  exercises: session.exercises.map((e) => ({
                    id: nextId('ex'),
                    exercise: e.name,
                    sets: e.sets,
                    reps: e.reps,
                    kg: e.kg,
                    rpe: e.rpe,
                    rest: e.rest ?? null,
                    notation: e.notation,
                  })),
                },
              ]
            : [],
        }
      }),
    })
    const draft: ProgramDraft = {
      id,
      name: g.name,
      subtitle: `${g.weeks.length} wk · generated · ${g.goalLabel} · ${g.methodLabel} · ${g.experienceLabel}`,
      custom: true,
      weeks: Array.from({ length: g.weeks.length }, makeWeek),
    }
    setDrafts((prev) => ({ ...prev, [id]: draft }))
    setOrder((prev) => [...prev, id])
    setSelectedId(id)
    setSel(null)
    setAssignOpen(false)
    if (g.warnings.length > 0) {
      toast.warning(`"${g.name}" generated — note: ${g.warnings[0]}${g.warnings.length > 1 ? ` (+${g.warnings.length - 1} more)` : ''}`)
    } else {
      toast.success(`"${g.name}" generated — ${g.weeks.length} weeks ready to edit`)
    }
  }

  /**
   * Map the calendar-style draft onto the Supabase template shape: week 1's
   * sessions become the session templates (workouts), later weeks are the
   * same sessions progressed — the DB stores one template per session title.
   */
  const buildPayload = (d: ProgramDraft): SaveProgramPayload => {
    const week1 = d.weeks[0]
    const seen = new Set<string>()
    const workouts: SaveWorkout[] = []
    week1.days.forEach((day) =>
      day.sessions.forEach((sess) => {
        if (seen.has(sess.title)) return
        seen.add(sess.title)
        workouts.push({
          name: sess.title,
          notes: null,
          exercises: sess.exercises.map((x, i) => ({
            name: x.exercise,
            sets: x.sets || null,
            reps: String(x.reps),
            rest_seconds: x.rest ?? null,
            order_index: i + 1,
            notes: null,
          })),
        })
      }),
    )
    return {
      name: d.name,
      duration_weeks: d.weeks.length,
      frequency_per_week: week1.days.filter((day) => day.sessions.length > 0).length,
      workouts,
    }
  }

  const save = async () => {
    if (saving) return
    setSaving(true)
    try {
      const res = await saveProgramToSupabase(buildPayload(draft))
      toast.success(
        `Saved to Supabase — ${res.workouts_created} workouts · ${res.exercises_created} exercises${res.replaced ? ' (replaced previous version)' : ''}`,
      )
    } catch (e) {
      toast.error(`Save failed: ${e instanceof Error ? e.message : 'unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  /** Append an exercise picked from the seeded Supabase library. */
  const addFromLibrary = async (ex: LibraryExercise) => {
    if (!sel) return
    const week = draft.weeks[sel.weekIdx]
    const usedInWeek = new Set(
      week.days.flatMap((d) => d.sessions.flatMap((s) => s.exercises.map((x) => x.exercise.toLowerCase()))),
    )
    if (usedInWeek.has(ex.name.toLowerCase())) {
      // Suggest variations: same category or same base exercise, not already used this week.
      let library: LibraryExercise[] = []
      try {
        library = await loadExerciseLibrary()
      } catch {
        /* fall through — still let the coach decide */
      }
      const cat = ex.movement_category
      const base = (ex.base_exercise ?? '').toLowerCase()
      const alternatives = library
        .filter(
          (c) =>
            c.name.toLowerCase() !== ex.name.toLowerCase() &&
            !usedInWeek.has(c.name.toLowerCase()) &&
            ((cat && c.movement_category === cat) || (base && (c.base_exercise ?? '').toLowerCase() === base)),
        )
        .slice(0, 4)
      setDupPending({ exercise: ex, alternatives })
      return
    }
    appendExercise(ex)
  }

  const appendExercise = (ex: { name: string }) => {
    if (!sel) return
    updateSession(sel, (s) => ({
      ...s,
      exercises: [
        ...s.exercises,
        { id: nextId('ex'), exercise: ex.name, sets: 3, reps: 10, kg: 0, rpe: 7 },
      ],
    }))
  }

  /** Set (or clear) a non-training marker on a day — rest / cardio / mobility. */
  const setDayMarker = (wi: number, di: number, marker: DayMarker | null) => {
    mutateDraft(selectedId, (d) => ({
      ...d,
      weeks: d.weeks.map((w, wIdx) =>
        wIdx === wi
          ? { ...w, days: w.days.map((day, dIdx) => (dIdx === di ? { ...day, marker } : day)) }
          : w,
      ),
    }))
    setDayMenu(null)
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

  /** Full stacked plan for one week — every day, every session, every exercise. */
  const renderWeekStack = (wi: number, onPickSession?: (s: Sel) => void) => {
    const week = draft.weeks[wi]
    if (!week) return null
    return (
      <div className="space-y-4">
        <p className="text-[10px] uppercase tracking-[0.16em] text-vault-muted">
          Week {wi + 1} · full plan
        </p>
        {week.days.map((day) =>
          day.sessions.length === 0 && !day.marker ? null : (
            <div key={day.id}>
              <p className="mb-1.5 flex items-center gap-2 text-[9px] uppercase tracking-[0.14em] text-vault-faint">
                {day.label}
                {day.marker && (
                  <span className="border border-vault-border px-1 text-[8px] text-vault-gold">
                    {MARKER_LABELS[day.marker]}
                  </span>
                )}
              </p>
              <div className="space-y-1.5">
                {day.sessions.map((sess) => (
                  <button
                    key={sess.id}
                    onClick={() => onPickSession?.({ weekIdx: wi, dayIdx: week.days.indexOf(day), sessionId: sess.id })}
                    className="block w-full border border-vault-border bg-vault-surface p-2.5 text-left transition-colors hover:border-vault-surface-3"
                  >
                    <span className="block truncate text-[11px] font-medium text-white" title={sess.title}>
                      {sess.title}
                    </span>
                    <span className="mt-1 block space-y-0.5 text-[10px] text-vault-faint">
                      {sess.exercises.map((x) => (
                        <span
                          key={x.id}
                          className="block truncate"
                          title={`${x.exercise} — ${x.sets} sets × ${x.reps} reps${x.kg ? ` @ ${x.kg}kg` : ''} · RPE ${x.rpe}`}
                        >
                          {x.notation && <span className="mr-1 text-vault-gold">{x.notation}</span>}
                          {x.exercise}{' '}
                          <span className="tnum">
                            {x.sets}×{x.reps}
                            {x.kg ? ` @${x.kg}kg` : ''}
                          </span>
                        </span>
                      ))}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ),
        )}
      </div>
    )
  }

  /** Week × day calendar grid. `large` = fullscreen rendering (bigger cells, more text). */
  const renderCalendar = (large?: boolean) => (
    <div className={large ? 'h-full overflow-auto pb-2 pr-1' : 'overflow-x-auto pb-2'}>
      <div className="flex gap-3" style={{ minWidth: draft.weeks.length * (large ? 250 : 176) }}>
        {draft.weeks.map((week, wi) => (
          <div
            key={week.id}
            className={`${large ? 'w-60' : 'w-44'} shrink-0 border border-vault-border bg-vault-bg/60`}
          >
            <button
              onClick={() => {
                setWeekView(wi)
                setSel(null)
                setDayMenu(null)
              }}
              title={`View the whole of Week ${wi + 1}`}
              className={`tnum block w-full border-b border-vault-border px-3 py-2 text-left text-[10px] uppercase tracking-[0.16em] transition-colors ${
                weekView === wi && !sel
                  ? 'bg-vault-gold/10 text-vault-gold'
                  : 'text-vault-muted hover:text-white'
              }`}
            >
              W{wi + 1}
            </button>
            <div className="space-y-2 p-2">
              {week.days.map((day, di) => {
                const isTarget = dropTarget?.weekIdx === wi && dropTarget?.dayIdx === di
                const menuOpen = dayMenu?.weekIdx === wi && dayMenu?.dayIdx === di
                return (
                  <div
                    key={day.id}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setDropTarget({ weekIdx: wi, dayIdx: di })
                    }}
                    onDragLeave={() =>
                      setDropTarget((t) => (t?.weekIdx === wi && t?.dayIdx === di ? null : t))
                    }
                    onDrop={(e) => onDrop(e, wi, di)}
                    className={`relative min-h-[52px] border p-1.5 transition-colors ${
                      isTarget
                        ? 'border-dashed border-white bg-white/5'
                        : 'border-vault-border/50'
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[9px] uppercase tracking-[0.14em] text-vault-faint">
                        {day.label}
                      </span>
                      <span className="flex items-center gap-1">
                        {day.marker && (
                          <span className="border border-vault-gold/40 px-1 text-[8px] uppercase tracking-[0.12em] text-vault-gold">
                            {MARKER_LABELS[day.marker]}
                          </span>
                        )}
                        <button
                          onClick={() => setDayMenu(menuOpen ? null : { weekIdx: wi, dayIdx: di })}
                          aria-label={`Add content on ${day.label}`}
                          className={`transition-colors ${menuOpen ? 'text-white' : 'text-vault-faint hover:text-white'}`}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </span>
                    </div>
                    {menuOpen && (
                      <div
                        className="absolute right-0 top-4 z-30 w-44 border border-vault-border bg-vault-surface-2 shadow-lg"
                        onMouseLeave={() => setDayMenu(null)}
                      >
                        {(
                          [
                            { label: 'Workout session', run: () => addSession(wi, di) },
                            { label: 'Rest day', run: () => setDayMarker(wi, di, 'rest') },
                            { label: 'Cardio', run: () => setDayMarker(wi, di, 'cardio') },
                            {
                              label: 'Mobility / recovery',
                              run: () => setDayMarker(wi, di, 'mobility'),
                            },
                            ...(day.marker
                              ? [{ label: 'Clear marker', run: () => setDayMarker(wi, di, null) }]
                              : []),
                          ] as { label: string; run: () => void }[]
                        ).map((opt) => (
                          <button
                            key={opt.label}
                            onClick={opt.run}
                            className="block w-full px-3 py-2 text-left text-[11px] text-white transition-colors hover:bg-vault-surface-3"
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="space-y-1.5">
                      {day.sessions.map((sess) => {
                        const isSel = sel?.sessionId === sess.id
                        return (
                          <motion.div key={sess.id} layout="position">
                            <div
                              draggable
                              onDragStart={(e) =>
                                onDragStart(e, { weekIdx: wi, dayIdx: di, sessionId: sess.id })
                              }
                              onClick={() => {
                                setWeekView(null)
                                setSel({ weekIdx: wi, dayIdx: di, sessionId: sess.id })
                              }}
                              className={`group cursor-grab border p-2 transition-all hover:scale-[1.03] active:cursor-grabbing ${
                                isSel
                                  ? 'border-white bg-vault-surface-2 shadow-[0_0_12px_rgba(255,255,255,0.05)]'
                                  : 'border-vault-border bg-vault-surface hover:border-vault-surface-3'
                              }`}
                            >
                              <div className="flex items-center gap-1.5">
                                <GripVertical className="h-3 w-3 shrink-0 text-vault-faint" />
                                <span
                                  className="min-w-0 flex-1 truncate text-[11px] font-medium text-white"
                                  title={sess.title}
                                >
                                  {sess.title}
                                </span>
                                <span className="hidden items-center gap-0.5 group-hover:flex">
                                  <button
                                    aria-label="Move up"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      reorderSession({ weekIdx: wi, dayIdx: di, sessionId: sess.id }, -1)
                                    }}
                                    className="text-vault-faint hover:text-white"
                                  >
                                    <ArrowUp className="h-3 w-3" />
                                  </button>
                                  <button
                                    aria-label="Move down"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      reorderSession({ weekIdx: wi, dayIdx: di, sessionId: sess.id }, 1)
                                    }}
                                    className="text-vault-faint hover:text-white"
                                  >
                                    <ArrowDown className="h-3 w-3" />
                                  </button>
                                  <button
                                    aria-label="Remove session"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      removeSession({ weekIdx: wi, dayIdx: di, sessionId: sess.id })
                                    }}
                                    className="text-vault-faint hover:text-white"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </span>
                              </div>
                              <p
                                className="mt-1 truncate text-[10px] text-vault-faint"
                                title={sess.exercises
                                  .map(
                                    (x) =>
                                      `${x.notation ? x.notation + ' · ' : ''}${x.exercise} ${x.sets}×${x.reps}`,
                                  )
                                  .join('  |  ')}
                              >
                                {sess.exercises
                                  .map(
                                    (x) =>
                                      `${x.notation ? x.notation + ' ' : ''}${x.exercise} ${x.sets}×${x.reps}`,
                                  )
                                  .slice(0, large ? 3 : 2)
                                  .join(', ')}
                                {sess.exercises.length > (large ? 3 : 2) ? '…' : ''}
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
              disabled={saving}
              className="inline-flex items-center gap-2 border border-white/70 px-4 py-2 text-[11px] uppercase tracking-[0.08em] text-white transition-colors hover:bg-white/10 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" /> {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button
              onClick={() => setGenOpen(true)}
              className="inline-flex items-center gap-2 border border-vault-gold/60 px-4 py-2 text-[11px] uppercase tracking-[0.08em] text-vault-gold transition-colors hover:bg-vault-gold/10"
            >
              <Wand2 className="h-3.5 w-3.5" /> Generate
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
              const isDb = pid.startsWith('db-')
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
                      {isDb ? 'DB' : assignedCount(pid)}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>

          {/* Supabase programs */}
          <div className="mt-4 border border-vault-border">
            <div className="flex items-center justify-between border-b border-vault-border px-3 py-2">
              <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-vault-muted">
                <Database className="h-3 w-3" />
                Supabase programs
              </span>
              <button
                onClick={loadDbPrograms}
                aria-label="Refresh Supabase programs"
                className="text-vault-faint transition-colors hover:text-white"
              >
                <RefreshCw className={`h-3 w-3 ${dbLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="p-2">
              {sheetsConfigured === false && (
                <p className="mb-1 border border-vault-border bg-vault-surface-2/40 px-2 py-1.5 text-[10px] leading-snug text-vault-faint">
                  Google Sheets sync not configured — add a service-account key
                  (GOOGLE_SERVICE_ACCOUNT_JSON) to enable create / push / import.
                </p>
              )}
              {dbLoading && !dbPrograms && (
                <p className="px-2 py-3 text-[11px] text-vault-faint">Loading…</p>
              )}
              {dbError && (
                <div className="px-2 py-2">
                  <p className="text-[11px] text-red-300">Load failed: {dbError}</p>
                  <button
                    onClick={loadDbPrograms}
                    className="mt-1 text-[10px] uppercase tracking-[0.1em] text-vault-muted hover:text-white"
                  >
                    Retry
                  </button>
                </div>
              )}
              {dbPrograms && dbPrograms.length === 0 && !dbLoading && (
                <p className="px-2 py-3 text-[11px] text-vault-faint">
                  No Supabase programs yet — build one and Save.
                </p>
              )}
              {dbPrograms?.map((p) => {
                const id = `db-${p.id}`
                const loaded = Boolean(drafts[id])
                const exCount = p.workouts.reduce((n, w) => n + w.exercises.length, 0)
                const busy = sheetBusy === p.id
                const syncedLabel = p.sheet_synced_at
                  ? new Date(p.sheet_synced_at).toLocaleString()
                  : null
                return (
                  <div
                    key={p.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => loadDbProgram(p)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        loadDbProgram(p)
                      }
                    }}
                    className="group flex w-full cursor-pointer items-center gap-2 border border-transparent px-2 py-2 text-left transition-colors hover:border-vault-border hover:bg-vault-surface-2/60"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] text-white">{p.name}</span>
                      <span className="tnum block text-[10px] text-vault-faint">
                        {p.duration_weeks ?? '?'} wk · {p.workouts.length} sessions · {exCount}{' '}
                        exercises
                        {p.client_name ? ` · ${p.client_name}` : ''}
                      </span>
                    </span>
                    {/* Google Sheets sync controls */}
                    <span
                      className="flex shrink-0 items-center gap-0.5 text-vault-muted"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {busy ? (
                        <RefreshCw className="h-3 w-3 animate-spin text-vault-gold" />
                      ) : p.sheet_id ? (
                        <>
                          <a
                            href={sheetUrl(p.sheet_id)}
                            target="_blank"
                            rel="noreferrer"
                            title={`Open Google Sheet${syncedLabel ? ` · last sync ${syncedLabel}` : ''}`}
                            className="p-1 transition-colors hover:text-white"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                          <button
                            onClick={() => sheetPush(p)}
                            title="Push program → Sheet (overwrites the sheet)"
                            className="p-1 transition-colors hover:text-white"
                          >
                            <Upload className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => sheetPull(p)}
                            title="Import from Sheet → program (overwrites the program)"
                            className="p-1 transition-colors hover:text-white"
                          >
                            <Download className="h-3 w-3" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => sheetCreate(p)}
                            title="Create a Google Sheet for this program"
                            className="p-1 transition-colors hover:text-white"
                          >
                            <FileSpreadsheet className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => sheetLink(p)}
                            title="Link an existing Google Sheet (URL or ID)"
                            className="p-1 transition-colors hover:text-white"
                          >
                            <Link2 className="h-3 w-3" />
                          </button>
                        </>
                      )}
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-[9px] uppercase tracking-[0.1em] text-vault-muted group-hover:text-white">
                      <CloudDownload className="h-3 w-3" />
                      {loaded ? 'Reload' : 'Load'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Shared tracking-template sync (one Google Sheet for the whole template) */}
          <TemplateSyncCard />
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
                <div className="flex items-center gap-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-vault-faint">
                    {draft.weeks.length} weeks · drag sessions between days
                  </p>
                  <button
                    onClick={() => setFullView(true)}
                    title="Fullscreen week view"
                    aria-label="Fullscreen week view"
                    className="text-vault-faint transition-colors hover:text-white"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {renderCalendar(false)}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Detail panel */}
        <div className="w-full shrink-0 border-t border-vault-border pt-4 lg:w-[340px] lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
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
              <SessionEditor
                session={selectedSession}
                onUpdate={(fn) => updateSession(sel, fn)}
                onPickLibrary={addFromLibrary}
                cueFor={cueFor}
                onDuplicateWeek={duplicateWeek}
                onDeleteSession={() => removeSession(sel)}
              />

              {/* Assign dropdown — real Supabase clients for DB-backed programs */}
              <div className="relative mt-5">                <button
                  onClick={() => setAssignOpen((v) => !v)}
                  disabled={!selectedId.startsWith('db-')}
                  className="flex w-full items-center justify-between border border-white/70 px-3 py-2.5 text-[11px] uppercase tracking-[0.08em] text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
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
                      {selectedId.startsWith('db-') ? (
                        clients.length === 0 ? (
                          <p className="px-3 py-2 text-[11px] text-vault-faint">
                            No clients loaded — check the connection.
                          </p>
                        ) : (
                          clients.map((c) => {
                            const prog = dbPrograms?.find((p) => `db-${p.id}` === selectedId)
                            const checked = prog?.client_id === c.id
                            return (
                              <label
                                key={c.id}
                                className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-[12px] text-white transition-colors hover:bg-vault-surface-3"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleAssign(c)}
                                  className="h-3.5 w-3.5 accent-white"
                                />
                                <span className="flex-1 truncate">{c.full_name}</span>
                                {checked && (
                                  <span className="text-[9px] uppercase tracking-[0.1em] text-vault-muted">
                                    Assigned
                                  </span>
                                )}
                              </label>
                            )
                          })
                        )
                      ) : (
                        <p className="px-3 py-2 text-[11px] leading-relaxed text-vault-faint">
                          Save this program to Supabase first — then you can assign it to a
                          client here.
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ) : weekView !== null ? (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-[0.16em] text-vault-muted">
                  Week detail
                </p>
                <button
                  onClick={() => setWeekView(null)}
                  aria-label="Clear week view"
                  className="text-vault-faint hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="max-h-[480px] overflow-y-auto pr-1">
                {renderWeekStack(weekView, (s) => {
                  setWeekView(null)
                  setSel(s)
                })}
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

      <GenerateProgramDialog open={genOpen} onClose={() => setGenOpen(false)} onApply={applyGenerated} />

      {/* Fullscreen week view */}
      {fullView && (
        <div className="fixed inset-0 z-50 flex flex-col bg-vault-bg p-4 lg:p-6">
          <div className="mb-4 flex items-center justify-between border-b border-vault-border pb-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-vault-muted">
                Fullscreen week view
              </p>
              <p className="text-[16px] font-medium text-white">{draft.name}</p>
            </div>
            <button
              onClick={() => setFullView(false)}
              className="inline-flex items-center gap-2 border border-vault-border px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] text-vault-muted transition-colors hover:text-white"
            >
              <Minimize2 className="h-3.5 w-3.5" /> Exit
            </button>
          </div>
          <div className="flex min-h-0 flex-1 gap-5">
            <div className="min-w-0 flex-1">{renderCalendar(true)}</div>
            <div className="hidden w-[340px] shrink-0 overflow-y-auto border-l border-vault-border pl-5 lg:block">
              {sel && selectedSession ? (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <button
                      onClick={() => setSel(null)}
                      className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-vault-muted transition-colors hover:text-white"
                    >
                      <ChevronDown className="h-3 w-3 -rotate-90" /> Week {weekView !== null ? weekView + 1 : sel.weekIdx + 1} plan
                    </button>
                    <button
                      onClick={() => setSel(null)}
                      aria-label="Back to week plan"
                      className="text-vault-faint hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <SessionEditor
                    session={selectedSession}
                    onUpdate={(fn) => updateSession(sel, fn)}
                    onPickLibrary={addFromLibrary}
                    cueFor={cueFor}
                    onDuplicateWeek={duplicateWeek}
                    onDeleteSession={() => {
                      removeSession(sel)
                      setFullView(false)
                    }}
                  />
                </div>
              ) : (
                renderWeekStack(weekView ?? 0, (s) => setSel(s))
              )}
            </div>
          </div>

          {/* Mobile: session editor as a bottom sheet */}
          {sel && selectedSession && (
            <div className="fixed inset-x-0 bottom-0 z-[60] max-h-[72vh] overflow-y-auto border-t border-vault-border bg-vault-surface p-4 lg:hidden">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-[0.16em] text-vault-muted">
                  Session detail
                </p>
                <button
                  onClick={() => setSel(null)}
                  aria-label="Close session"
                  className="text-vault-faint hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <SessionEditor
                session={selectedSession}
                onUpdate={(fn) => updateSession(sel, fn)}
                onPickLibrary={addFromLibrary}
                cueFor={cueFor}
              />
            </div>
          )}
        </div>
      )}

      {/* Duplicate exercise — variation picker */}
      {dupPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm border border-vault-border bg-vault-surface p-5">
            <p className="text-[10px] uppercase tracking-[0.16em] text-vault-muted">
              Duplicate exercise
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-white">
              “{dupPending.exercise.name}” is already used in Week{' '}
              {sel ? sel.weekIdx + 1 : '?'}. Pick a variation instead, or add it anyway.
            </p>
            <div className="mt-3 space-y-1.5">
              {dupPending.alternatives.length === 0 && (
                <p className="text-[11px] text-vault-faint">
                  No unused variations found in the library for this category.
                </p>
              )}
              {dupPending.alternatives.map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    appendExercise(a)
                    setDupPending(null)
                  }}
                  className="block w-full border border-vault-border px-3 py-2 text-left text-[12px] text-white transition-colors hover:border-vault-gold/60 hover:bg-vault-gold/5"
                >
                  {a.name}
                  <span className="block text-[9px] uppercase tracking-[0.1em] text-vault-faint">
                    {[a.movement_category, a.equipment].filter(Boolean).join(' · ')}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => setDupPending(null)}
                className="border border-vault-border px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] text-vault-muted transition-colors hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  appendExercise(dupPending.exercise)
                  setDupPending(null)
                }}
                className="border border-white/70 px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] text-white transition-colors hover:bg-white/10"
              >
                Add anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
