/**
 * Member login — the member-side counterpart of the staff Management Portal
 * sign-in. Same golden-steel vault treatment: brushed-metal brand panel,
 * slowly rotating vault door seal in a gold ring, metallic gold display
 * heading. Tester sign-in (no passwords yet): pick a demo member profile and
 * you're through to the dashboard. Real Supabase auth replaces this before
 * go-live.
 */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, LockKeyhole } from 'lucide-react'
import { asset } from '@/lib/utils'
import { MEMBER_PROFILES, getMemberProfile, signInAsMember } from '@/lib/member'

export default function MemberLogin() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState('rachel-cheung')
  const selectedProfile = getMemberProfile(selected)

  const enter = () => {
    const profile = signInAsMember(selected)
    if (profile) navigate(profile.home, { replace: true })
  }

  return (
    <div
      className="app-black tv2 grid min-h-[100dvh] bg-vault-bg text-white lg:grid-cols-2"
      style={{ background: '#141518' }}
    >
      {/* Brand panel — golden steel: brushed-metal surface, vault door seal,
          metallic gold display heading (shared with the staff portal) */}
      <div
        className="relative flex flex-col justify-between overflow-hidden border-b border-vault-border p-8 md:p-12 lg:border-b-0 lg:border-r"
        style={{ background: '#141518' }}
      >
        <div className="steel-texture pointer-events-none absolute inset-0" />
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.12) 0%, transparent 62%)' }}
        />

        <div className="relative">
          <Link to="/" aria-label="The Vault Fitness — home" className="inline-flex items-center gap-3">
            <img src={asset('brand/vault-logo-full.png')} alt="The Vault Fitness" className="h-12 w-auto" />
          </Link>
        </div>

        <div className="relative flex flex-col items-center py-10 text-center">
          <div className="relative">
            <div className="gold-ring pointer-events-none absolute inset-0 rounded-full" />
            <img
              src={asset('brand/vault-door.png')}
              alt="The Vault door"
              className="vault-door-spin relative w-52 md:w-64"
              style={{ filter: 'drop-shadow(0 18px 42px rgba(0,0,0,0.6))' }}
            />
          </div>
          <h1
            className="gold-metal-text mt-9 text-3xl md:text-4xl"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.08em' }}
          >
            MEMBER PORTAL
          </h1>
          <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-vault-muted">
            Your plan, progress and check-ins — the vault, opened for you
            every time you walk in.
          </p>
          <p className="mt-7 flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-vault-faint">
            <LockKeyhole className="h-3.5 w-3.5 text-gold/80" />
            Members only · Welcome back
          </p>
        </div>

        <p className="relative mt-6 text-[11px] text-vault-faint">© 2026 The Vault Fitness · Members</p>
      </div>

      {/* Sign-in panel */}
      <div className="flex items-center justify-center p-8 md:p-12">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          <p className="eyebrow">Member sign-in</p>
          <p className="mt-3 text-[13px] leading-relaxed text-vault-muted">
            Choose a profile to preview the member area. No password in this
            phase — real member accounts arrive when the backend does.
          </p>

          <div className="mt-6 space-y-2" role="radiogroup" aria-label="Member profile">
            {MEMBER_PROFILES.map((p) => {
              const active = selected === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setSelected(p.id)}
                  onDoubleClick={enter}
                  className={`flex w-full items-center gap-3 border px-4 py-3.5 text-left transition-colors ${
                    active
                      ? 'border-gold bg-white/[0.04]'
                      : 'border-vault-border bg-vault-surface hover:border-white/40'
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-[11px] ${
                      active ? 'border-gold/60 text-gold' : 'border-vault-border text-vault-muted'
                    }`}
                  >
                    {p.initials}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-[14px] font-bold ${active ? 'text-white' : 'text-white/90'}`}>
                      {p.name}
                    </span>
                    <span className="block truncate text-[12px] text-vault-muted">{p.goal}</span>
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] ${
                      active ? 'border border-gold text-gold' : 'border border-vault-border text-vault-muted'
                    }`}
                  >
                    {p.tier}
                  </span>
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={enter}
            className="mt-6 flex w-full items-center justify-center gap-2 bg-white px-6 py-3.5 text-[12px] font-bold uppercase tracking-[0.14em] text-vault-btn-text transition-opacity hover:opacity-85"
          >
            Enter as {selectedProfile?.name.split(' ')[0] ?? 'member'} <ArrowRight className="h-4 w-4" />
          </button>

          <div className="mt-5 flex items-center justify-between">
            <Link
              to="/"
              className="flex items-center gap-2 text-[12px] text-vault-muted transition-colors hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to homepage
            </Link>
            <span className="text-[11px] text-vault-faint">Tester mode — no real authentication yet</span>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
