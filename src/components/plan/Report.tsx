/**
 * The Vault Blueprint — live report document (design/plan-summary.md §3).
 * Inverted "paper": #2c2728 document on the #231f20 canvas; a print
 * stylesheet (print.css) inverts it to white paper / black ink for PDF.
 * All numbers come from the planBlueprint engine — the UI only renders.
 */
import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import type { BlueprintInputs, BlueprintResult } from '@/lib/planBlueprint'
import { FEMALE_REASSURANCE, MACRO_STYLES, macroGrams } from '@/lib/planBlueprint'
import { AnimatedNumber } from '@/components/analytics/shared'

/* Viz ramp via CSS vars so the app-black shell re-tones the document canvas */
const VIZ = {
  1: 'var(--viz-1)',
  2: 'var(--viz-2)',
  3: 'var(--viz-3)',
  4: 'var(--viz-4)',
  track: 'var(--viz-track)',
}

const fadeUp = (i: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: i * 0.08, duration: 0.45, ease: 'easeOut' as const },
})

function BlockTitle({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="mb-5">
      <p className="eyebrow report-muted">{kicker}</p>
      <h3 className="mt-1 text-[22px] font-bold text-white report-ink">{title}</h3>
    </div>
  )
}

/* ── Block 1 — numbers + calorie ladder ────────────────────── */
function NumbersBlock({ result }: { result: BlueprintResult }) {
  const c = result.calories
  const cards = [
    {
      label: 'BMR',
      value: c.bmr,
      caption: c.bmrMethod === 'katch-mcardle' ? 'Katch-McArdle' : 'Mifflin-St Jeor',
    },
    { label: 'TDEE', value: c.tdee, caption: 'maintenance, activity-adjusted' },
    { label: 'Target', value: c.target, caption: `−${Math.round(c.deficitPct * 100)}% ${result.goal.pace} pace` },
  ]
  const lo = Math.min(c.bmr, c.target) - 60
  const hi = Math.max(c.tdee, c.maintenance) + 60
  const pos = (v: number) => `${Math.min(100, Math.max(0, ((v - lo) / (hi - lo)) * 100))}%`
  const markers = [
    { label: 'BMR', v: c.bmr, strong: false },
    { label: 'Target', v: c.target, strong: true },
    { label: 'TDEE', v: c.tdee, strong: false },
  ]

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="border border-vault-border p-5 report-border">
            <p className="eyebrow report-muted">{card.label}</p>
            <p className="mt-2 text-white report-ink">
              <AnimatedNumber value={card.value} className="text-[30px] font-bold" duration={1} />{' '}
              <span className="text-[13px] font-normal text-vault-muted report-muted">kcal</span>
            </p>
            <p className="mt-1 text-[12px] text-vault-muted report-muted">{card.caption}</p>
          </div>
        ))}
      </div>

      {/* calorie ladder */}
      <div className="relative mt-10 h-12">
        <div className="absolute left-0 right-0 top-1/2 h-px bg-white/25 report-hairline" />
        {markers.map((m) => (
          <motion.div
            key={m.label}
            animate={{ left: pos(m.v) }}
            transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ left: pos(m.v) }}
          >
            <div
              className={`mx-auto w-[2px] ${m.strong ? 'h-6 bg-white report-bar-fill' : 'h-4 bg-white/50 report-bar-fill-soft'}`}
            />
            <p
              className={`tnum mt-1 whitespace-nowrap text-center text-[11px] uppercase tracking-[0.12em] ${
                m.strong ? 'text-white report-ink' : 'text-vault-muted report-muted'
              }`}
            >
              {m.label} {m.v.toLocaleString()}
            </p>
          </motion.div>
        ))}
      </div>

      {c.leanMassKg != null && c.fatMassKg != null && (
        <p className="tnum mt-6 text-[13px] text-vault-muted report-muted">
          <span className="text-white report-ink">{c.leanMassKg} kg lean</span> · {c.fatMassKg} kg fat
          {result.assessment.bodyFatPct != null && ` · ${result.assessment.bodyFatPct}% body fat`} · BMI{' '}
          {result.assessment.bmi}
        </p>
      )}
      <p className="mt-4 border-t border-vault-border pt-3 text-[12px] text-vault-faint report-border report-muted">
        {c.clampedByFloor
          ? 'Calorie floor applied (BMR × 1.05) — the pace deficit was clamped to keep intake safe. '
          : `Maintenance rounded to the nearest 50 kcal; target to the nearest 10. Deficit ${c.deficitPerDay.toLocaleString()} kcal/day. `}
        Test, don't guess.
      </p>
    </div>
  )
}

