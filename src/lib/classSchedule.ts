/**
 * Shared class schedule + booking store — now backed by Supabase.
 *
 * Phase 1 of the cloud migration: `classes` + `bookings` tables on project
 * gcurvjprfwecbchreieu. The browser reads both tables through the
 * publishable key (RLS grants public read only); every write goes through
 * the `book-class` Edge Function, which runs the atomic `book_class` /
 * `cancel_class_booking` DB functions — capacity decisions are made in one
 * statement, so concurrent members can never overbook the last spot.
 * Cancelling a confirmed spot promotes the earliest waitlisted member.
 *
 * The exported shapes are unchanged from the localStorage mock, so the
 * homepage class-card popup, Members Home and the Member App needed no
 * edits: `WEEK_CLASSES` hydrates from the cloud (in place, so existing
 * references update) and BOOKINGS_EVENT notifies listeners to re-render.
 *
 * member_label is the signed-in member's auth user id when a Supabase
 * session exists (verified server-side by book-class via the sent JWT);
 * otherwise the tester-era demo profile / guest labels apply.
 */
import { supabase } from '@/lib/supabase'
import { getMemberSession, getMemberProfile } from '@/lib/member'
import { getCurrentAccount } from '@/lib/memberAccounts'

export interface ClassSlot {
  id: string
  name: string
  day: string
  time: string
  coach: string
  capacity: number
  booked: number
  tag: string
}

/** Homepage card name → schedule names it covers. */
export const CARD_TO_SCHEDULE: Record<string, string[]> = {
  'Hyrox Class': ['HYROX Race Prep'],
  'FITMAMA Strength': ['FitMama Strength'],
}

// ---- booking store ----------------------------------------------------------

export type BookingStatus = 'confirmed' | 'waitlisted'

export interface Booking {
  classId: string
  status: BookingStatus
  at: string
}

export const BOOKINGS_EVENT = 'vault-class-bookings-changed'

const FN_URL = 'https://gcurvjprfwecbchreieu.supabase.co/functions/v1/book-class'
const BUILDER_SECRET = 'vault_bld_8f3a91c27d54e6b0'

/** Fallback rows so first paint works before the cloud round-trip. */
const FALLBACK: ClassSlot[] = [
  { id: 'c1', name: 'HYROX Race Prep', day: 'Mon', time: '07:00 – 08:00', coach: 'Dan Kan', capacity: 12, booked: 9, tag: 'Race Prep' },
  { id: 'c2', name: 'FitMama Strength', day: 'Mon', time: '10:30 – 11:30', coach: 'Ziggy Makant', capacity: 10, booked: 10, tag: "Women's Health" },
  { id: 'c3', name: 'Conditioning Circuit', day: 'Tue', time: '18:30 – 19:30', coach: 'Marcus Lau', capacity: 14, booked: 6, tag: 'Conditioning' },
  { id: 'c4', name: 'Olympic Lifting Club', day: 'Wed', time: '19:00 – 20:30', coach: 'Dan Kan', capacity: 8, booked: 5, tag: 'Strength' },
  { id: 'c5', name: 'HYROX Race Prep', day: 'Thu', time: '07:00 – 08:00', coach: 'Marcus Lau', capacity: 12, booked: 11, tag: 'Race Prep' },
  { id: 'c6', name: 'FitMama Strength', day: 'Fri', time: '10:30 – 11:30', coach: 'Ziggy Makant', capacity: 10, booked: 4, tag: "Women's Health" },
  { id: 'c7', name: 'Weekend Engine', day: 'Sat', time: '09:00 – 10:00', coach: 'Dan Kan', capacity: 16, booked: 8, tag: 'Conditioning' },
]

/** Live schedule — exported array is mutated in place on cloud hydration. */
export const WEEK_CLASSES: ClassSlot[] = [...FALLBACK]

/** All active bookings across members (drives counts + my-booking lookups). */
let allBookings: { classId: string; memberLabel: string; status: BookingStatus; at: string }[] = []
let hydrated = false

function notify() {
  window.dispatchEvent(new Event(BOOKINGS_EVENT))
}

/**
 * Identity for bookings: signed-in member account (label = auth user id,
 * matching what book-class records server-side) → demo profile → guest.
 */
function memberIdentity(): { label: string; name: string } {
  const acc = getCurrentAccount()
  if (acc) return { label: acc.id, name: `${acc.firstName} ${acc.lastName}`.trim() || acc.email }
  const sess = getMemberSession()
  if (sess) return { label: `prof-${sess.memberId}`, name: getMemberProfile(sess.memberId)?.name ?? sess.memberId }
  return { label: 'guest', name: 'Guest' }
}

