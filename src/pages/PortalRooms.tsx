/**
 * Rooms (/portal/rooms) — the owner portal's training-spaces catalog.
 * Status tabs with live counts, search, dense table with capacity /
 * equipment notes / status, inline add & edit forms, archive-restore
 * (rooms are never deleted — schedule blocks keep their names), CSV export
 * of the current view, and reset to defaults.
 *
 * The catalog persists to localStorage (rooms.ts, same event + storage
 * pattern as gymSettings.ts) and syncs live across open tabs.
 */
import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Archive, ArchiveRestore, Check, Download, DoorOpen, Pencil, Plus, Printer, RotateCcw, Search, X } from 'lucide-react'
import NavButtons from '@/components/NavButtons'
import { exportRoomsCsv, useRooms } from '@/lib/rooms'
import type { Room } from '@/lib/rooms'

type TabKey = 'all' | 'active' | 'archived'

const EMPTY_FORM = { name: '', capacity: '', notes: '' }

export default function PortalRooms() {
  const [rooms, saveRooms, resetRooms] = useRooms()
  const [tab, setTab] = useState<TabKey>('all')
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [savedFlash, setSavedFlash] = useState(false)

  const counts = useMemo(() => {
    const c: Record<TabKey, number> = { all: rooms.length, active: 0, archived: 0 }
    for (const r of rooms) c[r.active ? 'active' : 'archived'] += 1
    return c
  }, [rooms])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rooms.filter((r) => {
      if (tab === 'active' && !r.active) return false
      if (tab === 'archived' && r.active) return false
      if (q && !`${r.name} ${r.notes}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [rooms, tab, query])

  const closeForm = () => {
    setAdding(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  const startEdit = (r: Room) => {
    setEditingId(r.id)
    setAdding(false)
    setForm({ name: r.name, capacity: String(r.capacity), notes: r.notes })
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const name = form.name.trim()
    const capacity = Math.max(1, Math.round(Number(form.capacity) || 0))
    if (!name) return
    if (editingId) {
      saveRooms(rooms.map((r) => (r.id === editingId ? { ...r, name, capacity, notes: form.notes.trim() } : r)))
    } else {
      const id = `room-${Date.now().toString(36)}`
      saveRooms([...rooms, { id, name, capacity, notes: form.notes.trim(), active: true }])
    }
    closeForm()
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 2200)
  }

  const toggleArchive = (id: string) =>
    saveRooms(rooms.map((r) => (r.id === id ? { ...r, active: !r.active } : r)))

  const dirty = editingId !== null || adding

  return (
    <div className="space-y-5">
      {/* Header + toolbar */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Operate · Rooms</p>
          <h2 className="mt-1 text-2xl font-bold text-white">Rooms</h2>
          <p className="mt-1 text-[13px] text-vault-muted">
            Training spaces across the gym. The schedule editor reads this list — archive a room to take it off the
            board without losing its history.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-vault-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search rooms…"
              className="w-52 border border-vault-border bg-vault-surface py-2 pl-9 pr-3 text-[13px] text-white placeholder:text-vault-faint focus:border-gold focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={() => (dirty ? closeForm() : setAdding(true))}
            className="inline-flex items-center gap-2 bg-gold px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-black transition-colors hover:bg-gold-2"
          >
            {adding ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {adding ? 'Cancel' : 'Add room'}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 border border-vault-border px-3 py-2 text-[11px] uppercase tracking-[0.1em] text-vault-muted transition-colors hover:border-white/40 hover:text-white"
          >
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
          <button
            type="button"
            onClick={() => exportRoomsCsv(visible)}
            disabled={visible.length === 0}
            className="inline-flex items-center gap-2 border border-vault-border px-3 py-2 text-[11px] uppercase tracking-[0.1em] text-vault-muted transition-colors hover:border-white/40 hover:text-white disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          <button
            type="button"
            onClick={resetRooms}
            title="Restore the original room list"
            className="inline-flex items-center gap-2 border border-vault-border px-3 py-2 text-[11px] uppercase tracking-[0.1em] text-vault-muted transition-colors hover:border-white/40 hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
          <NavButtons homeTo="/portal" />
        </div>
      </div>

      {/* Add / edit inline form */}
      {dirty && (
        <form onSubmit={submit} className="app-card space-y-3 p-4">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-white">
              <DoorOpen className="h-4 w-4 text-gold" strokeWidth={1.5} />
              {editingId ? 'Edit room' : 'Add a new room'}
            </p>
            <button type="button" onClick={closeForm} aria-label="Close" className="text-vault-muted hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-vault-faint">Name</span>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Main Floor"
                className="w-full border border-vault-border bg-vault-surface px-3 py-2 text-[13px] text-white placeholder:text-vault-faint focus:border-gold focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-vault-faint">Capacity</span>
              <input
                required
                inputMode="numeric"
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value.replace(/[^\d]/g, '') })}
                placeholder="20"
                className="w-full border border-vault-border bg-vault-surface px-3 py-2 text-[13px] text-white placeholder:text-vault-faint focus:border-gold focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-vault-faint">
                Equipment / notes
              </span>
              <input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Racks, platforms…"
                className="w-full border border-vault-border bg-vault-surface px-3 py-2 text-[13px] text-white placeholder:text-vault-faint focus:border-gold focus:outline-none"
              />
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 bg-gold px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-black hover:bg-gold-2"
            >
              <Check className="h-3.5 w-3.5" /> {editingId ? 'Save changes' : 'Add room'}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="border border-vault-border px-3 py-2 text-[11px] uppercase tracking-[0.1em] text-vault-muted hover:text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Status tabs */}
      <div className="flex flex-wrap gap-1 border-b border-vault-border" role="tablist" aria-label="Room status">
        {(['all', 'active', 'archived'] as TabKey[]).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`px-3 py-2.5 text-[12px] capitalize transition-colors ${
              tab === t
                ? 'border-b-2 border-gold font-semibold text-white'
                : 'border-b-2 border-transparent text-vault-muted hover:text-white'
            }`}
          >
            {t} <span className="tnum text-vault-faint">{counts[t]}</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="app-card overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-vault-border text-[10px] uppercase tracking-[0.14em] text-vault-faint">
              <th className="px-4 py-3 font-medium">Room</th>
              <th className="px-4 py-3 font-medium">Capacity</th>
              <th className="px-4 py-3 font-medium">Equipment / notes</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.id} className="border-b border-vault-border/50 last:border-0 hover:bg-white/[0.03]">
                <td className="px-4 py-3">
                  <p className={`font-medium ${r.active ? 'text-white' : 'text-vault-muted line-through'}`}>{r.name}</p>
                  <p className="text-[11px] text-vault-faint">{r.id}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="tnum text-white">{r.capacity}</span>{' '}
                  <span className="text-vault-faint">pax</span>
                </td>
                <td className="max-w-[320px] px-4 py-3">
                  <p className="truncate text-vault-muted">{r.notes || '—'}</p>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block border px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] ${
                      r.active ? 'border-[#7ec98f]/50 text-[#7ec98f]' : 'border-vault-faint/60 text-vault-faint'
                    }`}
                  >
                    {r.active ? 'Active' : 'Archived'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(r)}
                      aria-label={`Edit ${r.name}`}
                      title="Edit"
                      className="p-1.5 text-vault-faint transition-colors hover:text-white"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleArchive(r.id)}
                      aria-label={r.active ? `Archive ${r.name}` : `Restore ${r.name}`}
                      title={r.active ? 'Archive — take off the schedule board' : 'Restore — available for scheduling again'}
                      className="p-1.5 text-vault-faint transition-colors hover:text-gold"
                    >
                      {r.active ? <Archive className="h-3.5 w-3.5" /> : <ArchiveRestore className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-[13px] text-vault-faint">
                  No rooms match{query ? ` “${query}”` : ''}
                  {tab === 'archived' ? ' — nothing archived yet' : ''}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footnotes */}
      <div className="flex flex-wrap gap-x-8 gap-y-2 text-[11px] text-vault-faint">
        <p>
          <span className="text-vault-muted">Archive, don’t delete</span> — schedule blocks that reference a room keep
          its name, and an archived room can be restored at any time.
        </p>
        {savedFlash && (
          <p className="flex items-center gap-1.5 text-[#7ec98f]">
            <Check className="h-3.5 w-3.5" /> Rooms saved
          </p>
        )}
      </div>
    </div>
  )
}
