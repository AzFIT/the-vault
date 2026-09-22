/**
 * Settings (/portal/settings) — the owner portal's configuration page.
 *
 * Three sections:
 *  1. Gym profile      — identity + contact details (single source of truth
 *                        for the public site going forward).
 *  2. Privacy & PIN    — the shared KPI/privacy PIN and the global
 *                        hide-figures toggle, managed centrally.
 *  3. Access & data    — honest status of tester-mode auth, the demo staff
 *                        key, and what "going live" needs to replace.
 *
 * Everything here persists to localStorage (same model as the rest of the
 * prototype); none of it touches Supabase directly.
 */
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Check, Copy, Eye, EyeOff, KeyRound, RotateCcw, ShieldCheck, TriangleAlert } from 'lucide-react'
import NavButtons from '@/components/NavButtons'
import { STAFF_PROFILES } from '@/lib/staff'
import { useGymSettings, usePrivacyPin } from '@/lib/gymSettings'
import type { GymSettings } from '@/lib/gymSettings'
import { useKpiHidden } from '@/lib/kpiHidden'

const DEMO_STAFF_KEY = 'vault_enq_3d8b52f1a947c60e'

function Section({
  icon,
  title,
  blurb,
  children,
}: {
  icon: React.ReactNode
  title: string
  blurb: string
  children: React.ReactNode
}) {
  return (
    <section className="border border-vault-border bg-vault-surface">
      <header className="flex items-start gap-3 border-b border-vault-border px-5 py-4">
        <span className="mt-0.5 text-gold">{icon}</span>
        <div>
          <h2 className="text-[15px] font-bold">{title}</h2>
          <p className="mt-0.5 text-[12px] leading-relaxed text-vault-muted">{blurb}</p>
        </div>
      </header>
      <div className="p-5">{children}</div>
    </section>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] uppercase tracking-[0.16em] text-vault-muted">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-vault-border bg-vault-bg px-3 py-2.5 text-[13px] text-white placeholder:text-vault-faint focus:border-gold/60 focus:outline-none"
      />
    </label>
  )
}

function Toggle({ on, onToggle, label, hint }: { on: boolean; onToggle: () => void; label: string; hint: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between gap-4 border border-vault-border bg-vault-bg px-4 py-3 text-left transition-colors hover:border-gold/40"
    >
      <span>
        <span className="block text-[13px] font-semibold">{label}</span>
        <span className="mt-0.5 block text-[11px] text-vault-muted">{hint}</span>
      </span>
      <span
        className={`relative h-5 w-10 shrink-0 border transition-colors ${on ? 'border-gold/60 bg-gold/20' : 'border-vault-border bg-vault-surface'}`}
        role="switch"
        aria-checked={on}
      >
        <span
          className={`absolute top-0.5 h-3.5 w-3.5 transition-all ${on ? 'left-[22px] bg-gold' : 'left-0.5 bg-vault-muted'}`}
        />
      </span>
    </button>
  )
}

