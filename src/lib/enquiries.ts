/**
 * Enquiry persistence — no backend yet, so submissions are stored in
 * localStorage. To go live, replace the body of `submitEnquiry` with a
 * fetch()/Supabase insert; the call sites and the `Enquiry` shape stay
 * exactly the same.
 */

export type EnquiryRoute = 'reception' | 'senior'
export type EnquiryStatus = 'new' | 'contacted'

export interface Enquiry {
  id: string
  /** reception = pass enquiries (front desk) · senior = membership (management) */
  route: EnquiryRoute
  /** plan id from membershipPlans, e.g. 'day', 'year', 'autopay' */
  plan: string
  /** plan label + price snapshot, e.g. '12 Month — HK$10,656' */
  planLabel: string
  /** ISO timestamp */
  createdAt: string
  /** staff workflow state */
  status: EnquiryStatus
  /** Full form payload (shape differs between pass / membership forms) */
  payload: Record<string, unknown>
}

const STORAGE_KEY = 'vault-enquiries'
/** Custom window event fired whenever the stored enquiries change. */
export const ENQUIRIES_CHANGED_EVENT = 'vault-enquiries-changed'

function notify() {
  window.dispatchEvent(new Event(ENQUIRIES_CHANGED_EVENT))
}

export function listEnquiries(): Enquiry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const all = JSON.parse(raw) as Enquiry[]
    // tolerate records written before the status field existed
    return all.map((e) => ({ ...e, status: e.status ?? 'new' }))
  } catch {
    return []
  }
}

function saveAll(all: Enquiry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    // storage full / unavailable
  }
  notify()
}

export function countNewEnquiries(): number {
  return listEnquiries().filter((e) => e.status === 'new').length
}

/**
 * Persist an enquiry. Returns the stored record.
 * Swap this one function for a real API call when the backend lands.
 */
export async function submitEnquiry(
  data: Omit<Enquiry, 'id' | 'createdAt' | 'status'>,
): Promise<Enquiry> {
  const record: Enquiry = {
    ...data,
    id: `enq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    status: 'new',
  }
  try {
    saveAll([...listEnquiries(), record])
  } catch {
    // storage unavailable — still resolve so the UI can confirm
  }
  return record
}

export function markContacted(id: string) {
  saveAll(listEnquiries().map((e) => (e.id === id ? { ...e, status: 'contacted' } : e)))
}

/** Download all enquiries as a CSV file. */
export function exportCsv() {
  const all = listEnquiries()
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const rows = [
    ['id', 'createdAt', 'status', 'route', 'plan', 'planLabel', 'name', 'mobile', 'email', 'preferredContact', 'payload'],
    ...all.map((e) => [
      e.id,
      e.createdAt,
      e.status,
      e.route,
      e.plan,
      e.planLabel,
      e.payload.name,
      e.payload.mobile,
      e.payload.email,
      e.payload.preferredContact,
      JSON.stringify(e.payload),
    ]),
  ]
  const csv = rows.map((r) => r.map(esc).join(',')).join('\r\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `vault-enquiries-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Newsletter signups (footer) — same no-backend caveat as enquiries.
// ---------------------------------------------------------------------------

const NEWSLETTER_KEY = 'vault-newsletter'

export function subscribeNewsletter(email: string) {
  try {
    const raw = localStorage.getItem(NEWSLETTER_KEY)
    const all: string[] = raw ? JSON.parse(raw) : []
    const clean = email.trim().toLowerCase()
    if (!all.includes(clean)) all.push(clean)
    localStorage.setItem(NEWSLETTER_KEY, JSON.stringify(all))
  } catch {
    // storage unavailable — signup is lost, UI already confirmed
  }
}
