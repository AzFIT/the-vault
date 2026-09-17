/**
 * Front-desk shell — shared chrome for the front-desk role (wireframe
 * screen 05 sidebar). Groups: TODAY (my shift, check in, POS, follow-ups)
 * and STUDIO (schedule, clients, enquiries). Modules that don't exist yet
 * render as disabled "Soon" items rather than dead links.
 *
 * Guard: no session → /portal/login. Everyone who isn't front desk is
 * bounced to their own home surface (owner → /portal, coach → /coach).
 */
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { LogOut } from 'lucide-react'
import { ENQUIRIES_CHANGED_EVENT, countNewEnquiries } from '@/lib/enquiries'
import { getCurrentProfile, openReminderCount, signOut } from '@/lib/staff'

interface DeskNavItem {
  label: string
  to?: string
  /** anchor on the My shift page, e.g. '#reminders' */
  hash?: string
  soon?: boolean
  badge?: number
}

const NAV_TODAY: DeskNavItem[] = [
  { label: 'My shift', to: '/portal/front-desk' },
  { label: 'Check In', to: '/portal/check-in' },
  { label: 'POS', to: '/portal/pos' },
  { label: 'Follow-ups', to: '/portal/follow-ups' },
]
const NAV_STUDIO: DeskNavItem[] = [
  { label: 'Schedule', soon: true },
  { label: 'Clients', soon: true },
  { label: 'Enquiries', to: '/admin/enquiries' },
]

const PAGE_CHROME: Record<string, { eyebrow: string; title: string }> = {
  '/portal/front-desk': { eyebrow: 'Staff', title: 'My shift' },
  '/portal/check-in': { eyebrow: 'Staff', title: 'Check in' },
  '/portal/pos': { eyebrow: 'Staff', title: 'Point of sale' },
  '/portal/follow-ups': { eyebrow: 'Staff', title: 'Follow-ups' },
}

function navCls(isActive: boolean) {
  return `relative flex w-full items-center gap-3 px-3 py-2.5 text-left text-[13px] transition-colors ${
    isActive ? 'bg-white/[0.08] text-white' : 'text-vault-muted hover:bg-white/[0.04] hover:text-white'
  }`
}

function NavEntry({ item, badge }: { item: DeskNavItem; badge?: number }) {
  if (item.soon || (!item.to && !item.hash)) {
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
  const to = item.hash ? `${item.to}${item.hash}` : (item.to as string)
  return (
    <NavLink
      to={to}
      end={!item.hash && item.to === '/portal/front-desk'}
      className={({ isActive }) => navCls(item.hash ? false : isActive)}
    >
      {({ isActive }) => (
        <>
          {(item.hash ? false : isActive) && (
            <span className="absolute left-0 top-0 h-full w-0.5 bg-gold" aria-hidden />
          )}
          <span className={`h-1.5 w-1.5 ${item.hash ? 'border border-vault-faint' : isActive ? 'bg-gold' : 'border border-vault-faint'}`} />
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

export default function FrontDeskShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const profile = getCurrentProfile()
  const [badges, setBadges] = useState({ enquiries: 0, followups: 0 })

  // Guard: front desk only. Everyone else gets bounced to their own surface.
  useEffect(() => {
    if (!profile) navigate('/portal/login', { replace: true })
    else if (profile.role !== 'front-desk') navigate(profile.home, { replace: true })
  }, [profile, navigate])

  useEffect(() => {
    const refresh = () =>
      setBadges({ enquiries: countNewEnquiries(), followups: openReminderCount() })
    refresh()
    window.addEventListener(ENQUIRIES_CHANGED_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(ENQUIRIES_CHANGED_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  if (!profile || profile.role !== 'front-desk') {
    return (
      <div className="app-black flex min-h-[100dvh] items-center justify-center bg-vault-bg" role="status" aria-label="Loading">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-vault-border border-t-gold" />
      </div>
    )
  }

  const chrome = PAGE_CHROME[location.pathname] ?? PAGE_CHROME['/portal/front-desk']

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
          <p className="px-3 pb-1 pt-4 text-[10px] uppercase tracking-[0.2em] text-vault-faint">Today</p>
          {NAV_TODAY.map((item) => (
            <NavEntry
              key={item.label}
              item={item}
              badge={item.label === 'Follow-ups' ? badges.followups || undefined : undefined}
            />
          ))}
          <p className="px-3 pb-1 pt-4 text-[10px] uppercase tracking-[0.2em] text-vault-faint">Studio</p>
          {NAV_STUDIO.map((item) => (
            <NavEntry
              key={item.label}
              item={item}
              badge={item.label === 'Enquiries' ? badges.enquiries || undefined : undefined}
            />
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
      {/* Mobile: front-desk pages are desktop-first for now */}
      <div className="border-t border-vault-border p-3 lg:hidden">
        <Link to="/" className="text-[12px] text-vault-muted">← Homepage</Link>
      </div>
    </div>
  )
}
