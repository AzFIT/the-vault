/**
 * Client directory data layer — the owner portal's member-list CRM
 * (wireframe screen 03). Seeds from the live coaching dataset
 * (src/data/mock.ts coachClients) so the portal stays in sync with the
 * demo clients, then pads the roster to a realistic studio size with
 * visitors, frozen accounts, and leads. No backend yet — the full list
 * persists to localStorage, and billing actions (send reminder, retry)
 * write through the same store.
 */
import { coachClients, coaches } from '@/data/mock'

export type ClientStatus = 'member' | 'visitor' | 'frozen' | 'lead'
export type BillingStatus = 'paid' | 'no-card' | 'failed'
export type TierState = 'active' | 'at-risk'

export interface ClientRow {
  id: string
  name: string
  status: ClientStatus
  /** Line under the name — "PT 3x/wk · Sheung Wan" for members, a goal for leads */
  subtitle: string
  phone: string
  email: string
  tierState: TierState
  membership: string
  membershipNote: string
  lastVisit: string
  /** null = not billable (visitors, leads) */
  billing: BillingStatus | null
  reminderSent?: boolean
}

export const STATUS_LABELS: Record<ClientStatus, string> = {
  member: 'Members',
  visitor: 'Visitors',
  frozen: 'Frozen',
  lead: 'Leads',
}

export const STATUS_ORDER: ClientStatus[] = ['member', 'visitor', 'frozen', 'lead']

const STORAGE_KEY = 'vault-client-directory-v1'

const AREAS = ['Sheung Wan', 'Central', 'Sai Ying Pun', 'Mid-Levels', 'Kennedy Town']
const VISIT_PATTERN = [
  'Today 07.00',
  'Today 18.30',
  'Yesterday',
  '2 days ago',
  '3 days ago',
  '5 days ago',
  '1 week ago',
  '12 days ago',
  '2 weeks ago',
]

const MEMBERSHIP_BY_TIER: Record<string, { membership: string; note: (i: number) => string }> = {
  'PT 3x/wk': { membership: 'PT 12-pack', note: (i) => `${3 + (i % 5)} sessions left` },
  'PT 2x/wk': { membership: 'Monthly', note: (i) => `renews in ${5 + ((i * 3) % 18)} days` },
  'Open Gym': { membership: 'Class pass 10', note: (i) => (i % 3 === 0 ? 'expired 5 days ago' : `${2 + (i % 6)} credits left`) },
  "Women's Programme": { membership: 'Monthly', note: (i) => `renews in ${9 + ((i * 2) % 14)} days` },
}

const coachName = (id: string) => coaches.find((c) => c.id === id)?.name ?? 'The Vault'

function emailFor(name: string) {
  const [first, last] = name.toLowerCase().split(' ')
  return `${first}.${last ?? ''}@example.com`.replace('..', '.')
}

function phoneFor(i: number) {
  return `+852 9${String(100 + ((i * 37) % 800))} ${String(1000 + ((i * 73) % 9000))}`
}

/** The 12 demo clients from the coaching dataset, mapped to CRM rows. */
const SEED_FROM_DEMO: ClientRow[] = coachClients.map((c, i) => {
  const m = MEMBERSHIP_BY_TIER[c.tier] ?? MEMBERSHIP_BY_TIER['Open Gym']
  const atRisk = c.adherence < 65
  const billing: BillingStatus =
    c.id === 'tom-whitfield' || c.id === 'alex-fong' ? 'no-card' : c.id === 'jason-ho' ? 'failed' : 'paid'
  return {
    id: c.id,
    name: c.name,
    status: 'member',
    subtitle: `${c.tier} · ${AREAS[i % AREAS.length]} · ${coachName(c.coachId)}`,
    phone: phoneFor(i),
    email: emailFor(c.name),
    tierState: atRisk ? 'at-risk' : 'active',
    membership: m.membership,
    membershipNote: m.note(i),
    lastVisit: VISIT_PATTERN[i % VISIT_PATTERN.length],
    billing,
  }
})

