/**
 * Portal login — unified tester sign-in for every role. A golden-steel
 * sign-in card accepts an email OR username plus password (any password in
 * tester mode) and routes each account to its home surface:
 *
 *   owner@vault.hk / ownerdan   → /portal              (Owner)
 *   staff@vault.hk / vaultstaff → /portal/front-desk   (Front desk)
 *   trainer@vault.hk / trainer  → /coach               (Coach)
 *   client@vault.hk / client    → /dashboard           (Client)
 *   members@vault.hk / members  → /members             (Member home)
 *
 * A real session (staff or member) is created on success, so portals stay
 * signed in across pages. Below the card, the original profile quick-pick
 * remains for one-click previews. When Supabase auth ships, swap the
 * credential map for an API call — routing and sessions stay identical.
 */
import { useState } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowLeft, KeyRound, Lock } from 'lucide-react'
import { asset } from '@/lib/utils'
import { STAFF_PROFILES, getProfile, signInAs } from '@/lib/staff'
import { signInAsMember } from '@/lib/member'
import { requestVaultEntry } from '@/lib/vaultEntry'
import UnlockButton from '@/components/UnlockButton'

interface TesterAccount {
  /** accepted logins (case-insensitive) */
  match: string[]
  name: string
  roleLabel: string
  /** session to create: staff profile id or member profile id */
  session: { kind: 'staff'; id: string } | { kind: 'member'; id: string }
  home: string
}

const TESTER_ACCOUNTS: TesterAccount[] = [
  { match: ['owner@vault.hk', 'ownerdan'], name: 'Dan Kan', roleLabel: 'Owner', session: { kind: 'staff', id: 'dan-kan' }, home: '/portal' },
  { match: ['staff@vault.hk', 'vaultstaff'], name: 'Rachel Cheung', roleLabel: 'Front desk', session: { kind: 'staff', id: 'rachel-cheung' }, home: '/portal/front-desk' },
  { match: ['trainer@vault.hk', 'trainer'], name: 'Ziggy Makant', roleLabel: 'Coach', session: { kind: 'staff', id: 'ziggy-makant' }, home: '/coach' },
  { match: ['client@vault.hk', 'client'], name: 'Marcus Lau', roleLabel: 'Client', session: { kind: 'member', id: 'marcus-lau' }, home: '/dashboard' },
  { match: ['members@vault.hk', 'members'], name: 'Rachel Cheung', roleLabel: 'Member', session: { kind: 'member', id: 'rachel-cheung' }, home: '/members' },
]

const findAccount = (login: string) => {
  const key = login.trim().toLowerCase()
  return TESTER_ACCOUNTS.find((a) => a.match.includes(key))
}

const INPUT_CLASS =
  'w-full border border-vault-border bg-vault-bg px-3 py-2.5 text-[13px] text-white placeholder:text-vault-faint focus:border-vault-surface-3 focus:outline-none'

