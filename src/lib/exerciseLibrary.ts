import { supabase } from '@/lib/supabase'

/** One row of the seeded `exercise_library` table (AzFIT workbook + app rows). */
export interface LibraryExercise {
  id: string
  name: string
  slug: string
  primary_muscle: string | null
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | null
  exercise_type: string | null
  equipment: string | null
  is_active: boolean
  source: string
  base_exercise: string | null
  movement_category: string | null
  grip_orientation: string | null
  grip_width: string | null
  coaching_cues: string | null
  youtube_url: string | null
}

export interface LibraryFilter {
  search: string
  movementCategory: string // '' = all
  equipment: string // '' = all
  difficulty: string // '' = all
  source: string // '' = all
}

export const EMPTY_FILTER: LibraryFilter = {
  search: '',
  movementCategory: '',
  equipment: '',
  difficulty: '',
  source: '',
}

let cache: LibraryExercise[] | null = null
let inflight: Promise<LibraryExercise[]> | null = null

/** Fetch the full active library once and cache it (≈650 rows, cheap). */
export async function loadExerciseLibrary(force = false): Promise<LibraryExercise[]> {
  if (cache && !force) return cache
  if (inflight && !force) return inflight
  inflight = (async () => {
    const { data, error } = await supabase
      .from('exercise_library')
      .select(
        'id,name,slug,primary_muscle,difficulty,exercise_type,equipment,is_active,source,base_exercise,movement_category,grip_orientation,grip_width,coaching_cues,youtube_url',
      )
      .eq('is_active', true)
      .order('name')
    if (error) throw new Error(error.message)
    cache = (data ?? []) as LibraryExercise[]
    return cache
  })()
  try {
    return await inflight
  } finally {
    inflight = null
  }
}

/** Distinct values for a column — used to populate filter dropdowns. */
export function distinct(library: LibraryExercise[], key: 'movement_category' | 'equipment' | 'difficulty' | 'source'): string[] {
  const set = new Set<string>()
  for (const ex of library) {
    const v = ex[key]
    if (v) set.add(v)
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b))
}

/** Case-insensitive substring match on name + base exercise. */
function matchesSearch(ex: LibraryExercise, q: string): boolean {
  const needle = q.trim().toLowerCase()
  if (!needle) return true
  return (
    ex.name.toLowerCase().includes(needle) ||
    (ex.base_exercise ?? '').toLowerCase().includes(needle) ||
    (ex.primary_muscle ?? '').toLowerCase().includes(needle)
  )
}

/** Apply the filter set to a loaded library. */
export function filterLibrary(library: LibraryExercise[], f: LibraryFilter): LibraryExercise[] {
  return library.filter(
    (ex) =>
      matchesSearch(ex, f.search) &&
      (!f.movementCategory || ex.movement_category === f.movementCategory) &&
      (!f.equipment || ex.equipment === f.equipment) &&
      (!f.difficulty || ex.difficulty === f.difficulty) &&
      (!f.source || ex.source === f.source),
  )
}
