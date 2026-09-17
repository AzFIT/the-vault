/**
 * Staff directory data layer — the owner portal's categorized roster of
 * trainers (Vault + freelance), class instructors, and front desk staff.
 * Mock roster seeded from src/data/mock.ts coaches plus invented supporting
 * staff; additions persist to localStorage (no backend until live auth lands).
 */

export type StaffCategory = 'vault' | 'freelance' | 'instructor' | 'front-desk'
export type StaffStatus = 'on-shift' | 'off' | 'teaching'

export interface StaffRow {
  id: string
  staffNo: string
  name: string
  category: StaffCategory
  role: string
  tags: string[]
  status: StaffStatus
  /** e.g. "Teaching 12:15" — shown next to the status dot */
  statusNote?: string
  /** Active client count, null for non-training roles */
  clients: number | null
  contact: string
  since: string
}

export const CATEGORY_LABELS: Record<StaffCategory, string> = {
  vault: 'Vault Trainer',
  freelance: 'Freelance',
  instructor: 'Class Instructor',
  'front-desk': 'Front Desk',
}

export const CATEGORY_ORDER: StaffCategory[] = ['vault', 'freelance', 'instructor', 'front-desk']

const STORAGE_KEY = 'vault-staff-directory-v1'

/** Seed roster — the five Vault coaches come from the live mock dataset. */
const SEED: StaffRow[] = [
  { id: 'dan-kan', staffNo: 'RC-1001', name: 'Dan Kan', category: 'vault', role: 'Head Coach & Co-Founder', tags: ['strength', 'hyrox', 'first-aid'], status: 'on-shift', clients: 6, contact: '+852 9123 4401', since: '2019' },
  { id: 'ziggy-makant', staffNo: 'RC-1002', name: 'Ziggy Makant', category: 'vault', role: "Head of Women's Health", tags: ['womens-health', 'nutrition', 'bilingual-eng-cant'], status: 'off', clients: 4, contact: '+852 9123 4402', since: '2020' },
  { id: 'teresa-riddle', staffNo: 'RC-1003', name: 'Teresa Riddle', category: 'vault', role: 'Personal Trainer', tags: ['strength', 'first-aid'], status: 'on-shift', clients: 5, contact: '+852 9123 4403', since: '2021' },
  { id: 'tarryn-maree', staffNo: 'RC-1004', name: 'Tarryn Maree', category: 'vault', role: "Women's Health Trainer", tags: ['womens-health', 'fitmama'], status: 'off', clients: 3, contact: '+852 9123 4404', since: '2022' },
  { id: 'emily-flavell', staffNo: 'RC-1005', name: 'Emily Flavell', category: 'vault', role: 'Junior Trainer', tags: ['strength', 'group-classes'], status: 'teaching', statusNote: 'Teaching 18:30', clients: 2, contact: '+852 9123 4405', since: '2024' },
  { id: 'jeremy-lai', staffNo: 'FL-2011', name: 'Jeremy Lai', category: 'freelance', role: 'Reformer Pilates', tags: ['reformer', 'bilingual-eng-cant'], status: 'teaching', statusNote: 'Teaching 12:15', clients: null, contact: '+852 9345 7711', since: '2022' },
  { id: 'marco-fung', staffNo: 'FL-2012', name: 'Marco Fung', category: 'freelance', role: 'Boxing & Conditioning', tags: ['boxing', 'conditioning'], status: 'off', clients: null, contact: '+852 9345 7712', since: '2023' },
  { id: 'nina-patel', staffNo: 'FL-2013', name: 'Nina Patel', category: 'freelance', role: 'Yoga & Mobility', tags: ['yoga', 'mobility'], status: 'off', clients: null, contact: '+852 9345 7713', since: '2023' },
  { id: 'sam-choi', staffNo: 'FL-2014', name: 'Sam Choi', category: 'freelance', role: 'Hyrox Prep Coach', tags: ['hyrox', 'conditioning'], status: 'off', clients: null, contact: '+852 9345 7714', since: '2024' },
  { id: 'hana-suzuki', staffNo: 'CI-3011', name: 'Hana Suzuki', category: 'instructor', role: 'Reformer Pilates Instructor', tags: ['reformer', 'bilingual-eng-cant'], status: 'teaching', statusNote: 'Teaching 19:00', clients: null, contact: '+852 9567 2210', since: '2022' },
  { id: 'kate-lam', staffNo: 'CI-3012', name: 'Kate Lam', category: 'instructor', role: 'FITMAMA Class Lead', tags: ['fitmama', 'womens-health'], status: 'off', clients: null, contact: '+852 9567 2211', since: '2023' },
  { id: 'joe-wong', staffNo: 'CI-3013', name: 'Joe Wong', category: 'instructor', role: 'Spin & HIIT', tags: ['spin', 'hiit'], status: 'teaching', statusNote: 'Teaching 07:00', clients: null, contact: '+852 9567 2212', since: '2024' },
  { id: 'rachel-cheung', staffNo: 'RC-1042', name: 'Rachel Cheung', category: 'front-desk', role: 'Front of House', tags: ['pos', 'bilingual-eng-cant'], status: 'on-shift', clients: null, contact: '+852 9123 4462', since: '2023' },
  { id: 'tony-leung', staffNo: 'RC-1043', name: 'Tony Leung', category: 'front-desk', role: 'Front of House', tags: ['pos', 'first-aid'], status: 'off', clients: null, contact: '+852 9123 4463', since: '2024' },
]

function slugify(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function readStored(): StaffRow[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as StaffRow[]) : null
  } catch {
    return null
  }
}

function writeStored(rows: StaffRow[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows))
  } catch {
    // storage unavailable (private mode) — directory stays seed-only
  }
}

/** Full roster: stored copy if present, otherwise the seed (and persist it). */
export function listStaff(): StaffRow[] {
  const stored = readStored()
  if (stored) return stored
  writeStored(SEED)
  return SEED
}

export function addStaff(input: Omit<StaffRow, 'id' | 'staffNo'>): StaffRow[] {
  const rows = listStaff()
  const prefixes: Record<StaffCategory, string> = {
    vault: 'RC-10',
    freelance: 'FL-20',
    instructor: 'CI-30',
    'front-desk': 'RC-10',
  }
  const next = rows.filter((r) => r.category === input.category).length + 1
  const row: StaffRow = {
    ...input,
    id: `${slugify(input.name)}-${Date.now().toString(36)}`,
    staffNo: `${prefixes[input.category]}${String(next + 40).slice(-2)}`,
  }
  const updated = [...rows, row]
  writeStored(updated)
  return updated
}

export function exportStaffCsv(rows: StaffRow[]) {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = [
    ['staffNo', 'name', 'category', 'role', 'tags', 'status', 'statusNote', 'clients', 'contact', 'since'],
    ...rows.map((r) => [
      r.staffNo,
      r.name,
      CATEGORY_LABELS[r.category],
      r.role,
      r.tags.join('; '),
      r.status,
      r.statusNote ?? '',
      r.clients ?? '',
      r.contact,
      r.since,
    ]),
  ]
    .map((r) => r.map(esc).join(','))
    .join('\r\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `vault-staff-directory-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
