import { Suspense, lazy } from 'react'
import type { ReactNode } from 'react'
import { Navigate, Routes, Route } from 'react-router'
import Layout from './components/Layout'
import AppShell from './components/AppShell'
import PortalShell from './components/PortalShell'
import FrontDeskShell from './components/FrontDeskShell'
import VaultEntry from './components/VaultEntry'

// Code-split pages — each route chunk loads on demand.
const Home = lazy(() => import('./pages/Home'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Sheets = lazy(() => import('./pages/Sheets'))
const Analytics = lazy(() => import('./pages/Analytics'))
const Coach = lazy(() => import('./pages/Coach'))
const PortalOwner = lazy(() => import('./pages/PortalOwner'))
const StaffDirectory = lazy(() => import('./pages/StaffDirectory'))
const PortalClients = lazy(() => import('./pages/PortalClients'))
const PortalSchedule = lazy(() => import('./pages/PortalSchedule'))
const PortalInsights = lazy(() => import('./pages/PortalInsights'))
const PortalInsightsReport = lazy(() => import('./pages/PortalInsightsReport'))
const PortalSettings = lazy(() => import('./pages/PortalSettings'))
const PortalServices = lazy(() => import('./pages/PortalServices'))
const PortalRooms = lazy(() => import('./pages/PortalRooms'))
const PlanSummary = lazy(() => import('./pages/PlanSummary'))
const Enquiries = lazy(() => import('./pages/Enquiries'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Intake = lazy(() => import('./pages/Intake'))
const PortalLogin = lazy(() => import('./pages/PortalLogin'))
const PortalGate = lazy(() => import('./pages/PortalGate'))
const MemberLogin = lazy(() => import('./pages/MemberLogin'))
const MembersHome = lazy(() => import('./pages/MembersHome'))
const MemberApp = lazy(() => import('./pages/MemberApp'))
const FrontDesk = lazy(() => import('./pages/FrontDesk'))
const FrontDeskCheckIn = lazy(() => import('./pages/FrontDeskCheckIn'))
const FrontDeskPOS = lazy(() => import('./pages/FrontDeskPOS'))
const FrontDeskFollowUps = lazy(() => import('./pages/FrontDeskFollowUps'))
// Phase 1 (temporary): design-token showcase for review — removed in Phase 5
const StyleGuide = lazy(() => import('./pages/StyleGuide'))

/** Centered gold spinner while a route chunk loads. */
function PageFallback() {
  return (
    <div className="flex min-h-[50dvh] items-center justify-center" role="status" aria-label="Loading">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-vault-border border-t-gold" />
    </div>
  )
}

export default function App() {
  // Per-route Suspense so the Layout/AppShell chrome stays mounted while
  // a page chunk loads.
  const page = (el: ReactNode) => <Suspense fallback={<PageFallback />}>{el}</Suspense>
  return (
    <>
      {/* Vault-entry ceremony overlay — renders above every route; PortalLogin
          and the Member App request it via a window event before navigating */}
      <VaultEntry />
      <Routes>
      {/* Marketing site — Navbar/Footer chrome */}
      <Route element={<Layout />}>
        <Route index element={page(<Home />)} />
        <Route path="*" element={page(<NotFound />)} />
      </Route>

      {/* Product app — sidebar shell */}
      <Route element={<AppShell />}>
        <Route path="/dashboard" element={page(<Dashboard />)} />
        <Route path="/sheets" element={page(<Sheets />)} />
        <Route path="/analytics" element={page(<Analytics />)} />
        <Route path="/coach" element={page(<Coach />)} />
        <Route path="/plan-summary" element={page(<PlanSummary />)} />
        <Route path="/admin/enquiries" element={page(<Enquiries />)} />
      </Route>

      {/* Owner portal — separate staff surface, owner-gated (tester sign-in) */}
      <Route element={<PortalShell />}>
        <Route path="/portal" element={page(<PortalOwner />)} />
        <Route path="/portal/staff" element={page(<StaffDirectory />)} />
        <Route path="/portal/clients" element={page(<PortalClients />)} />
        <Route path="/portal/schedule" element={page(<PortalSchedule />)} />
        <Route path="/portal/insights" element={page(<PortalInsights />)} />
        <Route path="/portal/settings" element={page(<PortalSettings />)} />
        <Route path="/portal/services" element={page(<PortalServices />)} />
        <Route path="/portal/rooms" element={page(<PortalRooms />)} />
        {/* Owner-context duplicates of shared work surfaces — same page
            components, but rendered inside the owner shell so the sidebar
            stays the owner's. The /portal/check-in + /portal/pos routes
            remain for the front-desk shell. */}
        <Route path="/portal/ops/check-in" element={page(<FrontDeskCheckIn />)} />
        <Route path="/portal/ops/pos" element={page(<FrontDeskPOS />)} />
        <Route path="/portal/ops/enquiries" element={page(<Enquiries />)} />
      </Route>

      {/* Retired management view — graduated into the owner portal */}
      <Route path="/manage" element={<Navigate to="/portal" replace />} />

      {/* Public client intake — no chrome, no login, shareable link */}
      <Route path="/intake" element={page(<Intake />)} />

      {/* Printable monthly revenue report — no chrome so prints stay clean;
          unguarded while auth is tester-mode (same trade-off as /intake) */}
      <Route path="/portal/insights/report" element={page(<PortalInsightsReport />)} />

      {/* Phase 1 design-token showcase — dev only (gated in Phase 5) */}
      {import.meta.env.DEV && <Route path="/style-guide" element={page(<StyleGuide />)} />}

      {/* Management portal — Phase A tester sign-in (no real auth yet) */}
      <Route path="/portal/login" element={page(<PortalLogin />)} />

      {/* The Vault Gate — intro video + destination menu (navbar Login/Staff) */}
      <Route path="/enter" element={page(<PortalGate />)} />

      {/* Member portal — golden-steel tester sign-in, mirrors the staff portal */}
      <Route path="/login" element={page(<MemberLogin />)} />
      <Route path="/members" element={page(<MembersHome />)} />
      <Route path="/members/app" element={page(<MemberApp />)} />

      {/* Front desk — separate front-desk surface, role-gated (tester sign-in) */}
      <Route element={<FrontDeskShell />}>
        <Route path="/portal/front-desk" element={page(<FrontDesk />)} />
        <Route path="/portal/check-in" element={page(<FrontDeskCheckIn />)} />
        <Route path="/portal/pos" element={page(<FrontDeskPOS />)} />
        <Route path="/portal/follow-ups" element={page(<FrontDeskFollowUps />)} />
        <Route path="/portal/desk-schedule" element={page(<PortalSchedule />)} />
        <Route path="/portal/desk-enquiries" element={page(<Enquiries />)} />
      </Route>
    </Routes>
    </>
  )
}
