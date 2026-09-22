/**
 * Member session — Phase A "tester" auth, mirroring the staff session model
 * in `staff.ts`. Signing in picks a member profile from the demo roster and
 * stores it in localStorage; the dashboard still renders the shared sample
 * data until the backend lands. Same honesty note as staff: prototype gate,
 * not real authentication.
 */

export interface MemberProfile {
  id: string
  name: string
  initials: string
  /** membership tier, shown as the sign-in badge */
  tier: string
  goal: string
  /** where a member lands after sign-in */
  home: string
}

export const MEMBER_PROFILES: MemberProfile[] = [
  {
    id: 'rachel-cheung',
    name: 'Rachel Cheung',
    initials: 'RC',
    tier: 'PT 3x/wk',
    goal: 'Reduce body fat',
    home: '/dashboard',
  },
  {
    id: 'marcus-lau',
    name: 'Marcus Lau',
    initials: 'ML',
    tier: 'PT 2x/wk',
    goal: 'Build strength',
    home: '/dashboard',
  },
  {
    id: 'priya-sharma',
    name: 'Priya Sharma',
    initials: 'PS',
    tier: 'PT 2x/wk',
    goal: 'Hyrox race prep',
    home: '/dashboard',
  },
  {
    id: 'karen-ng',
    name: 'Karen Ng',
    initials: 'KN',
    tier: "Women's Programme",
    goal: 'Postnatal return',
    home: '/dashboard',
  },
]

export function getMemberProfile(id: string): MemberProfile | undefined {
  return MEMBER_PROFILES.find((p) => p.id === id)
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

const MEMBER_KEY = 'vault-member-session'
export const MEMBER_SESSION_EVENT = 'vault-member-session-changed'

function notify() {
  window.dispatchEvent(new Event(MEMBER_SESSION_EVENT))
}

export interface MemberSession {
  memberId: string
  signedInAt: string
}

export function signInAsMember(id: string): MemberProfile | undefined {
  const profile = getMemberProfile(id)
  if (!profile) return undefined
  const session: MemberSession = { memberId: id, signedInAt: new Date().toISOString() }
  localStorage.setItem(MEMBER_KEY, JSON.stringify(session))
  notify()
  return profile
}

export function getMemberSession(): MemberSession | null {
  try {
    const raw = localStorage.getItem(MEMBER_KEY)
    return raw ? (JSON.parse(raw) as MemberSession) : null
  } catch {
    return null
  }
}

export function signOutMember() {
  localStorage.removeItem(MEMBER_KEY)
  notify()
}
