/**
 * Enquiry persistence — two layers:
 *
 * 1. CLOUD (primary): every submission is lodged through the Supabase
 *    `enquiries-inbox` Edge Function (public 'submit' action, service-key
 *    insert). Reading leads is PII and goes through the staff-gated
 *    'list'/'update' actions with the publishable key unable to read.
 * 2. LOCAL (cache/fallback): records also stay in localStorage so the CRM
 *    keeps working offline and submissions made before the cloud insert
 *    resolves are never lost. The Enquiries page merges both sources.
 */

export type EnquiryRoute = 'reception' | 'senior'
/** CRM pipeline: New → Contacted → Trial Booked → Converted · Cold = parked */
export type EnquiryStatus = 'new' | 'contacted' | 'trial-booked' | 'converted' | 'cold'

export const ENQUIRY_STATUSES: EnquiryStatus[] = ['new', 'contacted', 'trial-booked', 'converted', 'cold']

export const STATUS_LABELS: Record<EnquiryStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  'trial-booked': 'Trial booked',
  converted: 'Converted',
  cold: 'Cold',
}

/** DB (title case) ↔ app (kebab) status mapping */
const DB_STATUS: Record<EnquiryStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  'trial-booked': 'Trial Booked',
  converted: 'Converted',
  cold: 'Cold',
}
const APP_STATUS: Record<string, EnquiryStatus> = Object.fromEntries(
  Object.entries(DB_STATUS).map(([app, db]) => [db, app as EnquiryStatus]),
)

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
  /** Supabase row id once the cloud mirror has landed */
  cloudId?: string
  /** staff member responsible for following up (name) */
  assignedTo?: string
  /** free-text staff notes */
  notes?: string
}

// ---------------------------------------------------------------------------
// Cloud layer
// ---------------------------------------------------------------------------

/**
 * Demo-grade staff gate, same model as the save-program edge function.
 * Reading leads requires this key in the x-staff-key header. Replace with
 * Supabase Auth + staff roles before go-live.
 */
const INBOX_URL =
  'https://gcurvjprfwecbchreieu.supabase.co/functions/v1/enquiries-inbox'
const STAFF_KEY = 'vault_enq_3d8b52f1a947c60e'

/**
 * Mirror a submission into Supabase via the enquiries-inbox edge function
 * (public 'submit' action — server-side insert with the service key).
 * Never throws — localStorage is the fallback.
 */
async function cloudInsert(rec: Enquiry): Promise<string | null> {
  const p = rec.payload
  try {
    const res = await fetch(INBOX_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'submit',
        enquiry: {
          source: rec.plan,
          title: rec.planLabel,
          contact_name: (p.name as string) ?? null,
          contact_phone: (p.mobile as string) ?? null,
          contact_email: (p.email as string) ?? null,
          preferred_channels: Array.isArray(p.preferredContact)
            ? (p.preferredContact as string[])
            : [],
          best_time: (p.bestTime as string) ?? null,
          payload: { ...p, route: rec.route, plan: rec.plan, planLabel: rec.planLabel },
        },
      }),
    })
    if (!res.ok) throw new Error(`submit ${res.status}`)
    const data = (await res.json()) as { id?: string }
    return data.id ?? null
  } catch (err) {
    console.warn('[enquiries] cloud insert failed, kept locally only', err)
    return null
  }
}

/** Staff-gated raw cloud read. Returns null when the network/gate fails. */
async function cloudList(): Promise<Enquiry[] | null> {
  try {
    const res = await fetch(INBOX_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-staff-key': STAFF_KEY },
      body: JSON.stringify({ action: 'list' }),
    })
    if (!res.ok) throw new Error(`inbox ${res.status}`)
    const data = (await res.json()) as { enquiries: Record<string, unknown>[] }
    return (data.enquiries ?? []).map((row) => {
      const payload = (row.payload as Record<string, unknown>) ?? {}
      return {
        id: `cloud_${String(row.id)}`,
        cloudId: String(row.id),
        route: (payload.route as EnquiryRoute) ?? 'reception',
        plan: String(payload.plan ?? row.source ?? 'general'),
        planLabel: String(row.title ?? 'Enquiry'),
        createdAt: String(row.created_at),
        status: APP_STATUS[String(row.status ?? 'New')] ?? 'new',
        payload,
        assignedTo: (row.assigned_to as string) || undefined,
        notes: (row.notes as string) || undefined,
      }
    })
  } catch (err) {
    console.warn('[enquiries] cloud fetch failed', err)
    return null
  }
}

