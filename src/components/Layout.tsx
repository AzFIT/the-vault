import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router'
import Lenis from 'lenis'
import { Toaster } from 'sonner'
import Navbar from './Navbar'
import Footer from './Footer'
import WhatsAppFloat from './WhatsAppFloat'

/**
 * Marketing layout — Navbar + page + Footer + WhatsApp pill.
 * Owns Lenis smooth scrolling (marketing only; the app shell is not
 * scroll-jacked — design.md §6) and hash-anchor scrolling.
 */
export default function Layout() {
  const location = useLocation()

  // Lenis smooth scroll (lerp 0.1 — design.md §6)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const lenis = new Lenis({ lerp: 0.1 })
    let raf = 0
    const loop = (time: number) => {
      lenis.raf(time)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      lenis.destroy()
    }
  }, [])

  // Scroll to hash anchors (/#personal-training etc.)
  useEffect(() => {
    if (!location.hash) {
      window.scrollTo(0, 0)
      return
    }
    const el = document.querySelector(location.hash)
    if (el) {
      // wait a tick so the page has laid out after navigation
      requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth' }))
    }
  }, [location.pathname, location.hash])

  return (
    <div className="min-h-[100dvh] bg-vault-bg text-white">
      <Navbar />
      <main>
        <Outlet />
      </main>
      <Footer />
      <WhatsAppFloat />
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: '#161616',
            border: '1px solid #2a2a2a',
            color: '#fff',
            borderRadius: 0,
          },
        }}
      />
    </div>
  )
}
