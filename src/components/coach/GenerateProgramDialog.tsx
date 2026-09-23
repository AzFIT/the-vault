import { useState } from 'react'
import { X, Wand2 } from 'lucide-react'
import { loadExerciseLibrary } from '@/lib/exerciseLibrary'
import { generateProgram } from '@/lib/programGenerator'
import type { EquipmentId, ExperienceId, GeneratedProgram, GoalId, MethodId } from '@/lib/programGenerator'
import { GENERATOR_EQUIPMENT_LABELS, GENERATOR_EXPERIENCE_LABELS, GENERATOR_GOALS, GENERATOR_METHODS } from '@/lib/programGenerator'

interface Props {
  open: boolean
  onClose: () => void
  /** Called with the fully generated program on success. */
  onApply: (program: GeneratedProgram) => void
}

const SELECT_CLASS =
  'w-full border border-vault-border bg-vault-bg px-3 py-2 text-[13px] text-white focus:border-vault-surface-3 focus:outline-none'
const LABEL_CLASS = 'mb-1 block text-[10px] uppercase tracking-[0.16em] text-vault-muted'

const METHOD_GROUPS: { id: 'strength' | 'conditioning' | 'performance'; label: string }[] = [
  { id: 'strength', label: 'Classic Strength Protocols' },
  { id: 'conditioning', label: 'Conditioning & Intervals' },
  { id: 'performance', label: 'Performance & Skill' },
]

const NOTATION_PREVIEW: Record<string, string> = {
  letter: 'A · B · C…',
  pair: 'A1/A2 pairing',
  trio: 'A1/A2/A3 grouping',
  circuit: 'A1–A6 circuit',
  none: 'no notation',
}

