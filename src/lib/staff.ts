/**
 * Staff session + shift log — Phase A "tester" auth.
 *
 * Honesty note: this is a prototype gate, not real authentication. Signing in
 * picks a profile from a fixed list and stores it in localStorage; a
 * "Tester mode" banner stays on screen until the Supabase auth phase. Every
 * action logged through `recordEvent` is tagged with the acting staff ID —
 * that auto-tagging is what feeds the front-desk KPI cards and leaderboard.
 * When the backend lands, swap the localStorage bodies for API calls; the
 * shapes and call sites stay the same.
 */

export type StaffRole = 'owner' | 'front-desk' | 'coach'

export interface StaffProfile {
  id: string
  /** short unique staff code, e.g. RC-1042 — the auto-tag key */
  staffNo: string
  name: string
  initials: string
  role: StaffRole
  roleLabel: string
  tagline: string
  /** where this role lands after sign-in */
  home: string
}

export const STAFF_PROFILES: StaffProfile[] = [
  {
    id: 'dan-kan',
    staffNo: 'RC-1001',
    name: 'Dan Kan',
    initials: 'DK',
    role: 'owner',
    roleLabel: 'Owner',
    tagline: 'Owner · Head Coach',
    home: '/portal',
  },
  {
    id: 'rachel-cheung',
    staffNo: 'RC-1042',
    name: 'Rachel Cheung',
    initials: 'RC',
    role: 'front-desk',
    roleLabel: 'Front desk',
    tagline: 'Front desk · Shift 07:00–15:00',
    home: '/portal/front-desk',
  },
  {
    id: 'ziggy-makant',
    staffNo: 'RC-1002',
    name: 'Ziggy Makant',
    initials: 'ZM',
    role: 'coach',
    roleLabel: 'Coach',
    tagline: 'Coach · Women’s Health',
    home: '/coach',
  },
]

export function getProfile(id: string): StaffProfile | undefined {
  return STAFF_PROFILES.find((p) => p.id === id)
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

const SESSION_KEY = 'vault-staff-session'
export const STAFF_SESSION_EVENT = 'vault-staff-session-changed'

function notify() {
  window.dispatchEvent(new Event(STAFF_SESSION_EVENT))
}

export interface StaffSession {
  staffId: string
  signedInAt: string
}

export function getStaffSession(): StaffSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as StaffSession) : null
  } catch {
    return null
  }
}

export function getCurrentProfile(): StaffProfile | null {
  const s = getStaffSession()
  return s ? (getProfile(s.staffId) ?? null) : null
}

export function signInAs(staffId: string): StaffProfile | null {
  const profile = getProfile(staffId)
  if (!profile) return null
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ staffId, signedInAt: new Date().toISOString() }))
  } catch {
    // storage unavailable — session simply won't persist
  }
  notify()
  return profile
}

export function signOut() {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    // ignore
  }
  notify()
}

// ---------------------------------------------------------------------------
// Shift log (auto-tagged events)
// ---------------------------------------------------------------------------

export type ShiftEventType = 'checkin' | 'sale' | 'stock' | 'message' | 'signup' | 'followup'

export interface ShiftEvent {
  id: string
  staffId: string
  type: ShiftEventType
  label: string
  /** ISO timestamp */
  at: string
  /** local day bucket, YYYY-MM-DD — only today's events count toward KPIs */
  day: string
  points: number
}

/** Gamified scoring rules — surfaced in the "How your score works" panel. */
export const EVENT_POINTS: Record<ShiftEventType, number> = {
  checkin: 1,
  sale: 3,
  stock: 0,
  message: 1,
  signup: 10,
  followup: 4,
}

const EVENTS_KEY = 'vault-shift-events'

