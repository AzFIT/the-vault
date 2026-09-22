/**
 * Google Template card — the coach-facing sync controls for the gym's
 * shared tracking-template spreadsheet (one sheet, whole-template model).
 * Sits in the program builder's left rail under "Supabase programs", next
 * to the per-program Google Sheets sync controls.
 *
 * Connect: paste a Google Sheet URL (or raw spreadsheet ID) — the ID is
 * extracted client-side and sent to the function, which stores it as the
 * template config while pushing the template content. Status line shows
 * the last sync time once linked. Push / Pull mirror the existing
 * per-program sync UI: in-flight spinner, then an inline success or the
 * function's error message. Everything is disabled while a sync runs.
 */
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Check, Download, ExternalLink, FileSpreadsheet, RefreshCw, Upload } from 'lucide-react'
import { toast } from 'sonner'
import {
  extractSheetId,
  getTemplateStatus,
  pullTemplate,
  pushTemplate,
  templateSheetUrl,
} from '@/lib/templateSync'

type Busy = 'connect' | 'push' | 'pull' | null

export default function TemplateSyncCard() {
  const [sheetId, setSheetId] = useState<string | null>(null)
  const [syncedAt, setSyncedAt] = useState<string | null>(null)
  const [statusLoaded, setStatusLoaded] = useState(false)
  const [urlDraft, setUrlDraft] = useState('')
  const [urlError, setUrlError] = useState<string | null>(null)
  const [busy, setBusy] = useState<Busy>(null)
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  // Restore the stored template link on mount. The endpoint lands after this
  // UI ships, so a failed status call just means "not linked" — stay silent.
  useEffect(() => {
    let alive = true
    getTemplateStatus()
      .then((s) => {
        if (!alive) return
        if (s.sheet_id) setSheetId(s.sheet_id)
        setSyncedAt(s.sheet_synced_at ?? null)
      })
      .catch(() => {})
      .finally(() => alive && setStatusLoaded(true))
    return () => {
      alive = false
    }
  }, [])

  const run = async (kind: Exclude<Busy, null>, fn: () => Promise<void>) => {
    if (busy) return
    setBusy(kind)
    setNotice(null)
    setUrlError(null)
    try {
      await fn()
    } catch (e) {
      setNotice({ kind: 'error', text: e instanceof Error ? e.message : 'unknown error' })
    } finally {
      setBusy(null)
    }
  }

  const connect = (e: FormEvent) => {
    e.preventDefault()
    const id = extractSheetId(urlDraft)
    if (!id) {
      setUrlError('Not a Google Sheets link or spreadsheet ID — paste the full sheet URL.')
      return
    }
    void run('connect', async () => {
      const r = await pushTemplate(id)
      setSheetId(r.sheet_id)
      setSyncedAt(r.sheet_synced_at ?? null)
      setUrlDraft('')
      toast.success(`Google Template linked — ${r.sheet_url}`)
    })
  }

  const push = () =>
    void run('push', async () => {
      const r = await pushTemplate(sheetId ?? undefined)
      setSyncedAt(r.sheet_synced_at ?? null)
      setNotice({ kind: 'success', text: `Template pushed to Sheets · ${r.sheet_url}` })
    })

  const pull = () =>
    void run('pull', async () => {
      const r = await pullTemplate(sheetId ?? undefined)
      setSyncedAt(r.sheet_synced_at ?? null)
      setNotice({ kind: 'success', text: `Imported ${r.rows_imported} template row${r.rows_imported === 1 ? '' : 's'} from Sheets` })
    })

  const syncedLabel = syncedAt ? new Date(syncedAt).toLocaleString() : null

  return (
    <div className="mt-4 border border-vault-border">
      <div className="flex items-center justify-between border-b border-vault-border px-3 py-2">
        <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-vault-muted">
          <FileSpreadsheet className="h-3 w-3" />
          Google Template
        </span>
        {sheetId && (
          <a
            href={templateSheetUrl(sheetId)}
            target="_blank"
            rel="noreferrer"
            title={`Open template sheet${syncedLabel ? ` · last sync ${syncedLabel}` : ''}`}
            className="text-vault-faint transition-colors hover:text-white"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      <div className="space-y-2 p-2">
        <p className="text-[10px] leading-snug text-vault-faint">
          The shared tracking-template spreadsheet. Connect once, then push the template out or pull
          updates back in.
        </p>

        {/* Status line */}
        <p className="tnum text-[10px] text-vault-muted">
          {sheetId
            ? `Linked · last synced ${syncedLabel ?? 'never'}`
            : statusLoaded
              ? 'Not linked — paste the template sheet URL below.'
              : 'Checking stored link…'}
        </p>

        {/* Connect field */}
        <form onSubmit={connect} className="flex items-start gap-1">
          <input
            value={urlDraft}
            onChange={(e) => {
              setUrlDraft(e.target.value)
              setUrlError(null)
            }}
            placeholder="Paste Google Sheet URL…"
            aria-label="Template sheet URL"
            className="min-w-0 flex-1 border border-vault-border bg-vault-surface-2/40 px-2 py-1.5 text-[11px] text-white placeholder:text-vault-faint focus:border-gold focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy !== null || !urlDraft.trim()}
            title="Link this spreadsheet and push the template to it"
            className="inline-flex shrink-0 items-center gap-1 border border-vault-border px-2 py-1.5 text-[10px] uppercase tracking-[0.1em] text-vault-muted transition-colors hover:border-gold/60 hover:text-gold disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy === 'connect' ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            Connect
          </button>
        </form>
        {urlError && <p className="text-[10px] leading-snug text-red-300">{urlError}</p>}

        {/* Push / Pull */}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={push}
            disabled={busy !== null || !sheetId}
            title={sheetId ? 'Push template → Sheet (overwrites the sheet)' : 'Connect a template sheet first'}
            className="inline-flex flex-1 items-center justify-center gap-1 border border-vault-border px-2 py-1.5 text-[10px] uppercase tracking-[0.1em] text-vault-muted transition-colors hover:border-gold/60 hover:text-gold disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy === 'push' ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
            Push to Sheets
          </button>
          <button
            type="button"
            onClick={pull}
            disabled={busy !== null || !sheetId}
            title={sheetId ? 'Import the template from the linked Sheet' : 'Connect a template sheet first'}
            className="inline-flex flex-1 items-center justify-center gap-1 border border-vault-border px-2 py-1.5 text-[10px] uppercase tracking-[0.1em] text-vault-muted transition-colors hover:border-gold/60 hover:text-gold disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy === 'pull' ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
            Pull from Sheets
          </button>
        </div>

        {/* Success / error line */}
        {notice && (
          <p className={`text-[10px] leading-snug ${notice.kind === 'success' ? 'text-[#7ec98f]' : 'text-red-300'}`}>
            {notice.text}
          </p>
        )}
      </div>
    </div>
  )
}
