/**
 * Schedule (/portal/schedule) — the owner portal's week grid (wireframe
 * screen 04, Pike13 layout). Colour-coded blocks: gold = revenue-bearing
 * PT 1:1/2:1, white = group class with capacity, dashed = bookable open
 * room slot. Week/day toggle, ‹ › week navigation, legend filters, and a
 * click-to-edit drawer (time, room, coach, capacity, note). Edits persist
 * to localStorage; drag-to-move is a later phase.
 */
import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2, X } from 'lucide-react'
import {
  BLOCK_TYPE_LABELS,
  GRID_END_MIN,
  GRID_START_MIN,
  PX_PER_MIN,
  addBlock,
  addDays,
  deleteBlock,
  fmtDayHeader,
  fmtHour12,
  fmtTime,
  fmtWeekLabel,
  iso,
  listBlocks,
  mondayOf,
  updateBlock,
} from '@/lib/schedule'
import type { BlockType, ScheduleBlock } from '@/lib/schedule'

type ViewMode = 'week' | 'day'

const GRID_HEIGHT = (GRID_END_MIN - GRID_START_MIN) * PX_PER_MIN
const HOURS: number[] = []
for (let m = GRID_START_MIN; m < GRID_END_MIN; m += 60) HOURS.push(m)

function blockCls(type: BlockType) {
  switch (type) {
    case 'pt':
      return 'border-gold/70 bg-gold/10'
    case 'class':
      return 'border-white/40 bg-white/[0.04]'
    case 'open':
      return 'border-dashed border-vault-faint/70 bg-transparent'
  }
}

function blockTitleCls(type: BlockType) {
  return type === 'pt' ? 'text-gold' : type === 'class' ? 'text-white' : 'text-vault-muted'
}

function blockSub(block: ScheduleBlock): string {
  const parts = [fmtTime(block.startMin), block.room]
  if (block.type === 'class') parts.push(`${block.enrolled ?? 0}/${block.capacity ?? 0}`)
  if (block.type === 'pt' && block.coach) parts.push(block.coach)
  return parts.join(' · ')
}

const EMPTY_DRAFT: Omit<ScheduleBlock, 'id'> = {
  type: 'class',
  title: '',
  date: '',
  startMin: 8 * 60,
  durationMin: 60,
  room: 'Main',
  coach: '',
  capacity: 6,
  enrolled: 0,
  note: '',
}

