import { Suspense, lazy } from 'react'
import type { ReactNode } from 'react'
import { Navigate, Routes, Route } from 'react-router'
import Layout from './components/Layout'
import AppShell from './components/AppShell'
import PortalShell from './components/PortalShell'

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
const PlanSummary = lazy(() => import('./pages/PlanSummary'))
const Enquiries = lazy(() => import('./pages/Enquiries'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Intake = lazy(() => import('./pages/Intake'))
const PortalLogin = lazy(() => import('./pages/PortalLogin'))
const FrontDesk = lazy(() => import('./pages/FrontDesk'))

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
      </Route>

      {/* Retired management view — graduated into the owner portal */}
      <Route path="/manage" element={<Navigate to="/portal" replace />} />

      {/* Public client intake — no chrome, no login, shareable link */}
      <Route path="/intake" element={page(<Intake />)} />

      {/* Management portal — Phase A tester sign-in (no real auth yet) */}
      <Route path="/portal/login" element={page(<PortalLogin />)} />
      <Route path="/portal/front-desk" element={page(<FrontDesk />)} />
    </Routes>
  )
}
