import { useState } from 'react'
import { introPackage, formatHKD } from '@/data/mock'
import { Chips, Field, PhoneInput, Segmented } from './fields'
import { isEmail, isPhone } from '@/lib/validation'
import { membershipOnlyPlans, planOptionLabel } from './plans'

const CONTACT_OPTIONS = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'call', label: 'Phone call' },
  { value: 'email', label: 'Email' },
] as const
type Contact = (typeof CONTACT_OPTIONS)[number]['value']

const TIME_OPTIONS = [
  { value: 'morning', label: 'Morning 6:30–12' },
  { value: 'afternoon', label: 'Afternoon 12–5' },
  { value: 'evening', label: 'Evening 5–11:30' },
] as const
type BestTime = (typeof TIME_OPTIONS)[number]['value']

const EXPERIENCE_OPTIONS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
] as const
type Experience = (typeof EXPERIENCE_OPTIONS)[number]['value']

const GOAL_OPTIONS = [
  'Strength & muscle',
  'Fat loss & body composition',
  'Hyrox & conditioning',
  "Women's health",
  'Rehab or prehab',
  'General fitness',
] as const
type Goal = (typeof GOAL_OPTIONS)[number]

const PT_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'tell-me-more', label: 'Tell me more' },
] as const
type PtInterest = (typeof PT_OPTIONS)[number]['value']

const TOUR_OPTIONS = [
  { value: 'tour', label: 'Yes, book me a tour' },
  { value: 'call', label: 'No, just call me' },
] as const
type Tour = (typeof TOUR_OPTIONS)[number]['value']

const TRAINING_TIME_OPTIONS = ['Early morning', 'Lunch', 'Evenings', 'Weekends'] as const
type TrainingTime = (typeof TRAINING_TIME_OPTIONS)[number]

interface Props {
  planId: string
  sending: boolean
  onSubmit: (payload: Record<string, unknown>) => void
}

