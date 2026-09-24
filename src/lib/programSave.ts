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
  /** Current-week program activity aggregated by the clients action. */
  activity?: { week: number; done: number; total: number } | null
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

/* ---- client dashboard + client-portal program view ------------------------- */

/** Full clients row for the dashboard drawer. */
export interface ClientDetail {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  date_of_birth: string | null
  gender: string | null
  height_cm: number | null
  weight_kg: number | null
  body_fat_percentage: number | null
  fitness_goal: string | null
  experience_level: string | null
  status: string | null
  notes: string | null
  created_at: string | null
}

export interface ClientBooking {
  id: string
  class_id: string
  member_name: string | null
  status: string | null
  created_at: string | null
  classes: { name: string; day_of_week: number | null; time_label: string | null; coach_name: string | null } | null
}

export interface ClientProgramSummary {
  id: string
  name: string
  description: string | null
  duration_weeks: number | null
  frequency_per_week: number | null
  status: string | null
  start_date: string | null
  end_date: string | null
  phase_name: string | null
  updated_at: string | null
  workouts: LoadedWorkout[]
}

export interface ClientDetailResult {
  client: ClientDetail
  programs: ClientProgramSummary[]
  bookings: ClientBooking[]
  completions: { workout_id: string; week_number: number; completed_at: string }[]
}

export async function loadClientDetail(clientId: string): Promise<ClientDetailResult> {
  const { data, error } = await supabase.functions.invoke('save-program', {
    body: { action: 'client_detail', client_id: clientId, secret: BUILDER_SECRET },
  })
  if (error) throw new Error(error.message)
  if (data && typeof data === 'object' && 'error' in data) {
    throw new Error(String((data as { error: unknown }).error))
  }
  return data as ClientDetailResult
}

export interface MyProgramClient {
  id: string
  full_name: string
  fitness_goal: string | null
  experience_level: string | null
  status: string | null
}

export interface MyProgramResult {
  client: MyProgramClient | null
  program: ClientProgramSummary | null
  completions: { workout_id: string; week_number: number; completed_at: string }[]
}

/** The signed-in member's assigned program + session completions (by email). */
export async function loadMyProgram(email: string): Promise<MyProgramResult> {
  const { data, error } = await supabase.functions.invoke('save-program', {
    body: { action: 'my_program', email, secret: BUILDER_SECRET },
  })
  if (error) throw new Error(error.message)
  if (data && typeof data === 'object' && 'error' in data) {
    throw new Error(String((data as { error: unknown }).error))
  }
  return data as MyProgramResult
}

/** Mark (or unmark) a workout session complete for a week. */
export async function setSessionComplete(
  email: string,
  workoutId: string,
  weekNumber: number,
  done: boolean,
): Promise<void> {
  const { data, error } = await supabase.functions.invoke('save-program', {
    body: { action: 'complete_session', email, workout_id: workoutId, week_number: weekNumber, done, secret: BUILDER_SECRET },
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
