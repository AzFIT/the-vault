import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BarChart3,
  Bell,
  FileText,
  Inbox,
  LayoutDashboard,
  Menu,
  MessageCircle,
  Search,
  Table2,
  Users,
  X,
} from 'lucide-react'
import { Toaster } from 'sonner'
import { coachClients, programs } from '@/data/mock'
import { ENQUIRIES_CHANGED_EVENT, countNewEnquiries } from '@/lib/enquiries'
import WhatsAppFloat from './WhatsAppFloat'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/sheets', label: 'Sheets', icon: Table2 },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/coach', label: 'Coach', icon: Users },
  { to: '/plan-summary', label: 'Plan Summary', icon: FileText },
]

const PAGE_META: Record<string, { eyebrow: string; title: string }> = {
  '/dashboard': { eyebrow: 'Client View', title: 'Dashboard' },
  '/sheets': { eyebrow: 'Client View', title: 'Tracking Sheets' },
  '/analytics': { eyebrow: 'Client View', title: 'Analytics' },
  '/coach': { eyebrow: 'Coach View', title: 'Coach Dashboard' },
  '/plan-summary': { eyebrow: 'Client View', title: 'Plan Summary' },
  '/admin/enquiries': { eyebrow: 'Staff', title: 'Enquiries Inbox' },
}

const NOTIFICATIONS = [
  { id: 'n1', text: 'New membership enquiry — 6 Month', meta: '2h ago · Reception' },
  { id: 'n2', text: 'Rachel Cheung hit a PR — 61.5kg bench', meta: 'Yesterday · PT 3x/wk' },
  { id: 'n3', text: 'Tom Whitfield missed 2 sessions', meta: 'Yesterday · At risk' },
  { id: 'n4', text: 'FITMAMA Strength class full (6/6)', meta: 'Mon · Group classes' },
]

function navLinkCls(isActive: boolean) {
  return `relative flex items-center gap-3 px-3 py-2.5 text-[13px] uppercase tracking-[0.08em] transition-colors ${
    isActive
      ? 'bg-white/[0.08] text-white'
      : 'text-vault-muted hover:bg-white/[0.04] hover:text-white'
  }`
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation()
  const navigate = useNavigate()
  const isCoachView = location.pathname.startsWith('/coach')
  const [newCount, setNewCount] = useState(() => countNewEnquiries())

  useEffect(() => {
    const refresh = () => setNewCount(countNewEnquiries())
    window.addEventListener(ENQUIRIES_CHANGED_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(ENQUIRIES_CHANGED_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-vault-border px-5">
        <img src="/logo-gold.png" alt="The Vault" className="h-9 w-9 object-contain" />
        <span className="text-[13px] font-bold uppercase tracking-[0.18em]">The Vault</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) => navLinkCls(isActive)}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-0 h-full w-0.5 bg-gold" aria-hidden />
                )}
                <Icon className="h-4 w-4" strokeWidth={1.5} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Staff section */}
        <p className="px-3 pb-1 pt-5 text-[10px] uppercase tracking-[0.2em] text-vault-faint">
          Staff
        </p>
        <NavLink
          to="/admin/enquiries"
          onClick={onNavigate}
          className={({ isActive }) => navLinkCls(isActive)}
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <span className="absolute left-0 top-0 h-full w-0.5 bg-gold" aria-hidden />
              )}
              <Inbox className="h-4 w-4" strokeWidth={1.5} />
              <span>Enquiries</span>
              {newCount > 0 && (
                <span className="tnum ml-auto rounded-full bg-gold px-1.5 py-0.5 text-[10px] font-medium leading-none text-black">
                  {newCount}
                </span>
              )}
            </>
          )}
        </NavLink>
      </nav>

      {/* Mode switcher + user chip */}
      <div className="border-t border-vault-border p-4">
        <div className="mb-4 grid grid-cols-2 border border-vault-border text-[10px] uppercase tracking-[0.12em]">
          <button
            onClick={() => {
              navigate('/dashboard')
              onNavigate?.()
            }}
            className={`px-2 py-2 transition-colors ${
              !isCoachView ? 'bg-white text-vault-btn-text' : 'text-vault-muted hover:text-white'
            }`}
          >
            Client View
          </button>
          <button
            onClick={() => {
              navigate('/coach')
              onNavigate?.()
            }}
            className={`px-2 py-2 transition-colors ${
              isCoachView ? 'bg-white text-vault-btn-text' : 'text-vault-muted hover:text-white'
            }`}
          >
            Coach View
          </button>
        </div>
        <div className="flex items-center gap-3">
          {isCoachView ? (
            <div
              aria-label="Dan Kan"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-vault-border bg-vault-surface-2"
            >
              <span className="font-serif text-xs text-vault-muted">DK</span>
            </div>
          ) : (
            <div
              aria-label="Rachel Cheung"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-vault-border bg-vault-surface-2"
            >
              <span className="font-serif text-xs text-vault-muted">RC</span>
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-white">
              {isCoachView ? 'Dan Kan' : 'Rachel Cheung'}
            </p>
            <p className="text-[11px] text-vault-muted">Sheung Wan</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Command palette (⌘K)
// ---------------------------------------------------------------------------

interface PaletteItem {
  id: string
  label: string
  hint: string
  to: string
}

const PALETTE_ITEMS: PaletteItem[] = [
  ...NAV_ITEMS.map((n) => ({ id: `page-${n.to}`, label: n.label, hint: 'Page', to: n.to })),
  ...coachClients.map((c) => ({
    id: `client-${c.id}`,
    label: c.name,
    hint: `Client · ${c.tier}`,
    to: '/coach',
  })),
  ...programs.map((p) => ({
    id: `program-${p.id}`,
    label: p.name,
    hint: 'Program',
    to: '/coach',
  })),
]

/** Case-insensitive subsequence match; returns a score (lower = better) or -1. */
function fuzzyScore(query: string, text: string): number {
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  if (!q) return 0
  const sub = t.indexOf(q)
  if (sub >= 0) return sub
  let ti = 0
  for (let qi = 0; qi < q.length; qi++) {
    ti = t.indexOf(q[qi], ti)
    if (ti < 0) return -1
    ti++
  }
  return 100 + t.length
}

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {/* mounted fresh on each open, so query/cursor start reset */}
      {open && <PaletteDialog onClose={onClose} />}
    </AnimatePresence>
  )
}

function PaletteDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)

  const results = useMemo(
    () =>
      PALETTE_ITEMS.map((item) => ({ item, score: fuzzyScore(query.trim(), item.label) }))
        .filter((r) => r.score >= 0)
        .sort((a, b) => a.score - b.score)
        .map((r) => r.item)
        .slice(0, 9),
    [query],
  )

  const go = (to: string) => {
    onClose()
    navigate(to)
  }

  return (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[90] bg-black/60"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed left-1/2 top-[12vh] z-[91] w-[min(560px,calc(100vw-32px))] -translate-x-1/2 border border-vault-border bg-vault-surface shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Search"
          >
            <div className="flex items-center gap-3 border-b border-vault-border px-4">
              <Search className="h-4 w-4 shrink-0 text-vault-muted" />
              <input
                autoFocus
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setCursor(0)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') onClose()
                  else if (e.key === 'ArrowDown') {
                    e.preventDefault()
                    setCursor((c) => Math.min(c + 1, results.length - 1))
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault()
                    setCursor((c) => Math.max(c - 1, 0))
                  } else if (e.key === 'Enter' && results[cursor]) {
                    go(results[cursor].to)
                  }
                }}
                placeholder="Search pages, clients, programs…"
                aria-label="Search pages, clients and programs"
                className="w-full bg-transparent py-3.5 text-[14px] text-white placeholder:text-vault-faint focus:outline-none"
              />
              <kbd className="shrink-0 border border-vault-border px-1.5 py-0.5 text-[10px] text-vault-faint">
                ESC
              </kbd>
            </div>
            <ul className="max-h-[46vh] overflow-y-auto p-2" role="listbox">
              {results.length === 0 ? (
                <li className="px-3 py-6 text-center text-[13px] text-vault-faint">
                  No matches for “{query}”
                </li>
              ) : (
                results.map((r, i) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={i === cursor}
                      onMouseEnter={() => setCursor(i)}
                      onClick={() => go(r.to)}
                      className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-[13px] transition-colors ${
                        i === cursor ? 'bg-white/[0.08] text-white' : 'text-vault-muted'
                      }`}
                    >
                      <span>{r.label}</span>
                      <span className="text-[10px] uppercase tracking-[0.12em] text-vault-faint">
                        {r.hint}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </motion.div>
        </>
  )
}

// ---------------------------------------------------------------------------
// Notifications dropdown
// ---------------------------------------------------------------------------

function Notifications() {
  const [open, setOpen] = useState(false)
  const [read, setRead] = useState<Set<string>>(new Set())
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [open])

  const unread = NOTIFICATIONS.filter((n) => !read.has(n.id)).length

  return (
    <div ref={wrapRef} className="relative">
      <button
        aria-label={`Notifications${unread > 0 ? ` — ${unread} unread` : ''}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 text-vault-muted transition-colors hover:text-white"
      >
        <Bell className="h-5 w-5" strokeWidth={1.5} />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-gold" />
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-[60] mt-2 w-80 border border-vault-border bg-vault-surface shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-vault-border px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-vault-muted">
                Notifications
              </p>
              {unread > 0 && (
                <button
                  onClick={() => setRead(new Set(NOTIFICATIONS.map((n) => n.id)))}
                  className="text-[11px] uppercase tracking-[0.08em] text-gold transition-colors hover:text-white"
                >
                  Mark all read
                </button>
              )}
            </div>
            <ul>
              {NOTIFICATIONS.map((n) => {
                const isUnread = !read.has(n.id)
                return (
                  <li key={n.id}>
                    <button
                      onClick={() => setRead((r) => new Set(r).add(n.id))}
                      className="flex w-full items-start gap-3 border-b border-vault-border/60 px-4 py-3 text-left transition-colors last:border-0 hover:bg-white/[0.04]"
                    >
                      <span
                        className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                          isUnread ? 'bg-gold' : 'bg-transparent'
                        }`}
                        aria-hidden
                      />
                      <span>
                        <span className="block text-[13px] leading-snug text-white">{n.text}</span>
                        <span className="mt-0.5 block text-[11px] text-vault-faint">{n.meta}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * App shell — design.md §5.3. 240px sidebar + 64px top bar + Outlet content,
 * plus the floating WhatsApp pill (brand signature on every page).
 */
export default function AppShell() {
  const location = useLocation()
  const meta = PAGE_META[location.pathname] ?? { eyebrow: 'The Vault', title: 'App' }
  const [mobileOpen, setMobileOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  // ⌘K / Ctrl+K opens the command palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="app-black min-h-[100dvh] bg-vault-bg text-white">
      {/* Sidebar — desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-vault-border bg-vault-surface lg:block">
        <SidebarContent />
      </aside>

      {/* Sidebar — mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[65] bg-black/60 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="fixed inset-y-0 left-0 z-[66] w-60 border-r border-vault-border bg-vault-surface lg:hidden"
            >
              <button
                aria-label="Close menu"
                onClick={() => setMobileOpen(false)}
                className="absolute right-3 top-5 text-vault-muted hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Top bar */}
      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-vault-border bg-vault-bg/90 px-4 backdrop-blur-md md:px-8">
          <div className="flex items-center gap-3">
            <button
              className="text-vault-muted hover:text-white lg:hidden"
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-vault-muted">
                {meta.eyebrow}
              </p>
              <h1 className="text-lg font-bold leading-tight">{meta.title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <button
              aria-label="Search"
              onClick={() => setPaletteOpen(true)}
              className="hidden items-center gap-2 border border-vault-border px-3 py-1.5 text-[12px] text-vault-muted transition-colors hover:text-white md:flex"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Search</span>
              <kbd className="border border-vault-border px-1 text-[10px]">⌘K</kbd>
            </button>
            <Notifications />
            <a
              href="https://wa.me/85228859300"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Help via WhatsApp"
              className="flex items-center gap-2 rounded-full bg-[#25D366] px-3 py-1.5 text-[12px] font-medium text-white transition-transform hover:-translate-y-0.5"
            >
              <MessageCircle className="h-3.5 w-3.5 fill-white" strokeWidth={0} />
              <span className="hidden md:inline">Help</span>
            </a>
          </div>
        </header>

        {/* Content canvas — max 1280px, 32px padding (design.md §4) */}
        <main className="mx-auto w-full max-w-[1280px] p-4 md:p-8">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--vault-surface-2)',
            border: '1px solid var(--vault-border)',
            color: '#fff',
            borderRadius: 0,
          },
        }}
      />
      <WhatsAppFloat />
    </div>
  )
}
