import { createClient } from '@supabase/supabase-js'

/**
 * Browser-facing Supabase client.
 *
 * Uses the project's *publishable* key, which is safe to ship in the frontend
 * (same exposure model as the anon key). Row Level Security is what actually
 * protects data: with this key the app can read `exercise_library` (public
 * read policy) but cannot write to trainer tables — writes go through the
 * `save-program` Edge Function, which is gated by a shared builder secret.
 *
 * Override via Vite env vars if the project ever moves:
 *   VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY
 */
const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  'https://gcurvjprfwecbchreieu.supabase.co'

const SUPABASE_PUBLISHABLE_KEY =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
  'sb_publishable_u3ULFcAeHW3fwcpqu7ub_g_vwaOxCA1'

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
