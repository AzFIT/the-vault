import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { asset } from '@/lib/utils'
import { Facebook, Instagram, Menu, X } from 'lucide-react'

const NAV_LINKS = [
  { label: 'The Gym', to: '/#the-gym' },
  { label: 'Personal Training', to: '/#personal-training' },
  { label: 'Group Classes', to: '/#group-classes' },
  { label: "Women's Health", to: '/#womens-health' },
  { label: 'Gym Memberships', to: '/#memberships' },
]

/**
 * Marketing navbar — design.md §5.2.
 * Announcement bar + centered logo header + nav strip. Sticky with
 * backdrop blur after 80px of scroll. Mobile: full-screen overlay menu.
 */
export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
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
      className={`sticky top-0 z-50 transition-colors duration-300 ${
        scrolled ? 'bg-[rgba(35,31,32,0.85)] backdrop-blur-md' : 'bg-vault-bg'
      }`}
    >
      {/* 1 — Announcement bar */}
      <div className="relative flex h-9 items-center justify-center border-b border-vault-border px-4">
        <div className="absolute left-4 hidden items-center gap-3 sm:flex">
          <a href="https://www.facebook.com" aria-label="Facebook" className="text-vault-muted transition-colors hover:text-white">
            <Facebook className="h-3.5 w-3.5" />
          </a>
          <a href="https://www.instagram.com" aria-label="Instagram" className="text-vault-muted transition-colors hover:text-white">
            <Instagram className="h-3.5 w-3.5" />
          </a>
        </div>
        <p className="text-[11px] uppercase tracking-[0.14em] text-vault-muted">
          No contract. No joining fees. Cancel anytime.
        </p>
      </div>

      {/* 2 — Header bar with centered logo */}
      <div className="relative flex h-[96px] items-center justify-center border-b border-vault-border px-4 md:h-[112px] md:px-5">
        <Link to="/" aria-label="The Vault Fitness — home">
          <img src={asset('brand/vault-logo-full.png')} alt="The Vault Fitness" className="h-16 w-auto md:h-20" />
        </Link>

        <div className="absolute right-4 flex items-center gap-5 md:right-5">
          <Link
            to="/portal/login"
            className="hidden text-[13px] uppercase tracking-[0.12em] text-vault-muted transition-colors hover:text-white md:inline"
          >
            Staff
          </Link>
          <Link
            to="/dashboard"
            className="hidden text-[13px] uppercase tracking-[0.12em] text-vault-muted transition-colors hover:text-white md:inline"
          >
            Login
          </Link>
          <button
            className="text-white md:hidden"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* 3 — Nav strip */}
      <nav className="hidden h-12 items-center justify-center gap-9 md:flex">
        {NAV_LINKS.map((l) => (
          <Link key={l.to} to={l.to} className="nav-link">
            {l.label}
          </Link>
        ))}
      </nav>

      {/* Mobile full-screen menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[70] flex flex-col bg-vault-bg md:hidden"
          >
            <div className="flex h-[72px] items-center justify-between border-b border-vault-border px-4">
              <img src={asset('brand/vault-logo-full.png')} alt="The Vault Fitness" className="h-12 w-auto" />
              <motion.button
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                whileTap={{ rotate: 90 }}
                className="text-white"
              >
                <X className="h-6 w-6" />
              </motion.button>
            </div>
            <nav className="flex flex-1 flex-col items-start justify-center gap-2 px-8">
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
                    className="block py-3 text-3xl font-bold text-white"
                  >
                    {l.label}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 * NAV_LINKS.length, duration: 0.4 }}
              >
                <Link
                  to="/portal/login"
                  onClick={() => setOpen(false)}
                  className="mt-6 block text-3xl font-bold text-gold"
                >
                  Staff
                </Link>
                <Link
                  to="/dashboard"
                  onClick={() => setOpen(false)}
                  className="btn-primary mt-6"
                >
                  Login
                </Link>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
