/**
 * Portal global search — the admin-console header search from the workflow
 * wireframe ("Search Members or Classes…"). One box finds client-directory
 * members and gym classes; Enter / click jumps to the matching surface.
 * Results cap at 8, keyboard navigable, closes on Escape / outside click.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Search, User, Users } from 'lucide-react'
import { listClients } from '@/lib/clientDirectory'
import { gymClasses } from '@/data/mock'

interface Hit {
  kind: 'member' | 'class'
  id: string
  title: string
  sub: string
  /** route the hit navigates to */
  to: string
}

const MAX_HITS = 8

export default function PortalSearch() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const blurTimer = useRef<number | undefined>(undefined)

  const hits = useMemo<Hit[]>(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const members: Hit[] = listClients()
      .filter((c) => `${c.name} ${c.subtitle}`.toLowerCase().includes(q))
      .slice(0, 6)
      .map((c) => ({
        kind: 'member',
        id: c.id,
        title: c.name,
        sub: c.subtitle,
        to: '/portal/clients',
      }))
    const classes: Hit[] = gymClasses
      .filter((g) => `${g.name} ${g.description ?? ''}`.toLowerCase().includes(q))
      .slice(0, 4)
      .map((g) => ({
        kind: 'class',
        id: g.id,
        title: g.name,
        sub: `${g.durationMin} min · capacity ${g.capacity}`,
        to: '/portal/schedule',
      }))
    return [...members, ...classes].slice(0, MAX_HITS)
  }, [query])

  // Clamp the active index when the result list shrinks.
  useEffect(() => {
    setActive((i) => Math.min(i, Math.max(0, hits.length - 1)))
  }, [hits.length])

  // Close on outside click.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const go = (hit: Hit) => {
    setOpen(false)
    setQuery('')
    navigate(hit.to)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false)
      ;(e.target as HTMLInputElement).blur()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, hits.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      const hit = hits[active]
      if (hit) {
        e.preventDefault()
        go(hit)
      }
    }
  }

  const showPanel = open && query.trim().length > 0

  return (
    <div ref={rootRef} className="relative hidden md:block">
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-vault-faint" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            setActive(0)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            // Delay so mousedown on a result wins over the blur.
            blurTimer.current = window.setTimeout(() => setOpen(false), 120)
          }}
          placeholder="Search members or classes…"
          role="combobox"
          aria-expanded={showPanel}
          aria-label="Search members or classes"
          className="w-56 border border-vault-border bg-vault-surface py-2 pl-9 pr-3 text-[13px] text-white placeholder:text-vault-faint focus:border-gold focus:outline-none lg:w-72"
        />
      </label>
      {showPanel && (
        <div
          role="listbox"
          aria-label="Search results"
          className="absolute right-0 top-full z-50 mt-1 w-80 max-w-[90vw] border border-vault-border bg-vault-surface shadow-[0_12px_32px_rgba(0,0,0,0.55)]"
        >
          {hits.length === 0 && (
            <p className="px-4 py-4 text-[13px] text-vault-faint">
              Nothing matches “{query.trim()}”.
            </p>
          )}
          {hits.map((h, i) => (
            <button
              key={`${h.kind}-${h.id}`}
              type="button"
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault()
                window.clearTimeout(blurTimer.current)
                go(h)
              }}
              onClick={() => go(h)}
              onMouseEnter={() => setActive(i)}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13px] ${
                i === active ? 'bg-gold/10 text-white' : 'text-white/85'
              }`}
            >
              {h.kind === 'member' ? (
                <User className="h-4 w-4 shrink-0 text-gold" strokeWidth={1.5} />
              ) : (
                <Users className="h-4 w-4 shrink-0 text-gold" strokeWidth={1.5} />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{h.title}</span>
                <span className="block truncate text-[11px] text-vault-muted">{h.sub}</span>
              </span>
              <span className="text-[9px] uppercase tracking-[0.14em] text-vault-faint">
                {h.kind === 'member' ? 'Clients' : 'Schedule'}
              </span>
            </button>
          ))}
          {hits.length > 0 && (
            <p className="border-t border-vault-border px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-vault-faint">
              ↵ open · ↑↓ browse · esc close
            </p>
          )}
        </div>
      )}
    </div>
  )
}
