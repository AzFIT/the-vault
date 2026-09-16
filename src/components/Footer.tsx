import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { Facebook, Instagram, MapPin, Phone } from 'lucide-react'
import { toast } from 'sonner'
import { isEmail } from '@/lib/validation'
import { subscribeNewsletter } from '@/lib/enquiries'

const GYM_LINKS = [
  { label: 'Monthly Gym Membership', to: '/#memberships' },
  { label: 'Personal Training', to: '/#personal-training' },
  { label: 'Group Classes', to: '/#group-classes' },
  { label: "Women's Health", to: '/#womens-health' },
  { label: 'Gym Memberships', to: '/#memberships' },
]

// External links to the live thevault-fitness.com site.
const HELP_LINKS = [
  { label: 'Refer a Friend', href: 'https://thevault-fitness.com/pages/refer-a-friend-get-2-months-free' },
  { label: 'About Us', href: 'https://thevault-fitness.com/pages/about-us' },
  { label: 'Contact Us', href: 'https://thevault-fitness.com/pages/contact-us' },
  { label: 'Membership Rules', href: 'https://thevault-fitness.com/pages/membership-rules-guidelines' },
  { label: 'Privacy Policy', href: 'https://thevault-fitness.com/policies/privacy-policy' },
  { label: 'T&Cs', href: 'https://thevault-fitness.com/policies/terms-of-service' },
]

/** Marketing footer — design.md §5.4 */
export default function Footer() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

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
    <footer className="border-t border-vault-border bg-vault-bg">
      <div className="mx-auto grid max-w-[1600px] gap-12 px-5 py-16 md:grid-cols-2 lg:grid-cols-4 lg:gap-8 lg:px-8 lg:py-20">
        {/* 1 — Location block */}
        <div>
          <img src="/logo-gold.png" alt="The Vault Fitness" className="mb-6 h-12 w-auto" />
          <ul className="space-y-3 text-[13px] leading-relaxed text-vault-muted">
            <li className="flex gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
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
              <Phone className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                WhatsApp / Phone ·{' '}
                <a href="tel:+85228859300" className="transition-colors hover:text-white">
                  +852 2885 9300
                </a>
              </span>
            </li>
          </ul>
          <a
            href="https://maps.google.com/?q=Alliance+Building,+133+Connaught+Road,+Sheung+Wan,+Hong+Kong"
            target="_blank"
            rel="noopener noreferrer"
            className="group mt-5 inline-flex items-center gap-1 text-[13px] uppercase tracking-[0.08em] text-white"
          >
            Directions
            <span className="transition-transform duration-200 group-hover:translate-x-1.5">→</span>
          </a>
        </div>

        {/* 2 — Brand paragraph */}
        <div>
          <p className="eyebrow mb-5">About</p>
          <p className="max-w-xs text-[13px] leading-[1.8] text-vault-muted">
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
            <p className="eyebrow mb-5">The Gym</p>
            <ul className="space-y-2.5">
              {GYM_LINKS.map((l) => (
                <li key={l.label}>
                  <Link
                    to={l.to}
                    className="text-[13px] text-vault-muted transition-colors hover:text-white"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="eyebrow mb-5">Help</p>
            <ul className="space-y-2.5">
              {HELP_LINKS.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[13px] text-vault-muted transition-colors hover:text-white"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 4 — Newsletter */}
        <div>
          <p className="eyebrow mb-5">Newsletter</p>
          <p className="mb-5 text-[13px] text-vault-muted">
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
              className="border border-vault-border bg-transparent px-4 py-3 text-[13px] text-white placeholder:text-vault-faint focus:border-vault-surface-3 focus:outline-none"
            />
            {error && (
              <p role="alert" className="text-[12px] text-gold">
                {error}
              </p>
            )}
            <button type="submit" className="btn-primary w-full">
              Subscribe
            </button>
          </form>
          <div className="mt-6 flex items-center gap-4">
            <a href="https://www.facebook.com" aria-label="Facebook" className="text-vault-muted transition-colors hover:text-white">
              <Facebook className="h-4 w-4" />
            </a>
            <a href="https://www.instagram.com" aria-label="Instagram" className="text-vault-muted transition-colors hover:text-white">
              <Instagram className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-vault-border">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-5 py-6 lg:px-8">
          <p className="text-[12px] text-vault-faint">© 2026 The Vault Fitness.</p>
          <p className="hidden text-[11px] uppercase tracking-[0.14em] text-vault-faint sm:block">
            Sheung Wan · Hong Kong
          </p>
        </div>
      </div>
    </footer>
  )
}
