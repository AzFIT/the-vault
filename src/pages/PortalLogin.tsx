/**
 * Portal login — Phase A "tester sign-in". No passwords yet: pick a profile
 * and you're in. The chosen profile is stored as the staff session (role +
 * staff ID) and routes each role to its home surface:
 *
 *   Owner      → /manage       (graduates to /portal in a later phase)
 *   Front desk → /portal/front-desk
 *   Coach      → /coach
 *
 * A "Tester mode" banner stays on portal screens until real auth (Supabase)
 * ships. Back to homepage is always one click.
 */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { asset } from '@/lib/utils'
import { STAFF_PROFILES, getProfile, signInAs } from '@/lib/staff'

export default function PortalLogin() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState('rachel-cheung')
  const selectedProfile = getProfile(selected)

  const enter = () => {
    const profile = signInAs(selected)
    if (profile) navigate(profile.home, { replace: true })
  }

  return (
    <div className="app-black grid min-h-[100dvh] bg-vault-bg text-white lg:grid-cols-2">
      {/* Brand panel */}
      <div className="flex flex-col justify-between border-b border-vault-border p-8 md:p-12 lg:border-b-0 lg:border-r">
        <div>
          <Link to="/" aria-label="The Vault Fitness — home" className="inline-flex items-center gap-3">
            <img src={asset('logo-gold.png')} alt="The Vault Fitness" className="h-12 w-auto" />
          </Link>
          <h1 className="mt-10 font-serif text-3xl font-bold md:text-4xl">Management Portal</h1>
          <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-vault-muted">
            Scheduling, revenue and staff performance — the studio at a glance,
            before the first coffee.
          </p>
        </div>
        <p className="mt-12 text-[11px] text-vault-faint">© 2026 The Vault Fitness · Staff only</p>
      </div>

      {/* Sign-in panel */}
      <div className="flex items-center justify-center p-8 md:p-12">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          <p className="eyebrow">Tester sign-in</p>
          <p className="mt-3 text-[13px] leading-relaxed text-vault-muted">
            Choose a profile to preview the portal. No password in this phase —
            real accounts arrive when the backend does.
          </p>

          <div className="mt-6 space-y-2" role="radiogroup" aria-label="Staff profile">
            {STAFF_PROFILES.map((p) => {
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
                    <span className="block truncate text-[12px] text-vault-muted">{p.tagline}</span>
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] ${
                      active ? 'border border-gold text-gold' : 'border border-vault-border text-vault-muted'
                    }`}
                  >
                    {p.roleLabel}
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
            Enter as {selectedProfile?.name.split(' ')[0] ?? 'staff'} <ArrowRight className="h-4 w-4" />
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
