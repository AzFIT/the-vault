import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { Facebook, Instagram, MapPin, Phone } from 'lucide-react'
import { asset } from '@/lib/utils'
import { toast } from 'sonner'
import { isEmail } from '@/lib/validation'
import { subscribeNewsletter } from '@/lib/enquiries'
import ContactLauncher from './enquiry/ContactLauncher'

const GYM_LINKS = [
  { label: 'Monthly Gym Membership', to: '/#memberships' },
  { label: 'Personal Training', to: '/#personal-training' },
  { label: 'Group Classes', to: '/#group-classes' },
  { label: "Women's Health", to: '/#womens-health' },
  { label: 'Gym Memberships', to: '/#memberships' },
]

// External links to the live thevault-fitness.com site. ("Contact Us" is
// deliberately not here — it opens the ContactLauncher popup instead, see below.)
const HELP_LINKS = [
  { label: 'Refer a Friend', href: 'https://thevault-fitness.com/pages/refer-a-friend-get-2-months-free' },
  { label: 'About Us', href: 'https://thevault-fitness.com/pages/about-us' },
  { label: 'Membership Rules', href: 'https://thevault-fitness.com/pages/membership-rules-guidelines' },
  { label: 'Privacy Policy', href: 'https://thevault-fitness.com/policies/privacy-policy' },
  { label: 'T&Cs', href: 'https://thevault-fitness.com/policies/terms-of-service' },
]

/** Marketing footer — Phase 2 spec: charcoal, actual logo lockup, grey link
 * columns, hairline gold divider, copyright --text-muted. */
export default function Footer() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [contactOpen, setContactOpen] = useState(false)

  const subscribe = (e: FormEvent) => {
    e.preventDefault()
    if (!isEmail(email)) {
      setError('Please enter a valid email address')
      return
    }
    subscribeNewsletter(email)
    setEmail('')
    setError(null)
    toast.success('Subscribed — welcome to The Vault')
  }

  return (
    <footer className="tv2" style={{ background: 'var(--bg-charcoal)', borderTop: '1px solid rgba(212,175,55,0.15)' }}>
      <div className="mx-auto grid max-w-[1600px] gap-12 px-5 py-16 md:grid-cols-2 lg:grid-cols-4 lg:gap-8 lg:px-8 lg:py-20">
        {/* 1 — Location block */}
        <div>
          <span className="brand-logo brand-logo--sidebar mb-6">
            <img src={asset('brand/THEVAULT-logo-transparent.png')} alt="The Vault Fitness" />
          </span>
          <ul className="space-y-3 text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <li className="flex gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" color="#D4AF37" />
              <span>
                3/F Alliance Building, 133 Connaught Road,
                <br />
                Sheung Wan, Hong Kong
              </span>
            </li>
            <li>
              Mon–Fri · 6:30am–11:30pm
              <br />
              Sat, Sun &amp; Public Holidays · 8am–8pm
            </li>
            <li className="flex gap-2.5">
              <Phone className="mt-0.5 h-4 w-4 shrink-0" color="#D4AF37" />
              <span>
                WhatsApp / Phone ·{' '}
                <a href="tel:+85228859300" className="transition-colors hover:text-[#D4AF37]">
                  +852 2885 9300
                </a>
              </span>
            </li>
          </ul>
          <a
            href="https://maps.google.com/?q=Alliance+Building,+133+Connaught+Road,+Sheung+Wan,+Hong+Kong"
            target="_blank"
            rel="noopener noreferrer"
            className="group mt-5 inline-flex items-center gap-1.5 text-[13px] uppercase tracking-[0.08em]"
            style={{ color: 'var(--gold)' }}
          >
            Directions
            <span className="transition-transform duration-200 group-hover:translate-x-1.5">→</span>
          </a>
        </div>

        {/* 2 — Brand paragraph */}
        <div>
          <p className="section-head mb-5">About</p>
          <p className="max-w-xs text-[13px] leading-[1.8]" style={{ color: 'var(--text-secondary)' }}>
            The Vault Fitness, nestled in the heart of Sheung Wan, is a premier Hong
            Kong training facility offering state-of-the-art equipment, a VIP
            personal training studio and spacious changing facilities — every detail
            designed with holistic wellness, quality movement and performance in
            mind.
          </p>
        </div>

        {/* 3 — Link columns */}
        <div className="grid grid-cols-2 gap-8">
          <div>
            <p className="section-head mb-5">The Gym</p>
            <ul className="space-y-2.5">
              {GYM_LINKS.map((l) => (
                <li key={l.label}>
                  <Link to={l.to} className="footer-link">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="section-head mb-5">Help</p>
            <ul className="space-y-2.5">
              <li>
                <button
                  type="button"
                  onClick={() => setContactOpen(true)}
                  className="footer-link cursor-pointer"
                >
                  Contact Us
                </button>
              </li>
              {HELP_LINKS.map((l) => (
                <li key={l.label}>
                  <a href={l.href} target="_blank" rel="noopener noreferrer" className="footer-link">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 4 — Newsletter */}
        <div>
          <p className="section-head mb-5">Newsletter</p>
          <p className="mb-5 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            Sign up for exclusive offers, news and more.
          </p>
          <form className="flex flex-col gap-3" onSubmit={subscribe} noValidate>
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <input
              id="newsletter-email"
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (error) setError(null)
              }}
              onBlur={() => {
                if (email && !isEmail(email)) setError('Please enter a valid email address')
              }}
              placeholder="Email address"
              aria-invalid={!!error || undefined}
              className="border bg-transparent px-4 py-3 text-[13px] focus:outline-none"
              style={{
                borderColor: 'rgba(212,175,55,0.2)',
                color: 'var(--text-primary)',
                borderRadius: 'var(--radius-card)',
              }}
            />
            {error && (
              <p role="alert" className="text-[12px]" style={{ color: 'var(--gold)' }}>
                {error}
              </p>
            )}
            <button type="submit" className="btn-outline w-full">
              Subscribe
            </button>
          </form>
          <div className="mt-6 flex items-center gap-4">
            <a href="https://www.facebook.com" aria-label="Facebook" style={{ color: 'var(--text-muted)' }} className="transition-colors hover:text-[#D4AF37]">
              <Facebook className="h-4 w-4" />
            </a>
            <a href="https://www.instagram.com" aria-label="Instagram" style={{ color: 'var(--text-muted)' }} className="transition-colors hover:text-[#D4AF37]">
              <Instagram className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Hairline gold divider + copyright */}
      <div style={{ borderTop: '1px solid rgba(212,175,55,0.15)' }}>
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-5 py-6 lg:px-8">
          <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>© 2026 The Vault Fitness.</p>
          <p className="hidden text-[11px] uppercase tracking-[0.14em] sm:block" style={{ color: 'var(--text-muted)' }}>
            Sheung Wan · Hong Kong
          </p>
        </div>
      </div>

      {/* Same Contact popup as the navbar — footer Contact Us entry */}
      <ContactLauncher open={contactOpen} onClose={() => setContactOpen(false)} />
    </footer>
  )
}
