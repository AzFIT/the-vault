import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Bookmark } from 'lucide-react'
import InputConsole from '@/components/plan/InputConsole'
import Report from '@/components/plan/Report'
import '@/components/plan/print.css'
import type { BlueprintInputs } from '@/lib/planBlueprint'
import { computeBlueprint } from '@/lib/planBlueprint'
import { coachClients, demoClient, latestLog } from '@/data/mock'

/**
 * Plan Summary — /plan-summary (design/plan-summary.md).
 * Sticky input console + live report document driven entirely by the
 * planBlueprint engine. window.print() → ink-friendly PDF.
 */

/* ── mock client profiles (deterministic; Rachel from mock.ts) ── */
type Profile = Pick<
  BlueprintInputs,
  'gender' | 'age' | 'heightCm' | 'weightKg' | 'bodyFatPct' | 'goalType' | 'trainerSessionsPerWeek' | 'soloSessionsPerWeek'
>

const GOAL_MAP: Record<string, string> = {
  'Reduce body fat': 'reduce_body_fat',
  'Build strength': 'increase_strength',
  'Hyrox race prep': 'improve_fitness',
  'Muscle gain': 'build_muscle',
  'Postnatal return': 'reduce_body_fat',
  'General fitness': 'improve_fitness',
  'Return from injury': 'custom',
  'Menopause strength': 'increase_strength',
}

const BODY_STATS: Record<string, Pick<Profile, 'gender' | 'heightCm' | 'weightKg' | 'bodyFatPct'>> = {
  'rachel-cheung': { gender: 'female', heightCm: demoClient.heightCm, weightKg: latestLog().weightKg, bodyFatPct: 24 },
  'marcus-lau': { gender: 'male', heightCm: 178, weightKg: 86.4, bodyFatPct: 19 },
  'priya-sharma': { gender: 'female', heightCm: 163, weightKg: 58.2, bodyFatPct: null },
  'tom-whitfield': { gender: 'male', heightCm: 183, weightKg: 82.7, bodyFatPct: null },
  'karen-ng': { gender: 'female', heightCm: 160, weightKg: 61.5, bodyFatPct: 27 },
  'jason-ho': { gender: 'male', heightCm: 175, weightKg: 71.3, bodyFatPct: null },
  'amelia-wong': { gender: 'female', heightCm: 167, weightKg: 66.8, bodyFatPct: 25 },
  'david-chan': { gender: 'male', heightCm: 176, weightKg: 79.9, bodyFatPct: 22 },
  'sophie-leung': { gender: 'female', heightCm: 164, weightKg: 57.6, bodyFatPct: null },
  'kevin-tsang': { gender: 'male', heightCm: 172, weightKg: 68.1, bodyFatPct: null },
  'michelle-yip': { gender: 'female', heightCm: 161, weightKg: 63.4, bodyFatPct: 29 },
  'alex-fong': { gender: 'male', heightCm: 180, weightKg: 74.2, bodyFatPct: null },
}

const TIER_SESSIONS: Record<string, [number, number]> = {
  'PT 3x/wk': [3, 1],
  'PT 2x/wk': [2, 1],
  "Women's Programme": [2, 1],
  'Open Gym': [0, 3],
}

function defaultsFor(clientId: string): BlueprintInputs {
  const client = coachClients.find((c) => c.id === clientId) ?? coachClients[0]
  const stats = BODY_STATS[client.id] ?? BODY_STATS['rachel-cheung']
  const [pt, solo] = TIER_SESSIONS[client.tier] ?? [2, 1]
  return {
    gender: stats.gender,
    age: client.age,
    heightCm: stats.heightCm,
    weightKg: stats.weightKg,
    bodyFatPct: stats.bodyFatPct,
    activityKey: 'office',
    trainerSessionsPerWeek: pt,
    soloSessionsPerWeek: solo,
    stepTarget: 9000,
    goalType: GOAL_MAP[client.goal] ?? 'reduce_body_fat',
    pace: 'standard',
    programWeeks: 16,
    dietBreak: true,
    trainerName: 'Dan Kan',
    businessName: 'The Vault Fitness',
  }
}

const inputCls =
  'tnum border border-vault-border bg-vault-surface-2 px-3 py-2 text-[14px] text-white outline-none transition-colors focus:border-white'

export default function PlanSummary() {
  const [clientId, setClientId] = useState(demoClient.id)
  const [inputs, setInputs] = useState<BlueprintInputs>(() => defaultsFor(demoClient.id))
  const [saved, setSaved] = useState(false)

  const client = coachClients.find((c) => c.id === clientId) ?? coachClients[0]
  const result = useMemo(() => computeBlueprint(inputs), [inputs])

  const dateLabel = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const patch = (p: Partial<BlueprintInputs>) => {
    setSaved(false)
    setInputs((prev) => ({ ...prev, ...p }))
  }

  const selectClient = (id: string) => {
    setClientId(id)
    setInputs(defaultsFor(id))
    setSaved(false)
  }

  return (
    <div className="space-y-6">
      {/* §1 — client context bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="app-card print-hidden flex flex-wrap items-center justify-between gap-4 px-5 py-4"
      >
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <p className="eyebrow">Plan Summary</p>
            <h2 className="mt-0.5 text-[22px] font-bold leading-tight text-white">The Vault Blueprint</h2>
          </div>
          <select
            value={clientId}
            onChange={(e) => selectClient(e.target.value)}
            aria-label="Select client"
            className={`${inputCls} min-w-[200px]`}
          >
            {coachClients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.goal}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-[12px] text-vault-muted">
            Prepared by <span className="text-white">{inputs.trainerName}</span> · {inputs.businessName} · {dateLabel}
          </p>
          <button
            onClick={() => setSaved(true)}
            className="btn-ghost flex items-center gap-2"
            aria-live="polite"
          >
            <Bookmark className={`h-4 w-4 ${saved ? 'fill-white text-white' : ''}`} strokeWidth={1.5} />
            {saved ? 'Saved to client' : 'Save to client'}
          </button>
        </div>
      </motion.div>

      {/* split workspace — sticky console + live report */}
      <div className="grid items-start gap-6 lg:grid-cols-[380px_1fr]">
        <div className="lg:sticky lg:top-24">
          <InputConsole
            inputs={inputs}
            clamped={result.calories.clampedByFloor}
            onChange={patch}
            onPrint={() => window.print()}
            onReset={() => selectClient(clientId)}
          />
        </div>

        {/* cross-fade on client switch; recompute pulse on change */}
        <div className="relative">
          <motion.span
            key={JSON.stringify(inputs)}
            initial={{ opacity: 1, scale: 1 }}
            animate={{ opacity: 0, scale: 1.8 }}
            transition={{ duration: 0.6 }}
            className="print-hidden absolute -left-2 top-2 z-10 h-1.5 w-1.5 rounded-full bg-white"
            aria-hidden
          />
          <motion.div
            key={clientId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Report result={result} inputs={inputs} clientName={client.name} dateLabel={dateLabel} />
          </motion.div>
        </div>
      </div>
    </div>
  )
}
