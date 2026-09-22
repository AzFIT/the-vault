import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { submitEnquiry, type EnquiryRoute } from '@/lib/enquiries'
import { enquiryRouteForPlan, planLabel } from './plans'
import PassEnquiryForm from './PassEnquiryForm'
import MembershipEnquiryForm from './MembershipEnquiryForm'

interface Props {
  /** plan id from membershipPlans; null = closed */
  planId: string | null
  onClose: () => void
}

/**
 * Shared enquiry modal — backdrop fade + panel rise (Framer Motion),
 * ESC / backdrop close, full-screen sheet on mobile.
 */
export default function EnquiryModal({ planId, onClose }: Props) {
  return (
    <AnimatePresence>
      {/* key resets the form state whenever a new plan is opened */}
      {planId && <EnquiryModalInner key={planId} planId={planId} onClose={onClose} />}
    </AnimatePresence>
  )
}

function EnquiryModalInner({ planId, onClose }: { planId: string; onClose: () => void }) {
  const [status, setStatus] = useState<'form' | 'sending' | 'done'>('form')

  // ESC close + body scroll lock
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const route = enquiryRouteForPlan(planId)

  const handleSubmit = async (payload: Record<string, unknown>) => {
    setStatus('sending')
    // brief pause so the loading state is perceptible, then persist
    await new Promise((r) => setTimeout(r, 650))
    await submitEnquiry({
      route,
      plan: planId,
      planLabel: planLabel((payload.planId as string) ?? planId),
      payload,
    })
    setStatus('done')
    toast.success('Enquiry sent', {
      description:
        route === 'reception'
          ? 'Our reception team will be in touch.'
          : 'Our senior team will personally be in touch.',
    })
  }

  return (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />

          {/* Panel — full-screen sheet on mobile, centered card on sm+ */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={route === 'reception' ? 'Pass enquiry' : 'Membership enquiry'}
            initial={{ opacity: 0, y: 48 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 32 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex max-h-[100dvh] w-full flex-col border border-vault-border bg-vault-surface sm:my-8 sm:max-h-[88dvh] sm:max-w-lg"
          >
            {status === 'done' ? (
              <SuccessPanel route={route} onClose={onClose} />
            ) : (
              <>
                {/* Header */}
                <div className="flex items-start justify-between gap-6 border-b border-vault-border px-6 pb-5 pt-6 md:px-8">
                  <div>
                    <p className="eyebrow">
                      {route === 'reception' ? 'Pass Enquiry' : 'Membership Enquiry'}
                    </p>
                    <h3 className="display-title mt-2 text-[22px] font-bold leading-tight">
                      {planLabel(planId)}
                    </h3>
                    <p className="mt-2 text-[13px] leading-relaxed text-vault-muted">
                      {route === 'reception'
                        ? 'Our reception team will contact you to arrange your visit or a call.'
                        : 'Our senior team will personally be in touch.'}
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    aria-label="Close enquiry form"
                    className="shrink-0 p-1 text-vault-muted transition-colors hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Form body */}
                <div className="flex-1 overflow-y-auto px-6 py-6 md:px-8">
                  {route === 'reception' ? (
                    <PassEnquiryForm
                      planId={planId}
                      sending={status === 'sending'}
                      onSubmit={handleSubmit}
                    />
                  ) : (
                    <MembershipEnquiryForm
                      planId={planId}
                      sending={status === 'sending'}
                      onSubmit={handleSubmit}
                    />
                  )}
                </div>
              </>
            )}
          </motion.div>
        </div>
  )
}

function SuccessPanel({ route, onClose }: { route: EnquiryRoute; onClose: () => void }) {
  return (
    <div className="flex flex-col items-center px-8 py-16 text-center">
      <motion.span
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
        className="flex h-14 w-14 items-center justify-center rounded-full border border-gold"
      >
        <Check className="h-6 w-6 text-gold" />
      </motion.span>
      <h3 className="display-title mt-6 text-[22px] font-bold">
        Thank you — we'll be in touch shortly
      </h3>
      <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-vault-muted">
        {route === 'reception'
          ? 'Your enquiry has been sent to our reception team.'
          : 'Your enquiry has been sent to our senior team.'}
      </p>
      <button onClick={onClose} className="btn-outline mt-8">
        Close
      </button>
    </div>
  )
}
