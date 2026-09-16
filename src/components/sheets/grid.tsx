/**
 * Spreadsheet cell components for the Tracking Sheets (sheets.md §Global).
 * Active cell: 2px white outline ring inside the cell on a lightened bg;
 * committed cells flash white 12% for 400ms. Navigation logic lives in
 * useSheetGrid.ts.
 */
import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { GridController } from './useSheetGrid'

export type { CellAddr, CellMeta, GridController } from './useSheetGrid'

interface EditableCellProps {
  ctl: GridController
  r: number
  c: number
  /** raw string value used to seed the editor */
  value: string
  /** rendered when not editing (defaults to value) */
  display?: ReactNode
  editable?: boolean
  focusable?: boolean
  align?: 'left' | 'right' | 'center'
  numeric?: boolean
  placeholder?: string
  className?: string
  onCommit?: (v: string) => void
}

export function EditableCell({
  ctl,
  r,
  c,
  value,
  display,
  editable = true,
  focusable = true,
  align = 'right',
  numeric = true,
  placeholder = '—',
  className,
  onCommit,
}: EditableCellProps) {
  const isActive = ctl.isActive(r, c) && focusable
  const isEditing = ctl.isEditing(r, c) && editable && focusable
  const [draft, setDraft] = useState('')
  const [flash, setFlash] = useState(false)
  const cancelRef = useRef(false)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Seed the draft when the editor opens (render-phase derived state)
  const [wasEditing, setWasEditing] = useState(false)
  if (isEditing !== wasEditing) {
    setWasEditing(isEditing)
    if (isEditing) setDraft(ctl.seed ?? value)
  }

  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current)
    },
    [],
  )

  const doFlash = () => {
    setFlash(true)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlash(false), 400)
  }

  const commit = (dr: number, dc: number, wrap = false) => {
    ctl.stopEdit()
    if (!cancelRef.current && draft !== value) {
      onCommit?.(draft)
      doFlash()
    }
    if (dr !== 0 || dc !== 0) ctl.move(dr, dc, wrap)
  }

  const onInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'Enter':
        e.preventDefault()
        e.stopPropagation()
        commit(1, 0)
        return
      case 'Tab':
        e.preventDefault()
        e.stopPropagation()
        commit(0, e.shiftKey ? -1 : 1, true)
        return
      case 'Escape':
        e.preventDefault()
        e.stopPropagation()
        cancelRef.current = true
        ctl.stopEdit()
        return
      case 'ArrowUp':
        e.preventDefault()
        e.stopPropagation()
        commit(-1, 0)
        return
      case 'ArrowDown':
        e.preventDefault()
        e.stopPropagation()
        commit(1, 0)
        return
      default:
        e.stopPropagation()
    }
  }

  return (
    <td
      role="gridcell"
      aria-selected={isActive}
      onClick={() => focusable && ctl.activate(r, c)}
      onDoubleClick={() => focusable && editable && ctl.activate(r, c, { edit: true })}
      className={cn(
        'h-11 border border-vault-border/60 px-3 text-[13px] transition-colors duration-300',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        numeric && 'tabular-nums',
        isActive && 'bg-vault-surface-2 outline outline-2 -outline-offset-2 outline-white',
        flash && 'bg-white/[0.12]',
        !focusable && 'text-vault-faint',
        className,
      )}
    >
      {isEditing ? (
        <input
          autoFocus
          value={draft}
          inputMode={numeric ? 'decimal' : 'text'}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onInputKeyDown}
          onBlur={() => commit(0, 0)}
          onFocus={(e) => {
            cancelRef.current = false
            if (ctl.seed) e.target.select()
          }}
          className={cn(
            'w-full bg-transparent p-0 text-[13px] text-white outline-none',
            align === 'right' && 'text-right',
            align === 'center' && 'text-center',
            'tabular-nums',
          )}
        />
      ) : (
        <span className="block truncate">
          {display ?? (value === '' ? <span className="text-vault-faint">{placeholder}</span> : value)}
        </span>
      )}
    </td>
  )
}

/** Non-editing focusable cell wrapper for custom interactive content. */
export function CustomCell({
  ctl,
  r,
  c,
  children,
  className,
  align = 'center',
}: {
  ctl: GridController
  r: number
  c: number
  children: ReactNode
  className?: string
  align?: 'left' | 'right' | 'center'
}) {
  const isActive = ctl.isActive(r, c)
  return (
    <td
      role="gridcell"
      aria-selected={isActive}
      onClick={() => ctl.activate(r, c)}
      className={cn(
        'h-11 border border-vault-border/60 px-3 text-[13px] transition-colors duration-300',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        isActive && 'bg-vault-surface-2 outline outline-2 -outline-offset-2 outline-white',
        className,
      )}
    >
      {children}
    </td>
  )
}

/** Header cell — 11px uppercase muted labels (sheets.md §Global). */
export function HeaderCell({
  children,
  className,
  sticky,
}: {
  children?: ReactNode
  className?: string
  sticky?: boolean
}) {
  return (
    <th
      className={cn(
        'h-10 border border-vault-border/60 bg-vault-surface-2 px-3 text-left text-[11px] font-normal uppercase tracking-[0.15em] text-vault-muted',
        sticky && 'sticky left-0 z-10',
        className,
      )}
    >
      {children}
    </th>
  )
}
