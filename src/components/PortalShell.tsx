/**
 * Owner portal shell (/portal) — the studio-owner surface, separate from the
 * client AppShell and the front-desk shell. Grouped navigation matches the
 * wireframe: OPERATE (dashboard/schedule/check-in/rooms), GROW (clients,
 * enquiries, POS, insights, marketing), MANAGE (services, staff, settings).
 * Modules that don't exist yet render as disabled "Soon" items rather than
 * dead links.
 *
 * Guard: no session → /portal/login. Front desk and coach sessions are
 * bounced to their own home surfaces — each role sees only its own workflow.
 */
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { LogOut } from 'lucide-react'
import { ENQUIRIES_CHANGED_EVENT, countNewEnquiries } from '@/lib/enquiries'
import { getCurrentProfile, signOut } from '@/lib/staff'

interface PortalNavItem {
  label: string
  to?: string
  soon?: boolean
}

/** Topbar chrome per portal page — keeps the shell in sync with the route. */
const PAGE_CHROME: Record<string, { eyebrow: string; title: string }> = {
  '/portal': { eyebrow: 'Staff', title: 'Dashboard' },
  '/portal/staff': { eyebrow: 'Manage', title: 'Staff directory' },
}

const NAV_OPERATE: PortalNavItem[] = [
  { label: 'Dashboard', to: '/portal' },
  { label: 'Schedule', soon: true },
  { label: 'Check In', soon: true },
  { label: 'Rooms', soon: true },
]
const NAV_GROW: PortalNavItem[] = [
  { label: 'Clients', soon: true },
  { label: 'Enquiries', to: '/admin/enquiries' },
  { label: 'Point of Sale', soon: true },
  { label: 'Insights', soon: true },
  { label: 'Marketing', soon: true },
]
const NAV_MANAGE: PortalNavItem[] = [
  { label: 'Services & Products', soon: true },
  { label: 'Staff', to: '/portal/staff' },
  { label: 'Settings', soon: true },
]

function navCls(isActive: boolean) {
  return `relative flex w-full items-center gap-3 px-3 py-2.5 text-left text-[13px] transition-colors ${
    isActive
      ? 'bg-white/[0.08] text-white'
      : 'text-vault-muted hover:bg-white/[0.04] hover:text-white'
  }`
}

function NavEntry({ item, badge }: { item: PortalNavItem; badge?: number }) {
  if (item.soon || !item.to) {
    return (
      <button
        type="button"
        disabled
        title="Coming in a later phase"
        className="relative flex w-full cursor-not-allowed items-center gap-3 px-3 py-2.5 text-left text-[13px] text-vault-faint"
      >
        <span className="h-1.5 w-1.5 border border-vault-faint/60" />
        {item.label}
        <span className="ml-auto text-[9px] uppercase tracking-[0.14em] text-vault-faint">Soon</span>
      </button>
    )
  }
  return (
    <NavLink to={item.to} end={item.to === '/portal'} className={({ isActive }) => navCls(isActive)}>
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute left-0 top-0 h-full w-0.5 bg-gold" aria-hidden />}
          <span className={`h-1.5 w-1.5 ${isActive ? 'bg-gold' : 'border border-vault-faint'}`} />
          {item.label}
          {badge ? (
            <span className="ml-auto rounded-full bg-gold px-1.5 py-0.5 text-[10px] font-medium leading-none text-black">
              {badge}
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  )
}

export default function PortalShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const profile = getCurrentProfile()
  const [newCount, setNewCount] = useState(() => countNewEnquiries())
  const chrome = PAGE_CHROME[location.pathname] ?? PAGE_CHROME['/portal']

  // Guard: owner only. Everyone else gets bounced to their own surface.
  useEffect(() => {
    if (!profile) navigate('/portal/login', { replace: true })
    else if (profile.role !== 'owner') navigate(profile.home, { replace: true })
  }, [profile, navigate])

  useEffect(() => {
    const refresh = () => setNewCount(countNewEnquiries())
    window.addEventListener(ENQUIRIES_CHANGED_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(ENQUIRIES_CHANGED_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  if (!profile || profile.role !== 'owner') {
    return (
      <div className="app-black flex min-h-[100dvh] items-center justify-center bg-vault-bg" role="status" aria-label="Loading">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-vault-border border-t-gold" />
      </div>
    )
  }

  const signOutAndLeave = () => {
    signOut()
    navigate('/portal/login', { replace: true })
  }

  return (
    <div className="app-black min-h-[100dvh] bg-vault-bg text-white">
      <div className="flex">
        {/* Sidebar */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-vault-border bg-vault-surface p-3 lg:flex">
          <div className="flex items-center gap-3 border-b border-vault-border px-2 pb-4 pt-1">
            <span className="flex h-9 w-9 items-center justify-center border border-gold text-[13px] font-bold text-gold">V</span>
            <span className="text-[13px] font-bold uppercase tracking-[0.18em]">The Vault</span>
          </div>
          <p className="px-3 pb-1 pt-4 text-[10px] uppercase tracking-[0.2em] text-vault-faint">Operate</p>
          {NAV_OPERATE.map((item) => (
            <NavEntry key={item.label} item={item} />
          ))}
          <p className="px-3 pb-1 pt-4 text-[10px] uppercase tracking-[0.2em] text-vault-faint">Grow</p>
          {NAV_GROW.map((item) => (
            <NavEntry key={item.label} item={item} badge={item.label === 'Enquiries' ? newCount || undefined : undefined} />
          ))}
          <p className="px-3 pb-1 pt-4 text-[10px] uppercase tracking-[0.2em] text-vault-faint">Manage</p>
          {NAV_MANAGE.map((item) => (
            <NavEntry key={item.label} item={item} />
          ))}
          <div className="mt-auto flex items-center gap-3 border-t border-vault-border px-2 pt-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-vault-border bg-vault-surface-2 text-[11px] text-vault-muted">
              {profile.initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">{profile.name}</p>
              <p className="text-[11px] text-vault-muted">
                {profile.roleLabel} · {profile.staffNo}
              </p>
            </div>
            <button
              type="button"
              onClick={signOutAndLeave}
              aria-label="Sign out"
              title="Sign out"
              className="p-1.5 text-vault-muted transition-colors hover:text-white"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </aside>

        {/* Main */}
        <div className="min-w-0 flex-1 lg:pl-60">
          <header className="sticky top-0 z-30 flex h-16 flex-wrap items-center gap-3 border-b border-vault-border bg-vault-bg/90 px-4 backdrop-blur-md md:px-8">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-vault-muted">{chrome.eyebrow}</p>
              <h1 className="text-lg font-bold leading-tight">{chrome.title}</h1>
            </div>
            <span className="ml-auto border border-gold/50 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-gold">
              Tester mode — signed in as {profile.name}
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-vault-border bg-vault-surface-2 text-[11px] text-vault-muted">
              {profile.initials}
            </span>
          </header>
          <main className="mx-auto w-full max-w-[1280px] p-4 md:p-8">
            <Outlet />
          </main>
        </div>
      </div>
      {/* Mobile: portal is desktop-first for now; offer the essentials */}
      <div className="border-t border-vault-border p-3 lg:hidden">
        <Link to="/" className="text-[12px] text-vault-muted">← Homepage</Link>
      </div>
    </div>
  )
}