/** Padded roster so the studio looks real — members, then other statuses. */
const INVENTED: ClientRow[] = [
  // members (15 + Jessica Mok = 16, plus the 12 demo clients = 28)
  { id: 'jessica-mok', name: 'Jessica Mok', status: 'member', subtitle: `PT 2x/wk · ${AREAS[1]} · Ziggy Makant`, phone: '+852 9611 2203', email: 'jess.mok@example.com', tierState: 'at-risk', membership: 'Monthly', membershipNote: 'renews in 12 days', lastVisit: '5 days ago', billing: 'failed' },
  { id: 'brian-chiu', name: 'Brian Chiu', status: 'member', subtitle: `PT 3x/wk · ${AREAS[2]} · Dan Kan`, phone: '+852 9632 5187', email: 'brian.chiu@example.com', tierState: 'active', membership: 'PT 12-pack', membershipNote: '7 sessions left', lastVisit: 'Today 07.00', billing: 'paid' },
  { id: 'olivia-tam', name: 'Olivia Tam', status: 'member', subtitle: `Open Gym · ${AREAS[0]}`, phone: '+852 9701 8842', email: 'olivia.tam@example.com', tierState: 'active', membership: 'Class pass 10', membershipNote: '5 credits left', lastVisit: 'Yesterday', billing: 'paid' },
  { id: 'ethan-kwan', name: 'Ethan Kwan', status: 'member', subtitle: `PT 2x/wk · ${AREAS[3]} · Teresa Riddle`, phone: '+852 9418 3356', email: 'ethan.kwan@example.com', tierState: 'active', membership: 'Monthly', membershipNote: 'renews in 8 days', lastVisit: '2 days ago', billing: 'paid' },
  { id: 'grace-ho', name: 'Grace Ho', status: 'member', subtitle: `Women's Programme · ${AREAS[4]} · Tarryn Maree`, phone: '+852 9555 7019', email: 'grace.ho@example.com', tierState: 'at-risk', membership: 'Monthly', membershipNote: 'renews in 3 days', lastVisit: '12 days ago', billing: 'no-card' },
  { id: 'ryan-yip', name: 'Ryan Yip', status: 'member', subtitle: `Open Gym · ${AREAS[1]}`, phone: '+852 9823 4460', email: 'ryan.yip@example.com', tierState: 'active', membership: 'Class pass 10', membershipNote: '8 credits left', lastVisit: 'Today 18.30', billing: 'paid' },
  { id: 'natalie-cheng', name: 'Natalie Cheng', status: 'member', subtitle: `PT 3x/wk · ${AREAS[2]} · Dan Kan`, phone: '+852 9367 9921', email: 'natalie.cheng@example.com', tierState: 'active', membership: 'PT 12-pack', membershipNote: '2 sessions left', lastVisit: '3 days ago', billing: 'paid' },
  { id: 'hugo-sin', name: 'Hugo Sin', status: 'member', subtitle: `PT 2x/wk · ${AREAS[0]} · Emily Flavell`, phone: '+852 9142 6674', email: 'hugo.sin@example.com', tierState: 'active', membership: 'Monthly', membershipNote: 'renews in 15 days', lastVisit: '1 week ago', billing: 'failed' },
  { id: 'ivy-lai', name: 'Ivy Lai', status: 'member', subtitle: `Women's Programme · ${AREAS[3]} · Ziggy Makant`, phone: '+852 9288 1135', email: 'ivy.lai@example.com', tierState: 'active', membership: 'Monthly', membershipNote: 'renews in 11 days', lastVisit: 'Yesterday', billing: 'paid' },
  { id: 'oscar-tse', name: 'Oscar Tse', status: 'member', subtitle: `Open Gym · ${AREAS[4]}`, phone: '+852 9774 2288', email: 'oscar.tse@example.com', tierState: 'active', membership: 'Class pass 10', membershipNote: 'expired 2 days ago', lastVisit: '2 days ago', billing: 'paid' },
  { id: 'fiona-kwok', name: 'Fiona Kwok', status: 'member', subtitle: `PT 2x/wk · ${AREAS[1]} · Teresa Riddle`, phone: '+852 9519 7743', email: 'fiona.kwok@example.com', tierState: 'at-risk', membership: 'Monthly', membershipNote: 'renews tomorrow', lastVisit: '2 weeks ago', billing: 'paid' },
  { id: 'leo-pang', name: 'Leo Pang', status: 'member', subtitle: `PT 3x/wk · ${AREAS[2]} · Dan Kan`, phone: '+852 9640 5517', email: 'leo.pang@example.com', tierState: 'active', membership: 'PT 12-pack', membershipNote: '9 sessions left', lastVisit: 'Today 07.00', billing: 'paid' },
  { id: 'zoe-yuen', name: 'Zoe Yuen', status: 'member', subtitle: `Open Gym · ${AREAS[0]}`, phone: '+852 9486 3302', email: 'zoe.yuen@example.com', tierState: 'active', membership: 'Class pass 10', membershipNote: '6 credits left', lastVisit: '5 days ago', billing: 'paid' },
  { id: 'chris-tam', name: 'Chris Tam', status: 'member', subtitle: `PT 2x/wk · ${AREAS[3]} · Emily Flavell`, phone: '+852 9333 8864', email: 'chris.tam@example.com', tierState: 'active', membership: 'Monthly', membershipNote: 'renews in 6 days', lastVisit: '1 week ago', billing: 'no-card' },
  { id: 'yan-cheung', name: 'Yan Cheung', status: 'member', subtitle: `Women's Programme · ${AREAS[4]} · Tarryn Maree`, phone: '+852 9921 4470', email: 'yan.cheung@example.com', tierState: 'active', membership: 'Monthly', membershipNote: 'renews in 19 days', lastVisit: '3 days ago', billing: 'paid' },
  { id: 'jasmine-seeto', name: 'Jasmine Seeto', status: 'member', subtitle: `PT 3x/wk · ${AREAS[1]} · Dan Kan`, phone: '+852 9607 2158', email: 'jasmine.seeto@example.com', tierState: 'active', membership: 'PT 12-pack', membershipNote: '11 sessions left', lastVisit: 'Yesterday', billing: 'paid' },
  // visitors (3)
  { id: 'aaron-liu', name: 'Aaron Liu', status: 'visitor', subtitle: 'Trial · Hyrox taster', phone: '+852 9155 6023', email: 'aaron.liu@example.com', tierState: 'active', membership: 'Trial pass', membershipNote: '1 session left', lastVisit: 'Today 12.15', billing: null },
  { id: 'bella-ng', name: 'Bella Ng', status: 'visitor', subtitle: 'Drop-in · Reformer taster', phone: '+852 9788 1346', email: 'bella.ng@example.com', tierState: 'active', membership: 'Trial pass', membershipNote: 'redeemed today', lastVisit: 'Today 09.00', billing: null },
  { id: 'chris-wu', name: 'Chris Wu', status: 'visitor', subtitle: 'Guest pass · friend referral', phone: '+852 9442 7791', email: 'chris.wu@example.com', tierState: 'active', membership: 'Guest pass', membershipNote: 'expires in 3 days', lastVisit: 'Yesterday', billing: null },
  // frozen (2)
  { id: 'derek-lam', name: 'Derek Lam', status: 'frozen', subtitle: `PT 2x/wk · ${AREAS[2]}`, phone: '+852 9618 9034', email: 'derek.lam@example.com', tierState: 'active', membership: 'Frozen', membershipNote: 'resumes 2026-10-02', lastVisit: '3 weeks ago', billing: 'paid' },
  { id: 'ella-chow', name: 'Ella Chow', status: 'frozen', subtitle: `Open Gym · ${AREAS[0]}`, phone: '+852 9305 4418', email: 'ella.chow@example.com', tierState: 'active', membership: 'Frozen', membershipNote: 'resumes 2026-11-15', lastVisit: '1 month ago', billing: 'paid' },
  // leads (6)
  { id: 'lead-hannah-cho', name: 'Hannah Cho', status: 'lead', subtitle: 'Personal training · fat loss', phone: '+852 9766 2280', email: 'hannah.cho@example.com', tierState: 'active', membership: '—', membershipNote: 'via quick contact', lastVisit: 'Never', billing: null },
  { id: 'lead-ivan-shum', name: 'Ivan Shum', status: 'lead', subtitle: 'Group training · Hyrox prep', phone: '+852 9540 6672', email: 'ivan.shum@example.com', tierState: 'active', membership: '—', membershipNote: 'via quick contact', lastVisit: 'Never', billing: null },
  { id: 'lead-julia-man', name: 'Julia Man', status: 'lead', subtitle: 'Membership · open gym', phone: '+852 9273 8851', email: 'julia.man@example.com', tierState: 'active', membership: '—', membershipNote: 'via intake form', lastVisit: 'Never', billing: null },
  { id: 'lead-ken-cheung', name: 'Ken Cheung', status: 'lead', subtitle: 'Personal training · strength', phone: '+852 9499 3146', email: 'ken.cheung@example.com', tierState: 'active', membership: '—', membershipNote: 'WhatsApp enquiry', lastVisit: 'Never', billing: null },
  { id: 'lead-lisa-wong', name: 'Lisa Wong', status: 'lead', subtitle: 'Women’s programme · postnatal', phone: '+852 9835 5527', email: 'lisa.wong@example.com', tierState: 'active', membership: '—', membershipNote: 'via intake form', lastVisit: 'Never', billing: null },
  { id: 'lead-matt-hui', name: 'Matt Hui', status: 'lead', subtitle: 'Trial class · reformer', phone: '+852 9117 7902', email: 'matt.hui@example.com', tierState: 'active', membership: '—', membershipNote: 'walk-in', lastVisit: 'Never', billing: null },
]

