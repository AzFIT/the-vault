/**
 * Owner portal shell (/portal) — the studio-owner surface, separate from the
 * client AppShell and the front-desk shell. Grouped navigation matches the
 * wireframe: OPERATE (dashboard/schedule/check-in/rooms), GROW (clients,
 * enquiries, POS, insights, marketing), MANAGE (services, staff, settings).
 * Modules that don't exist yet render as disabled "Soon" items rather than
 * dead links.
 *
 * Chrome extras: collapsible sidebar (persisted), a mobile drawer with the
 * same navigation, and back / forward / home buttons in the topbar.
 *
 * Guard: no session → /portal/login. Front desk and coach sessions are
 * bounced to their own home surfaces — each role sees only its own workflow.
 */
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { LogOut, Lock, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { ENQUIRIES_CHANGED_EVENT, countNewEnquiries } from '@/lib/enquiries'
import { getCurrentProfile, signOut } from '@/lib/staff'
import { asset } from '@/lib/utils'
import NavButtons from '@/components/NavButtons'
import PortalSearch from '@/components/PortalSearch'

interface PortalNavItem {
  label: string
  to?: string
  soon?: boolean
}

/** Topbar chrome per portal page — keeps the shell in sync with the route. */
const PAGE_CHROME: Record<string, { eyebrow: string; title: string }> = {
  '/portal': { eyebrow: 'Staff', title: 'Dashboard' },
  '/portal/staff': { eyebrow: 'Manage', title: 'Staff directory' },
  '/portal/clients': { eyebrow: 'Grow', title: 'Clients' },
  '/portal/schedule': { eyebrow: 'Operate', title: 'Schedule' },
  '/portal/insights': { eyebrow: 'Grow', title: 'Revenue & performance' },
  '/portal/settings': { eyebrow: 'Manage', title: 'Settings' },
  '/portal/services': { eyebrow: 'Manage', title: 'Services & Products' },
  '/portal/ops/check-in': { eyebrow: 'Operate', title: 'Check in' },
  '/portal/ops/pos': { eyebrow: 'Grow', title: 'Point of sale' },
  '/portal/ops/enquiries': { eyebrow: 'Grow', title: 'Enquiries inbox' },
  '/portal/rooms': { eyebrow: 'Operate', title: 'Rooms' },
  '/portal/members': { eyebrow: 'Manage', title: 'Members' },
}

const NAV_OPERATE: PortalNavItem[] = [
  { label: 'Dashboard', to: '/portal' },
  { label: 'Schedule', to: '/portal/schedule' },
  { label: 'Check In', to: '/portal/ops/check-in' },
  { label: 'Rooms', to: '/portal/rooms' },
]
const NAV_GROW: PortalNavItem[] = [
  { label: 'Clients', to: '/portal/clients' },
  { label: 'Enquiries', to: '/portal/ops/enquiries' },
  { label: 'Point of Sale', to: '/portal/ops/pos' },
  { label: 'Insights', to: '/portal/insights' },
  { label: 'Marketing', soon: true },
]
const NAV_MANAGE: PortalNavItem[] = [
  { label: 'Services & Products', to: '/portal/services' },
  { label: 'Staff', to: '/portal/staff' },
  { label: 'Members', to: '/portal/members' },
  { label: 'Settings', to: '/portal/settings' },
]

const COLLAPSE_KEY = 'vault-sidebar-collapsed'

function navCls(isActive: boolean, collapsed: boolean) {
  return `relative flex w-full items-center gap-3 px-3 py-2.5 text-left text-[13px] transition-colors ${
    collapsed ? 'justify-center px-0' : ''
  } ${
    isActive
      ? 'bg-gold/10 text-gold'
      : 'text-vault-muted hover:bg-white/[0.04] hover:text-[color:var(--vault-ink)]'
  }`
}

function NavEntry({ item, badge, collapsed }: { item: PortalNavItem; badge?: number; collapsed: boolean }) {
  if (item.soon || !item.to) {
    return (
      <button
        type="button"
        disabled
        title={`${item.label} — coming in a later phase`}
        className={`relative flex w-full cursor-not-allowed items-center gap-3 px-3 py-2.5 text-left text-[13px] text-vault-faint ${
          collapsed ? 'justify-center px-0' : ''
        }`}
      >
        <span className="h-1.5 w-1.5 border border-vault-faint/60" />
        {!collapsed && (
          <>
            {item.label}
            <span className="ml-auto text-[9px] uppercase tracking-[0.14em] text-vault-faint">Soon</span>
          </>
        )}
      </button>
    )
  }
  return (
    <NavLink
      to={item.to}
      end={item.to === '/portal'}
      title={item.label}
      className={({ isActive }) => navCls(isActive, collapsed)}
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute left-0 top-0 h-full w-0.5 bg-gold" aria-hidden />}
          <span className={`h-1.5 w-1.5 shrink-0 ${isActive ? 'bg-gold' : 'border border-vault-faint'}`} />
          {!collapsed && item.label}
          {!collapsed && badge ? (
            <span className="ml-auto rounded-full bg-gold px-1.5 py-0.5 text-[10px] font-medium leading-none text-black">
              {badge}
            </span>
          ) : null}
          {collapsed && badge ? (
            <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-gold" aria-hidden />
          ) : null}
        </>
      )}
    </NavLink>
  )
}

