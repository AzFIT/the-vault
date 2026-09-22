import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Library, Plus, RefreshCw, Search } from 'lucide-react'
import {
  distinct,
  EMPTY_FILTER,
  filterLibrary,
  loadExerciseLibrary,
} from '@/lib/exerciseLibrary'
import type { LibraryExercise, LibraryFilter } from '@/lib/exerciseLibrary'

const PAGE = 60

/**
 * Searchable, filterable browser for the seeded Supabase `exercise_library`.
 * Rendered inside the program builder's session detail; clicking the + on a
 * row calls `onPick` with the full library record (cues, category, video…).
 */
export default function ExercisePicker({
  onPick,
  pickedNames,
}: {
  onPick: (ex: LibraryExercise) => void
  pickedNames: Set<string>
}) {
  const [open, setOpen] = useState(false)
  const [library, setLibrary] = useState<LibraryExercise[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<LibraryFilter>(EMPTY_FILTER)
  const [showCount, setShowCount] = useState(PAGE)

  const load = (force = false) => {
    setLoading(true)
    setError(null)
    loadExerciseLibrary(force)
      .then(setLibrary)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (open && library === null && !loading && !error) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const categories = useMemo(() => (library ? distinct(library, 'movement_category') : []), [library])
  const equipment = useMemo(() => (library ? distinct(library, 'equipment') : []), [library])
  const difficulties = useMemo(() => (library ? distinct(library, 'difficulty') : []), [library])
  const sources = useMemo(() => (library ? distinct(library, 'source') : []), [library])

  const filtered = useMemo(
    () => (library ? filterLibrary(library, filter) : []),
    [library, filter],
  )
  const visible = filtered.slice(0, showCount)

  const hasFilter =
    filter.search !== '' ||
    filter.movementCategory !== '' ||
    filter.equipment !== '' ||
    filter.difficulty !== '' ||
    filter.source !== ''

  const selectCls =
    'w-full border border-vault-border bg-vault-bg px-2 py-1.5 text-[11px] text-white focus:border-vault-surface-3 focus:outline-none appearance-none'

  return (
    <div className="mt-4 border border-vault-border">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-vault-surface-2/60"
      >
        <span className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-vault-muted">
          <Library className="h-3.5 w-3.5" />
          Exercise library
          <span className="tnum normal-case tracking-normal text-vault-faint">
            {library ? `${library.length} exercises` : 'Supabase'}
          </span>
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-vault-faint transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="border-t border-vault-border p-3">
          {/* Search + filters */}
          <div className="mb-2 grid grid-cols-2 gap-1.5">
            <div className="relative col-span-2">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-vault-faint" />
              <input
                value={filter.search}
                onChange={(e) => {
                  setFilter((f) => ({ ...f, search: e.target.value }))
                  setShowCount(PAGE)
                }}
                placeholder="Search name, base exercise or muscle…"
                className="w-full border border-vault-border bg-vault-bg py-1.5 pl-7 pr-2 text-[12px] text-white placeholder:text-vault-faint focus:border-vault-surface-3 focus:outline-none"
              />
            </div>
            {(
              [
                ['movementCategory', 'All categories', categories],
                ['equipment', 'All equipment', equipment],
                ['difficulty', 'Any level', difficulties],
                ['source', 'Any source', sources.map((s) => (s === 'azfit_master_workbook' ? 'AzFIT Master' : 'App'))],
              ] as const
            ).map(([key, placeholder, options]) => (
              <div key={key} className="relative">
                <select
                  value={filter[key] === 'azfit_master_workbook' ? 'AzFIT Master' : filter[key]}
                  onChange={(e) => {
                    const raw = e.target.value
                    setFilter((f) => ({
                      ...f,
                      [key]: raw === 'AzFIT Master' ? 'azfit_master_workbook' : raw,
                    }))
                    setShowCount(PAGE)
                  }}
                  className={selectCls}
                >
                  <option value="">{placeholder}</option>
                  {options.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-vault-faint" />
              </div>
            ))}
          </div>

          {/* Status line */}
          <div className="mb-2 flex items-center justify-between">
            <p className="tnum text-[10px] text-vault-faint">
              {loading
                ? 'Loading…'
                : error
                  ? 'Load failed'
                  : `Showing ${visible.length} of ${filtered.length}`}
            </p>
            <div className="flex items-center gap-2">
              {hasFilter && (
                <button
                  onClick={() => {
                    setFilter(EMPTY_FILTER)
                    setShowCount(PAGE)
                  }}
                  className="text-[10px] uppercase tracking-[0.1em] text-vault-muted hover:text-white"
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => load(true)}
                aria-label="Reload library"
                className="text-vault-faint hover:text-white"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {error && (
            <p className="border border-vault-border bg-vault-bg px-3 py-2 text-[11px] text-red-300">
              {error} — check the connection and retry.
            </p>
          )}

          {/* Results */}
          <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
            {visible.map((ex) => {
              const picked = pickedNames.has(ex.name)
              return (
                <div
                  key={ex.id}
                  className="group flex items-center gap-2 border border-vault-border/50 bg-vault-bg/60 px-2 py-1.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] text-white">{ex.name}</p>
                    <p className="truncate text-[10px] text-vault-faint">
                      {[ex.movement_category, ex.primary_muscle, ex.difficulty]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <button
                    onClick={() => onPick(ex)}
                    disabled={picked}
                    aria-label={`Add ${ex.name}`}
                    className={`shrink-0 border p-1 transition-colors ${
                      picked
                        ? 'border-vault-border text-vault-faint'
                        : 'border-white/60 text-white hover:bg-white hover:text-vault-btn-text'
                    }`}
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              )
            })}
            {!loading && !error && visible.length === 0 && (
              <p className="py-4 text-center text-[11px] text-vault-faint">
                No exercises match these filters.
              </p>
            )}
          </div>

          {filtered.length > showCount && (
            <button
              onClick={() => setShowCount((c) => c + PAGE)}
              className="btn-ghost mt-2 w-full justify-center text-[10px]"
            >
              Show more ({filtered.length - showCount} remaining)
            </button>
          )}
        </div>
      )}
    </div>
  )
}