export default function PortalSettings() {
  const [settings, saveSettings, resetSettings] = useGymSettings()
  const [pin, setPin] = usePrivacyPin()
  const [kpiHidden, toggleKpiHidden] = useKpiHidden()
  const [draft, setDraft] = useState<GymSettings | null>(null)
  const [saved, setSaved] = useState(false)
  const [pinDraft, setPinDraft] = useState('')
  const [pinSaved, setPinSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const form = draft ?? settings

  const dirty = JSON.stringify(form) !== JSON.stringify(settings)

  const submitProfile = (e: FormEvent) => {
    e.preventDefault()
    saveSettings(form)
    setDraft(null)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2200)
  }

  const submitPin = (e: FormEvent) => {
    e.preventDefault()
    const clean = pinDraft.replace(/\D/g, '').slice(0, 6)
    if (clean.length < 4) return
    setPin(clean)
    setPinDraft('')
    setPinSaved(true)
    window.setTimeout(() => setPinSaved(false), 2200)
  }

  const copyKey = async () => {
    try {
      await navigator.clipboard.writeText(DEMO_STAFF_KEY)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard unavailable — the key is visible for manual copy
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-vault-muted">Manage</p>
          <h1 className="text-xl font-bold">Settings</h1>
        </div>
        <NavButtons homeTo="/portal" />
      </div>

      {/* ---- Gym profile ------------------------------------------------- */}
      <Section
        icon={<ShieldCheck className="h-4 w-4" strokeWidth={1.5} />}
        title="Gym profile"
        blurb="Identity and contact details — the single source of truth for the public site going forward. Marketing pages still read their own constants today; wiring them to this profile is a follow-up phase."
      >
        <form onSubmit={submitProfile} className="grid gap-4 md:grid-cols-2">
          <Field label="Gym name" value={form.gymName} onChange={(v) => setDraft({ ...form, gymName: v })} />
          <Field label="Tagline" value={form.tagline} onChange={(v) => setDraft({ ...form, tagline: v })} />
          <Field label="Phone" value={form.phone} onChange={(v) => setDraft({ ...form, phone: v })} />
          <Field label="WhatsApp number (digits, with country code)" value={form.whatsapp} onChange={(v) => setDraft({ ...form, whatsapp: v })} />
          <Field label="Email" type="email" value={form.email} onChange={(v) => setDraft({ ...form, email: v })} />
          <Field label="Weekday hours" value={form.hoursWeekday} onChange={(v) => setDraft({ ...form, hoursWeekday: v })} />
          <Field label="Weekend hours" value={form.hoursWeekend} onChange={(v) => setDraft({ ...form, hoursWeekend: v })} />
          <div className="md:col-span-2">
            <Field label="Address" value={form.address} onChange={(v) => setDraft({ ...form, address: v })} />
          </div>
          <div className="flex flex-wrap items-center gap-3 md:col-span-2">
            <button
              type="submit"
              disabled={!dirty}
              className="btn-gold !px-5 !py-2.5 text-[12px] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saved ? (
                <span className="inline-flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5" /> Saved
                </span>
              ) : (
                'Save profile'
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                resetSettings()
                setDraft(null)
              }}
              className="inline-flex items-center gap-1.5 border border-vault-border px-4 py-2.5 text-[12px] text-vault-muted transition-colors hover:border-gold/40 hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset to defaults
            </button>
          </div>
        </form>
      </Section>

      {/* ---- Privacy & PIN ------------------------------------------------ */}
      <Section
        icon={<KeyRound className="h-4 w-4" strokeWidth={1.5} />}
        title="Privacy & PIN"
        blurb="The PIN protects blurred sensitive figures (sessions, revenue) from being revealed on screen. One PIN is shared across the owner dashboard, front desk and insights."
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="border border-vault-border bg-vault-bg px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-vault-muted">Current PIN</p>
              <p className="mt-1 flex items-center gap-2 text-[15px] font-bold tracking-[0.3em]">
                {pin ? '••••••' : <span className="text-[13px] font-normal text-vault-faint">Not set — anyone can reveal figures</span>}
              </p>
            </div>
            <form onSubmit={submitPin} className="flex items-end gap-2">
              <div className="flex-1">
                <Field
                  label={pin ? 'New PIN (4–6 digits)' : 'Set PIN (4–6 digits)'}
                  value={pinDraft}
                  onChange={(v) => setPinDraft(v.replace(/\D/g, '').slice(0, 6))}
                  placeholder="e.g. 4629"
                />
              </div>
              <button
                type="submit"
                disabled={pinDraft.length < 4}
                className="btn-gold shrink-0 !px-4 !py-2.5 text-[12px] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {pinSaved ? 'Saved' : pin ? 'Change' : 'Set PIN'}
              </button>
            </form>
          </div>
          {pin && (
            <button
              type="button"
              onClick={() => setPin(null)}
              className="text-[12px] text-vault-muted underline-offset-2 transition-colors hover:text-[#e06565] hover:underline"
            >
              Remove PIN (figures become revealable by anyone)
            </button>
          )}
          <Toggle
            on={kpiHidden}
            onToggle={toggleKpiHidden}
            label="Hide KPI figures across all portals"
            hint="Blurs every KPI number on the owner dashboard, front desk and insights until toggled back. Independent of the PIN."
          />
        </div>
      </Section>

      {/* ---- Access & data ------------------------------------------------ */}
      <Section
        icon={<TriangleAlert className="h-4 w-4" strokeWidth={1.5} />}
        title="Access & data — tester mode status"
        blurb="An honest picture of what protects the app today, and exactly what real go-live authentication will replace."
      >
        <div className="space-y-4">
          <div className="border border-gold/30 bg-gold/5 px-4 py-3">
            <p className="flex items-start gap-2 text-[12px] leading-relaxed text-gold">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Tester mode is active. Signing in picks a fixed profile ({STAFF_PROFILES.map((p) => p.name).join(', ')}) stored in this
              browser only. Anyone with the device can act as any role. This page cannot fix that — real Supabase Auth with staff
              accounts and passwords is the go-live gate.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="border border-vault-border bg-vault-bg px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-vault-muted">Demo staff key (enquiries + import pipeline)</p>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap border border-vault-border bg-vault-surface px-3 py-2 text-[12px] text-gold">
                  {DEMO_STAFF_KEY}
                </code>
                <button
                  type="button"
                  onClick={copyKey}
                  aria-label="Copy staff key"
                  className="flex h-9 w-9 items-center justify-center border border-vault-border text-vault-muted transition-colors hover:border-gold/50 hover:text-gold"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-[#7ec98f]" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-vault-muted">
                This key gates the enquiries inbox and CSV import Edge Functions. It is baked into the deployed functions, so
                rotating it means redeploying them with a new value — ask Kimi to do it as part of the real-auth phase, not before.
              </p>
            </div>
            <div className="border border-vault-border bg-vault-bg px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-vault-muted">Where the data lives today</p>
              <ul className="mt-2 space-y-1.5 text-[12px] leading-relaxed text-vault-muted">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 bg-gold" />
                  Enquiries, exercise library, imported clients — Supabase (cloud, survives reinstalls)
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 bg-gold" />
                  Clients directory, staff directory, schedule blocks, POS sales, shift events — this browser's localStorage
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 bg-gold" />
                  Clearing browser storage or switching devices starts those over — the Supabase migration phase moves them to the
                  cloud
                </li>
              </ul>
            </div>
          </div>
        </div>
      </Section>

      <p className="flex items-center gap-2 text-[11px] text-vault-faint">
        <Eye className="h-3.5 w-3.5" />
        Settings save to this browser instantly and sync across open tabs. No save is needed for toggles.
        <EyeOff className="h-3.5 w-3.5" aria-hidden />
      </p>
    </div>
  )
}
