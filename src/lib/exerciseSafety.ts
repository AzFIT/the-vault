// ---------------------------------------------------------------------------
// Contraindication / injury-safety rules for program generation.
// Ported from Azfit.ai's exerciseSafety.ts, adapted to The Vault library.
// `exclude` = never pick this exercise (swap for another candidate);
// `warn` = allowed, but surfaced to the coach in the generation summary.
// ---------------------------------------------------------------------------

export interface Contraindication {
  /** Free-text limitation keyword, matched loosely against the user's input. */
  limitation: string
  /** Name/base-exercise keywords that trigger this rule. */
  keywords: string[]
  severity: 'exclude' | 'warn'
  note: string
}

export const CONTRAINDICATIONS: Contraindication[] = [
  {
    limitation: 'lower back',
    keywords: [
      'deadlift',
      'good morning',
      'bent over row',
      'bent-over row',
      'back squat',
      'overhead press',
    ],
    severity: 'exclude',
    note: 'excluded axial-loaded movements — swap for machine or supported variants',
  },
  {
    limitation: 'knee',
    keywords: ['squat', 'lunge', 'leg extension', 'jump'],
    severity: 'warn',
    note: 'knee-loaded movements included — check tolerance with the client first',
  },
  {
    limitation: 'shoulder',
    keywords: ['overhead press', 'upright row', 'dip', 'bench press'],
    severity: 'warn',
    note: 'shoulder-loaded movements included — verify pain-free range',
  },
  {
    limitation: 'wrist',
    keywords: ['push-up', 'pushup', 'plank', 'front squat', 'barbell curl'],
    severity: 'warn',
    note: 'wrist-loaded movements included — consider dumbbell/fist variants',
  },
  {
    limitation: 'neck',
    keywords: ['shrug', 'overhead'],
    severity: 'warn',
    note: 'neck-adjacent movements included — keep loads conservative',
  },
  {
    limitation: 'hip',
    keywords: ['sumo', 'hip thrust', 'lunge'],
    severity: 'warn',
    note: 'hip-loaded movements included — monitor range of motion',
  },
]

/** Normalize a free-text limitation string ("Knee pain", "sore knees") to a lookup key. */
export function normalizeLimitation(raw: string): string {
  const t = raw.trim().toLowerCase()
  if (!t) return ''
  if (/(lower\s*back|back pain|lumbar)/.test(t)) return 'lower back'
  if (/(knee|knees)/.test(t)) return 'knee'
  if (/(shoulder|rotator)/.test(t)) return 'shoulder'
  if (/(wrist)/.test(t)) return 'wrist'
  if (/(neck)/.test(t)) return 'neck'
  if (/(hip)/.test(t)) return 'hip'
  return t
}

/**
 * Match an exercise name (+ base exercise) against the active contraindications
 * derived from the user's limitation text. Returns every rule that fires.
 */
export function findContraindications(
  exerciseName: string,
  limitations: string[],
): Contraindication[] {
  if (limitations.length === 0) return []
  const hay = exerciseName.toLowerCase()
  const hits: Contraindication[] = []
  for (const c of CONTRAINDICATIONS) {
    const applies =
      limitations.includes(c.limitation) || limitations.some((l) => c.limitation.includes(l))
    if (!applies) continue
    if (c.keywords.some((k) => hay.includes(k.toLowerCase()))) hits.push(c)
  }
  return hits
}