export default function PortalLogin() {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [suggestOpen, setSuggestOpen] = useState(false)
  const [selected, setSelected] = useState('rachel-cheung')
  const selectedProfile = getProfile(selected)

  // Validate + create the session. Returning false aborts the unlock
  // animation (button stays gold); the sweep fires later via onEnter.
  const armCard = () => {
    const account = findAccount(login)
    if (!account) {
      setError('Unknown account — try owner@vault.hk, staff@vault.hk, trainer@vault.hk, client@vault.hk or members@vault.hk.')
      return false
    }
    if (!password.trim()) {
      setError('Enter any password — real authentication arrives with the backend.')
      return false
    }
    if (account.session.kind === 'staff') signInAs(account.session.id)
    else signInAsMember(account.session.id)
    setError(null)
    return true
  }

  const enterCard = () => {
    requestVaultEntry(findAccount(login)?.home ?? '/portal')
  }

  const armQuick = () => {
    signInAs(selected)
    return true
  }

  const enterQuick = () => {
    const profile = getProfile(selected)
    if (profile) requestVaultEntry(profile.home)
  }

  // Double-click on a profile row is a power shortcut — straight in, no ceremony hold.
  const enterDirect = () => {
    const profile = signInAs(selected)
    if (profile) requestVaultEntry(profile.home)
  }

  return (
    <div className="app-black tv2 grid min-h-[100dvh] bg-vault-bg text-white lg:grid-cols-2" style={{ background: '#141518' }}>
      {/* Brand panel — golden steel: brushed-metal surface, vault door seal,
          metallic gold display heading */}
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
              src={asset('brand/vault-door-gold.png')}
              alt="The Vault door"
              className="vault-door-spin relative w-52 md:w-64"
              style={{ filter: 'drop-shadow(0 18px 42px rgba(0,0,0,0.6))' }}
            />
          </div>
          <h1
            className="gold-metal-text mt-9 text-3xl md:text-4xl"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.08em' }}
          >
            PORTAL ACCESS
          </h1>
          <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-vault-muted">
            One door, every room — sign in and the vault opens to your portal.
          </p>
          <p className="mt-7 flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-vault-faint">
            <KeyRound className="h-3.5 w-3.5 text-gold/80" />
            Authorized access only
          </p>
        </div>

        <p className="relative mt-6 text-[11px] text-vault-faint">© 2026 The Vault Fitness · Staff & members</p>
      </div>

      {/* Sign-in panel */}
      <div className="flex items-center justify-center p-8 md:p-12">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          {/* ——— The sign-in card ——— */}
          <div className="border border-vault-border bg-vault-surface/60 p-6">
            <p className="eyebrow flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-gold/80" /> Sign in
            </p>
            <div className="mt-5 space-y-3">
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-[0.16em] text-vault-muted" htmlFor="pl-login">
                  Email or username
                </label>
                <input
                  id="pl-login"
                  className={INPUT_CLASS}
                  placeholder="owner@vault.hk · vaultstaff · trainer…"
                  value={login}
                  autoComplete="username"
                  onChange={(e) => {
                    setLogin(e.target.value)
                    setError(null)
                  }}
                  onFocus={() => setSuggestOpen(true)}
                  onKeyDown={(e) => e.key === 'Enter' && armCard() && enterCard()}
                />
                {/* Tester suggestions — tap one to fill email + password.
                    Removed before real authentication ships. */}
                {suggestOpen && (
                  <div className="mt-2 border border-vault-border bg-vault-bg">
                    <p className="border-b border-vault-border/60 px-3 py-1.5 text-[9px] uppercase tracking-[0.18em] text-vault-faint">
                      Tester accounts — tap to fill
                    </p>
                    {TESTER_ACCOUNTS.map((a) => (
                      <button
                        key={a.match[0]}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault() // keep focus semantics simple; fill both fields
                          setLogin(a.match[0])
                          setPassword('vault123')
                          setSuggestOpen(false)
                          setError(null)
                        }}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-white/[0.04]"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[12px] font-bold text-white">{a.name}</span>
                          <span className="block truncate text-[10px] text-vault-faint">{a.match[0]}</span>
                        </span>
                        <span className="shrink-0 border border-vault-border px-1.5 py-0.5 text-[9px] uppercase tracking-[0.1em] text-vault-muted">
                          {a.roleLabel}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-[0.16em] text-vault-muted" htmlFor="pl-pass">
                  Password
                </label>
                <input
                  id="pl-pass"
                  type="password"
                  className={INPUT_CLASS}
                  placeholder="Any password in tester mode"
                  value={password}
                  autoComplete="current-password"
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setError(null)
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && armCard() && enterCard()}
                />
              </div>
              {error && (
                <p className="border border-red-500/40 bg-red-500/10 px-3 py-2 text-[11px] leading-snug text-red-300">
                  {error}
                </p>
              )}
              <UnlockButton
                idleLabel="Open the vault"
                onArm={armCard}
                onEnter={enterCard}
                className="py-3"
              />
            </div>
          </div>

          {/* ——— Quick preview ——— */}
          <p className="mt-7 text-[10px] uppercase tracking-[0.2em] text-vault-faint">Quick preview — staff profiles</p>
          <div className="mt-3 space-y-2" role="radiogroup" aria-label="Staff profile">
            {STAFF_PROFILES.map((p) => {
              const active = selected === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setSelected(p.id)}
                  onDoubleClick={enterDirect}
                  className={`flex w-full items-center gap-3 border px-4 py-3 text-left transition-colors ${
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

          <UnlockButton
            idleLabel={`Enter as ${selectedProfile?.name.split(' ')[0] ?? 'staff'}`}
            onArm={armQuick}
            onEnter={enterQuick}
            className="mt-4 py-2.5 text-[11px]"
          />

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