export default function GenerateProgramDialog({ open, onClose, onApply }: Props) {
  const [goal, setGoal] = useState<GoalId>('muscle')
  const [experience, setExperience] = useState<ExperienceId>('beginner')
  const [frequency, setFrequency] = useState<2 | 3 | 4>(3)
  const [equipment, setEquipment] = useState<EquipmentId>('full')
  const [injuries, setInjuries] = useState('')
  const [programName, setProgramName] = useState('')
  const [method, setMethod] = useState<MethodId>('straight')
  const [exCount, setExCount] = useState(GENERATOR_METHODS.straight.defaultCount)
  const [weeks, setWeeks] = useState(4)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const methodDef = GENERATOR_METHODS[method]
  const totalExercises = frequency * exCount

  const changeMethod = (id: MethodId) => {
    setMethod(id)
    setExCount(GENERATOR_METHODS[id].defaultCount) // snap the count to the method's sweet spot
  }

  const submit = async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const library = await loadExerciseLibrary()
      if (library.length === 0) throw new Error('exercise library is empty — check Supabase connection')
      const result = generateProgram(
        { goal, experience, frequency, equipment, injuries, method, exercisesPerSession: exCount, weeks },
        library,
      )
      if (programName.trim()) result.name = programName.trim()
      onApply(result)
      setBusy(false)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'generation failed')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md border border-vault-border bg-vault-surface">
        <div className="flex items-center justify-between border-b border-vault-border px-4 py-3">
          <span className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-vault-muted">
            <Wand2 className="h-3.5 w-3.5 text-vault-gold" />
            Generate Program
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-vault-faint transition-colors hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 p-4">
          <p className="text-[11px] leading-snug text-vault-faint">
            Builds a full draft from the exercise library. Working loads are left blank
            for you to set — progression comes later.
          </p>

          <div>
            <label className={LABEL_CLASS} htmlFor="gen-method">Training method</label>
            <select
              id="gen-method"
              className={SELECT_CLASS}
              value={method}
              onChange={(e) => changeMethod(e.target.value as MethodId)}
            >
              {METHOD_GROUPS.map((group) => (
                <optgroup key={group.id} label={group.label}>
                  {(Object.entries(GENERATOR_METHODS) as [MethodId, (typeof GENERATOR_METHODS)[MethodId]][])
                    .filter(([, def]) => def.group === group.id)
                    .map(([id, def]) => (
                      <option key={id} value={id}>{def.label}</option>
                    ))}
                </optgroup>
              ))}
            </select>
            <p className="mt-1 text-[10px] text-vault-faint">
              {methodDef.note ?? `${NOTATION_PREVIEW[methodDef.notation]} · ${methodDef.defaultCount} exercises/session`}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLASS} htmlFor="gen-count">Exercises / session</label>
              <select
                id="gen-count"
                className={SELECT_CLASS}
                value={exCount}
                onChange={(e) => setExCount(Number(e.target.value))}
              >
                {[3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>{n} exercises</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL_CLASS} htmlFor="gen-weeks">Program length</label>
              <select
                id="gen-weeks"
                className={SELECT_CLASS}
                value={weeks}
                onChange={(e) => setWeeks(Number(e.target.value))}
              >
                {[2, 3, 4, 5, 6, 8].map((n) => (
                  <option key={n} value={n}>{n} weeks</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={LABEL_CLASS} htmlFor="gen-goal">Goal</label>
            <select id="gen-goal" className={SELECT_CLASS} value={goal} onChange={(e) => setGoal(e.target.value as GoalId)}>
              {Object.entries(GENERATOR_GOALS).map(([id, g]) => (
                <option key={id} value={id}>{g.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLASS} htmlFor="gen-exp">Experience</label>
              <select id="gen-exp" className={SELECT_CLASS} value={experience} onChange={(e) => setExperience(e.target.value as ExperienceId)}>
                {Object.entries(GENERATOR_EXPERIENCE_LABELS).map(([id, l]) => (
                  <option key={id} value={id}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL_CLASS} htmlFor="gen-freq">Days / week</label>
              <select id="gen-freq" className={SELECT_CLASS} value={frequency} onChange={(e) => setFrequency(Number(e.target.value) as 2 | 3 | 4)}>
                <option value={2}>2 days</option>
                <option value={3}>3 days</option>
                <option value={4}>4 days</option>
              </select>
            </div>
          </div>

          <p className="border border-vault-border/60 bg-vault-bg px-3 py-2 text-[10px] leading-snug text-vault-muted">
            ≈ {totalExercises} exercises across {weeks} weeks · {methodDef.label} · {NOTATION_PREVIEW[methodDef.notation]}
          </p>

          <div>
            <label className={LABEL_CLASS} htmlFor="gen-eq">Available equipment</label>
            <select id="gen-eq" className={SELECT_CLASS} value={equipment} onChange={(e) => setEquipment(e.target.value as EquipmentId)}>
              {Object.entries(GENERATOR_EQUIPMENT_LABELS).map(([id, l]) => (
                <option key={id} value={id}>{l}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={LABEL_CLASS} htmlFor="gen-inj">Injuries / limitations (optional)</label>
            <input
              id="gen-inj"
              className={SELECT_CLASS}
              placeholder="e.g. knee pain, lower back"
              value={injuries}
              onChange={(e) => setInjuries(e.target.value)}
            />
            <p className="mt-1 text-[10px] text-vault-faint">
              Affected lifts are swapped out or flagged in the summary.
            </p>
          </div>

          <div>
            <label className={LABEL_CLASS} htmlFor="gen-name">Program name (optional)</label>
            <input
              id="gen-name"
              className={SELECT_CLASS}
              placeholder={`Generated — ${GENERATOR_GOALS[goal].label}`}
              value={programName}
              onChange={(e) => setProgramName(e.target.value)}
            />
          </div>

          {error && <p className="border border-red-500/40 bg-red-500/10 px-3 py-2 text-[11px] text-red-300">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={onClose}
              className="border border-vault-border px-4 py-2 text-[11px] uppercase tracking-[0.08em] text-vault-muted transition-colors hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={busy}
              className="inline-flex items-center gap-2 bg-vault-gold px-4 py-2 text-[11px] uppercase tracking-[0.08em] text-vault-btn-text transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              <Wand2 className="h-3.5 w-3.5" />
              {busy ? 'Generating…' : 'Generate draft'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
