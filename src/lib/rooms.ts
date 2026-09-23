/**
 * Rooms catalog — the owner-editable list of training spaces (used by the
 * schedule going forward). Stored in localStorage and synced live across
 * components and tabs via the same event + storage pattern as
 * gymSettings.ts / posCatalog.ts.
 *
 * Rooms are archived (active: false), never deleted — schedule blocks that
 * reference a room keep their name, and an archived room can be restored.
 * The defaults below are the seed catalog; the first write persists them
 * and "Reset to defaults" restores exactly this list.
 */
import { useCallback, useEffect, useState } from 'react'

export interface Room {
  id: string
  name: string
  capacity: number
  /** equipment / usage notes */
  notes: string
  /** archived rooms are hidden from scheduling but keep their history */
  active: boolean
}

export const DEFAULT_ROOMS: Room[] = [
  { id: 'main-floor', name: 'Main Floor', capacity: 40, notes: 'Racks, platforms, cardio row', active: true },
  { id: 'studio', name: 'Studio', capacity: 20, notes: 'Group classes · mats & light dumbbells', active: true },
  { id: 'pt-corner', name: 'PT Corner', capacity: 4, notes: 'Cable station, bench, mobility kit', active: true },
]

const KEY = 'vault-rooms'
const EVENT = 'vault-rooms-changed'

export function getRooms(): Room[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Room[]) : DEFAULT_ROOMS
  } catch {
    return DEFAULT_ROOMS
  }
}

export function saveRooms(next: Room[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // storage unavailable — change applies to this mount only
  }
  window.dispatchEvent(new Event(EVENT))
}

export function resetRooms() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(EVENT))
}

/** [rooms, save, reset] — subscribes to live changes from any surface. */
export function useRooms(): [Room[], (next: Room[]) => void, () => void] {
  const [rooms, setRooms] = useState<Room[]>(getRooms)

  useEffect(() => {
    const refresh = () => setRooms(getRooms())
    window.addEventListener(EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  const save = useCallback((next: Room[]) => {
    saveRooms(next)
    setRooms(next)
  }, [])
  const reset = useCallback(() => {
    resetRooms()
    setRooms(DEFAULT_ROOMS)
  }, [])

  return [rooms, save, reset]
}

/** Download the given rooms (e.g. the current filtered view) as CSV. */
export function exportRoomsCsv(rooms: Room[]) {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = [
    ['name', 'capacity', 'notes', 'status'],
    ...rooms.map((r) => [r.name, r.capacity, r.notes, r.active ? 'active' : 'archived']),
  ]
    .map((r) => r.map(esc).join(','))
    .join('\r\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `vault-rooms-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
