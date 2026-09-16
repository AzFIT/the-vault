/**
 * Client Intake Form — public, no-login onboarding page (Phase 6 "frictionless
 * onboarding" shipped early). Faithful port of the AzFit 10-step intake form,
 * re-skinned to The Vault design language: monochrome black/white, sharp
 * borders, gold logo, eyebrow labels, pill toggles that fill white when active.
 *
 * On submit the answers are packed into a nested JSON object and downloaded
 * as `client_intake.azfit` (JSON content) — the "AzFit file" hand-off to the
 * coach. No data leaves the device; there is no backend yet.
 */
import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, RotateCcw } from 'lucide-react'

// ---------------------------------------------------------------------------
// Field model
// ---------------------------------------------------------------------------

type FieldType = 'text' | 'email' | 'tel' | 'number' | 'time' | 'select' | 'textarea' | 'radio' | 'checkbox' | 'range'

type Field = {
  name: string
  label: string
  type: FieldType
  required?: boolean
  optional?: boolean
  placeholder?: string
  options?: string[]
  min?: number
  max?: number
  step?: number
  half?: boolean
}

type Step = { name: string; desc: string; fields: Field[] }

const STEPS: Step[] = [
  {
    name: 'Basics',
    desc: 'Tell us who you are and how to reach you.',
    fields: [
      { name: 'basics.name', label: 'Full Name', type: 'text', required: true, placeholder: 'Jane Doe' },
      { name: 'basics.email', label: 'Email', type: 'email', required: true, placeholder: 'jane@email.com', half: true },
      { name: 'basics.phone', label: 'Phone / WhatsApp', type: 'tel', optional: true, placeholder: '+852 0000 0000', half: true },
      { name: 'basics.age', label: 'Age', type: 'number', required: true, min: 10, max: 100, placeholder: '28', half: true },
      { name: 'basics.height_cm', label: 'Height (cm)', type: 'number', required: true, min: 100, max: 250, placeholder: '170', half: true },
      { name: 'basics.weight_kg', label: 'Current Weight (kg)', type: 'number', required: true, min: 30, max: 300, step: 0.1, placeholder: '70', half: true },
      { name: 'basics.body_fat', label: 'Body Fat %', type: 'text', optional: true, placeholder: "e.g. ~22% or 'soft around the waist'", half: true },
      { name: 'basics.location', label: 'Nationality / Location', type: 'text', required: true, placeholder: 'Hong Kong', half: true },
      { name: 'basics.occupation', label: 'Occupation', type: 'text', required: true, placeholder: 'Software engineer', half: true },
      { name: 'basics.work_start', label: 'Work Start Time', type: 'time', half: true },
      { name: 'basics.work_end', label: 'Work Finish Time', type: 'time', half: true },
      { name: 'basics.work_days', label: 'Work Days & Pattern', type: 'text', placeholder: 'e.g. Mon–Fri office, weekend shifts' },
      {
        name: 'basics.work_activity_level', label: 'Work Activity Level', type: 'select',
        options: ['Sedentary (desk job)', 'Lightly active (some walking)', 'Moderately active (on feet often)', 'Very active (physical labor)'],
      },
    ],
  },
  {
    name: 'Goals',
    desc: 'Where are we going?',
    fields: [
      {
        name: 'goals.primary_goal', label: 'Primary Goal', type: 'select', required: true,
        options: ['Fat loss', 'Muscle gain', 'Improve fitness', 'Improve health markers', 'Sports performance', 'Lifestyle balance', 'Other'],
      },
      { name: 'goals.target_weight_kg', label: 'Target Weight (kg)', type: 'number', min: 30, max: 300, step: 0.1, placeholder: '62', half: true },
      { name: 'goals.target_body_fat', label: 'Target Body Fat %', type: 'number', min: 3, max: 60, step: 0.1, placeholder: '18', half: true },
      { name: 'goals.timeline', label: 'Timeline / Deadline', type: 'text', required: true, placeholder: 'e.g. 6 months — wedding in June 2027' },
      {
        name: 'goals.long_term_goals', label: 'Long-Term Goals', type: 'checkbox', optional: true,
        options: ['Maintain results', 'Build strength', 'Improve endurance', 'Injury prevention', 'Sustainable lifestyle'],
      },
      { name: 'goals.notes', label: 'Goal Notes', type: 'textarea', optional: true, placeholder: 'Anything else about your goals…' },
    ],
  },
  {
    name: 'Eating Habits',
    desc: 'Show us a typical day on your plate.',
    fields: [
      {
        name: 'eating.cooking_habits', label: 'Typical Cooking Habits', type: 'checkbox', optional: true,
        options: ['Cook every meal', 'Cook breakfast only', 'Cook lunch only', 'Cook dinner only', 'Take-out often', 'Meal prep regularly'],
      },
      {
        name: 'eating.takeout_frequency', label: 'Take-Out Frequency', type: 'select', optional: true, half: true,
        options: ['Rarely', '1–2 times per week', '3–5 times per week', 'Daily'],
      },
      { name: 'eating.meals_prepped', label: 'Meals Prepped', type: 'text', optional: true, placeholder: 'e.g. 5 lunches/week', half: true },
      { name: 'eating.typical_daily_meals', label: 'Typical Daily Meals', type: 'textarea', required: true, placeholder: 'Breakfast, lunch, dinner, snacks — what do you usually eat?' },
      { name: 'eating.tracks_calories', label: 'Do you track calories/macros?', type: 'radio', options: ['Yes', 'No', 'Sometimes'] },
      { name: 'eating.current_daily_averages', label: 'Current Daily Averages', type: 'text', optional: true, placeholder: 'e.g. ~2000 kcal, 120g protein' },
      { name: 'eating.foods_love', label: 'Foods You Love', type: 'text', placeholder: 'Pizza, chocolate, rice…', half: true },
      { name: 'eating.foods_hate_allergies', label: 'Foods You Hate / Allergies', type: 'text', placeholder: 'Shellfish allergy, broccoli…', half: true },
      {
        name: 'eating.dietary_restrictions', label: 'Dietary Restrictions', type: 'select', half: true,
        options: ['None', 'Vegetarian', 'Vegan', 'Halal', 'Kosher', 'Gluten-free', 'Lactose-free', 'Other'],
      },
      {
        name: 'eating.cooking_ability', label: 'Cooking Ability', type: 'select', half: true,
        options: ['Beginner (mostly microwave/ready meals)', 'Intermediate (can follow recipes)', 'Advanced (love experimenting)'],
      },
      { name: 'eating.food_budget', label: 'Weekly Food Budget', type: 'text', placeholder: 'e.g. HK$800/week', half: true },
      {
        name: 'eating.alcohol_intake', label: 'Alcohol Intake', type: 'select', half: true,
        options: ['None', 'Rarely', '2–3 times per week', '4+ times per week', 'Daily'],
      },
      {
        name: 'eating.caffeine_cups_per_day', label: 'Caffeine Intake (cups/day)', type: 'select', half: true,
        options: ['0', '1', '2', '3', '4', '5+'],
      },
      { name: 'eating.cravings', label: 'Common Cravings', type: 'text', placeholder: 'Late-night sweets, salty snacks…', half: true },
      { name: 'eating.sweet_tooth_level', label: 'Sweet Tooth Level', type: 'range', min: 1, max: 10 },
    ],
  },
  {
    name: 'Training & Activity',
    desc: 'How do you currently move?',
    fields: [
      { name: 'training.current_routine', label: 'Current Exercise Routine', type: 'textarea', required: true, placeholder: 'What does a typical training week look like?' },
      {
        name: 'training.gym_access', label: 'Gym Access', type: 'select', half: true,
        options: ['Home gym', 'Commercial gym', 'Both home and commercial', 'No access currently'],
      },
      { name: 'training.sports_played', label: 'Sports / Activities Played', type: 'text', placeholder: 'Football, padel, swimming…', half: true },
      {
        name: 'training.experience', label: 'Training Experience', type: 'select', half: true,
        options: ['Beginner (< 1 year)', 'Intermediate (1–3 years)', 'Advanced (3+ years)'],
      },
      { name: 'training.avg_daily_steps', label: 'Average Daily Step Count', type: 'number', min: 0, max: 50000, placeholder: '8000', half: true },
      { name: 'training.injuries_limitations', label: 'Injuries / Limitations', type: 'textarea', placeholder: 'Any injuries, joint issues, or movements to avoid?' },
      { name: 'training.enjoyed_styles', label: 'Training Styles You Enjoy', type: 'text', placeholder: 'Weightlifting, HIIT, yoga, running…' },
    ],
  },
  {
    name: 'Sleep & Recovery',
    desc: 'Recovery is where results happen.',
    fields: [
      { name: 'sleep.avg_hours', label: 'Average Sleep Hours', type: 'number', required: true, min: 0, max: 16, step: 0.5, placeholder: '7.5', half: true },
      {
        name: 'sleep.quality', label: 'Sleep Quality', type: 'select', half: true,
        options: ['Poor', 'Average', 'Good', 'Excellent'],
      },
      { name: 'sleep.bedtime', label: 'Typical Bedtime', type: 'time', half: true },
      { name: 'sleep.wake_time', label: 'Typical Wake-up Time', type: 'time', half: true },
      { name: 'sleep.naps', label: 'Do you nap?', type: 'radio', options: ['Yes', 'No', 'Sometimes'] },
      {
        name: 'sleep.screen_time_before_bed', label: 'Screen Time Before Bed', type: 'select',
        options: ['None — screens off 1+ hour before bed', 'Light — under 30 minutes', 'Moderate — 30–60 minutes', 'Heavy — 1+ hour in bed on phone/laptop'],
      },
    ],
  },
  {
    name: 'Health & Medical',
    desc: 'Everything here stays confidential. The female-health questions apply only if relevant — otherwise skip them.',
    fields: [
      { name: 'health.medical_conditions', label: 'Medical Conditions', type: 'textarea', placeholder: "Diabetes, thyroid, PCOS, hypertension… (or 'None')" },
      { name: 'health.medications', label: 'Current Medications', type: 'text', placeholder: 'List any current medications', half: true },
      { name: 'health.supplements', label: 'Supplements', type: 'text', placeholder: 'Whey, creatine, vitamin D…', half: true },
      {
        name: 'health.menstrual_cycle_regularity', label: 'Menstrual Cycle Regularity', type: 'select', half: true,
        options: ['Not applicable', 'Regular', 'Irregular', 'Very irregular / absent'],
      },
      { name: 'health.pms_symptoms', label: 'PMS Symptoms', type: 'text', placeholder: 'e.g. bloating, cravings, mood swings', half: true },
      { name: 'health.digestive_issues', label: 'Digestive Issues', type: 'text', placeholder: "IBS, bloating, acid reflux… (or 'None')" },
      { name: 'health.stress_level', label: 'Stress Level', type: 'range', min: 1, max: 10 },
      { name: 'health.eating_disorder_history', label: 'Eating Disorder History', type: 'textarea', placeholder: 'Anything your coach should know to keep your plan safe and sustainable.' },
    ],
  },
  {
    name: 'Lifestyle',
    desc: 'Your environment shapes your habits.',
    fields: [
      {
        name: 'lifestyle.living_situation', label: 'Living Situation', type: 'select', half: true,
        options: ['Alone', 'With partner', 'With family / children', 'Shared housing / roommates'],
      },
      {
        name: 'lifestyle.who_cooks', label: 'Who Cooks?', type: 'select', half: true,
        options: ['Self', 'Partner', 'Family', 'Shared responsibility', 'Mostly take-out'],
      },
      {
        name: 'lifestyle.time_to_cook', label: 'Time Available to Cook (per day)', type: 'select', half: true,
        options: ['Under 30 minutes', '30–60 minutes', '1–2 hours', '2+ hours'],
      },
      {
        name: 'lifestyle.meals_out_per_week', label: 'Meals Out Per Week', type: 'select', half: true,
        options: ['0', '1–2', '3–4', '5+'],
      },
      { name: 'lifestyle.willing_to_meal_prep', label: 'Willing to meal prep?', type: 'radio', options: ['Yes', 'No', 'Maybe'] },
      {
        name: 'lifestyle.biggest_obstacles', label: 'Biggest Obstacles to Consistency', type: 'checkbox', optional: true,
        options: ['Lack of time', 'Lack of motivation', 'Work schedule', 'Family commitments', 'Injuries / health', 'Gym confidence', 'Nutrition discipline'],
      },
      { name: 'lifestyle.notes', label: 'Anything else about your lifestyle?', type: 'textarea', placeholder: 'Travel schedule, social events, work culture…' },
    ],
  },
  {
    name: 'Past Attempts',
    desc: 'Your history helps us skip the mistakes.',
    fields: [
      { name: 'past.diets_or_coaches', label: 'Diets / Coaches Tried Before', type: 'textarea', placeholder: 'Keto, intermittent fasting, previous coach…' },
      { name: 'past.what_worked', label: 'What Worked?', type: 'textarea', placeholder: 'What gave you results or felt sustainable?', half: true },
      { name: 'past.what_failed', label: 'What Failed?', type: 'textarea', placeholder: 'Why did past attempts stop working?', half: true },
      {
        name: 'past.macro_tracking_history', label: 'Macro Tracking History', type: 'radio',
        options: ['Never tracked', 'Tried but stopped', 'On and off', 'Consistently'],
      },
    ],
  },
  {
    name: 'Body & Tracking',
    desc: 'How do you relate to the data?',
    fields: [
      { name: 'tracking.scale_relationship', label: 'Relationship With the Scale', type: 'textarea', placeholder: 'Does the number affect your mood? Do you weigh daily?' },
      { name: 'tracking.progress_photos', label: 'Willing to take progress photos?', type: 'radio', options: ['Yes', 'No'] },
      { name: 'tracking.food_scale', label: 'Own a food scale?', type: 'radio', options: ['Yes', 'No', 'Will buy'] },
      { name: 'tracking.recent_blood_work', label: 'Recent Blood Work Results', type: 'textarea', placeholder: "Share any relevant results (cholesterol, hormones, vitamin D…) or 'None / not tested'." },
    ],
  },
  {
    name: 'Preferences',
    desc: 'Last step — how do you want to be coached?',
    fields: [
      {
        name: 'preferences.guidance_style', label: 'Strict vs. Flexible Guidance', type: 'select', half: true,
        options: ['Strict — tell me exactly what to do', 'Balanced — structure with some flexibility', 'Flexible — guide me, let me decide'],
      },
      {
        name: 'preferences.meal_plan_vs_macros', label: 'Meal Plans vs. Macro Targets', type: 'select', half: true,
        options: ['Full meal plans', 'Macro targets + food suggestions', 'Combination of both', 'Either — whatever works best'],
      },
      {
        name: 'preferences.checkin_frequency', label: 'Check-in Frequency', type: 'select', half: true,
        options: ['Daily', 'Every 2–3 days', 'Weekly', 'Bi-weekly', 'Monthly'],
      },
      {
        name: 'preferences.communication_style', label: 'Coach Communication Style', type: 'select', half: true,
        options: ['Supportive & encouraging', 'Direct & no-nonsense', 'Balanced mix', 'Data-driven & analytical', 'Motivational & high-energy'],
      },
      { name: 'preferences.language', label: 'Preferred Language', type: 'text', placeholder: 'English', half: true },
      { name: 'preferences.timezone', label: 'Time Zone', type: 'text', placeholder: 'e.g. GMT+8 (Hong Kong)', half: true },
      {
        name: 'preferences.contact_method', label: 'Preferred Contact Method', type: 'select',
        options: ['Email', 'WhatsApp', 'Phone call', 'In-app chat'],
      },
      { name: 'preferences.triggers_to_avoid', label: 'Triggers to Avoid', type: 'textarea', placeholder: 'e.g. aggressive calorie cuts, daily weigh-ins, food guilt language…' },
      {
        name: 'preferences.consent', label: 'Consent', type: 'radio', required: true,
        options: ['I consent to AzFit storing my intake & health information for coaching purposes'],
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// Form state helpers
// ---------------------------------------------------------------------------

type Values = Record<string, unknown>

const rangeDefault = (f: Field) => Math.round(((f.min ?? 1) + (f.max ?? 10)) / 2)

const initValues = (): Values => {
  const v: Values = {}
  for (const s of STEPS)
    for (const f of s.fields) if (f.type === 'range') v[f.name] = rangeDefault(f)
  return v
}

/** True when every required field on the step has a value. */
function stepValid(step: Step, values: Values): boolean {
  for (const f of step.fields) {
    if (!f.required) continue
    const v = values[f.name]
    if (f.type === 'radio') {
      if (typeof v !== 'string' || !v) return false
    } else if (v === undefined || v === null || String(v).trim() === '') {
      return false
    }
  }
  return true
}

/** Fields missing on the current step (for highlight). */
function missingFields(step: Step, values: Values): Set<string> {
  const missing = new Set<string>()
  for (const f of step.fields) {
    if (!f.required) continue
    const v = values[f.name]
    const empty =
      f.type === 'radio'
        ? typeof v !== 'string' || !v
        : v === undefined || v === null || String(v).trim() === ''
    if (empty) missing.add(f.name)
  }
  return missing
}

const inputCls = (invalid: boolean) =>
  `w-full border bg-vault-bg px-3 py-2.5 text-[14px] text-white placeholder:text-vault-faint focus:outline-none transition-colors ${
    invalid ? 'border-[#ff6b6b]' : 'border-vault-border focus:border-white/70'
  }`

// ---------------------------------------------------------------------------
// Field renderers
// ---------------------------------------------------------------------------

function FieldShell({
  field,
  invalid,
  children,
}: {
  field: Field
  invalid: boolean
  children: React.ReactNode
}) {
  return (
    <div className={field.half ? '' : 'sm:col-span-2'}>
      <label className="mb-2 block text-[11px] uppercase tracking-[0.14em] text-vault-muted">
        {field.label}
        {field.optional && <span className="normal-case tracking-normal text-vault-faint"> — optional</span>}
      </label>
      {children}
      {invalid && <p className="mt-1.5 text-[11px] text-[#ff6b6b]">This field is required</p>}
    </div>
  )
}

function FieldControl({
  field,
  value,
  invalid,
  onChange,
}: {
  field: Field
  value: unknown
  invalid: boolean
  onChange: (v: unknown) => void
}) {
  if (field.type === 'select') {
    return (
      <select value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} className={inputCls(invalid)}>
        <option value="">Select…</option>
        {field.options?.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    )
  }
  if (field.type === 'textarea') {
    return (
      <textarea
        value={(value as string) ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        rows={4}
        className={`${inputCls(invalid)} resize-y`}
      />
    )
  }
  if (field.type === 'radio' || field.type === 'checkbox') {
    const current = field.type === 'radio' ? ((value as string) ?? '') : Array.isArray(value) ? (value as string[]) : []
    return (
      <div className="flex flex-wrap gap-2">
        {field.options?.map((o) => {
          const active = field.type === 'radio' ? current === o : current.includes(o)
          return (
            <button
              key={o}
              type="button"
              aria-pressed={active}
              onClick={() => {
                if (field.type === 'radio') onChange(active ? '' : o)
                else {
                  const arr = Array.isArray(current) ? current : []
                  onChange(active ? arr.filter((x: string) => x !== o) : [...arr, o])
                }
              }}
              className={`border px-3.5 py-2 text-[13px] transition-colors ${
                active
                  ? 'border-white bg-white font-bold text-vault-btn-text'
                  : 'border-vault-border bg-vault-bg text-vault-muted hover:border-white/60 hover:text-white'
              }`}
            >
              {o}
            </button>
          )
        })}
      </div>
    )
  }
  if (field.type === 'range') {
    const num = typeof value === 'number' ? value : rangeDefault(field)
    return (
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={field.min}
          max={field.max}
          value={num}
          aria-label={field.label}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-1 flex-1 cursor-pointer appearance-none bg-vault-border accent-white"
        />
        <span className="tnum w-10 shrink-0 bg-white py-1 text-center text-[13px] font-bold text-vault-btn-text">{num}</span>
      </div>
    )
  }
  // text-like inputs
  return (
    <input
      type={field.type}
      value={(value as string) ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      min={field.min}
      max={field.max}
      step={field.step}
      className={inputCls(invalid)}
    />
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Intake() {
  const [stepIdx, setStepIdx] = useState(0)
  const [values, setValues] = useState<Values>(initValues)
  const [submitted, setSubmitted] = useState(false)
  const [showError, setShowError] = useState(false)

  const step = STEPS[stepIdx]
  const total = STEPS.length
  const isLast = stepIdx === total - 1
  const valid = useMemo(() => stepValid(step, values), [step, values])
  const [missing, setMissing] = useState<Set<string>>(new Set())

  const set = (name: string, v: unknown) => {
    setValues((prev) => ({ ...prev, [name]: v }))
    setMissing((m) => {
      if (!m.has(name)) return m
      const next = new Set(m)
      next.delete(name)
      return next
    })
  }

  const go = (next: number) => {
    if (next > stepIdx && !valid) {
      setMissing(missingFields(step, values))
      setShowError(true)
      return
    }
    setShowError(false)
    setMissing(new Set())
    setStepIdx(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!valid) {
      setMissing(missingFields(step, values))
      setShowError(true)
      return
    }
    // Pack flat dot-notation values into a nested object
    const client: Record<string, unknown> = {}
    for (const [key, v] of Object.entries(values)) {
      const keys = key.split('.')
      let node = client
      keys.forEach((k, i) => {
        if (i === keys.length - 1) node[k] = v
        else {
          if (typeof node[k] !== 'object' || node[k] === null) node[k] = {}
          node = node[k] as Record<string, unknown>
        }
      })
    }
    const data = {
      form: 'AzFit Client Intake',
      version: 'the-vault/intake',
      submitted_at: new Date().toISOString(),
      client,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'client_intake.azfit'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setSubmitted(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const restart = () => {
    setValues(initValues())
    setStepIdx(0)
    setSubmitted(false)
    setShowError(false)
    setMissing(new Set())
    window.scrollTo({ top: 0 })
  }

  const progress = submitted ? 100 : ((stepIdx + 1) / total) * 100

  return (
    <div className="min-h-dvh px-4 py-10 md:py-16">
      <div className="mx-auto max-w-2xl">
        {/* Brand */}
        <header className="mb-10 text-center">
          <img
            src="brand/vault-logo.png"
            alt="The Vault Fitness"
            className="mx-auto h-24 w-auto md:h-28"
            width={640}
            height={638}
          />
          <p className="eyebrow mt-6">Client Intake</p>
          <h1 className="mt-2 font-serif text-3xl font-bold text-white md:text-4xl">
            Let's build your plan.
          </h1>
          <p className="mt-2 text-[13px] text-vault-muted">
            Ten short steps · everything stays between you and your coach
          </p>
        </header>

        {/* Progress */}
        <div className="mb-8">
          <div className="mb-2 flex items-baseline justify-between text-[11px] uppercase tracking-[0.14em]">
            <span className="text-white">
              Step <span className="tnum font-bold">{submitted ? total : stepIdx + 1}</span> of <span className="tnum">{total}</span>
            </span>
            <span className="text-vault-muted">{submitted ? 'Complete' : step.name}</span>
          </div>
          <div className="h-1 w-full overflow-hidden" style={{ background: 'var(--viz-track)' }}>
            <motion.div
              className="h-full bg-white"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        </div>

        {submitted ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="app-card p-10 text-center"
          >
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white">
              <Check className="h-8 w-8 text-vault-btn-text" strokeWidth={2.5} />
            </span>
            <h2 className="mt-6 text-2xl font-bold text-white">You're all set!</h2>
            <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-vault-muted">
              Your intake file has been downloaded. Send the{' '}
              <span className="font-bold text-white">client_intake.azfit</span> file to your Vault
              coach to get started.
            </p>
            <button type="button" onClick={restart} className="btn-ghost mx-auto mt-8">
              <RotateCcw className="h-3.5 w-3.5" /> Fill another form
            </button>
          </motion.div>
        ) : (
          <form onSubmit={submit} noValidate>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={stepIdx}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="app-card p-6 md:p-8"
              >
                <p className="eyebrow">{String(stepIdx + 1).padStart(2, '0')} · {step.name}</p>
                <h2 className="mt-2 text-xl font-bold text-white md:text-2xl">{step.name}</h2>
                <p className="mt-1.5 text-[13px] text-vault-muted">{step.desc}</p>

                <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {step.fields.map((f) => (
                    <FieldShell key={f.name} field={f} invalid={missing.has(f.name)}>
                      <FieldControl field={f} value={values[f.name]} invalid={missing.has(f.name)} onChange={(v) => set(f.name, v)} />
                    </FieldShell>
                  ))}
                </div>

                {/* Step navigation */}
                <div className="mt-9 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => go(stepIdx - 1)}
                    disabled={stepIdx === 0}
                    className="btn-ghost disabled:opacity-30"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Previous
                  </button>
                  <div className="flex flex-col items-end gap-2">
                    {showError && !valid && (
                      <span className="text-[12px] text-[#ff6b6b]">Please fill in the required fields.</span>
                    )}
                    {isLast ? (
                      <button type="submit" className="flex items-center gap-2 bg-white px-6 py-2.5 text-[12px] font-bold uppercase tracking-[0.12em] text-vault-btn-text transition-opacity hover:opacity-85">
                        Submit <Check className="h-4 w-4" strokeWidth={2.5} />
                      </button>
                    ) : (
                      <button type="button" onClick={() => go(stepIdx + 1)} className="flex items-center gap-2 bg-white px-6 py-2.5 text-[12px] font-bold uppercase tracking-[0.12em] text-vault-btn-text transition-opacity hover:opacity-85">
                        Next <ArrowRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </form>
        )}

        <p className="mt-8 text-center text-[11px] text-vault-faint">
          The Vault Fitness © 2026 — Confidential client intake. Your data stays with your coach.
        </p>
      </div>
    </div>
  )
}
