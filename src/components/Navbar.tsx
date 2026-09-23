import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { asset } from '@/lib/utils'
import { Facebook, Instagram, Menu, X } from 'lucide-react'
import ContactLauncher from './enquiry/ContactLauncher'

const NAV_LINKS = [
  { label: 'The Gym', to: '/#the-gym' },
  { label: 'Personal Training', to: '/#personal-training' },
  { label: 'Group Classes', to: '/#group-classes' },
  { label: "Women's Health", to: '/#womens-health' },
  { label: 'Gym Memberships', to: '/#memberships' },
]

/**
 * Marketing navbar — Phase 2 re-theme (design pack, split-hero homepage).
 * Left: actual V logo + "THE VAULT FITNESS" letter-spaced caps lockup.
 * Links: --text-secondary with gold hover. One solid gold "JOIN NOW".
 * Mobile: hamburger + logo; full-screen charcoal overlay, gold links.
 */
export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <header
      className={`tv2 sticky top-0 z-50 transition-colors duration-300 ${
        scrolled ? 'bg-[rgba(13,13,15,0.88)] backdrop-blur-md' : 'bg-[#0D0D0F]'
      }`}
    >
      {/* 1 — Announcement bar */}
      <div
        className="relative flex h-9 items-center justify-center border-b px-4"
        style={{ borderColor: 'rgba(212,175,55,0.15)' }}
      >
        <div className="absolute left-4 hidden items-center gap-3 sm:flex">
          <a href="https://www.facebook.com" aria-label="Facebook" style={{ color: 'var(--text-muted)' }} className="transition-colors hover:text-[#D4AF37]">
            <Facebook className="h-3.5 w-3.5" />
          </a>
          <a href="https://www.instagram.com" aria-label="Instagram" style={{ color: 'var(--text-muted)' }} className="transition-colors hover:text-[#D4AF37]">
            <Instagram className="h-3.5 w-3.5" />
          </a>
        </div>
        <p className="text-[11px] uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
          No contract. No joining fees. Cancel anytime.
        </p>
      </div>

      {/* 2 — Header bar: lockup (left) · links + JOIN NOW (right) */}
      <div
        className="relative flex h-[72px] items-center justify-between border-b px-4 md:px-6"
        style={{ borderColor: 'rgba(212,175,55,0.15)' }}
      >
        <Link to="/" className="brand-logo" aria-label="The Vault Fitness — home">
          <img src={asset('brand/THEVAULT-logo-transparent.png')} alt="The Vault Fitness" className="!h-8 md:!h-9" />
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {NAV_LINKS.map((l) => (
            <Link key={l.to} to={l.to} className="nav-link">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4 md:gap-5">
          <button
            onClick={() => setContactOpen(true)}
            className="hidden text-[13px] uppercase tracking-[0.12em] md:inline"
            style={{ color: 'var(--text-muted)' }}
          >
            Contact
          </button>
          <Link
            to="/enter"
            className="hidden text-[13px] uppercase tracking-[0.12em] md:inline"
            style={{ color: 'var(--text-muted)' }}
          >
            Staff
          </Link>
          <Link
            to="/enter"
            className="hidden text-[13px] uppercase tracking-[0.12em] md:inline"
            style={{ color: 'var(--text-muted)' }}
          >
            Login
          </Link>
          <Link to="/#memberships" className="btn-gold !px-5 !py-2.5 hidden md:inline-flex">
            Join Now
          </Link>
          <button
            className="md:hidden"
            style={{ color: 'var(--text-primary)' }}
            aria-label="Open menu"
            onClick={() => setOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Mobile full-screen charcoal overlay menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="tv2 fixed inset-0 z-[70] flex flex-col md:hidden"
            style={{ background: 'var(--bg-charcoal)' }}
          >
            <div
              className="flex h-[72px] items-center justify-between border-b px-4"
              style={{ borderColor: 'rgba(212,175,55,0.15)' }}
            >
              <span className="brand-logo">
                <img src={asset('brand/THEVAULT-logo-transparent.png')} alt="The Vault Fitness" className="!h-8" />
              </span>
              <motion.button
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                whileTap={{ rotate: 90 }}
                style={{ color: 'var(--text-primary)' }}
              >
                <X className="h-6 w-6" />
              </motion.button>
            </div>
            <nav className="flex flex-1 flex-col items-start justify-center gap-1 px-8">
              {NAV_LINKS.map((l, i) => (
                <motion.div
                  key={l.to}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06 * i, duration: 0.4 }}
                >
                  <Link
                    to={l.to}
                    onClick={() => setOpen(false)}
                    className="nav-link block py-3 !text-xl !normal-case !tracking-[0.06em]"
                  >
                    {l.label}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 * NAV_LINKS.length, duration: 0.4 }}
                className="mt-6 flex w-full flex-col gap-4"
              >
                <Link to="/#memberships" onClick={() => setOpen(false)} className="btn-gold w-full">
                  Join Now
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    setContactOpen(true)
                  }}
                  className="btn-outline w-full !border-gold/60 !text-gold"
                >
                  Contact
                </button>
                <div className="flex gap-6">
                  <Link to="/enter" onClick={() => setOpen(false)} className="nav-link">
                    Staff
                  </Link>
                  <Link to="/enter" onClick={() => setOpen(false)} className="nav-link">
                    Login
                  </Link>
                </div>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contact launcher — same popup on desktop and mobile */}
      <ContactLauncher open={contactOpen} onClose={() => setContactOpen(false)} />
    </header>
  )
}