/* ── Block 2 — macro targets + style table ─────────────────── */
function MacrosBlock({ result }: { result: BlueprintResult }) {
  const c = result.calories
  const style = MACRO_STYLES.find((s) => s.key === result.recommended.key) ?? MACRO_STYLES[0]
  const g = macroGrams(c.target, style.split)
  const cols = [
    { label: 'Protein', grams: g.proteinG, kcal: g.proteinG * 4, pct: style.split[0], color: VIZ[1] },
    { label: 'Carbs', grams: g.carbsG, kcal: g.carbsG * 4, pct: style.split[1], color: VIZ[2] },
    { label: 'Fat', grams: g.fatsG, kcal: g.fatsG * 9, pct: style.split[2], color: VIZ[3] },
  ]

  return (
    <div>
      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="flex-1 space-y-5">
          {cols.map((col) => (
            <div key={col.label}>
              <div className="flex items-baseline justify-between">
                <span className="text-[12px] uppercase tracking-[0.16em] text-vault-muted report-muted">
                  {col.label}
                </span>
                <span className="tnum text-[12px] text-vault-muted report-muted">
                  {col.kcal.toLocaleString()} kcal · {col.pct}%
                </span>
              </div>
              <p className="tnum mt-0.5 text-[26px] font-bold leading-none text-white report-ink">
                {col.grams}
                <span className="text-[14px] font-normal text-vault-muted report-muted"> g</span>
              </p>
              <motion.div
                animate={{ width: `${col.pct}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="mt-2 h-1 report-bar-fill"
                style={{ background: col.color }}
              />
            </div>
          ))}
        </div>
        <div className="relative h-[140px] w-[140px] shrink-0 self-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={cols}
                dataKey="kcal"
                nameKey="label"
                innerRadius={46}
                outerRadius={62}
                paddingAngle={4}
                cornerRadius={5}
                strokeWidth={0}
                isAnimationActive
                animationDuration={800}
              >
                {cols.map((col) => (
                  <Cell key={col.label} fill={col.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="tnum text-[18px] font-bold text-white report-ink">{c.target.toLocaleString()}</span>
            <span className="text-[10px] uppercase tracking-[0.14em] text-vault-muted report-muted">kcal</span>
          </div>
        </div>
      </div>

      <p className="mt-5 text-[13px] text-vault-muted report-muted">
        Hit protein first. Carbs fuel training days. Fat supports hormones. Recommended split:{' '}
        <span className="text-white report-ink">{result.recommended.name}</span> — {result.recommended.reason}. Protein
        floor: <span className="text-white report-ink">{result.proteinFloor.grams} g</span> ({result.proteinFloor.basis}
        ).
      </p>

      {/* five macro styles at target & maintenance */}
      <div className="mt-6 overflow-x-auto">
        <table className="tnum w-full min-w-[560px] text-[13px]">
          <thead>
            <tr className="border-b border-vault-border text-left text-[11px] uppercase tracking-[0.14em] text-vault-muted report-border report-muted">
              <th className="py-2 pr-3 font-normal">Style</th>
              <th className="py-2 pr-3 font-normal">Split P/C/F</th>
              <th className="py-2 pr-3 text-right font-normal">At target {c.target.toLocaleString()}</th>
              <th className="py-2 pr-3 text-right font-normal">At maintenance {c.maintenance.toLocaleString()}</th>
              <th className="py-2 text-right font-normal">Note</th>
            </tr>
          </thead>
          <tbody>
            {result.macroStyles.map((s) => (
              <tr
                key={s.key}
                className={`border-b border-vault-border/60 text-white last:border-0 report-border report-ink ${
                  s.key === result.recommended.key ? 'bg-white/[0.05] report-row-rec' : ''
                }`}
              >
                <td className="py-2.5 pr-3">
                  {s.name}
                  {s.key === result.recommended.key && (
                    <span className="ml-2 bg-white px-1.5 py-px text-[9px] font-medium uppercase tracking-[0.1em] text-vault-btn-text report-pill">
                      Recommended
                    </span>
                  )}
                </td>
                <td className="py-2.5 pr-3 text-vault-muted report-muted">
                  {s.split[0]}/{s.split[1]}/{s.split[2]}
                </td>
                <td className="py-2.5 pr-3 text-right">
                  {s.atTarget.proteinG}P · {s.atTarget.carbsG}C · {s.atTarget.fatsG}F
                </td>
                <td className="py-2.5 pr-3 text-right text-vault-muted report-muted">
                  {s.atMaintenance.proteinG}P · {s.atMaintenance.carbsG}C · {s.atMaintenance.fatsG}F
                </td>
                <td className="py-2.5 text-right text-[12px] text-vault-muted report-muted">
                  {s.atTarget.belowFloor ? (
                    <span className="border border-dashed border-viz-3 px-1.5 py-0.5 report-border">below protein floor</span>
                  ) : (
                    'meets floor'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── Goal + expected outcomes ──────────────────────────────── */
function OutcomesBlock({ result }: { result: BlueprintResult }) {
  const o = result.outcomes
  return (
    <div>
      <p className="text-[15px] leading-relaxed text-white report-ink">{result.goal.statement}</p>
      {o && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Weekly rate', value: `${o.weeklyLossRange[0]}–${o.weeklyLossRange[1]} kg` },
            { label: 'Projected fat loss', value: `${o.projectedFatLossKg} kg` },
            { label: 'End weight', value: `${o.endWeightKg} kg` },
            {
              label: 'End body fat',
              value: o.endBodyFatPct != null ? `${o.endBodyFatPct}%` : '—',
            },
          ].map((s) => (
            <div key={s.label} className="border border-vault-border p-4 report-border">
              <p className="text-[11px] uppercase tracking-[0.14em] text-vault-muted report-muted">{s.label}</p>
              <p className="tnum mt-1 text-[18px] font-bold text-white report-ink">{s.value}</p>
            </div>
          ))}
        </div>
      )}
      {result.femaleReassurance && (
        <p className="mt-4 border-l-2 border-white pl-4 text-[13px] leading-relaxed text-vault-muted report-muted report-hairline-l">
          {FEMALE_REASSURANCE}
        </p>
      )}
    </div>
  )
}

/* ── Block 3 — roadmap ─────────────────────────────────────── */
function RoadmapBlock({ result }: { result: BlueprintResult }) {
  return (
    <div className="relative pl-6">
      <motion.div
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="absolute bottom-2 left-[5px] top-2 w-px origin-top bg-white/25 report-hairline"
      />
      <div className="space-y-5">
        {result.roadmap.map((p, i) => {
          const isBreak = p.name.toLowerCase().includes('diet break')
          return (
            <motion.div key={`${p.weeks}-${p.name}`} {...fadeUp(i + 1)} className="relative">
              <span
                className={`absolute -left-6 top-1.5 h-[11px] w-[11px] rounded-full border report-dot ${
                  i === 0 ? 'border-white bg-white' : 'border-white/50 bg-vault-surface'
                }`}
                aria-hidden
              />
              <div
                className={`border p-4 report-border ${isBreak ? 'border-dashed border-white/60' : 'border-vault-border'}`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="border border-white/40 px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] text-white report-border report-ink">
                    W{p.weeks}
                  </span>
                  <span className="text-[13px] font-bold uppercase tracking-[0.14em] text-white report-ink">
                    {p.name}
                  </span>
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-vault-muted report-muted">{p.note}</p>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

/* ── GBC training template ─────────────────────────────────── */
function TrainingBlock({ result, inputs }: { result: BlueprintResult; inputs: BlueprintInputs }) {
  const { sessions, restRules, stepTarget } = result.training
  return (
    <div>
      <p className="mb-5 text-[13px] text-vault-muted report-muted">
        German Body Composition training — {inputs.trainerSessionsPerWeek} session
        {inputs.trainerSessionsPerWeek === 1 ? '' : 's'} with {result.header.trainerName} +{' '}
        {inputs.soloSessionsPerWeek} solo · {stepTarget.toLocaleString()} steps daily.
      </p>
      <div className="space-y-5">
        {sessions.map((s, si) => (
          <div key={`${s.name}-${si}`} className="border border-vault-border report-border">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-vault-border px-4 py-3 report-border">
              <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-white report-ink">{s.name}</p>
              <span className="text-[11px] uppercase tracking-[0.14em] text-vault-muted report-muted">
                {s.kind === 'trainer' ? 'With trainer · VIP Studio' : 'Solo'}
              </span>
            </div>
            <table className="tnum w-full text-[13px]">
              <tbody>
                {s.blocks.map((b) => (
                  <tr key={b.label} className="border-b border-vault-border/50 last:border-0 report-border">
                    <td className="w-10 py-2 pl-4 text-vault-faint report-muted">{b.label}</td>
                    <td className="py-2 pr-3 text-white report-ink">{b.exercises}</td>
                    <td className="py-2 pr-3 text-right text-vault-muted report-muted">{b.setsReps}</td>
                    <td className="hidden py-2 pr-3 text-right text-vault-muted report-muted sm:table-cell">
                      {b.tempo}
                    </td>
                    <td className="hidden w-16 py-2 pr-4 text-right text-vault-muted report-muted sm:table-cell">
                      {b.rest}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(s.finisher || s.rounds) && (
              <p className="border-t border-vault-border px-4 py-2.5 text-[12px] text-vault-muted report-border report-muted">
                {s.rounds && <span className="mr-3">{s.rounds}</span>}
                {s.finisher && <span>Finisher: {s.finisher}</span>}
              </p>
            )}
          </div>
        ))}
        {sessions.length === 0 && (
          <p className="text-[13px] text-vault-muted report-muted">
            No sessions scheduled — add PT or solo sessions to generate the training week.
          </p>
        )}
      </div>
      <ul className="mt-5 space-y-2">
        {restRules.map((r) => (
          <li key={r} className="flex gap-3 text-[13px] leading-relaxed text-vault-muted report-muted">
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rotate-45 bg-white report-bar-fill" aria-hidden />
            {r}
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ── Block 4 — sample day of eating ────────────────────────── */
function MealDayBlock({ result }: { result: BlueprintResult }) {
  const d = result.sampleDay
  return (
    <div>
      <div>
        {d.meals.map((m, i) => (
          <motion.div
            key={m.name}
            {...fadeUp(i)}
            className="flex flex-wrap items-baseline justify-between gap-2 border-b border-vault-border/60 py-3 report-border"
          >
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-vault-muted report-muted">
                {m.name.split(' — ')[0]}
              </p>
              <p className="mt-0.5 text-[14px] text-white report-ink">{m.items.join(' · ')}</p>
            </div>
            <p className="tnum text-right text-[13px] text-vault-muted report-muted">
              <span className="text-white report-ink">{m.macros.kcal.toLocaleString()} kcal</span> · {m.macros.p}P /{' '}
              {m.macros.c}C / {m.macros.f}F
            </p>
          </motion.div>
        ))}
        <div className="flex items-baseline justify-between py-3">
          <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-white report-ink">Total</p>
          <p className="tnum text-[14px] font-bold text-white report-ink">
            {d.totals.kcal.toLocaleString()} kcal · {d.totals.p}P / {d.totals.c}C / {d.totals.f}F
          </p>
        </div>
      </div>
      <p className="mt-1 text-[12px] text-vault-faint report-muted">
        {d.withinTolerance
          ? 'Portions auto-scaled to within ±5% of your recommended macros.'
          : 'Portions auto-scaled toward your recommended macros — small variances are fine; hit the weekly average.'}
      </p>
    </div>
  )
}

/* ── Food rules + tracking ─────────────────────────────────── */
function RulesBlock({ result }: { result: BlueprintResult }) {
  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div>
        <p className="mb-3 text-[12px] uppercase tracking-[0.16em] text-white report-ink">Eating rules</p>
        <ul className="space-y-2">
          {result.foodRules.map((r) => (
            <li key={r} className="flex gap-3 text-[13px] leading-relaxed text-vault-muted report-muted">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rotate-45 bg-white report-bar-fill" aria-hidden />
              {r}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="mb-3 text-[12px] uppercase tracking-[0.16em] text-white report-ink">Tracking rules</p>
        <table className="w-full text-[13px]">
          <tbody>
            {result.tracking.map((t) => (
              <tr key={t.what} className="border-b border-vault-border/50 align-top last:border-0 report-border">
                <td className="py-2 pr-3 text-white report-ink">{t.what}</td>
                <td className="py-2 pr-3 text-vault-muted report-muted">{t.frequency}</td>
                <td className="py-2 text-vault-faint report-muted">{t.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── FAQ ───────────────────────────────────────────────────── */
function FaqBlock({ result }: { result: BlueprintResult }) {
  return (
    <div className="space-y-5">
      {result.faq.map((f) => (
        <div key={f.q}>
          <p className="text-[14px] font-bold text-white report-ink">{f.q}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-vault-muted report-muted">{f.a}</p>
        </div>
      ))}
    </div>
  )
}

/* ── Block 5 — commitment + signature ──────────────────────── */
function CommitmentBlock({ result, clientName }: { result: BlueprintResult; clientName: string }) {
  const asks = [
    `${result.training.sessions.length} sessions per week`,
    `${result.training.stepTarget.toLocaleString()} steps daily`,
    'Log food 5 days per week',
    '7h+ sleep',
  ]
  const gets = [
    '1:1 coaching in the VIP Studio',
    'Weekly check-ins',
    'Program adjustments as you adapt',
    'Access to The Vault 6:30am–11:30pm',
  ]
  return (
    <div>
      <div className="grid gap-8 md:grid-cols-2">
        {[
          { title: 'What we ask of you', items: asks },
          { title: 'What you get from us', items: gets },
        ].map((col) => (
          <div key={col.title}>
            <p className="mb-3 text-[12px] uppercase tracking-[0.16em] text-white report-ink">{col.title}</p>
            <ul className="space-y-2">
              {col.items.map((i) => (
                <li key={i} className="flex gap-3 text-[13px] text-vault-muted report-muted">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rotate-45 bg-white report-bar-fill" aria-hidden />
                  {i}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-8 sm:grid-cols-2">
        {[
          { name: clientName, role: 'Client' },
          { name: `${result.header.trainerName}, ${result.header.businessName ?? 'The Vault Fitness'}`, role: 'Coach' },
        ].map((s) => (
          <div key={s.role}>
            <div className="h-10 border-b border-white/50 report-hairline" />
            <p className="mt-2 text-[13px] text-white report-ink">{s.name}</p>
            <p className="text-[11px] uppercase tracking-[0.14em] text-vault-muted report-muted">
              {s.role} · Date ____________
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── the document ──────────────────────────────────────────── */
export default function Report({
  result,
  inputs,
  clientName,
  dateLabel,
}: {
  result: BlueprintResult
  inputs: BlueprintInputs
  clientName: string
  dateLabel: string
}) {
  const blocks: { kicker: string; title: string; node: ReactNode; avoidSplit?: boolean }[] = [
    { kicker: 'Block 1', title: 'Your numbers', node: <NumbersBlock result={result} /> },
    { kicker: 'Block 2', title: 'Daily macro targets', node: <MacrosBlock result={result} /> },
    { kicker: 'Expected outcomes', title: 'Where this lands', node: <OutcomesBlock result={result} /> },
    {
      kicker: 'Block 3',
      title: 'Program roadmap',
      node: <RoadmapBlock result={result} />,
      avoidSplit: true,
    },
    {
      kicker: 'Training',
      title: 'Your training week',
      node: <TrainingBlock result={result} inputs={inputs} />,
      avoidSplit: true,
    },
    {
      kicker: 'Block 4',
      title: `Sample day of eating · ≈ ${result.calories.target.toLocaleString()} kcal`,
      node: <MealDayBlock result={result} />,
      avoidSplit: true,
    },
    { kicker: 'Rules', title: 'How we measure & eat', node: <RulesBlock result={result} /> },
    { kicker: 'FAQ', title: 'Questions, answered', node: <FaqBlock result={result} /> },
    {
      kicker: 'Block 5',
      title: 'Commitment',
      node: <CommitmentBlock result={result} clientName={clientName} />,
      avoidSplit: true,
    },
  ]

  return (
    <article className="vault-report mx-auto w-full max-w-[800px] border border-vault-border bg-vault-surface p-6 sm:p-10 md:p-14">
      {/* header */}
      <motion.header {...fadeUp(0)} className="mb-10 text-center">
        <img src="/logo-gold.png" alt="The Vault Fitness" className="report-logo mx-auto h-20 w-20 object-contain" />
        <p className="eyebrow mt-4 report-muted">The Vault Fitness · Sheung Wan</p>
        <h2 className="mt-2 text-[30px] font-bold leading-tight text-white report-ink md:text-[40px]">
          Personal Training Blueprint
        </h2>
        <p className="mt-3 text-[13px] text-vault-muted report-muted">
          Prepared for <span className="text-white report-ink">{clientName}</span> by {result.header.trainerName} ·{' '}
          {dateLabel} · {result.goal.programWeeks}-week program
        </p>
      </motion.header>

      {blocks.map((b, i) => (
        <motion.section
          key={b.title}
          {...fadeUp(Math.min(i + 1, 6))}
          className={`border-t border-vault-border py-10 report-border ${b.avoidSplit ? 'print-block' : ''}`}
        >
          <BlockTitle kicker={b.kicker} title={b.title} />
          {b.node}
        </motion.section>
      ))}

      {/* footer strip */}
      <footer className="report-footer border-t border-vault-border pt-6 text-center text-[12px] text-vault-muted report-border report-muted">
        <p>
          3/F Alliance Building, 133 Connaught Road, Sheung Wan, Hong Kong · WhatsApp +852 2885 9300
        </p>
        <p className="mt-1">No contract. No joining fees. Cancel anytime.</p>
        <p className="report-page-mark mt-3 text-[10px] uppercase tracking-[0.2em] text-vault-faint">
          The Vault Fitness · Personal Training Blueprint
        </p>
      </footer>
    </article>
  )
}
