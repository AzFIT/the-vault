import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Minus, Plus, RotateCcw, FileDown } from 'lucide-react'
import type { BlueprintInputs } from '@/lib/planBlueprint'
import { ACTIVITY_PRESETS, PACE_DEFICITS } from '@/lib/planBlueprint'

/* ── small primitives ──────────────────────────────────────── */
const inputCls =
  'tnum w-full border border-vault-border bg-vault-surface-2 px-3 py-2 text-[14px] text-white outline-none transition-colors focus:border-white'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-vault-muted">{label}</span>
      {children}
    </label>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="border-t border-vault-border px-5 py-5 first:border-0 first:pt-0">
      <legend className="sr-only">{title}</legend>
      <p className="mb-4 text-[13px] uppercase tracking-[0.18em] text-white">{title}</p>
      <div className="space-y-4">{children}</div>
    </fieldset>
  )
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex border border-vault-border p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`flex-1 px-2 py-1.5 text-[12px] uppercase tracking-[0.08em] transition-colors ${
            value === o.value ? 'bg-white text-vault-btn-text' : 'text-vault-muted hover:text-white'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Stepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center border border-vault-border">
      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease"
        className="px-3 py-2 text-vault-muted transition-colors hover:text-white disabled:opacity-30"
      >
        <Minus className="h-3.5 w-3.5" />
      </motion.button>
      <span className="tnum flex-1 text-center text-[14px] text-white">{value}</span>
      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase"
        className="px-3 py-2 text-vault-muted transition-colors hover:text-white disabled:opacity-30"
      >
        <Plus className="h-3.5 w-3.5" />
      </motion.button>
    </div>
  )
}

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between"
    >
      <span className="text-[13px] text-white">{label}</span>
      <span
        className={`relative h-5 w-9 rounded-full transition-colors ${checked ? 'bg-white' : 'bg-viz-track'}`}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          className={`absolute top-0.5 h-4 w-4 rounded-full ${
            checked ? 'right-0.5 bg-vault-btn-text' : 'left-0.5 bg-vault-muted'
          }`}
        />
      </span>
    </button>
  )
}

function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
}: {
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  format: (v: number) => string
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="tnum text-[14px] text-white">{format(value)}</span>
        <span className="tnum text-[11px] text-vault-faint">
          {format(min)} – {format(max)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-white"
      />
    </div>
  )
}

/* ── the console ───────────────────────────────────────────── */
const GOAL_OPTIONS = [
  { value: 'lose_weight', label: 'Lose weight' },
  { value: 'reduce_body_fat', label: 'Reduce body fat' },
  { value: 'build_muscle', label: 'Build muscle' },
  { value: 'increase_strength', label: 'Increase strength' },
  { value: 'improve_fitness', label: 'Improve fitness' },
  { value: 'custom', label: 'Custom' },
]

export default function InputConsole({
  inputs,
  clamped,
  onChange,
  onPrint,
  onReset,
}: {
  inputs: BlueprintInputs
  clamped: boolean
  onChange: (patch: Partial<BlueprintInputs>) => void
  onPrint: () => void
  onReset: () => void
}) {
  const set = onChange
  const num = (v: string, fallback: number) => {
    const n = Number(v)
    return Number.isFinite(n) && v !== '' ? n : fallback
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="app-card print-hidden overflow-hidden py-5"
    >
      {/* BODY */}
      <Group title="Body">
        <Field label="Gender">
          <Segmented
            options={[
              { value: 'female', label: 'F' },
              { value: 'male', label: 'M' },
            ]}
            value={inputs.gender === 'male' ? 'male' : 'female'}
            onChange={(v) => set({ gender: v })}
          />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Age">
            <input
              type="number"
              className={inputCls}
              value={inputs.age}
              min={14}
              max={90}
              onChange={(e) => set({ age: num(e.target.value, inputs.age) })}
            />
          </Field>
          <Field label="Height cm">
            <input
              type="number"
              className={inputCls}
              value={inputs.heightCm}
              min={130}
              max={220}
              onChange={(e) => set({ heightCm: num(e.target.value, inputs.heightCm) })}
            />
          </Field>
          <Field label="Weight kg">
            <input
              type="number"
              className={inputCls}
              value={inputs.weightKg}
              min={35}
              max={200}
              step={0.1}
              onChange={(e) => set({ weightKg: num(e.target.value, inputs.weightKg) })}
            />
          </Field>
        </div>
        <div className="space-y-3">
          <Switch
            checked={inputs.bodyFatPct != null}
            onChange={(v) => set({ bodyFatPct: v ? 24 : null })}
            label="Body fat % known"
          />
          {inputs.bodyFatPct != null && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="bg-white px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-vault-btn-text">
                  Lean mass mode · Katch-McArdle
                </span>
              </div>
              <Slider
                value={inputs.bodyFatPct}
                min={8}
                max={45}
                onChange={(v) => set({ bodyFatPct: v })}
                format={(v) => `${v}%`}
              />
            </div>
          )}
        </div>
      </Group>

      {/* ACTIVITY */}
      <Group title="Activity">
        <Field label="Activity preset">
          <select
            className={inputCls}
            value={inputs.activityKey}
            onChange={(e) => set({ activityKey: e.target.value as BlueprintInputs['activityKey'] })}
          >
            {Object.entries(ACTIVITY_PRESETS).map(([k, p]) => (
              <option key={k} value={k}>
                {p.label} — ×{p.multiplier}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="PT sessions / wk">
            <Stepper value={inputs.trainerSessionsPerWeek} min={0} max={5} onChange={(v) => set({ trainerSessionsPerWeek: v })} />
          </Field>
          <Field label="Solo sessions / wk">
            <Stepper value={inputs.soloSessionsPerWeek} min={0} max={7} onChange={(v) => set({ soloSessionsPerWeek: v })} />
          </Field>
        </div>
        <Field label="Daily step target">
          <Slider
            value={inputs.stepTarget}
            min={4000}
            max={15000}
            step={500}
            onChange={(v) => set({ stepTarget: v })}
            format={(v) => v.toLocaleString()}
          />
        </Field>
      </Group>

      {/* GOAL */}
      <Group title="Goal">
        <Field label="Goal type">
          <select
            className={inputCls}
            value={inputs.goalType}
            onChange={(e) => set({ goalType: e.target.value })}
          >
            {GOAL_OPTIONS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Pace">
          <Segmented
            options={(
              [
                ['conservative', 'Conservative'],
                ['standard', 'Standard'],
                ['aggressive', 'Aggressive'],
              ] as const
            ).map(([v, label]) => ({
              value: v,
              label: `${label} −${Math.round(PACE_DEFICITS[v] * 100)}%`,
            }))}
            value={inputs.pace}
            onChange={(v) => set({ pace: v })}
          />
        </Field>
        {clamped && (
          <p className="border border-dashed border-viz-3 px-3 py-2 text-[12px] text-vault-muted">
            Calorie floor applied (BMR × 1.05) — target raised to keep you safe.
          </p>
        )}
      </Group>

      {/* PROGRAM */}
      <Group title="Program">
        <Field label="Duration">
          <Slider
            value={inputs.programWeeks}
            min={4}
            max={24}
            onChange={(v) => set({ programWeeks: v })}
            format={(v) => `${v} weeks`}
          />
        </Field>
        <Switch
          checked={inputs.dietBreak}
          onChange={(v) => set({ dietBreak: v })}
          label="Diet break mid-program"
        />
        <Field label="Trainer name">
          <input
            type="text"
            className={inputCls}
            value={inputs.trainerName}
            onChange={(e) => set({ trainerName: e.target.value })}
          />
        </Field>
        <Field label="Business name">
          <input
            type="text"
            className={inputCls}
            value={inputs.businessName ?? ''}
            onChange={(e) => set({ businessName: e.target.value })}
          />
        </Field>
      </Group>

      {/* ACTIONS */}
      <Group title="Actions">
        <button
          type="button"
          onClick={onPrint}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-[13px] uppercase tracking-[0.08em] text-vault-btn-text transition-all hover:-translate-y-px hover:bg-vault-btn-hover active:scale-[0.98]"
        >
          <FileDown className="h-4 w-4" strokeWidth={1.5} />
          Generate PDF
        </button>
        <div className="flex items-center justify-between">
          <button type="button" onClick={onReset} className="btn-ghost">
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
          <span className="flex items-center gap-1.5 text-[11px] text-vault-faint">
            <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden />
            Synced · just now
          </span>
        </div>
      </Group>
    </motion.div>
  )
}
