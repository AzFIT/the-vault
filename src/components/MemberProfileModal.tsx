/**
 * MemberProfileModal — the front-desk check-in card. Pops up when a cloud
 * member checks in: payment status, waiver state, recent class bookings and
 * a birthday banner (retention moment). Desk actions live here too — check
 * in, quick +1 credit, renew, and sign the waiver on the spot.
 */
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Cake,
  Check,
  Coins,
  Crown,
  FileWarning,
  Plus,
  RefreshCcw,
  ShieldAlert,
  X,
} from 'lucide-react'
import {
  adjustMemberCredits,
  getFrontdeskProfile,
  renewMember,
  signMemberWaiver,
  type FrontdeskProfile,
} from '@/lib/memberAdmin'
import {
  flagClient,
  frontdeskVerify,
  type FrontdeskVerifyResult,
} from '@/lib/programSave'

const PAYMENT_STYLES: Record<string, { pill: string; label: string }> = {
  up_to_date: { pill: 'border-emerald-400/50 text-emerald-300', label: 'Payments up to date' },
  past_due: { pill: 'border-amber-400/50 text-amber-300', label: 'Payment due — period expired' },
  canceled: { pill: 'border-red-400/50 text-red-300', label: 'Membership canceled' },
  none: { pill: 'border-vault-border text-vault-muted', label: 'No membership on file' },
}

interface Props {
  userId: string
  staffName: string
  onCheckIn: (label: string) => void
  onClose: () => void
}