const SEED: ClientRow[] = [...SEED_FROM_DEMO, ...INVENTED]

function readStored(): ClientRow[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as ClientRow[]) : null
  } catch {
    return null
  }
}

function writeStored(rows: ClientRow[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows))
  } catch {
    // storage unavailable — directory stays seed-only
  }
}

/** Full list: stored copy if present, otherwise the seed (and persist it). */
export function listClients(): ClientRow[] {
  const stored = readStored()
  if (stored) return stored
  writeStored(SEED)
  return SEED
}

export function addClient(input: Omit<ClientRow, 'id'>): ClientRow[] {
  const rows = listClients()
  const id = `${input.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`
  const updated = [...rows, { ...input, id }]
  writeStored(updated)
  return updated
}

/** Billing actions write through: send reminder / retry payment. */
export function updateClient(id: string, patch: Partial<ClientRow>): ClientRow[] {
  const rows = listClients()
  const updated = rows.map((r) => (r.id === id ? { ...r, ...patch } : r))
  writeStored(updated)
  return updated
}

export function exportClientsCsv(rows: ClientRow[]) {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = [
    ['name', 'status', 'subtitle', 'phone', 'email', 'tierState', 'membership', 'membershipNote', 'lastVisit', 'billing', 'reminderSent'],
    ...rows.map((r) => [
      r.name,
      r.status,
      r.subtitle,
      r.phone,
      r.email,
      r.tierState,
      r.membership,
      r.membershipNote,
      r.lastVisit,
      r.billing ?? '',
      r.reminderSent ? 'yes' : '',
    ]),
  ]
    .map((r) => r.map(esc).join(','))
    .join('\r\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `vault-clients-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
