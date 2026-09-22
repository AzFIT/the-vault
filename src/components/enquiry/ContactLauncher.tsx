import { useEffect } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, CalendarCheck, CreditCard, Dumbbell, MessageCircle, X } from 'lucide-react'

/**
 * Contact launcher — opened from the navbar "Contact" entry on every
 * marketing page. A popup of the four intent cards from the /intake
 * chooser; each card deep-links straight into the matching intake flow
 * (/intake?mode=…). Styled on the same token surface + gold Cinzel
 * headings as the enquiry modal so every client-facing surface matches.
 */

type Mode = 'contact' | 'membership' | 'training' | 'trial'

const CARDS: { mode: Mode; icon: typeof MessageCircle; title: string; desc: string }[] = [
  {
    mode: 'contact',
    icon: MessageCircle,
    title: 'Get in touch',
    desc: 'Quick contact — tell us how you\u2019d like us to reach you (WhatsApp, call, or text) and we\u2019ll come back to you.',
  },
  {
    mode: 'membership',
    icon: CreditCard,
    title: 'Membership',
    desc: 'Monthly passes and 12-month memberships — fill in the intake so our team can prepare the right options for you.',
  },
  {
    mode: 'training',
    icon: Dumbbell,
    title: 'Personal or group training',
    desc: '1-on-1 PT or small-group coaching — the intake helps us match you with the right coach and programme.',
  },
  {
    mode: 'trial',
    icon: CalendarCheck,
    title: 'Book your trial session',
    desc: 'A few quick questions about your training background and schedule — ends with a neat summary you can print or save.',
  },
]

export default function ContactLauncher({ open, onClose }: { open: boolean; onClose: () => void }) {
  // ESC close + body scroll lock while open
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Contact The Vault"
            initial={{ opacity: 0, y: 48 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 32 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex max-h-[100dvh] w-full flex-col overflow-y-auto border border-vault-border bg-vault-surface sm:my-8 sm:max-w-xl"
          >
            <div className="flex items-start justify-between gap-6 px-6 pb-5 pt-6 md:px-8">
              <div>
                <p className="eyebrow">Contact</p>
                <h3 className="display-title mt-2 text-[22px] font-bold leading-tight">
                  What are you looking for?
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-vault-muted">
                  Pick one and we&rsquo;ll take you straight to the right form.
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close contact menu"
                className="shrink-0 p-1 text-vault-muted transition-colors hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 px-6 pb-6 md:grid-cols-2 md:px-8">
              {CARDS.map((c, i) => (
                <motion.div
                  key={c.mode}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i, duration: 0.3 }}
                >
                  <Link
                    to={`/intake?mode=${c.mode}`}
                    onClick={onClose}
                    className="group flex h-full items-start gap-4 border border-vault-border bg-vault-bg p-5 text-left transition-colors hover:border-gold/60"
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center border border-vault-border text-vault-muted transition-colors group-hover:border-gold group-hover:text-gold">
                      <c.icon className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-bold text-white">{c.title}</span>
                      <span className="mt-1 block text-[12px] leading-relaxed text-vault-muted">
                        {c.desc}
                      </span>
                    </span>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-vault-faint transition-transform group-hover:translate-x-0.5 group-hover:text-gold" />
                  </Link>
                </motion.div>
              ))}
            </div>

            <p className="border-t border-vault-border px-6 py-4 text-center text-[12px] text-vault-muted md:px-8">
              Prefer to chat?{' '}
              <a
                href="https://wa.me/85228859300"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-gold transition-colors hover:text-gold-bright"
              >
                WhatsApp us directly
              </a>{' '}
              — front desk replies fastest there.
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