function localDay(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function listEvents(staffId: string): ShiftEvent[] {
  try {
    const raw = localStorage.getItem(EVENTS_KEY)
    const all: ShiftEvent[] = raw ? JSON.parse(raw) : []
    return all.filter((e) => e.staffId === staffId)
  } catch {
    return []
  }
}

/** Events from today only — the KPI cards count the current shift. */
export function listTodayEvents(staffId: string): ShiftEvent[] {
  return listEvents(staffId).filter((e) => e.day === localDay())
}

/** Today's events across ALL staff, newest first — the owner-dashboard
 *  operations feed (recent check-ins, sales…) that spans every shift. */
export function listAllTodayEvents(type?: ShiftEventType): ShiftEvent[] {
  try {
    const raw = localStorage.getItem(EVENTS_KEY)
    const all: ShiftEvent[] = raw ? JSON.parse(raw) : []
    return all
      .filter((e) => e.day === localDay() && (!type || e.type === type))
      .sort((a, b) => b.at.localeCompare(a.at))
  } catch {
    return []
  }
}

export function countToday(staffId: string, type: ShiftEventType): number {
  return listTodayEvents(staffId).filter((e) => e.type === type).length
}

export function pointsToday(staffId: string): number {
  return listTodayEvents(staffId).reduce((a, e) => a + e.points, 0)
}

export function recordEvent(staffId: string, type: ShiftEventType, label: string): ShiftEvent {
  const now = new Date()
  const event: ShiftEvent = {
    id: `evt_${now.getTime().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    staffId,
    type,
    label,
    at: now.toISOString(),
    day: localDay(now),
    points: EVENT_POINTS[type],
  }
  try {
    const raw = localStorage.getItem(EVENTS_KEY)
    const all: ShiftEvent[] = raw ? JSON.parse(raw) : []
    localStorage.setItem(EVENTS_KEY, JSON.stringify([...all, event]))
  } catch {
    // storage full — event is lost, UI already updated
  }
  return event
}

/** Sum of today's sale amounts, parsed from "Sale — … HK$180" style labels. */
export function salesToday(staffId: string): number {
  return listTodayEvents(staffId)
    .filter((e) => e.type === 'sale')
    .reduce((a, e) => {
      const m = e.label.match(/HK\$([\d,]+)/)
      return a + (m ? parseInt(m[1].replace(/,/g, ''), 10) : 0)
    }, 0)
}

// ---------------------------------------------------------------------------
// Follow-up reminders
// ---------------------------------------------------------------------------

export interface ShiftReminder {
  id: string
  title: string
  due: string
  done: boolean
}

const REMINDERS_KEY = 'vault-shift-reminders'

/** Seed the board once with the wireframe's three reminders. */
function seedReminders(): ShiftReminder[] {
  return [
    { id: 'rem_jessica', title: 'Call back Jessica Mok — trial enquiry from intake', due: '14:00', done: false },
    { id: 'rem_tom', title: 'WhatsApp Tom Whitfield — missed 2 sessions', due: 'Overdue', done: false },
    { id: 'rem_emily', title: 'Renewal reminder — Emily F. membership ends 26 Sep', due: '15:00', done: false },
  ]
}

export function listReminders(): ShiftReminder[] {
  try {
    const raw = localStorage.getItem(REMINDERS_KEY)
    if (!raw) {
      const seeded = seedReminders()
      localStorage.setItem(REMINDERS_KEY, JSON.stringify(seeded))
      return seeded
    }
    return JSON.parse(raw) as ShiftReminder[]
  } catch {
    return seedReminders()
  }
}

function saveReminders(all: ShiftReminder[]) {
  try {
    localStorage.setItem(REMINDERS_KEY, JSON.stringify(all))
  } catch {
    // ignore
  }
}

export function addReminder(title: string, due: string): ShiftReminder {
  const reminder: ShiftReminder = {
    id: `rem_${Date.now().toString(36)}`,
    title: title.trim(),
    due: due.trim() || 'Today',
    done: false,
  }
  saveReminders([...listReminders(), reminder])
  return reminder
}

export function completeReminder(id: string) {
  saveReminders(listReminders().map((r) => (r.id === id ? { ...r, done: true } : r)))
}

export function openReminderCount(): number {
  return listReminders().filter((r) => !r.done).length
}
