/**
 * Tracking Sheets — The Vault app (sheets.md).
 * Spreadsheet-grade entry over the shared mock store: Daily Tracking /
 * Workouts / Nutrition tabs with keyboard grid nav, live recompute and
 * layoutId tab underline. All persistence is local state (no backend).
 */
import { useCallback, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  MoreVertical,
  Plus,
} from 'lucide-react'
import { dailyLogs, LOG_WEEKS } from '@/data/mock'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import DailyTab from '@/components/sheets/DailyTab'
import WorkoutsTab from '@/components/sheets/WorkoutsTab'
import NutritionTab from '@/components/sheets/NutritionTab'
import { getDayEntry, useVault, vaultActions } from '@/components/sheets/store'

type TabId = 'daily' | 'workouts' | 'nutrition'

const TABS: { id: TabId; label: string }[] = [
  { id: 'daily', label: 'Daily Tracking' },
  { id: 'workouts', label: 'Workouts' },
  { id: 'nutrition', label: 'Nutrition' },
]

const weekDates = (w: number): string[] =>
  dailyLogs.slice(w * 7, w * 7 + 7).map((l) => l.date)

function weekRangeLabel(dates: string[]): string {
  const first = new Date(`${dates[0]}T00:00:00`)
  const last = new Date(`${dates[dates.length - 1]}T00:00:00`)
  const sameMonth = first.getMonth() === last.getMonth()
  const f = first.toLocaleDateString('en-GB', sameMonth ? { day: 'numeric' } : { day: 'numeric', month: 'short' })
  const l = last.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${f} – ${l}`
}

function downloadCSV(filename: string, rows: string[][]) {
  const csv = rows
    .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function Sheets() {
  const vault = useVault()
  const [tab, setTab] = useState<TabId>('daily')
  const [week, setWeek] = useState(LOG_WEEKS - 1)
  const dates = weekDates(week)
  const addRowRef = useRef<(() => void) | null>(null)

  const registerAddRow = useCallback((fn: (() => void) | null) => {
    addRowRef.current = fn
  }, [])

  const exportCSV = () => {
    const rows = [
      ['Day', 'Weight (kg)', 'Steps', 'Sleep (hrs)', 'Calories', 'Water (L)', 'Energy (1-5)', 'Notes'],
      ...dates.map((d) => {
        const e = getDayEntry(vault, d)
        return [
          new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
          e.weightKg?.toFixed(1) ?? '',
          e.steps !== null ? String(e.steps) : '',
          e.sleepHrs?.toFixed(1) ?? '',
          e.calories !== null ? String(e.calories) : '',
          e.waterL.toFixed(1),
          String(e.energy),
          e.notes,
        ]
      }),
    ]
    downloadCSV(`vault-tracking-week-${week + 1}.csv`, rows)
  }

  return (
    <div className="space-y-5">
      {/* Section 1 — tabs + toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Tracking sheets" className="flex gap-5">
          {TABS.map((t) => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={cn(
                  'relative pb-2 text-[13px] uppercase tracking-[0.08em] transition-colors',
                  active ? 'text-white' : 'text-vault-muted hover:text-white',
                )}
              >
                <span className="flex items-center gap-1.5">
                  {t.label}
                  {active && vault.saveState === 'dirty' && (
                    <span className="h-1.5 w-1.5 rounded-full bg-white" aria-label="Unsaved changes" />
                  )}
                </span>
                {active && (
                  <motion.span
                    layoutId="sheet-tab-underline"
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-white"
                  />
                )}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <span className="hidden text-[12px] text-vault-muted md:inline" aria-live="polite">
            {vault.saveState === 'saved' && 'Saved · just now'}
            {vault.saveState === 'dirty' && 'Unsaved…'}
          </span>

          {/* Week navigator */}
          <div className="flex items-center border border-vault-border">
            <button
              type="button"
              aria-label="Previous week"
              disabled={week === 0}
              onClick={() => setWeek((w) => Math.max(0, w - 1))}
              className="px-2 py-1.5 text-vault-muted transition-colors hover:text-white disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[150px] text-center text-[12px] tabular-nums text-white">
              ‹ Week {week + 1} · {weekRangeLabel(dates)} ›
            </span>
            <button
              type="button"
              aria-label="Next week"
              disabled={week === LOG_WEEKS - 1}
              onClick={() => setWeek((w) => Math.min(LOG_WEEKS - 1, w + 1))}
              className="px-2 py-1.5 text-vault-muted transition-colors hover:text-white disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {tab !== 'daily' && (
            <button
              type="button"
              onClick={() => addRowRef.current?.()}
              className="btn-ghost hidden md:inline-flex"
            >
              <Plus className="h-3.5 w-3.5" /> Add row
            </button>
          )}
          <button type="button" onClick={exportCSV} className="btn-ghost hidden md:inline-flex">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="More actions" className="p-1.5 text-vault-muted hover:text-white">
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border-vault-border bg-vault-surface-2 text-white">
              <DropdownMenuItem
                disabled={week === 0}
                onClick={() => vaultActions.copyLastWeek(dates, weekDates(week - 1))}
                className="focus:bg-white/[0.08] focus:text-white"
              >
                Copy last week
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => vaultActions.clearWeek(dates)}
                className="focus:bg-white/[0.08] focus:text-white"
              >
                Clear week
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.print()} className="focus:bg-white/[0.08] focus:text-white">
                Print
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportCSV} className="focus:bg-white/[0.08] focus:text-white md:hidden">
                Export CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tab content — cross-fade 200ms + 8px rise */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {tab === 'daily' && <DailyTab weekDates={dates} />}
          {tab === 'workouts' && (
            <WorkoutsTab weekDates={dates} weekIndex={week} registerAddRow={registerAddRow} />
          )}
          {tab === 'nutrition' && <NutritionTab registerAddRow={registerAddRow} />}
        </motion.div>
      </AnimatePresence>

      {/* Mobile floating add button — offset left of the WhatsApp pill */}
      {tab !== 'daily' && (
        <button
          type="button"
          aria-label="Add row"
          onClick={() => addRowRef.current?.()}
          className="fixed bottom-6 right-[96px] z-40 flex h-12 w-12 items-center justify-center rounded-full bg-white text-vault-btn-text shadow-lg transition-transform hover:-translate-y-0.5 md:hidden"
        >
          <Plus className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}
