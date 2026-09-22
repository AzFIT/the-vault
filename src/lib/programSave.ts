import { supabase } from '@/lib/supabase'

/**
 * Program save payload — mirrors the Supabase schema seeded in Phase A
 * (programs → workouts → exercises).
 */
export interface SaveExercise {
  name: string
  sets: number | null
  reps: string
  rest_seconds: number | null
  order_index: number
  notes: string | null
}
export interface SaveWorkout {
  name: string
  notes: string | null
  exercises: SaveExercise[]
}
export interface SaveProgramPayload {
  name: string
  duration_weeks: number
  frequency_per_week: number
  phases?: unknown
  workouts: SaveWorkout[]
  /** Defaults to the AzFIT master trainer profile. */
  trainer_id?: string
}

export interface SaveProgramResult {
  program_id: string
  workouts_created: number
  exercises_created: number
  replaced: boolean
}

/** Nested program graph returned by the `load` action. */
export interface LoadedExercise {
  name: string
  sets: number | null
  reps: string | null
  rest_seconds: number | null
  order_index: number | null
  notes: string | null
}
export interface LoadedWorkout {
  id: string
  name: string
  notes: string | null
  week_number: number | null
  exercises: LoadedExercise[]
}
export interface LoadedProgram {
  id: string
  name: string
  description: string | null
  duration_weeks: number | null
  frequency_per_week: number | null
  status: string
  phases: unknown
  client_id: string | null
  client_name: string | null
  sheet_id: string | null
  sheet_synced_at: string | null
  workouts: LoadedWorkout[]
}

export interface ClientSummary {
  id: string
  full_name: string
  email: string | null
  status: string | null
}

export async function loadProgramsFromSupabase(): Promise<LoadedProgram[]> {
  const { data, error } = await supabase.functions.invoke('save-program', {
    body: { action: 'load', secret: BUILDER_SECRET },
  })
  if (error) throw new Error(error.message)
  if (data && typeof data === 'object' && 'error' in data) {
    throw new Error(String((data as { error: unknown }).error))
  }
  return ((data as { programs?: LoadedProgram[] })?.programs ?? []) as LoadedProgram[]
}

export async function loadClientsFromSupabase(): Promise<ClientSummary[]> {
  const { data, error } = await supabase.functions.invoke('save-program', {
    body: { action: 'clients', secret: BUILDER_SECRET },
  })
  if (error) throw new Error(error.message)
  if (data && typeof data === 'object' && 'error' in data) {
    throw new Error(String((data as { error: unknown }).error))
  }
  return ((data as { clients?: ClientSummary[] })?.clients ?? []) as ClientSummary[]
}

/** Link a program to a client row (clientId null unassigns). */
export async function assignProgramToClient(
  programId: string,
  clientId: string | null,
): Promise<void> {
  const { data, error } = await supabase.functions.invoke('save-program', {
    body: { action: 'assign', program_id: programId, client_id: clientId, secret: BUILDER_SECRET },
  })
  if (error) throw new Error(error.message)
  if (data && typeof data === 'object' && 'error' in data) {
    throw new Error(String((data as { error: unknown }).error))
  }
}

/**
 * Shared builder secret — demo-grade gate for the `save-program` Edge
 * Function. Same exposure model as the publishable key (visible in frontend
 * bundle); real Supabase Auth for trainers replaces this before go-live.
 */
const BUILDER_SECRET = 'vault_bld_8f3a91c27d54e6b0'

export async function saveProgramToSupabase(
  payload: SaveProgramPayload,
): Promise<SaveProgramResult> {
  const { data, error } = await supabase.functions.invoke('save-program', {
    body: { ...payload, secret: BUILDER_SECRET },
  })
  if (error) throw new Error(error.message)
  if (data && typeof data === 'object' && 'error' in data) {
    throw new Error(String((data as { error: unknown }).error))
  }
  return data as SaveProgramResult
}
