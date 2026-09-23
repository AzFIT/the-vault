/**
 * Class booking popup — opened from the homepage class cards.
 *
 *   Click card → choose "I'm a Member" / "Not a Member Yet"
 *   Member (signed in)  → upcoming sessions with live capacity:
 *                         Book (confirmed) or Join Waitlist when full
 *   Member (signed out) → prompt to sign in, then book
 *   Non-member          → intake form (contact details) so the team can
 *                         book them in manually and arrange payment
 *
 * Bookings live in Supabase (`classes` + `bookings`, writes via the
 * book-class edge function) and re-render here via BOOKINGS_EVENT.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowRight, CalendarCheck, Check, User, Users, X } from 'lucide-react'
import {
  WEEK_CLASSES,
  BOOKINGS_EVENT,
  bookingFor,
  bookClass,
  cancelBooking,
  spotsLeft,
  waitlistCount,
} from '@/lib/classSchedule'
import { getMemberSession, getMemberProfile } from '@/lib/member'

interface Props {
  /** Homepage card label, e.g. "Hyrox Class". */
  cardName: string
  onClose: () => void
}

type Step = 'choose' | 'member' | 'guest'

const OPTION_CLASS =
  'group flex w-full items-center gap-3 border border-vault-border bg-vault-surface/60 px-4 py-3.5 text-left transition-colors hover:border-gold/70 hover:bg-white/[0.04]'

export default function ClassBookingModal({ cardName, onClose }: Props) {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('choose')
  const [, setTick] = useState(0)
  const refresh = () => setTick((t) => t + 1)
  // Bookings are async cloud writes — re-render when the store notifies.
  useEffect(() => {
    window.addEventListener(BOOKINGS_EVENT, refresh)
    return () => window.removeEventListener(BOOKINGS_EVENT, refresh)
  }, [])

  const memberSession = getMemberSession()
  const member = memberSession ? getMemberProfile(memberSession.memberId) : undefined
  const isPT = cardName === 'VIP 1-on-1'
  const scheduleNames = isPT ? [] : cardName === 'Hyrox Class' ? ['HYROX Race Prep'] : ['FitMama Strength']
  const sessions = WEEK_CLASSES.filter((c) => scheduleNames.includes(c.name))

  const goMember = () => {
    if (isPT) {
      // PT has no group schedule — members go to the trainer directory
      navigate('/members')
      onClose()
      return
    }
    setStep('member')
  }

  const goGuest = () => {
    navigate('/intake?mode=training')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-label={`${cardName} booking`}>
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-md border border-vault-border bg-vault-surface"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-vault-border px-4 py-3">
          <span className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-vault-muted">
            <CalendarCheck className="h-3.5 w-3.5 text-[#D4AF37]" />
            {cardName}
          </span>
          <button onClick={onClose} aria-label="Close" className="text-vault-faint transition-colors hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4">
          {step === 'choose' && (
            <div>
              <p className="text-[14px] font-bold text-white">How would you like to continue?</p>
              <p className="mt-1 text-[12px] leading-relaxed text-vault-muted">
                Members can book instantly (or join the waitlist when a class is full).
                New here? Leave your details and we'll get you booked in.
              </p>
              <div className="mt-4 space-y-2">
                <button type="button" onClick={goMember} className={OPTION_CLASS}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-vault-border text-vault-muted transition-colors group-hover:border-[#D4AF37]/60 group-hover:text-[#D4AF37]">
                    <User className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-bold text-white">I’m a Member</span>
                    <span className="block text-[12px] text-vault-muted">
                      {isPT ? 'Meet the trainers on your member home' : 'Sign in and book your spot'}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-vault-faint transition-transform group-hover:translate-x-1" />
                </button>
                <button type="button" onClick={goGuest} className={OPTION_CLASS}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-vault-border text-vault-muted transition-colors group-hover:border-[#D4AF37]/60 group-hover:text-[#D4AF37]">
                    <Users className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-bold text-white">Not a Member Yet</span>
                    <span className="block text-[12px] text-vault-muted">Leave your details — we’ll contact you to book</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-vault-faint transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          )}

          {step === 'member' && !memberSession && (
            <div className="text-center">
              <p className="text-[14px] font-bold text-white">Members sign in to book</p>
              <p className="mt-2 text-[12px] leading-relaxed text-vault-muted">
                Sign in with your member account and you can book this class instantly —
                or join the waitlist if it’s full.
              </p>
              <button
                type="button"
                onClick={() => {
                  navigate('/portal/login')
                  onClose()
                }}
                className="mt-4 w-full bg-white px-4 py-3 text-[12px] font-bold uppercase tracking-[0.14em] text-vault-btn-text transition-opacity hover:opacity-85"
              >
                Sign in <ArrowRight className="ml-1 inline h-4 w-4" />
              </button>
              <button type="button" onClick={() => setStep('choose')} className="mt-3 text-[12px] text-vault-muted transition-colors hover:text-white">
                ← Back
              </button>
            </div>
          )}

          {step === 'member' && memberSession && (
            <div>
              <p className="text-[12px] text-vault-muted">
                Booked as <span className="font-bold text-white">{member?.name ?? 'Member'}</span>
              </p>
              <div className="mt-3 space-y-2">
                {sessions.map((c) => {
                  const mine = bookingFor(c.id)
                  const left = spotsLeft(c)
                  const waiting = waitlistCount(c.id)
                  return (
                    <div key={c.id} className="flex items-center gap-3 border border-vault-border bg-vault-bg px-3 py-3">
                      <div className="min-w-[76px]">
                        <p className="text-[13px] font-bold text-white">{c.day}</p>
                        <p className="text-[11px] text-vault-muted">{c.time}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-bold text-white">{c.name}</p>
                        <p className="text-[11px] text-vault-muted">
                          {mine?.status === 'confirmed'
                            ? 'Booked ✓ — see you there'
                            : mine?.status === 'waitlisted'
                              ? `Waitlisted · #${waiting} in queue`
                              : left > 0
                                ? `${left} spot${left === 1 ? '' : 's'} left`
                                : `Full · ${waiting} on waitlist`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (mine) cancelBooking(c.id)
                          else bookClass(c.id)
                          refresh()
                        }}
                        className={`shrink-0 px-3 py-2 text-[10px] uppercase tracking-[0.1em] transition-colors ${
                          mine
                            ? 'border border-vault-border text-vault-muted hover:border-red-400/60 hover:text-red-300'
                            : left > 0
                              ? 'bg-[#D4AF37] text-vault-btn-text hover:opacity-90'
                              : 'border border-vault-border text-vault-muted hover:border-[#D4AF37]/60 hover:text-[#D4AF37]'
                        }`}
                      >
                        {mine ? 'Cancel' : left > 0 ? 'Book' : 'Waitlist'}
                      </button>
                    </div>
                  )
                })}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-[10px] text-vault-faint">
                  <Check className="h-3 w-3 text-[#D4AF37]" /> Free cancellation anytime
                </p>
                <button type="button" onClick={() => setStep('choose')} className="text-[12px] text-vault-muted transition-colors hover:text-white">
                  ← Back
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
