import { getClientById, gymClasses } from '@/data/mock'

export const timeToMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

/** Demo clock pinned at 12:00 (coach.md §3) */
export const NOW_LABEL_MINUTES = 12 * 60

export type SessionKind = 'pt' | 'class' | 'group'

export interface ScheduleEntry {
  time: string
  label: string
  kind: SessionKind
  note: string
  classId?: string
  booked?: number
}

const clientName = (id: string) => getClientById(id)?.name ?? id

/** Today's sessions — names/classes resolved from mock.ts entities */
export const TODAY_SCHEDULE: ScheduleEntry[] = [
  { time: '07:00', label: clientName('marcus-lau'), kind: 'pt', note: 'VIP Studio' },
  {
    time: '08:00',
    label: 'Strength Class',
    kind: 'class',
    note: 'Main floor',
    classId: 'strength',
    booked: 5,
  },
  { time: '10:30', label: clientName('priya-sharma'), kind: 'pt', note: 'Main floor' },
  {
    time: '12:15',
    label: 'FITMAMA Strength',
    kind: 'class',
    note: 'Main floor',
    classId: 'fitmama-strength',
    booked: 4,
  },
  {
    time: '18:30',
    label: `${clientName('rachel-cheung')} + ${clientName('david-chan')}`,
    kind: 'group',
    note: 'VIP Studio',
  },
  {
    time: '19:30',
    label: 'Hyrox Class',
    kind: 'class',
    note: 'Main floor',
    classId: 'hyrox',
    booked: 6,
  },
]

export const capacityOf = (classId?: string) =>
  gymClasses.find((c) => c.id === classId)?.capacity ?? 6
