import { useState } from 'react'
import { Field, PhoneInput, Segmented } from './fields'
import { isEmail, isPhone } from '@/lib/validation'
import { passPlans, planOptionLabel } from './plans'

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

interface Props {
  planId: string
  sending: boolean
  onSubmit: (payload: Record<string, unknown>) => void
}

/** Form A — pass enquiry, routed to reception. */
export default function PassEnquiryForm({ planId, sending, onSubmit }: Props) {
  const [name, setName] = useState('')
  const [mobile, setMobile] = useState('')
  const [email, setEmail] = useState('')
  const [plan, setPlan] = useState(planId)
  const [contact, setContact] = useState<Contact | ''>('')
  const [bestTime, setBestTime] = useState<BestTime | ''>('')
  const [asap, setAsap] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [trainedBefore, setTrainedBefore] = useState<'yes' | 'no' | ''>('')
  const [notes, setNotes] = useState('')
  const [attempted, setAttempted] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const errors: Record<string, string> = {}
  if (!name.trim()) errors.name = 'Please enter your full name'
  if (!isPhone(mobile)) errors.mobile = 'Please enter a valid HK mobile number'
  if (!isEmail(email)) errors.email = 'Please enter a valid email address'
  if (!contact) errors.contact = 'Choose how we should reach you'
  const valid = Object.keys(errors).length === 0
  const show = (k: string) => (attempted || touched[k] ? errors[k] : undefined)
  const blur = (k: string) => () => setTouched((t) => ({ ...t, [k]: true }))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setAttempted(true)
    if (!valid) return
    onSubmit({
      form: 'pass',
      planId: plan,
      name: name.trim(),
      mobile: `+852 ${mobile.trim()}`,
      email: email.trim(),
      preferredContact: contact,
      bestTime: bestTime || null,
      startDate: asap ? 'ASAP' : startDate || null,
      trainedBefore: trainedBefore || null,
      notes: notes.trim() || null,
    })
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <Field label="Full name" id="pass-name" required error={show('name')}>
        <input
          id="pass-name"
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

      <Field label="Mobile / WhatsApp" id="pass-mobile" required error={show('mobile')}>
        <PhoneInput
          id="pass-mobile"
          value={mobile}
          onChange={setMobile}
          onBlur={blur('mobile')}
          invalid={!!show('mobile')}
        />
      </Field>

      <Field label="Email" id="pass-email" required error={show('email')}>
        <input
          id="pass-email"
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

      <Field label="Pass of interest" id="pass-plan" required>
        <select
          id="pass-plan"
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          className="enquiry-input appearance-none"
        >
          {passPlans.map((p) => (
            <option key={p.id} value={p.id} className="bg-[#161616]">
              {planOptionLabel(p)}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Preferred contact" error={show('contact')}>
        <Segmented
          options={CONTACT_OPTIONS}
          value={contact}
          onChange={setContact}
          invalid={!!show('contact')}
          ariaLabel="Preferred contact method"
        />
      </Field>

      <Field label="Best time to reach you">
        <Segmented
          options={TIME_OPTIONS}
          value={bestTime}
          onChange={setBestTime}
          ariaLabel="Best time to reach you"
        />
      </Field>

      <Field label="Preferred start date" id="pass-start-date">
        <div className="space-y-3">
          <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-vault-muted">
            <input
              type="checkbox"
              checked={asap}
              onChange={(e) => setAsap(e.target.checked)}
              className="h-4 w-4 accent-[#d4af37]"
            />
            As soon as possible
          </label>
          {!asap && (
            <input
              id="pass-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className="enquiry-input [color-scheme:dark]"
            />
          )}
        </div>
      </Field>

      <Field label="Trained at The Vault before?">
        <Segmented
          options={[
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ]}
          value={trainedBefore}
          onChange={setTrainedBefore}
          ariaLabel="Trained at The Vault before?"
        />
      </Field>

      <Field label="Anything we should know?" id="pass-notes">
        <textarea
          id="pass-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Optional — questions, goals, anything at all"
          className="enquiry-input resize-none"
        />
      </Field>

      <button type="submit" disabled={sending} className="btn-gold w-full">
        {sending ? 'Sending…' : 'Send Enquiry'} {!sending && <span className="btn-arrow">→</span>}
      </button>
      <p className="text-center text-[11px] leading-relaxed text-vault-faint">
        No payment now — reception will confirm availability and arrange your visit.
      </p>
    </form>
  )
}
