import type { ReactNode } from 'react'

/** Labelled field wrapper with required marker + inline error. */
export function Field({
  label,
  id,
  required = false,
  error,
  hint,
  children,
}: {
  label: string
  /** id of the inner control — wires <label htmlFor> when provided */
  id?: string
  required?: boolean
  error?: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="enquiry-label">
        {label} {required && <span className="text-gold">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1.5 text-[12px] text-vault-faint">{hint}</p>}
      {error && (
        <p role="alert" className="enquiry-error">
          {error}
        </p>
      )}
    </div>
  )
}

/** Single-select segmented control. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  invalid = false,
  ariaLabel,
}: {
  options: readonly { value: T; label: string }[]
  value: T | ''
  onChange: (v: T) => void
  invalid?: boolean
  ariaLabel?: string
}) {
  return (
    <div
      className="flex flex-wrap border border-vault-border"
      data-invalid={invalid || undefined}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          role="radio"
          aria-checked={value === o.value}
          className={`flex-1 whitespace-nowrap px-3 py-2.5 text-[12px] uppercase tracking-[0.08em] transition-colors ${
            value === o.value
              ? 'bg-gold font-medium text-black'
              : 'text-vault-muted hover:text-white'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Multi-select chip group. */
export function Chips<T extends string>({
  options,
  values,
  onToggle,
  ariaLabel,
}: {
  options: readonly T[]
  values: T[]
  onToggle: (v: T) => void
  ariaLabel?: string
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onToggle(o)}
          aria-pressed={values.includes(o)}
          data-active={values.includes(o) || undefined}
          className="enquiry-chip"
        >
          {o}
        </button>
      ))}
    </div>
  )
}

/** Mobile input with fixed +852 prefix. */
export function PhoneInput({
  id,
  value,
  onChange,
  onBlur,
  invalid = false,
}: {
  id?: string
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  invalid?: boolean
}) {
  return (
    <div
      className="enquiry-input flex items-center gap-2.5 px-0 py-0"
      data-invalid={invalid || undefined}
    >
      <span className="border-r border-vault-border py-3 pl-4 pr-3 text-[13px] text-vault-muted">
        +852
      </span>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d\s]/g, ''))}
        onBlur={onBlur}
        placeholder="6123 4567"
        aria-label="Mobile or WhatsApp number"
        className="flex-1 bg-transparent py-3 pr-4 text-[14px] text-white placeholder:text-vault-faint focus:outline-none"
      />
    </div>
  )
}
