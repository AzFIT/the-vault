/**
 * Local mock libraries for the Tracking Sheets comboboxes.
 * Exercise library + HK-friendly food database (sheets.md §3/§4) —
 * mock.ts carries no food DB, so these page-level mocks live here.
 */

export const exerciseLibrary: string[] = [
  'Bench Press',
  'Trap Bar Deadlift',
  'Back Squat',
  'Deadlift',
  'Hip Thrust',
  'Barbell Row',
  'Overhead Press',
  'Lat Pulldown',
  'Seated Cable Row',
  'Dumbbell Shoulder Press',
  'Incline DB Curl',
  'Walking Lunge',
  'Leg Curl',
  'Pallof Press',
  'Kettlebell Swing',
  'Ski Erg',
  'Sled Push',
  'Sled Pull',
  'Row Erg',
  'Sandbag Lunge',
  'Wall Balls',
]

export interface FoodDef {
  name: string
  /** macros per 100g */
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export const foodDb: FoodDef[] = [
  { name: 'Chicken rice (poached)', kcal: 190, protein: 22, carbs: 24, fat: 5 },
  { name: 'Cha siu rice box', kcal: 240, protein: 20, carbs: 28, fat: 6 },
  { name: 'Congee with lean pork', kcal: 60, protein: 3, carbs: 11, fat: 0.5 },
  { name: 'Egg whites', kcal: 52, protein: 11, carbs: 0.7, fat: 0.2 },
  { name: 'Whey shake', kcal: 110, protein: 22, carbs: 3, fat: 1 },
  { name: 'Salmon fillet', kcal: 208, protein: 20, carbs: 0, fat: 13 },
  { name: 'Steamed fish', kcal: 110, protein: 20, carbs: 0, fat: 3 },
  { name: 'Sweet potato', kcal: 86, protein: 1.6, carbs: 20, fat: 0.1 },
  { name: 'Oats', kcal: 389, protein: 17, carbs: 66, fat: 7 },
  { name: 'Greek yoghurt', kcal: 97, protein: 9, carbs: 3.6, fat: 5 },
  { name: 'Jasmine rice', kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  { name: 'Choi sum', kcal: 20, protein: 1.5, carbs: 3, fat: 0.2 },
  { name: 'Tofu', kcal: 76, protein: 8, carbs: 1.9, fat: 4.8 },
  { name: 'Apple', kcal: 52, protein: 0.3, carbs: 14, fat: 0.2 },
  { name: 'Almonds', kcal: 579, protein: 21, carbs: 22, fat: 50 },
  { name: 'Rice noodles', kcal: 108, protein: 1.8, carbs: 25, fat: 0.2 },
  { name: 'Beef brisket', kcal: 250, protein: 26, carbs: 0, fat: 16 },
  { name: 'Prawns', kcal: 99, protein: 24, carbs: 0.2, fat: 0.3 },
]

/** Case-insensitive substring filter with start-of-word boost. */
export function fuzzyFilter<T>(items: T[], query: string, get: (t: T) => string): T[] {
  const q = query.trim().toLowerCase()
  if (!q) return items
  const scored = items
    .map((it) => {
      const name = get(it).toLowerCase()
      if (name.startsWith(q)) return { it, s: 0 }
      if (name.includes(` ${q}`)) return { it, s: 1 }
      if (name.includes(q)) return { it, s: 2 }
      return null
    })
    .filter((x): x is { it: T; s: number } => x !== null)
  scored.sort((a, b) => a.s - b.s)
  return scored.map((x) => x.it)
}
