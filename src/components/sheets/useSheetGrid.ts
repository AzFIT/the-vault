/**
 * Spreadsheet keyboard-navigation hook (sheets.md §Global). See grid.tsx for
 * the cell components that consume this controller.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'

export interface CellAddr {
  r: number
  c: number
}

export interface CellMeta {
  focusable: boolean
  editable: boolean
}

export interface GridController {
  active: CellAddr | null
  editing: boolean
  seed: string | null
  isActive: (r: number, c: number) => boolean
  isEditing: (r: number, c: number) => boolean
  activate: (r: number, c: number, opts?: { edit?: boolean; seed?: string | null }) => void
  move: (dr: number, dc: number, wrap?: boolean) => void
  startEdit: (seed?: string | null) => void
  stopEdit: () => void
  blur: () => void
  containerProps: {
    tabIndex: number
    ref: React.RefObject<HTMLDivElement | null>
    onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void
    onBlur: (e: React.FocusEvent<HTMLDivElement>) => void
  }
}

export function useSheetGrid(
  rows: number,
  cols: number,
  meta: (r: number, c: number) => CellMeta,
): GridController {
  const [active, setActive] = useState<CellAddr | null>(null)
  const [editing, setEditing] = useState(false)
  const [seed, setSeed] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const metaRef = useRef(meta)

  useEffect(() => {
    metaRef.current = meta
  })

  const move = useCallback(
    (dr: number, dc: number, wrap = false) => {
      setActive((prev) => {
        if (!prev) return prev
        let { r, c } = prev
        for (let i = 0; i < rows * cols; i++) {
          r += dr
          c += dc
          if (wrap) {
            if (c >= cols) {
              c = 0
              r += 1
            }
            if (c < 0) {
              c = cols - 1
              r -= 1
            }
            if (r >= rows) r = 0
            if (r < 0) r = rows - 1
          }
          if (r < 0 || r >= rows || c < 0 || c >= cols) return prev
          if (metaRef.current(r, c).focusable) return { r, c }
        }
        return prev
      })
    },
    [rows, cols],
  )

  const activate = useCallback(
    (r: number, c: number, opts?: { edit?: boolean; seed?: string | null }) => {
      setActive({ r, c })
      setEditing(opts?.edit ?? false)
      setSeed(opts?.seed ?? null)
    },
    [],
  )

  const startEdit = useCallback((s: string | null = null) => {
    setEditing(true)
    setSeed(s)
  }, [])

  const stopEdit = useCallback(() => {
    setEditing(false)
    setSeed(null)
  }, [])

  const blur = useCallback(() => {
    setActive(null)
    setEditing(false)
    setSeed(null)
  }, [])

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (!active || editing) return
      const m = metaRef.current(active.r, active.c)
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          move(-1, 0)
          return
        case 'ArrowDown':
          e.preventDefault()
          move(1, 0)
          return
        case 'ArrowLeft':
          e.preventDefault()
          move(0, -1)
          return
        case 'ArrowRight':
          e.preventDefault()
          move(0, 1)
          return
        case 'Tab':
          e.preventDefault()
          move(0, e.shiftKey ? -1 : 1, true)
          return
        case 'Enter':
          e.preventDefault()
          if (m.editable) startEdit()
          else move(1, 0)
          return
        case 'F2':
          e.preventDefault()
          if (m.editable) startEdit()
          return
        case 'Escape':
          blur()
          return
        default:
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && m.editable) {
            e.preventDefault()
            startEdit(e.key)
          }
      }
    },
    [active, editing, move, startEdit, blur],
  )

  const onBlur = useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      // Only clear the active cell when focus leaves the whole grid
      if (!e.currentTarget.contains(e.relatedTarget as Node)) blur()
    },
    [blur],
  )

  return {
    active,
    editing,
    seed,
    isActive: (r, c) => active?.r === r && active?.c === c,
    isEditing: (r, c) => editing && active?.r === r && active?.c === c,
    activate,
    move,
    startEdit,
    stopEdit,
    blur,
    containerProps: { tabIndex: 0, ref: containerRef, onKeyDown, onBlur },
  }
}