// ---------------------------------------------------------------------------
// Merged view: cloud (primary) + local-only records (offline submissions and
// anything saved before cloud mirroring existed). The cloud cache is kept in
// module memory so every dashboard count reflects Supabase after one fetch.
// ---------------------------------------------------------------------------

let cloudCache: Enquiry[] | null = null

export function mergeCloudLocal(cloud: Enquiry[], local: Enquiry[]): Enquiry[] {
  const cloudIds = new Set(cloud.map((c) => c.cloudId))
  const localOnly = local.filter((l) => !l.cloudId || !cloudIds.has(l.cloudId))
  return [...cloud, ...localOnly]
}

/**
 * Refresh the cloud cache from Supabase. Dashboards call this once on mount;
 * on success it fires ENQUIRIES_CHANGED_EVENT so every subscribed count and
 * badge re-renders with real numbers. Returns false when the cloud is
 * unreachable (callers then keep working from the local cache).
 */
export async function refreshCloudEnquiries(): Promise<boolean> {
  const cloud = await cloudList()
  if (cloud === null) return false // unreachable — keep working from local cache
  cloudCache = cloud
  notify()
  return true
}

/** Merged view used by dashboards and the Enquiries page. */
export function fetchEnquiriesMerged(): Enquiry[] {
  return mergeCloudLocal(cloudCache ?? [], listEnquiries())
}

/** Fire-and-forget status patch on the cloud row. */
function cloudUpdate(cloudId: string, patch: Record<string, unknown>) {
  void fetch(INBOX_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-staff-key': STAFF_KEY },
    body: JSON.stringify({ action: 'update', id: cloudId, ...patch }),
  }).catch((err) => console.warn('[enquiries] cloud update failed', err))
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
  return fetchEnquiriesMerged().filter((e) => e.status === 'new').length
}

/**
 * Resolve an enquiry id (local `enq_…` or `cloud_<uuid>`) to its cloud row id
 * and its local-storage record (if any).
 */
function resolve(id: string): { cloudId: string | null; local: Enquiry | null } {
  if (id.startsWith('cloud_')) return { cloudId: id.slice(6), local: null }
  const local = listEnquiries().find((e) => e.id === id) ?? null
  return { cloudId: local?.cloudId ?? null, local }
}

/** Shared mutation path: patch localStorage if present, mirror to the cloud row. */
function applyPatch(id: string, patch: Partial<Enquiry>, cloudPatch: Record<string, unknown>) {
  const { cloudId, local } = resolve(id)
  if (local) {
    saveAll(listEnquiries().map((e) => (e.id === id ? { ...e, ...patch } : e)))
  } else {
    notify()
  }
  if (cloudId) cloudUpdate(cloudId, cloudPatch)
}

/** Move a lead along the pipeline (New → Contacted → Trial booked → Converted / Cold). */
export function setEnquiryStatus(id: string, status: EnquiryStatus) {
  applyPatch(id, { status }, { status: DB_STATUS[status] })
}

export function markContacted(id: string) {
  setEnquiryStatus(id, 'contacted')
}

/** Assign (or unassign with '') the staff member responsible for the follow-up. */
export function assignEnquiry(id: string, assignee: string) {
  applyPatch(id, { assignedTo: assignee || undefined }, { assigned_to: assignee })
}

/** Save free-text staff notes on the enquiry. */
export function setEnquiryNotes(id: string, notes: string) {
  applyPatch(id, { notes }, { notes })
}

/**
 * Persist an enquiry: mirror to Supabase (primary) and localStorage
 * (cache/fallback). Returns the stored record with cloudId attached when
 * the cloud insert landed.
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
  const cloudId = await cloudInsert(record)
  if (cloudId) record.cloudId = cloudId
  try {
    saveAll([...listEnquiries(), record])
  } catch {
    // storage unavailable — cloud copy still holds the record
  }
  return record
}

/** Download all enquiries as a CSV file. */
export function exportCsv() {
  const all = fetchEnquiriesMerged()
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
