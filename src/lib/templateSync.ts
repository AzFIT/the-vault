import { supabase } from '@/lib/supabase'

/**
 * Tracking-template sync — thin client for the `template` mode of the
 * `sync-sheets` Edge Function (deployed separately; see Kimi Work). Same
 * auth model as sheetsSync.ts: the Google service-account key lives in a
 * Supabase project secret; the frontend only ever sends the demo builder
 * gate secret.
 *
 * Template model: ONE shared Google spreadsheet holds the gym's tracking
 * template (the sheets.md grid layout), as opposed to the per-program
 * sheets handled by sheetsSync.ts. The function keeps the sheet_id in its
 * stored config; callers may pass an explicit sheet_id to override it.
 */

export interface TemplateStatus {
  configured: boolean
  sheet_id?: string | null
  sheet_url?: string | null
  sheet_synced_at?: string | null
}

export interface TemplatePushResult {
  sheet_id: string
  sheet_url: string
  sheet_synced_at?: string | null
}

export interface TemplatePullResult {
  rows_imported: number
  sheet_synced_at?: string | null
}

const BUILDER_SECRET = 'vault_bld_8f3a91c27d54e6b0'

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('sync-sheets', {
    body: { mode: 'template', ...body, secret: BUILDER_SECRET },
  })
  if (error) throw new Error(error.message)
  if (data && typeof data === 'object' && 'error' in data) {
    throw new Error(String((data as { error: unknown }).error))
  }
  return data as T
}

/** Stored template connection status. `configured: false` with no sheet_id
 *  means the template has never been linked (or the function has no
 *  service-account key yet). */
export async function getTemplateStatus(): Promise<TemplateStatus> {
  return invoke<TemplateStatus>({ action: 'template_status' })
}

/** Push the tracking template to the sheet. Passing `sheetId` links that
 *  spreadsheet first (the function stores it as the template config) and
 *  then overwrites its content. Without a sheetId it uses the stored config. */
export async function pushTemplate(sheetId?: string): Promise<TemplatePushResult> {
  return invoke<TemplatePushResult>({ action: 'push_template', ...(sheetId ? { sheet_id: sheetId } : {}) })
}

/** Import the tracking template FROM the linked sheet back into the app.
 *  Uses the stored config unless an explicit `sheetId` is given. */
export async function pullTemplate(sheetId?: string): Promise<TemplatePullResult> {
  return invoke<TemplatePullResult>({ action: 'pull_template', ...(sheetId ? { sheet_id: sheetId } : {}) })
}

/**
 * Extract a spreadsheet ID from a Google Sheets URL
 * (…/spreadsheets/d/<ID>/…) or accept a raw ID. Returns null when the
 * reference is neither — callers surface that as an inline form error.
 */
export function extractSheetId(ref: string): string | null {
  const m = ref.match(/\/d\/([a-zA-Z0-9-_]+)/)
  if (m) return m[1]
  const trimmed = ref.trim()
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) return trimmed
  return null
}

/** Canonical edit URL for a linked spreadsheet. */
export function templateSheetUrl(sheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/edit`
}