function confirmedCount(classId: string): number {
  return allBookings.filter((b) => b.classId === classId && b.status === 'confirmed').length
}

/** Recompute each slot's live `booked` happens in refreshFromCloud below. */
async function refreshFromCloud() {
  const [{ data: classes, error: ce }, { data: bookings, error: be }] = await Promise.all([
    supabase.from('classes').select('code,name,day_of_week,time_label,coach_name,capacity,base_booked,tag').eq('active', true).order('code'),
    supabase.from('bookings').select('class_id,member_label,status,created_at,classes!inner(code)').neq('status', 'canceled'),
  ])
  if (ce || be) {
    console.warn('[classSchedule] cloud refresh failed, keeping local data', ce ?? be)
    return
  }
  // Replace the schedule in place so existing WEEK_CLASSES references update.
  WEEK_CLASSES.splice(
    0,
    WEEK_CLASSES.length,
    ...((classes ?? []) as Record<string, unknown>[]).map((c) => ({
      id: String(c.code),
      name: String(c.name),
      day: String(c.day_of_week),
      time: String(c.time_label),
      coach: String(c.coach_name),
      capacity: Number(c.capacity),
      booked: Number(c.base_booked),
      tag: String(c.tag ?? ''),
    })),
  )
  const baseByCode = new Map(
    ((classes ?? []) as Record<string, unknown>[]).map((c) => [String(c.code), Number(c.base_booked)] as const),
  )
  allBookings = ((bookings ?? []) as Record<string, unknown>[]).map((b) => ({
    classId: String((b.classes as { code: string }).code),
    memberLabel: String(b.member_label),
    status: String(b.status) as BookingStatus,
    at: String(b.created_at),
  }))
  for (const slot of WEEK_CLASSES) {
    slot.booked = (baseByCode.get(slot.id) ?? 0) + confirmedCount(slot.id)
  }
  hydrated = true
  notify()
}

async function callFn(action: 'book' | 'cancel', classCode: string) {
  const id = memberIdentity()
  // When a real Supabase session exists, send the JWT so book-class verifies
  // it server-side and books under the auth user id (overrides the label).
  const { data: sessionData } = await supabase.auth.getSession()
  const userToken = sessionData.session?.access_token ?? ''
  const res = await fetch(FN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: BUILDER_SECRET,
      action,
      class_code: classCode,
      member_label: id.label,
      member_name: id.name,
      user_token: userToken,
    }),
  })
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok || body.error) throw new Error(String(body.error ?? `HTTP ${res.status}`))
  return body
}

export function getBookings(): Booking[] {
  const { label } = memberIdentity()
  return allBookings
    .filter((b) => b.memberLabel === label)
    .map((b) => ({ classId: b.classId, status: b.status, at: b.at }))
}

/** The signed-in member's booking for a session, if any. */
export function bookingFor(classId: string): Booking | undefined {
  return getBookings().find((b) => b.classId === classId)
}

/** Book a session — confirmed when a spot is free, otherwise waitlisted. */
export async function bookClass(classId: string): Promise<Booking> {
  const existing = bookingFor(classId)
  if (existing) return existing
  try {
    await callFn('book', classId)
  } catch (e) {
    // Callers fire-and-forget — surface the failure in the console and keep
    // local state untouched rather than throwing an unhandled rejection.
    console.error('[classSchedule] book failed', e)
  } finally {
    await refreshFromCloud()
  }
  return bookingFor(classId) ?? { classId, status: 'waitlisted', at: new Date().toISOString() }
}

export async function cancelBooking(classId: string) {
  try {
    await callFn('cancel', classId)
  } catch (e) {
    console.error('[classSchedule] cancel failed', e)
  } finally {
    await refreshFromCloud()
  }
}

export function waitlistCount(classId: string): number {
  return allBookings.filter((b) => b.classId === classId && b.status === 'waitlisted').length
}

/** Spots remaining for a session after confirmed bookings. */
export function spotsLeft(slot: ClassSlot): number {
  return Math.max(0, slot.capacity - slot.booked)
}

// Hydrate on first import (browser only). Fire-and-forget; pages render the
// fallback schedule immediately and re-render via BOOKINGS_EVENT when live
// data lands.
if (typeof window !== 'undefined') {
  refreshFromCloud()
  // Keep counts honest across tabs (a booking made elsewhere shows up here).
  window.addEventListener('storage', () => {
    if (!hydrated) return
    refreshFromCloud()
  })
}