/** Form B — membership enquiry, routed to senior staff / management. */
export default function MembershipEnquiryForm({ planId, sending, onSubmit }: Props) {
  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [email, setEmail] = useState('')
  const [plan, setPlan] = useState(planId)
  const [contact, setContact] = useState<Contact | ''>('')
  const [bestTime, setBestTime] = useState<BestTime | ''>('')
  const [experience, setExperience] = useState<Experience | ''>('')
  const [goals, setGoals] = useState<Goal[]>([])
  const [ptInterest, setPtInterest] = useState<PtInterest | ''>('')
  const [tour, setTour] = useState<Tour | ''>('')
  const [trainingTimes, setTrainingTimes] = useState<TrainingTime[]>([])
  const [injuries, setInjuries] = useState('')
  const [referredBy, setReferredBy] = useState('')
  const [questions, setQuestions] = useState('')
  const [attempted, setAttempted] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const toggle = <T,>(arr: T[], v: T, set: (a: T[]) => void) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])

  const errors: Record<string, string> = {}
  if (!name.trim()) errors.name = 'Please enter your full name'
  if (!isPhone(mobile)) errors.mobile = 'Please enter a valid HK mobile number'
  if (!isEmail(email)) errors.email = 'Please enter a valid email address'
  if (!contact) errors.contact = 'Choose how we should reach you'
  if (!bestTime) errors.bestTime = 'Choose the best time to reach you'
  const valid = Object.keys(errors).length === 0
  const show = (k: string) => (attempted || touched[k] ? errors[k] : undefined)
  const blur = (k: string) => () => setTouched((t) => ({ ...t, [k]: true }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setAttempted(true)
    if (!valid) return
    onSubmit({
      form: 'membership',
      planId: plan,
      name: name.trim(),
      mobile: `+852 ${mobile.trim()}`,
      email: email.trim(),
      preferredContact: contact,
      bestTime,
      trainingExperience: experience || null,
      goals,
      personalTrainingInterest: ptInterest || null,
      tourOrTrial: tour || null,
      preferredTrainingTimes: trainingTimes,
      injuries: injuries.trim() || null, // confidential
      referredBy: referredBy.trim() || null,
      questions: questions.trim() || null,
    })
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <Field label="Full name" id="mb-name" required error={show('name')}>
        <input
          id="mb-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={blur('name')}
          placeholder="Your name"
          autoComplete="name"
          data-invalid={!!show('name') || undefined}
          className="enquiry-input"
        />
      </Field>

      <Field label="Mobile / WhatsApp" id="mb-mobile" required error={show('mobile')}>
        <PhoneInput
          id="mb-mobile"
          value={mobile}
          onChange={setMobile}
          onBlur={blur('mobile')}
          invalid={!!show('mobile')}
        />
      </Field>

      <Field label="Email" id="mb-email" required error={show('email')}>
        <input
          id="mb-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={blur('email')}
          placeholder="you@example.com"
          autoComplete="email"
          data-invalid={!!show('email') || undefined}
          className="enquiry-input"
        />
      </Field>

      <Field label="Membership of interest" id="mb-plan" required>
        <select
          id="mb-plan"
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          className="enquiry-input appearance-none"
        >
          {membershipOnlyPlans.map((p) => (
            <option key={p.id} value={p.id} className="bg-[#161616]">
              {planOptionLabel(p)}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Preferred contact method" required error={show('contact')}>
        <Segmented
          options={CONTACT_OPTIONS}
          value={contact}
          onChange={setContact}
          invalid={!!show('contact')}
          ariaLabel="Preferred contact method"
        />
      </Field>

      <Field label="Best time to reach you" required error={show('bestTime')}>
        <Segmented
          options={TIME_OPTIONS}
          value={bestTime}
          onChange={setBestTime}
          invalid={!!show('bestTime')}
          ariaLabel="Best time to reach you"
        />
      </Field>

      <Field label="Training experience">
        <Segmented
          options={EXPERIENCE_OPTIONS}
          value={experience}
          onChange={setExperience}
          ariaLabel="Training experience"
        />
      </Field>

      <Field label="Main goals">
        <Chips
          options={GOAL_OPTIONS}
          values={goals}
          onToggle={(g) => toggle(goals, g, setGoals)}
          ariaLabel="Main goals"
        />
      </Field>

      <Field
        label="Interested in adding personal training?"
        hint={
          ptInterest === 'yes' || ptInterest === 'tell-me-more'
            ? `Ask about our ${introPackage.name} — ${formatHKD(introPackage.priceHKD)} for ${introPackage.includes[0].toLowerCase()} plus a month of VIP access.`
            : undefined
        }
      >
        <Segmented
          options={PT_OPTIONS}
          value={ptInterest}
          onChange={setPtInterest}
          ariaLabel="Interested in adding personal training?"
        />
        {(ptInterest === 'yes' || ptInterest === 'tell-me-more') && (
          <p className="mt-2 text-[12px] text-gold">
            Members start with the {introPackage.name} ({formatHKD(introPackage.priceHKD)}) — the
            fastest way to get coaching from day one.
          </p>
        )}
      </Field>

      <Field label="Gym tour or trial session first?">
        <Segmented
          options={TOUR_OPTIONS}
          value={tour}
          onChange={setTour}
          ariaLabel="Gym tour or trial session first?"
        />
      </Field>

      <Field label="Preferred training times">
        <Chips
          options={TRAINING_TIME_OPTIONS}
          values={trainingTimes}
          onToggle={(t) => toggle(trainingTimes, t, setTrainingTimes)}
          ariaLabel="Preferred training times"
        />
      </Field>

      <Field
        label="Injuries or health conditions?"
        id="mb-injuries"
        hint="Confidential — only your coaching team sees this."
      >
        <textarea
          id="mb-injuries"
          value={injuries}
          onChange={(e) => setInjuries(e.target.value)}
          rows={2}
          placeholder="Optional"
          className="enquiry-input resize-none"
        />
      </Field>

      <Field
        label="Referred by a member?"
        id="mb-referred"
        hint="Refer-a-friend: existing members get 2 months free when you join."
      >
        <input
          id="mb-referred"
          type="text"
          value={referredBy}
          onChange={(e) => setReferredBy(e.target.value)}
          placeholder="Member's name (optional)"
          className="enquiry-input"
        />
      </Field>

      <Field label="Questions for our team" id="mb-questions">
        <textarea
          id="mb-questions"
          value={questions}
          onChange={(e) => setQuestions(e.target.value)}
          rows={3}
          placeholder="Optional"
          className="enquiry-input resize-none"
        />
      </Field>

      <button type="submit" disabled={sending} className="btn-gold w-full">
        {sending ? 'Sending…' : 'Send Enquiry'} {!sending && <span className="btn-arrow">→</span>}
      </button>
      <p className="text-center text-[11px] leading-relaxed text-vault-faint">
        No payment now — a senior team member will personally follow up.
      </p>
    </form>
  )
}