export default function PortalSchedule() {
  const [blocks, setBlocks] = useState<ScheduleBlock[]>(() => listBlocks())
  const [weekOffset, setWeekOffset] = useState(0)
  const [view, setView] = useState<ViewMode>('week')
  const [hiddenTypes, setHiddenTypes] = useState<Set<BlockType>>(new Set())
  const [draft, setDraft] = useState<(Omit<ScheduleBlock, 'id'> & { id?: string }) | null>(null)

  const monday = useMemo(() => addDays(mondayOf(new Date()), weekOffset * 7), [weekOffset])
  const weekDates = useMemo(() => Array.from({ length: 5 }, (_, i) => addDays(monday, i)), [monday])

  /** Day view: today when looking at the current week, otherwise Monday. */
  const dayDate = useMemo(() => {
    if (weekOffset === 0) {
      const today = new Date()
      const dow = (today.getDay() + 6) % 7
      return dow < 5 ? today : monday
    }
    return monday
  }, [weekOffset, monday])

  const columns = view === 'week' ? weekDates : [dayDate]

  const blocksFor = (date: Date) =>
    blocks.filter(
      (b) =>
        b.date === iso(date) &&
        !hiddenTypes.has(b.type) &&
        b.startMin >= GRID_START_MIN - 60 &&
        b.startMin < GRID_END_MIN,
    )

  const openDrawer = (block: ScheduleBlock) => {
    const { id, ...rest } = block
    setDraft({ ...rest, id })
  }

  const openNew = () => {
    const target = view === 'day' ? dayDate : weekOffset === 0 ? new Date() : monday
    setDraft({ ...EMPTY_DRAFT, date: iso(target) })
  }

  const closeDrawer = () => setDraft(null)

  const saveDrawer = (e: FormEvent) => {
    e.preventDefault()
    if (!draft || !draft.title.trim() || !draft.date) return
    const payload: Omit<ScheduleBlock, 'id'> = {
      ...draft,
      title: draft.title.trim(),
      coach: draft.coach?.trim() || undefined,
      note: draft.note?.trim() || undefined,
    }
    if (draft.id) setBlocks(updateBlock(draft.id, payload))
    else setBlocks(addBlock(payload))
    setDraft(null)
  }

  const removeDraft = () => {
    if (draft?.id) setBlocks(deleteBlock(draft.id))
    setDraft(null)
  }

  const toggleType = (t: BlockType) =>
    setHiddenTypes((prev) => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t)
      else next.add(t)
      return next
    })

  const setDraftField = <K extends keyof typeof EMPTY_DRAFT>(key: K, value: (typeof EMPTY_DRAFT)[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d))

  return (
    <div className="space-y-4">
      {/* Header + toolbar */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Operate · Schedule</p>
          <h2 className="mt-1 text-2xl font-bold text-white">Schedule</h2>
          <p className="mt-1 text-[13px] text-vault-muted">
            Gold = revenue-bearing 1:1/2:1 · white = group class · dashed = bookable open slot.
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-2 bg-gold px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-black transition-colors hover:bg-gold-2"
        >
          <Plus className="h-3.5 w-3.5" /> Add block
        </button>
      </div>

      {/* Week nav + view toggle + legend */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => setWeekOffset((o) => o - 1)}
            aria-label="Previous week"
            className="border border-vault-border px-2.5 py-2 text-vault-muted transition-colors hover:border-white/40 hover:text-white"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="border-y border-vault-border px-3 py-2 text-[11px] uppercase tracking-[0.12em] text-white">
            {fmtWeekLabel(monday)}
          </span>
          <button
            type="button"
            onClick={() => setWeekOffset((o) => o + 1)}
            aria-label="Next week"
            className="border border-vault-border px-2.5 py-2 text-vault-muted transition-colors hover:border-white/40 hover:text-white"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setWeekOffset(0)}
            className={`ml-1 border px-3 py-2 text-[11px] uppercase tracking-[0.1em] transition-colors ${
              weekOffset === 0
                ? 'border-white bg-white font-semibold text-black'
                : 'border-vault-border text-vault-muted hover:text-white'
            }`}
          >
            Today
          </button>
        </div>
        <div className="flex items-center">
          {(['day', 'week'] as ViewMode[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`border px-3 py-2 text-[11px] uppercase tracking-[0.1em] transition-colors ${
                view === v
                  ? 'border-white bg-white font-semibold text-black'
                  : 'border-vault-border text-vault-muted hover:text-white'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
        {/* Legend — type visibility toggles */}
        <div className="ml-auto flex flex-wrap items-center gap-3">
          {(Object.keys(BLOCK_TYPE_LABELS) as BlockType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => toggleType(t)}
              aria-pressed={!hiddenTypes.has(t)}
              className={`inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.1em] transition-opacity ${
                hiddenTypes.has(t) ? 'text-vault-faint opacity-40 line-through' : 'text-vault-muted hover:text-white'
              }`}
            >
              <span
                className={`h-2.5 w-2.5 ${
                  t === 'pt' ? 'border border-gold bg-gold/30' : t === 'class' ? 'border border-white/60' : 'border border-dashed border-vault-faint'
                }`}
              />
              {BLOCK_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="app-card overflow-x-auto">
        <div className="flex min-w-[720px]">
          {/* Time gutter */}
          <div className="w-12 shrink-0">
            <div className="h-8 border-b border-vault-border" />
            <div className="relative" style={{ height: GRID_HEIGHT }}>
              {HOURS.map((m) => (
                <span
                  key={m}
                  className="tnum absolute right-2 -translate-y-1/2 text-[10px] text-vault-faint"
                  style={{ top: (m - GRID_START_MIN) * PX_PER_MIN }}
                >
                  {fmtHour12(m)}
                </span>
              ))}
            </div>
          </div>
          {/* Day columns */}
          {columns.map((date) => {
            const isToday = iso(date) === iso(new Date())
            return (
              <div key={iso(date)} className="min-w-0 flex-1 border-l border-vault-border">
                <div
                  className={`flex h-8 items-center justify-center border-b border-vault-border text-[11px] uppercase tracking-[0.12em] ${
                    isToday ? 'font-bold text-gold' : 'text-vault-muted'
                  }`}
                >
                  {fmtDayHeader(date)}
                </div>
                <div className="relative" style={{ height: GRID_HEIGHT }}>
                  {HOURS.map((m) => (
                    <div
                      key={m}
                      className="absolute left-0 right-0 border-t border-vault-border/40"
                      style={{ top: (m - GRID_START_MIN) * PX_PER_MIN }}
                    />
                  ))}
                  {blocksFor(date).map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => openDrawer(b)}
                      className={`absolute left-1 right-1 overflow-hidden border px-2 py-1 text-left transition-colors hover:brightness-125 ${blockCls(b.type)}`}
                      style={{
                        top: Math.max(0, (b.startMin - GRID_START_MIN) * PX_PER_MIN),
                        height: Math.max(28, b.durationMin * PX_PER_MIN - 3),
                      }}
                    >
                      <p className={`truncate text-[12px] font-semibold leading-tight ${blockTitleCls(b.type)}`}>
                        {b.title}
                      </p>
                      <p className="tnum mt-0.5 truncate text-[10px] leading-tight text-vault-muted">
                        {blockSub(b)}
                      </p>
                      {b.note && <p className="truncate text-[10px] leading-tight text-vault-faint">{b.note}</p>}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legends */}
      <div className="flex flex-wrap gap-x-8 gap-y-2 text-[11px] text-vault-faint">
        <p>
          <span className="text-vault-muted">Colour coding</span> — gold blocks are revenue-bearing
          1:1/2:1 sessions, white blocks are group classes, dashed blocks are bookable open slots.
        </p>
        <p>
          <span className="text-vault-muted">Block click</span> opens the edit drawer — time, room,
          coach, capacity. Drag-to-move comes in a later phase.
        </p>
      </div>

      {/* Edit drawer */}
      {draft && (
        <>
          <button type="button" aria-label="Close drawer" className="fixed inset-0 z-40 cursor-default bg-black/60" onClick={closeDrawer} />
          <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col overflow-y-auto border-l border-vault-border bg-vault-surface p-5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.2em] text-vault-muted">
                {draft.id ? 'Edit block' : 'New block'}
              </p>
              <button type="button" onClick={closeDrawer} aria-label="Close" className="text-vault-muted hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={saveDrawer} className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-vault-faint">Title</span>
                <input
                  required
                  value={draft.title}
                  onChange={(e) => setDraftField('title', e.target.value)}
                  className="w-full border border-vault-border bg-vault-bg px-3 py-2 text-[13px] text-white focus:border-gold focus:outline-none"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-vault-faint">Type</span>
                  <select
                    value={draft.type}
                    onChange={(e) => setDraftField('type', e.target.value as BlockType)}
                    className="w-full border border-vault-border bg-vault-bg px-3 py-2 text-[13px] text-white focus:border-gold focus:outline-none"
                  >
                    {(Object.keys(BLOCK_TYPE_LABELS) as BlockType[]).map((t) => (
                      <option key={t} value={t}>
                        {BLOCK_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-vault-faint">Date</span>
                  <input
                    required
                    type="date"
                    value={draft.date}
                    onChange={(e) => setDraftField('date', e.target.value)}
                    className="w-full border border-vault-border bg-vault-bg px-3 py-2 text-[13px] text-white focus:border-gold focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-vault-faint">Start</span>
                  <input
                    required
                    type="time"
                    value={fmtTime(draft.startMin)}
                    onChange={(e) => {
                      const [h, m] = e.target.value.split(':').map(Number)
                      setDraftField('startMin', (h || 0) * 60 + (m || 0))
                    }}
                    className="w-full border border-vault-border bg-vault-bg px-3 py-2 text-[13px] text-white focus:border-gold focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-vault-faint">Duration</span>
                  <select
                    value={draft.durationMin}
                    onChange={(e) => setDraftField('durationMin', Number(e.target.value))}
                    className="w-full border border-vault-border bg-vault-bg px-3 py-2 text-[13px] text-white focus:border-gold focus:outline-none"
                  >
                    {[30, 45, 60, 90, 120].map((d) => (
                      <option key={d} value={d}>
                        {d} min
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-vault-faint">Room</span>
                  <select
                    value={draft.room}
                    onChange={(e) => setDraftField('room', e.target.value)}
                    className="w-full border border-vault-border bg-vault-bg px-3 py-2 text-[13px] text-white focus:border-gold focus:outline-none"
                  >
                    {['Main', 'VIP', 'Reformer'].map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </label>
                {draft.type === 'pt' && (
                  <label className="block">
                    <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-vault-faint">Coach</span>
                    <input
                      value={draft.coach ?? ''}
                      onChange={(e) => setDraftField('coach', e.target.value)}
                      className="w-full border border-vault-border bg-vault-bg px-3 py-2 text-[13px] text-white focus:border-gold focus:outline-none"
                    />
                  </label>
                )}
                {draft.type === 'class' && (
                  <>
                    <label className="block">
                      <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-vault-faint">Capacity</span>
                      <input
                        type="number"
                        min={1}
                        value={draft.capacity ?? 6}
                        onChange={(e) => setDraftField('capacity', Number(e.target.value))}
                        className="w-full border border-vault-border bg-vault-bg px-3 py-2 text-[13px] text-white focus:border-gold focus:outline-none"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-vault-faint">Enrolled</span>
                      <input
                        type="number"
                        min={0}
                        value={draft.enrolled ?? 0}
                        onChange={(e) => setDraftField('enrolled', Number(e.target.value))}
                        className="w-full border border-vault-border bg-vault-bg px-3 py-2 text-[13px] text-white focus:border-gold focus:outline-none"
                      />
                    </label>
                  </>
                )}
              </div>
              {draft.type === 'open' && (
                <label className="block">
                  <span className="mb-1 block text-[10px] uppercase tracking-[0.14em] text-vault-faint">Note</span>
                  <input
                    value={draft.note ?? ''}
                    onChange={(e) => setDraftField('note', e.target.value)}
                    placeholder="bookable"
                    className="w-full border border-vault-border bg-vault-bg px-3 py-2 text-[13px] text-white placeholder:text-vault-faint focus:border-gold focus:outline-none"
                  />
                </label>
              )}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="bg-gold px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-black hover:bg-gold-2"
                >
                  Save block
                </button>
                {draft.id && (
                  <button
                    type="button"
                    onClick={removeDraft}
                    className="inline-flex items-center gap-1.5 border border-vault-border px-3 py-2 text-[11px] uppercase tracking-[0.1em] text-[#e06565] transition-colors hover:border-[#e06565]/60"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="ml-auto border border-vault-border px-3 py-2 text-[11px] uppercase tracking-[0.1em] text-vault-muted hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </form>
          </aside>
        </>
      )}
    </div>
  )
}
