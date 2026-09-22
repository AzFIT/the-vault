import { supabase } from '@/lib/supabase'

/**
 * Two-way Google Sheets sync — thin client for the `sync-sheets` Edge
 * Function. The Google service account key lives in a Supabase project
 * secret; the frontend only ever sends the demo builder gate secret.
 *
 * Sync model: one spreadsheet per program. A SUMMARY tab plus one tab per
 * session (Exercise / Sets / Reps / Rest (s) / Notes). Push overwrites the
 * sheet; pull overwrites the program's sessions in Supabase.
 */

export interface SheetsStatus {
  configured: boolean
  sheet_id?: string | null
  sheet_url?: string | null
  sheet_synced_at?: string | null
}

export interface SheetsLinkResult {
  sheet_id: string
  sheet_url: string
  sheet_synced_at?: string | null
  /** Present when a share-with-email was requested but Drive refused it. */
  share_warning?: string | null
}

export interface SheetsPullResult {
  workouts_imported: number
  exercises_imported: number
  sheet_synced_at?: string | null
}

const BUILDER_SECRET = 'vault_bld_8f3a91c27d54e6b0'

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('sync-sheets', {
    body: { ...body, secret: BUILDER_SECRET },
  })
  if (error) throw new Error(error.message)
  if (data && typeof data === 'object' && 'error' in data) {
    throw new Error(String((data as { error: unknown }).error))
  }
  return data as T
}

/** Global or per-program connection status. `configured: false` means the
 *  service-account secret has not been set on the project yet. */
export async function getSheetsStatus(programId?: string): Promise<SheetsStatus> {
  return invoke<SheetsStatus>({ action: 'status', ...(programId ? { program_id: programId } : {}) })
}

/** Create a new Google Sheet for a program and push its current content.
 *  Pass `shareWith` (the trainer's Google email) to be granted writer access,
 *  since a service-account-owned sheet is otherwise invisible to the user. */
export async function createSheetForProgram(
  programId: string,
  shareWith?: string,
): Promise<SheetsLinkResult> {
  return invoke<SheetsLinkResult>({
    action: 'create',
    program_id: programId,
    ...(shareWith ? { share_with: shareWith } : {}),
  })
}

/** Push the program's current Supabase content to its linked sheet
 *  (creating the sheet first if the program has none). Overwrites the sheet. */
export async function pushProgramToSheet(programId: string): Promise<SheetsLinkResult> {
  return invoke<SheetsLinkResult>({ action: 'push', program_id: programId })
}

/** Import session tabs from the linked sheet back into the program.
 *  Overwrites the program's workouts/exercises in Supabase. */
export async function pullProgramFromSheet(programId: string): Promise<SheetsPullResult> {
  return invoke<SheetsPullResult>({ action: 'pull', program_id: programId })
}

/** Attach an existing spreadsheet (URL or raw ID) to a program. */
export async function linkSheetToProgram(
  programId: string,
  sheetRef: string,
): Promise<SheetsLinkResult> {
  return invoke<SheetsLinkResult>({ action: 'link', program_id: programId, sheet_ref: sheetRef })
}

/** Canonical edit URL for a linked spreadsheet. */
export function sheetUrl(sheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/edit`
}
