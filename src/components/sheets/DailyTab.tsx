/**
 * Daily Tracking tab — sheets.md §2. 7 rows (Mon–Sun of selected week) with
 * inline editing, keyboard grid nav, energy squares and an auto-recomputing
 * WEEK AVG footer. Below md it collapses to a card stack (sheets.md §5).
 */
import { motion } from 'framer-motion'
import { average } from '@/data/mock'
import { cn } from '@/lib/utils'
import { CustomCell, EditableCell, HeaderCell } from './grid'
import { useSheetGrid } from './useSheetGrid'
import { EnergySquares, TweenNumber } from './widgets'
import { getDayEntry, useVault, vaultActions } from './store'
import type { DayEntry } from './store'

const COLS = 8 // day, weight, steps, sleep, calories, water, energy, notes

const parseNum = (s: string): number | null => {
  const n = parseFloat(s.replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

const round1 = (n: number) => Math.round(n * 10) / 10

function fmt(n: number | null, digits = 0): string {
  if (n === null) return ''
  return digits > 0 ? n.toFixed(digits) : String(Math.round(n))
}

export default function DailyTab({ weekDates }: { weekDates: string[] }) {
  const vault = useVault()
  const entries = weekDates.map((d) => getDayEntry(vault, d))

  const ctl = useSheetGrid(entries.length, COLS, (r, c) => {
    if (c === 0) return { focusable: false, editable: false }
    const locked = entries[r]?.locked ?? true
    if (c === 6) return { focusable: !locked, editable: false } // energy squares
    return { focusable: !locked, editable: !locked }
  })

  const commitField = (entry: DayEntry, field: 'weightKg' | 'steps' | 'sleepHrs' | 'calories' | 'waterL') =>
    (raw: string) => {
      const n = parseNum(raw)
      if (n === null || n < 0) return
      const v = field === 'steps' || field === 'calories' ? Math.round(n) : round1(n)
      vaultActions.setDailyField(entry.date, field, v)
    }

  const present = (pick: (e: DayEntry) => number | null) =>
    entries.map(pick).filter((n): n is number => n !== null)

  const avgs = {
    weight: average(present((e) => e.weightKg)),
    steps: average(present((e) => e.steps)),
    sleep: average(present((e) => e.sleepHrs)),
    calories: average(present((e) => e.calories)),
    water: average(entries.map((e) => e.waterL)),
    energy: average(entries.map((e) => e.energy)),
  }

  return (
    <>
      {/* Desktop sheet */}
      <div {...ctl.containerProps} className="hidden overflow-x-auto outline-none md:block">
        <table className="w-full min-w-[860px] border-collapse" role="grid" aria-label="Daily tracking sheet">
          <thead>
            <tr>
              {['Day', 'Weight (kg)', 'Steps', 'Sleep (hrs)', 'Calories', 'Water (L)', 'Energy (1–5)', 'Notes'].map(
                (h, i) => (
                  <HeaderCell key={h} sticky={i === 0} className={i > 0 && i < 6 ? 'text-right' : undefined}>
                    {h}
                  </HeaderCell>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {entries.map((e, r) => {
              const dayLabel = new Date(`${e.date}T00:00:00`).toLocaleDateString('en-GB', {
                weekday: 'short',
                day: 'numeric',
              })
              return (
                <motion.tr
                  key={e.date}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: r * 0.04, ease: 'easeOut' }}
                  className={cn(
                    'transition-colors hover:bg-vault-surface-2',
                    r % 2 === 1 && 'bg-vault-surface',
                    e.locked && 'opacity-50',
                  )}
                >
                  <td
                    className="sticky left-0 z-10 h-11 border border-vault-border/60 bg-vault-surface px-3 text-[13px] font-medium text-white"
                    title={e.locked ? 'Not yet — log from tomorrow' : undefined}
                  >
                    {dayLabel}
                  </td>
                  <EditableCell ctl={ctl} r={r} c={1} value={fmt(e.weightKg, 1)} display={e.weightKg !== null ? e.weightKg.toFixed(1) : undefined} editable={!e.locked} focusable={!e.locked} onCommit={commitField(e, 'weightKg')} />
                  <EditableCell ctl={ctl} r={r} c={2} value={fmt(e.steps)} display={e.steps !== null ? e.steps.toLocaleString('en-HK') : undefined} editable={!e.locked} focusable={!e.locked} onCommit={commitField(e, 'steps')} />
                  <EditableCell ctl={ctl} r={r} c={3} value={fmt(e.sleepHrs, 1)} display={e.sleepHrs !== null ? e.sleepHrs.toFixed(1) : undefined} editable={!e.locked} focusable={!e.locked} onCommit={commitField(e, 'sleepHrs')} />
                  <EditableCell ctl={ctl} r={r} c={4} value={fmt(e.calories)} display={e.calories !== null ? e.calories.toLocaleString('en-HK') : undefined} editable={!e.locked} focusable={!e.locked} onCommit={commitField(e, 'calories')} />
                  <EditableCell ctl={ctl} r={r} c={5} value={e.waterL.toFixed(1)} display={e.waterL.toFixed(1)} editable={!e.locked} focusable={!e.locked} onCommit={commitField(e, 'waterL')} />
                  <CustomCell ctl={ctl} r={r} c={6} className={e.locked ? 'pointer-events-none' : undefined}>
                    <EnergySquares
                      value={e.energy}
                      disabled={e.locked}
                      onChange={(v) => vaultActions.setDailyField(e.date, 'energy', v)}
                    />
                  </CustomCell>
                  <EditableCell ctl={ctl} r={r} c={7} value={e.notes} align="left" numeric={false} editable={!e.locked} focusable={!e.locked} onCommit={(v) => vaultActions.setDailyField(e.date, 'notes', v)} />
                </motion.tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-vault-surface-2 font-bold text-white">
              <td className="sticky left-0 z-10 h-11 border border-vault-border/60 bg-vault-surface-2 px-3 text-[11px] uppercase tracking-[0.15em]">
                Week avg
              </td>
              <td className="h-11 border border-vault-border/60 px-3 text-right text-[13px]">
                <TweenNumber value={avgs.weight} format={(v) => v.toFixed(1)} />
              </td>
              <td className="h-11 border border-vault-border/60 px-3 text-right text-[13px]">
                <TweenNumber value={avgs.steps} />
              </td>
              <td className="h-11 border border-vault-border/60 px-3 text-right text-[13px]">
                <TweenNumber value={avgs.sleep} format={(v) => v.toFixed(1)} />
              </td>
              <td className="h-11 border border-vault-border/60 px-3 text-right text-[13px]">
                <TweenNumber value={avgs.calories} />
              </td>
              <td className="h-11 border border-vault-border/60 px-3 text-right text-[13px]">
                <TweenNumber value={avgs.water} format={(v) => v.toFixed(1)} />
              </td>
              <td className="h-11 border border-vault-border/60 px-3 text-center text-[13px]">
                <TweenNumber value={avgs.energy} format={(v) => v.toFixed(1)} />
              </td>
              <td className="h-11 border border-vault-border/60 px-3" />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mobile card stack */}
      <div className="space-y-3 md:hidden">
        {entries.map((e) => (
          <div key={e.date} className="app-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[13px] font-bold uppercase tracking-[0.12em]">
                {new Date(`${e.date}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}
              </p>
              <EnergySquares
                value={e.energy}
                disabled={e.locked}
                onChange={(v) => vaultActions.setDailyField(e.date, 'energy', v)}
              />
            </div>
            <div className="space-y-2">
              {(
                [
                  ['Weight (kg)', fmt(e.weightKg, 1), 'weightKg'],
                  ['Steps', fmt(e.steps), 'steps'],
                  ['Sleep (hrs)', fmt(e.sleepHrs, 1), 'sleepHrs'],
                  ['Calories', fmt(e.calories), 'calories'],
                  ['Water (L)', e.waterL.toFixed(1), 'waterL'],
                ] as const
              ).map(([label, val, field]) => (
                <label key={field} className="flex items-center justify-between gap-3 text-[13px]">
                  <span className="text-vault-muted">{label}</span>
                  <input
                    defaultValue={val}
                    inputMode="decimal"
                    disabled={e.locked}
                    onBlur={(ev) => commitField(e, field)(ev.target.value)}
                    onKeyDown={(ev) => ev.key === 'Enter' && (ev.target as HTMLInputElement).blur()}
                    className="w-24 border border-vault-border bg-transparent px-2 py-1 text-right tabular-nums text-white outline-none focus:border-white"
                  />
                </label>
              ))}
              <label className="flex items-center justify-between gap-3 text-[13px]">
                <span className="text-vault-muted">Notes</span>
                <input
                  defaultValue={e.notes}
                  disabled={e.locked}
                  onBlur={(ev) => vaultActions.setDailyField(e.date, 'notes', ev.target.value)}
                  onKeyDown={(ev) => ev.key === 'Enter' && (ev.target as HTMLInputElement).blur()}
                  className="w-40 border border-vault-border bg-transparent px-2 py-1 text-right text-white outline-none focus:border-white"
                />
              </label>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
