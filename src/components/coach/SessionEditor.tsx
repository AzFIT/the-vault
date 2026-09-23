import { Copy, Plus, Trash2 } from 'lucide-react'
import type { LibraryExercise } from '@/lib/exerciseLibrary'
import {
  nextId,
  nextNotation,
  normalizeNotation,
  NOTATION_OPTIONS,
} from './builderModel'
import type { Session } from './builderModel'
import ExercisePicker from './ExercisePicker'

const GRID = 'grid-cols-[38px_minmax(0,1fr)_28px_32px_42px_28px_32px_14px]'

interface Props {
  session: Session
  /** Apply an immutable update to this session. */
  onUpdate: (fn: (s: Session) => Session) => void
  /** Host handles library picks (duplicate guard lives there). */
  onPickLibrary: (ex: LibraryExercise) => void
  /** Coaching cue lookup from the loaded exercise library. */
  cueFor: (name: string) => string | null
  onDuplicateWeek?: () => void
  onDeleteSession?: () => void
  /** Host-rendered slot (e.g. the assign-to-client dropdown). */
  assignSlot?: React.ReactNode
}

/**
 * Editable session detail: title, exercise table (Poliquin pair + sets/reps/
 * kg/RPE/rest), seeded library picker, coaching cues. Shared by the normal
 * builder panel and the fullscreen week view.
 */
export default function SessionEditor({
  session,
  onUpdate,
  onPickLibrary,
  cueFor,
  onDuplicateWeek,
  onDeleteSession,
  assignSlot,
}: Props) {
  const setNotation = (exId: string, raw: string) => {
    const value = normalizeNotation(raw)
    onUpdate((s) => {
      const idx = s.exercises.findIndex((x) => x.id === exId)
      if (idx < 0) return s
      const exercises = s.exercises.map((x, i) =>
        i === idx ? { ...x, notation: value || undefined } : x,
      )
      // Auto-chain: A → next block B; A1 → next block A2 (only if next is unset).
      const suggested = value ? nextNotation(value) : null
      if (suggested && idx + 1 < exercises.length && !exercises[idx + 1].notation) {
        exercises[idx + 1] = { ...exercises[idx + 1], notation: suggested }
      }
      return { ...s, exercises }
    })
  }

  return (
    <div>
      <input
        value={session.title}
        onChange={(e) => onUpdate((s) => ({ ...s, title: e.target.value }))}
        className="mb-3 w-full border border-vault-border bg-vault-bg px-3 py-2 text-[14px] font-medium text-white focus:border-vault-surface-3 focus:outline-none"
      />

      {/* Exercise table */}
      <div className="space-y-1.5">
        <div className={`grid ${GRID} gap-1 text-[9px] uppercase tracking-[0.12em] text-vault-faint`}>
          <span className="text-center" title="Poliquin pair notation (supersets)">Pair</span>
          <span>Exercise</span>
          <span className="text-center">Sets</span>
          <span className="text-center">Reps</span>
          <span className="text-center">Kg</span>
          <span className="text-center">RPE</span>
          <span className="text-center" title="Rest after set/block (seconds)">Rest</span>
          <span />
        </div>
        {session.exercises.map((ex) => {
          const cue = cueFor(ex.exercise)
          return (
            <div key={ex.id} className={`grid ${GRID} items-start gap-1`}>
              <input
                list="vault-notation-options"
                value={ex.notation ?? ''}
                onChange={(e) => setNotation(ex.id, e.target.value)}
                placeholder="–"
                title="Poliquin pair notation — type or pick: A starts a new block, A1/A2 pair as a superset"
                className="h-6 min-w-0 border border-vault-border/60 bg-vault-bg px-0.5 text-center text-[10px] uppercase leading-none text-vault-gold placeholder:text-vault-faint focus:border-vault-surface-3 focus:outline-none"
              />
              <div className="min-w-0">
                <input
                  value={ex.exercise}
                  title={ex.exercise}
                  onChange={(e) =>
                    onUpdate((s) => ({
                      ...s,
                      exercises: s.exercises.map((x) =>
                        x.id === ex.id ? { ...x, exercise: e.target.value } : x,
                      ),
                    }))
                  }
                  className="h-6 w-full min-w-0 border border-vault-border/60 bg-vault-bg px-1.5 text-[11px] leading-none text-white focus:border-vault-surface-3 focus:outline-none"
                />
                {cue && (
                  <p className="mt-0.5 truncate text-[9px] leading-snug text-vault-faint" title={cue}>
                    {cue}
                  </p>
                )}
              </div>
              {(['sets', 'reps', 'kg', 'rpe'] as const).map((field) => (
                <input
                  key={field}
                  type="number"
                  value={ex[field]}
                  onChange={(e) =>
                    onUpdate((s) => ({
                      ...s,
                      exercises: s.exercises.map((x) =>
                        x.id === ex.id ? { ...x, [field]: Number(e.target.value) } : x,
                      ),
                    }))
                  }
                  className="tnum h-6 min-w-0 w-full border border-vault-border/60 bg-vault-bg px-0.5 text-center text-[11px] leading-none text-white focus:border-vault-surface-3 focus:outline-none"
                />
              ))}
              <input
                type="number"
                value={ex.rest ?? ''}
                placeholder="–"
                onChange={(e) =>
                  onUpdate((s) => ({
                    ...s,
                    exercises: s.exercises.map((x) =>
                      x.id === ex.id
                        ? { ...x, rest: e.target.value === '' ? null : Number(e.target.value) }
                        : x,
                    ),
                  }))
                }
                className="tnum h-6 min-w-0 w-full border border-vault-border/60 bg-vault-bg px-0.5 text-center text-[11px] leading-none text-white placeholder:text-vault-faint focus:border-vault-surface-3 focus:outline-none"
              />
              <button
                aria-label="Remove exercise"
                onClick={() =>
                  onUpdate((s) => ({
                    ...s,
                    exercises: s.exercises.filter((x) => x.id !== ex.id),
                  }))
                }
                className="text-vault-faint hover:text-white"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          )
        })}
        <datalist id="vault-notation-options">
          {NOTATION_OPTIONS.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        <button
          onClick={() =>
            onUpdate((s) => ({
              ...s,
              exercises: [
                ...s.exercises,
                {
                  id: nextId('ex'),
                  exercise: 'New exercise',
                  sets: 3,
                  reps: 8,
                  kg: 20,
                  rpe: 7,
                  rest: null,
                },
              ],
            }))
          }
          className="btn-ghost mt-1 text-[10px]"
        >
          <Plus className="h-3 w-3" /> Add exercise
        </button>
      </div>

      {/* Seeded Supabase exercise library */}
      <ExercisePicker
        onPick={onPickLibrary}
        pickedNames={new Set(session.exercises.map((x) => x.exercise))}
      />

      {assignSlot && <div className="mt-5">{assignSlot}</div>}

      {(onDuplicateWeek || onDeleteSession) && (
        <div className="mt-4 flex items-center gap-4">
          {onDuplicateWeek && (
            <button onClick={onDuplicateWeek} className="btn-ghost text-[10px]">
              <Copy className="h-3 w-3" /> Duplicate week
            </button>
          )}
          {onDeleteSession && (
            <button onClick={onDeleteSession} className="btn-ghost text-[10px]">
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          )}
        </div>
      )}
    </div>
  )
}
