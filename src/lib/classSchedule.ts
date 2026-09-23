/**
 * Shared class schedule + booking store — mock draft shaped to the target
 * SQL schema (`classes` + `bookings` with status confirmed/waitlisted/…).
 * Used by the homepage class-card popup and the Member Home schedule so a
 * booking made in either place is visible in both.
 *
 * Persistence: localStorage (per browser). When Supabase ships, swap the
 * store bodies for API calls — the shapes stay the same.
 */

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

export const WEEK_CLASSES: ClassSlot[] = [
  { id: 'c1', name: 'HYROX Race Prep', day: 'Mon', time: '07:00 – 08:00', coach: 'Dan Kan', capacity: 12, booked: 9, tag: 'Race Prep' },
  { id: 'c2', name: 'FitMama Strength', day: 'Mon', time: '10:30 – 11:30', coach: 'Ziggy Makant', capacity: 10, booked: 10, tag: "Women's Health" },
  { id: 'c3', name: 'Conditioning Circuit', day: 'Tue', time: '18:30 – 19:30', coach: 'Marcus Lau', capacity: 14, booked: 6, tag: 'Conditioning' },
  { id: 'c4', name: 'Olympic Lifting Club', day: 'Wed', time: '19:00 – 20:30', coach: 'Dan Kan', capacity: 8, booked: 5, tag: 'Strength' },
  { id: 'c5', name: 'HYROX Race Prep', day: 'Thu', time: '07:00 – 08:00', coach: 'Marcus Lau', capacity: 12, booked: 11, tag: 'Race Prep' },
  { id: 'c6', name: 'FitMama Strength', day: 'Fri', time: '10:30 – 11:30', coach: 'Ziggy Makant', capacity: 10, booked: 4, tag: "Women's Health" },
  { id: 'c7', name: 'Weekend Engine', day: 'Sat', time: '09:00 – 10:00', coach: 'Dan Kan', capacity: 16, booked: 8, tag: 'Conditioning' },
]

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

const STORE_KEY = 'vault-class-bookings'
export const BOOKINGS_EVENT = 'vault-class-bookings-changed'

function notify() {
  window.dispatchEvent(new Event(BOOKINGS_EVENT))
}

export function getBookings(): Booking[] {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    return raw ? (JSON.parse(raw) as Booking[]) : []
  } catch {
    return []
  }
}

function save(bookings: Booking[]) {
  localStorage.setItem(STORE_KEY, JSON.stringify(bookings))
  notify()
}

/** The signed-in member's booking for a session, if any. */
export function bookingFor(classId: string): Booking | undefined {
  return getBookings().find((b) => b.classId === classId)
}

/** Book a session — confirmed when a spot is free, otherwise waitlisted. */
export function bookClass(classId: string): Booking {
  const existing = bookingFor(classId)
  if (existing) return existing
  const slot = WEEK_CLASSES.find((c) => c.id === classId)
  const status: BookingStatus =
    slot && slot.booked + confirmedCount(classId) < slot.capacity ? 'confirmed' : 'waitlisted'
  const booking: Booking = { classId, status, at: new Date().toISOString() }
  save([...getBookings(), booking])
  return booking
}

export function cancelBooking(classId: string) {
  save(getBookings().filter((b) => b.classId !== classId))
}

/** Confirmed bookings across all users of this browser (mock multi-user). */
function confirmedCount(classId: string): number {
  return getBookings().filter((b) => b.classId === classId && b.status === 'confirmed').length
}

export function waitlistCount(classId: string): number {
  return getBookings().filter((b) => b.classId === classId && b.status === 'waitlisted').length
}

/** Spots remaining for a session after confirmed bookings. */
export function spotsLeft(slot: ClassSlot): number {
  return Math.max(0, slot.capacity - slot.booked - confirmedCount(slot.id))
}
