/**
 * Shared widgets for the Tracking Sheets: a 300ms number tween (averages,
 * volumes, macro bars) and the dark combobox cell used for exercises/foods.
 */
import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GridController } from './grid'
import { fuzzyFilter } from './libraries'

// ---------------------------------------------------------------------------
// TweenNumber — tweens between committed values (300ms, tabular)
// ---------------------------------------------------------------------------

export function TweenNumber({
  value,
  format = (v: number) => Math.round(v).toLocaleString('en-HK'),
  duration = 0.3,
  className,
}: {
  value: number
  format?: (v: number) => string
  duration?: number
  className?: string
}) {
  const mv = useMotionValue(value)
  const text = useTransform(mv, (v) => format(v))

  useEffect(() => {
    const controls = animate(mv, value, { duration, ease: 'easeOut' })
    return () => controls.stop()
  }, [mv, value, duration])

  return (
    <motion.span className={cn('tabular-nums', className)}>{text}</motion.span>
  )
}

// ---------------------------------------------------------------------------
// ComboCell — searchable dark dropdown living inside a grid cell.
// The grid controller's "editing" state doubles as the open state, so
// Enter / typing opens it exactly like the inline editor.
// ---------------------------------------------------------------------------

interface ComboCellProps<T> {
  ctl: GridController
  r: number
  c: number
  value: string
  options: T[]
  getLabel: (t: T) => string
  onSelect: (t: T) => void
  placeholder?: string
  disabled?: boolean
  align?: 'left' | 'right'
  /** render nothing at all (grouped exercise continuation rows) */
  blank?: boolean
  /** small adornment after the label (e.g. the group collapse toggle) */
  trailer?: ReactNode
}

export function ComboCell<T>({
  ctl,
  r,
  c,
  value,
  options,
  getLabel,
  onSelect,
  placeholder = 'Search…',
  disabled = false,
  align = 'left',
  blank = false,
  trailer,
}: ComboCellProps<T>) {
  const isActive = ctl.isActive(r, c)
  const open = ctl.isEditing(r, c) && !disabled
  const [query, setQuery] = useState('')
  const [hi, setHi] = useState(0)
  const listRef = useRef<HTMLUListElement>(null)

  // Reset query/highlight when the dropdown opens (render-phase derived state)
  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setQuery(ctl.seed ?? '')
      setHi(0)
    }
  }

  const filtered = fuzzyFilter(options, query, getLabel).slice(0, 8)

  useEffect(() => {
    listRef.current
      ?.querySelector('[data-hi="true"]')
      ?.scrollIntoView({ block: 'nearest' })
  }, [hi])

  const choose = (t: T, advance = true) => {
    onSelect(t)
    ctl.stopEdit()
    if (advance) ctl.move(1, 0)
  }

  const onInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation()
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHi((h) => Math.min(h + 1, filtered.length - 1))
        return
      case 'ArrowUp':
        e.preventDefault()
        setHi((h) => Math.max(h - 1, 0))
        return
      case 'Enter':
        e.preventDefault()
        if (filtered[hi]) choose(filtered[hi])
        else ctl.stopEdit()
        return
      case 'Tab':
        e.preventDefault()
        if (filtered[hi]) {
          onSelect(filtered[hi])
        }
        ctl.stopEdit()
        ctl.move(0, e.shiftKey ? -1 : 1, true)
        return
      case 'Escape':
        e.preventDefault()
        ctl.stopEdit()
        return
      default:
        setHi(0)
    }
  }

  return (
    <td
      role="gridcell"
      aria-selected={isActive}
      onClick={() => !disabled && ctl.activate(r, c)}
      onDoubleClick={() => !disabled && ctl.activate(r, c, { edit: true })}
      className={cn(
        'relative h-11 border border-vault-border/60 px-3 text-[13px] transition-colors duration-300',
        align === 'right' && 'text-right',
        isActive && 'bg-vault-surface-2 outline outline-2 -outline-offset-2 outline-white',
        disabled && 'text-vault-muted',
      )}
    >
      {open ? (
        <input
          autoFocus
          value={query}
          placeholder={placeholder}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onInputKeyDown}
          onBlur={() => ctl.stopEdit()}
          className="w-full bg-transparent p-0 text-[13px] text-white outline-none"
        />
      ) : blank ? (
        <span aria-hidden="true" />
      ) : (
        <span className="flex items-center gap-1.5">
          <span className={cn('block min-w-0 flex-1 truncate', !value && 'text-vault-faint')}>
            {value || '—'}
          </span>
          {trailer}
        </span>
      )}

      {open && (
        <motion.ul
          ref={listRef}
          initial={{ opacity: 0, scale: 0.96, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="absolute left-0 top-full z-30 mt-1 max-h-64 w-64 overflow-y-auto border border-vault-border bg-vault-surface-2 shadow-xl shadow-black/40"
        >
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-[13px] text-vault-faint">No matches</li>
          )}
          {filtered.map((t, i) => {
            const label = getLabel(t)
            const selected = label === value
            return (
              <li key={label}>
                <button
                  type="button"
                  data-hi={i === hi}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    choose(t, false)
                  }}
                  onMouseEnter={() => setHi(i)}
                  className={cn(
                    'flex w-full items-center justify-between px-3 py-2 text-left text-[13px]',
                    i === hi ? 'bg-white/[0.08] text-white' : 'text-vault-muted',
                  )}
                >
                  <span className="truncate">{label}</span>
                  {selected && <Check className="h-3.5 w-3.5 shrink-0" />}
                </button>
              </li>
            )
          })}
        </motion.ul>
      )}
    </td>
  )
}

// ---------------------------------------------------------------------------
// EnergySquares — 1–5 rating as five small squares (Daily Tracking tab)
// ---------------------------------------------------------------------------

export function EnergySquares({
  value,
  onChange,
  disabled = false,
}: {
  value: number
  onChange?: (v: number) => void
  disabled?: boolean
}) {
  return (
    <span className="inline-flex items-center gap-1" role="radiogroup" aria-label="Energy level">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation()
            onChange?.(n)
          }}
          className={cn(
            'h-2.5 w-2.5 transition-colors',
            n <= value ? 'bg-white' : '',
            disabled ? 'cursor-default' : 'hover:bg-white/60',
          )}
          style={n <= value ? undefined : { background: 'var(--viz-track)' }}
        />
      ))}
    </span>
  )
}