export default function MemberProfileModal({ userId, staffName, onCheckIn, onClose }: Props) {
  const [data, setData] = useState<FrontdeskProfile | null>(null)
  const [verify, setVerify] = useState<FrontdeskVerifyResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  // Identity verification is auxiliary — a failure here must never block the
  // check-in flow, so it fails silently to "no data on file".
  const loadVerify = async (email: string) => {
    try {
      setVerify(await frontdeskVerify(email))
    } catch {
      setVerify(null)
    }
  }

  const reload = async () => {
    try {
      const profile = await getFrontdeskProfile(userId)
      setData(profile)
      if (profile.email) void loadVerify(profile.email)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load member.')
    }
  }

  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // Esc closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const run = async (fn: () => Promise<unknown>, okText: string) => {
    if (busy) return
    setBusy(true)
    setNotice(null)
    try {
      await fn()
      await reload()
      setNotice(okText)
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Action failed.')
    } finally {
      setBusy(false)
    }
  }

  const name = data ? `${data.profile.first_name ?? ''} ${data.profile.last_name ?? ''}`.trim() : '…'
  const payment = data ? PAYMENT_STYLES[data.payment.state] ?? PAYMENT_STYLES.none : null

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Member profile — ${name}`}>
      <div className="absolute inset-0 bg-black/75" onClick={onClose} aria-hidden />
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative max-h-[90dvh] w-full max-w-lg overflow-y-auto border border-vault-border bg-vault-surface"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-vault-border p-5">
          <div className="flex items-start gap-3">
            {/* Identity photo — gold ring normally, red ring when fraud flags are open */}
            <div
              className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 ${
                verify && verify.open_flags.length > 0 ? 'border-red-400/70' : 'border-gold/60'
              }`}
            >
              {verify?.client?.photo_url ? (
                <img
                  src={verify.client.photo_url}
                  alt={`${name} — ID photo`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-vault-border/40 text-[15px] font-bold text-gold">
                  {name === '…'
                    ? '?'
                    : name
                        .split(' ')
                        .map((w) => w[0] ?? '')
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p className="text-[16px] font-bold text-white">{name}</p>
              <p className="text-[12px] text-vault-muted">
                {data?.email ?? 'loading…'}
                {data?.profile.phone ? ` · ${data.profile.phone}` : ''}
              </p>
              {/* Discreet fraud report — one tap, no confrontation, management reviews later */}
              <button
                type="button"
                disabled={busy || !verify?.client}
                onClick={() => {
                  const clientId = verify?.client?.id
                  if (!clientId) return
                  void run(
                    () => flagClient(clientId, 'Front desk: person did not match photo at check-in', staffName),
                    'Flagged discreetly — management will review.',
                  )
                }}
                className="mt-1.5 flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-vault-faint transition-colors hover:text-red-300 disabled:opacity-40"
              >
                <ShieldAlert className="h-3 w-3" /> Report identity mismatch
              </button>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 text-vault-muted transition-colors hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {error && <p className="border border-red-500/40 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">{error}</p>}
          {notice && <p className="border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-[12px] text-emerald-300">{notice}</p>}

          {/* Identity alert — open fraud flags surface before anything else */}
          {verify && verify.open_flags.length > 0 && (
            <div className="flex items-start gap-3 border border-red-500/60 bg-red-500/10 px-4 py-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-red-300">
                  Identity alert — {verify.open_flags.length} open fraud{' '}
                  {verify.open_flags.length === 1 ? 'flag' : 'flags'}
                </p>
                <p className="mt-0.5 text-[11px] text-vault-muted">
                  Latest: {verify.open_flags[0].reason} · flagged by {verify.open_flags[0].flagged_by} ·{' '}
                  {new Date(verify.open_flags[0].created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}

          {/* Birthday banner — the retention moment */}
          {data?.birthday_today && (
            <div className="flex items-center gap-3 border border-gold/60 bg-gold/10 px-4 py-3">
              <Cake className="h-6 w-6 shrink-0 text-gold" />
              <div>
                <p className="text-[13px] font-bold text-gold">It's {name.split(' ')[0]}'s birthday today!</p>
                <p className="text-[11px] text-vault-muted">Wish them a great session — a small gesture goes a long way.</p>
              </div>
            </div>
          )}

          {!data && !error && <p className="py-6 text-center text-[12px] text-vault-muted">Loading member…</p>}

          {data && payment && (
            <>
              {/* Payment + credits */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="border border-vault-border p-3.5">
                  <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-vault-faint">
                    <Crown className="h-3.5 w-3.5 text-gold" /> Membership
                  </p>
                  <p className="mt-1.5 text-[13px] font-bold text-white">{data.payment.plan_name ?? '—'}</p>
                  <span className={`mt-2 inline-block border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em] ${payment.pill}`}>
                    {payment.label}
                  </span>
                  {data.payment.current_period_end && data.payment.state !== 'none' && (
                    <p className="mt-1.5 text-[11px] text-vault-faint">
                      Renews {new Date(data.payment.current_period_end).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="border border-vault-border p-3.5">
                  <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-vault-faint">
                    <Coins className="h-3.5 w-3.5 text-gold" /> Class credits
                  </p>
                  <p className="tnum mt-1 text-2xl font-bold text-white">{data.payment.credits_remaining ?? '—'}</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void run(() => adjustMemberCredits(userId, 1, 'front desk quick +1'), 'Added 1 credit.')}
                      className="flex items-center gap-1 border border-vault-border px-2.5 py-1.5 text-[10px] uppercase tracking-[0.1em] text-vault-muted transition-colors hover:border-gold/60 hover:text-gold disabled:opacity-40"
                    >
                      <Plus className="h-3 w-3" /> 1
                    </button>
                    <button
                      type="button"
                      disabled={busy || data.payment.state === 'none'}
                      onClick={() => void run(() => renewMember(userId), 'Renewed — credits reset.')}
                      className="flex items-center gap-1 border border-vault-border px-2.5 py-1.5 text-[10px] uppercase tracking-[0.1em] text-vault-muted transition-colors hover:border-gold/60 hover:text-gold disabled:opacity-40"
                    >
                      <RefreshCcw className="h-3 w-3" /> Renew
                    </button>
                  </div>
                </div>
              </div>

              {/* Waiver */}
              <div
                className={`flex items-center gap-3 border px-4 py-3 ${
                  data.profile.waiver_signed_at
                    ? 'border-vault-border'
                    : 'border-amber-400/50 bg-amber-400/10'
                }`}
              >
                <FileWarning className={`h-5 w-5 shrink-0 ${data.profile.waiver_signed_at ? 'text-vault-faint' : 'text-amber-300'}`} />
                <div className="min-w-0 flex-1">
                  {data.profile.waiver_signed_at ? (
                    <p className="text-[12px] text-vault-muted">
                      Waiver signed {new Date(data.profile.waiver_signed_at).toLocaleDateString()}
                    </p>
                  ) : (
                    <p className="text-[12px] font-bold text-amber-300">Waiver NOT signed</p>
                  )}
                </div>
                {!data.profile.waiver_signed_at && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void run(() => signMemberWaiver(userId), 'Waiver signed.')}
                    className="shrink-0 bg-gold px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-black transition-colors hover:bg-gold-2 disabled:opacity-40"
                  >
                    Sign waiver
                  </button>
                )}
              </div>

              {/* Recent bookings */}
              <div className="border border-vault-border">
                <p className="border-b border-vault-border px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] text-vault-faint">
                  Recent bookings · last {data.bookings.length}
                </p>
                {data.bookings.length === 0 ? (
                  <p className="px-4 py-5 text-center text-[12px] text-vault-muted">No bookings yet.</p>
                ) : (
                  data.bookings.map((b) => (
                    <div key={b.id} className="flex items-center gap-3 border-b border-vault-border/60 px-4 py-2.5 text-[12px] last:border-0">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-white">{b.class_name}</span>
                        <span className="block text-[10px] text-vault-faint">
                          {[b.day_of_week, b.time_label].filter(Boolean).join(' · ')}
                          {b.coach_name ? ` · ${b.coach_name}` : ''}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 border px-1.5 py-0.5 text-[9px] uppercase tracking-[0.1em] ${
                          b.status === 'confirmed'
                            ? 'border-emerald-400/50 text-emerald-300'
                            : b.status === 'waitlisted'
                              ? 'border-amber-400/50 text-amber-300'
                              : 'border-vault-border text-vault-muted'
                        }`}
                      >
                        {b.status}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Check in */}
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  onCheckIn(`Check-in — ${name} (${data.payment.plan_name ?? 'member'})`)
                  onClose()
                }}
                className="flex w-full items-center justify-center gap-2 bg-[#D4AF37] px-6 py-3 text-[12px] font-bold uppercase tracking-[0.14em] text-black transition-colors hover:bg-[#E7C86B]"
              >
                <Check className="h-4 w-4" /> Check in {name.split(' ')[0]}
              </button>
              <p className="text-center text-[10px] text-vault-faint">Logged under {staffName}</p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