function SidebarContent({
  collapsed,
  newCount,
  onNavigate,
}: {
  collapsed: boolean
  newCount: number
  onNavigate?: () => void
}) {
  const navigate = useNavigate()
  const profile = getCurrentProfile()
  const signOutAndLeave = () => {
    signOut()
    navigate('/portal/login', { replace: true })
  }
  return (
    <>
      <div className={`flex items-center gap-3 border-b border-vault-border px-2 pb-4 pt-1 ${collapsed ? 'justify-center' : ''}`}>
        <img src={asset('brand/THEVAULT-logo-transparent.png')} alt="The Vault" className="h-8 w-auto shrink-0 object-contain" />
        {!collapsed && <span className="brand-logo__wordmark !text-[11px]">The Vault Fitness</span>}
      </div>
      {!collapsed && <p className="px-3 pb-1 pt-4 text-[10px] uppercase tracking-[0.2em] text-vault-faint">Operate</p>}
      {collapsed && <div className="pt-3" />}
      {NAV_OPERATE.map((item) => (
        <NavEntry key={item.label} item={item} collapsed={collapsed} />
      ))}
      {!collapsed && <p className="px-3 pb-1 pt-4 text-[10px] uppercase tracking-[0.2em] text-vault-faint">Grow</p>}
      {collapsed && <div className="pt-3" />}
      {NAV_GROW.map((item) => (
        <NavEntry
          key={item.label}
          item={item}
          collapsed={collapsed}
          badge={item.label === 'Enquiries' ? newCount || undefined : undefined}
        />
      ))}
      {!collapsed && <p className="px-3 pb-1 pt-4 text-[10px] uppercase tracking-[0.2em] text-vault-faint">Manage</p>}
      {collapsed && <div className="pt-3" />}
      {NAV_MANAGE.map((item) => (
        <NavEntry key={item.label} item={item} collapsed={collapsed} />
      ))}
      {onNavigate && (
        <div className="mt-4 border-t border-vault-border pt-3">
          <Link to="/" onClick={onNavigate} className="block px-3 text-[12px] text-vault-muted hover:text-white">
            ← Homepage
          </Link>
        </div>
      )}
      <div className="mt-auto">
        {!collapsed ? (
          <div className="flex items-center gap-3 border-t border-vault-border px-2 pt-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/50 bg-gold/10 text-[11px] text-gold">
              {profile?.initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium">{profile?.name}</p>
              <p className="text-[11px] text-vault-muted">
                {profile?.roleLabel} · {profile?.staffNo}
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
        ) : (
          <div className="flex flex-col items-center gap-2 border-t border-vault-border pt-3">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/50 bg-gold/10 text-[11px] text-gold"
              title={`${profile?.name} · ${profile?.roleLabel}`}
            >
              {profile?.initials}
            </span>
            <button
              type="button"
              onClick={signOutAndLeave}
              aria-label="Sign out"
              title="Sign out"
              className="p-1 text-vault-muted transition-colors hover:text-white"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>
    </>
  )
}

export default function PortalShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const profile = getCurrentProfile()
  const [newCount, setNewCount] = useState(() => countNewEnquiries())
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === '1')
  const [mobileOpen, setMobileOpen] = useState(false)
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

  const toggleCollapsed = () =>
    setCollapsed((v) => {
      localStorage.setItem(COLLAPSE_KEY, v ? '0' : '1')
      return !v
    })

  return (
    <div className="app-black tv2 min-h-[100dvh] bg-vault-bg text-white">
      <div className="flex">
        {/* Sidebar — collapsible on desktop, hidden on mobile (drawer below) */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-vault-border bg-vault-surface p-3 transition-[width] duration-200 lg:flex ${
            collapsed ? 'w-16' : 'w-60'
          }`}
        >
          <SidebarContent collapsed={collapsed} newCount={newCount} />
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="mt-3 flex w-full items-center justify-center gap-2 border-t border-vault-border pt-3 text-vault-muted transition-colors hover:text-white"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" strokeWidth={1.5} />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4" strokeWidth={1.5} />
                <span className="text-[10px] uppercase tracking-[0.14em]">Collapse</span>
              </>
            )}
          </button>
        </aside>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/70" onClick={() => setMobileOpen(false)} aria-hidden />
            <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-vault-border bg-vault-surface p-3">
              <SidebarContent collapsed={false} newCount={newCount} onNavigate={() => setMobileOpen(false)} />
            </aside>
          </div>
        )}

        {/* Main */}
        <div className={`min-w-0 flex-1 transition-[padding] duration-200 ${collapsed ? 'lg:pl-16' : 'lg:pl-60'}`}>
          <header className="sticky top-0 z-30 flex h-16 flex-wrap items-center gap-3 border-b border-vault-border bg-vault-bg/90 px-4 backdrop-blur-md md:px-8">
            <Link
              to="/"
              aria-label="The Vault Fitness — home"
              className="absolute left-1/2 hidden -translate-x-1/2 md:block"
            >
              <img src={asset('brand/THEVAULT-logo-transparent.png')} alt="" className="h-8 w-auto object-contain" />
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="flex h-8 w-8 items-center justify-center border border-vault-border text-vault-muted hover:text-[color:var(--gold)] lg:hidden"
            >
              <Menu className="h-4 w-4" strokeWidth={1.5} />
            </button>
            <NavButtons homeTo="/portal" />
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-vault-muted">{chrome.eyebrow}</p>
              <h1 className="text-lg font-bold leading-tight">{chrome.title}</h1>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <PortalSearch />
              <span className="hidden border border-gold/50 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-gold sm:inline-block">
                Tester mode — signed in as {profile.name}
              </span>
              <span className="hidden h-9 w-9 items-center justify-center rounded-full border border-gold/50 bg-gold/10 text-[11px] text-gold sm:flex">
                {profile.initials}
              </span>
              <button
                type="button"
                onClick={() => {
                  signOut()
                  navigate('/portal/login', { replace: true })
                }}
                aria-label={`Lock out — sign out ${profile.name}`}
                title="Lock out"
                className="flex h-9 w-9 items-center justify-center border border-vault-border text-vault-muted transition-colors hover:border-gold/60 hover:text-gold"
              >
                <Lock className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>
          </header>
          <main className="mx-auto w-full max-w-[1280px] p-4 md:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
