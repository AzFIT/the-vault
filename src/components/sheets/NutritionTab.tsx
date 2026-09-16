/**
 * Nutrition tab — sheets.md §4. Sticky macro target bar (live vs targets)
 * above a meal-grouped food sheet. Food combobox auto-fills macros per 100g,
 * QTY scales them live; meal subtotals and a pinned day-total row recompute
 * on every commit.
 */
import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Copy, Plus } from 'lucide-react'
import { macroTargets } from '@/data/mock'
import { cn } from '@/lib/utils'
import { EditableCell, HeaderCell } from './grid'
import { useSheetGrid } from './useSheetGrid'
import { ComboCell, TweenNumber } from './widgets'
import { foodDb } from './libraries'
import type { FoodDef } from './libraries'
import {
  MEALS,
  dayMacroTotals,
  foodRowMacros,
  getFoodRows,
  useVault,
  vaultActions,
} from './store'
import type { FoodRow } from './store'

const parseNum = (s: string): number | null => {
  const n = parseFloat(s.replace(/,/g, ''))
  return Number.isFinite(n) && n >= 0 ? n : null
}

const fmtQty = (q: number): string => String(Math.round(q * 100) / 100)
const fmt1 = (n: number): string => String(Math.round(n * 10) / 10)

function MacroBar({
  label,
  actual,
  target,
  unit,
}: {
  label: string
  actual: number
  target: number
  unit: string
}) {
  const pct = Math.min(100, (actual / target) * 100)
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] uppercase tracking-[0.15em] text-vault-muted">{label}</span>
        <span className="text-[12px] text-vault-muted tabular-nums">
          <span className="font-bold text-white">{actual.toLocaleString('en-HK')}</span> /{' '}
          {target.toLocaleString('en-HK')}
          {unit}
        </span>
      </div>
      <div className="mt-1.5 h-1 w-full" style={{ background: 'var(--viz-track)' }}>
        <motion.div
          className="h-full bg-white"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

export default function NutritionTab({
  registerAddRow,
}: {
  registerAddRow: (fn: (() => void) | null) => void
}) {
  const vault = useVault()
  const rows = getFoodRows(vault)
  const totals = dayMacroTotals(vault)

  useEffect(() => {
    registerAddRow(() => vaultActions.addFoodRow(MEALS[0]))
    return () => registerAddRow(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ctl = useSheetGrid(rows.length, 6, () => ({ focusable: true, editable: true }))

  const update = (row: FoodRow, patch: Partial<FoodRow>) => vaultActions.updateFoodRow(row.id, patch)

  const commitMacro = (row: FoodRow, field: 'kcal' | 'protein' | 'carbs' | 'fat') => (raw: string) => {
    const n = parseNum(raw)
    if (n === null) return
    const qty = row.qty || 1
    update(row, { [field]: Math.round((n / qty) * 100) / 100 })
  }

  const pickFood = (row: FoodRow) => (def: FoodDef) => {
    update(row, {
      food: def.name,
      kcal: def.kcal,
      protein: def.protein,
      carbs: def.carbs,
      fat: def.fat,
      qty: row.qty > 0 ? row.qty : 1,
    })
  }

  const mealSubtotal = (meal: string) =>
    rows
      .filter((r) => r.meal === meal)
      .reduce(
        (acc, r) => {
          const m = foodRowMacros(r)
          acc.kcal += m.kcal
          acc.protein += m.protein
          acc.carbs += m.carbs
          acc.fat += m.fat
          return acc
        },
        { kcal: 0, protein: 0, carbs: 0, fat: 0 },
      )

  return (
    <div>
      {/* Macro target bar — sticky under the toolbar */}
      <div className="sticky top-16 z-20 -mx-1 mb-4 bg-vault-bg/95 px-1 py-3 backdrop-blur">
        <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
          <MacroBar label="Calories" actual={totals.kcal} target={macroTargets.calories} unit="" />
          <MacroBar label="Protein" actual={totals.protein} target={macroTargets.proteinG} unit="g" />
          <MacroBar label="Carbs" actual={totals.carbs} target={macroTargets.carbsG} unit="g" />
          <MacroBar label="Fat" actual={totals.fat} target={macroTargets.fatG} unit="g" />
        </div>
      </div>

      <div {...ctl.containerProps} className="overflow-x-auto outline-none">
        <table className="w-full min-w-[720px] border-collapse" role="grid" aria-label="Nutrition sheet">
          <thead>
            <tr>
              <HeaderCell>Food</HeaderCell>
              <HeaderCell className="w-24 text-right">Qty (×100g)</HeaderCell>
              <HeaderCell className="w-24 text-right">Kcal</HeaderCell>
              <HeaderCell className="w-24 text-right">Protein</HeaderCell>
              <HeaderCell className="w-24 text-right">Carbs</HeaderCell>
              <HeaderCell className="w-24 text-right">Fat</HeaderCell>
            </tr>
          </thead>
          <tbody>
            {MEALS.map((meal) => {
              const mealRows = rows
                .map((row, idx) => ({ row, idx }))
                .filter(({ row }) => row.meal === meal)
              const sub = mealSubtotal(meal)
              return [
                <tr key={`${meal}-head`} className="bg-vault-surface-2">
                  <td colSpan={6} className="border border-vault-border/60 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] uppercase tracking-[0.15em] text-white">{meal}</span>
                      <span className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => vaultActions.copyYesterdayMeal(meal)}
                          className="btn-ghost text-[10px]"
                        >
                          <Copy className="h-3 w-3" /> Copy yesterday
                        </button>
                        <button
                          type="button"
                          onClick={() => vaultActions.addFoodRow(meal)}
                          className="btn-ghost text-[10px]"
                        >
                          <Plus className="h-3 w-3" /> Add food
                        </button>
                      </span>
                    </div>
                  </td>
                </tr>,
                ...mealRows.map(({ row, idx }) => {
                  const m = foodRowMacros(row)
                  return (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.25 }}
                      className={cn('transition-colors hover:bg-vault-surface-2', idx % 2 === 1 && 'bg-vault-surface')}
                    >
                      <ComboCell
                        ctl={ctl}
                        r={idx}
                        c={0}
                        value={row.food}
                        options={foodDb}
                        getLabel={(f) => f.name}
                        onSelect={pickFood(row)}
                        placeholder="Search foods…"
                      />
                      <EditableCell
                        ctl={ctl} r={idx} c={1}
                        value={fmtQty(row.qty)}
                        display={fmtQty(row.qty)}
                        onCommit={(raw) => {
                          const n = parseNum(raw)
                          if (n !== null && n > 0) update(row, { qty: n })
                        }}
                      />
                      <EditableCell ctl={ctl} r={idx} c={2} value={String(m.kcal)} onCommit={commitMacro(row, 'kcal')} />
                      <EditableCell ctl={ctl} r={idx} c={3} value={fmt1(m.protein)} onCommit={commitMacro(row, 'protein')} />
                      <EditableCell ctl={ctl} r={idx} c={4} value={fmt1(m.carbs)} onCommit={commitMacro(row, 'carbs')} />
                      <EditableCell ctl={ctl} r={idx} c={5} value={fmt1(m.fat)} onCommit={commitMacro(row, 'fat')} />
                    </motion.tr>
                  )
                }),
                <tr key={`${meal}-sub`} className="bg-vault-surface-2 font-bold text-white">
                  <td className="h-10 border border-vault-border/60 px-3 text-[11px] uppercase tracking-[0.15em] text-vault-muted">
                    {meal} subtotal
                  </td>
                  <td className="h-10 border border-vault-border/60" />
                  <td className="h-10 border border-vault-border/60 px-3 text-right text-[13px] tabular-nums">
                    <TweenNumber value={sub.kcal} />
                  </td>
                  <td className="h-10 border border-vault-border/60 px-3 text-right text-[13px] tabular-nums">
                    <TweenNumber value={sub.protein} format={(v) => fmt1(v)} />
                  </td>
                  <td className="h-10 border border-vault-border/60 px-3 text-right text-[13px] tabular-nums">
                    <TweenNumber value={sub.carbs} format={(v) => fmt1(v)} />
                  </td>
                  <td className="h-10 border border-vault-border/60 px-3 text-right text-[13px] tabular-nums">
                    <TweenNumber value={sub.fat} format={(v) => fmt1(v)} />
                  </td>
                </tr>,
              ]
            })}
          </tbody>
          <tfoot>
            <tr className="bg-white font-bold text-vault-btn-text">
              <td className="h-11 px-3 text-[11px] uppercase tracking-[0.15em]">Day total</td>
              <td />
              <td className="h-11 px-3 text-right text-[13px] tabular-nums">
                <TweenNumber value={totals.kcal} />
              </td>
              <td className="h-11 px-3 text-right text-[13px] tabular-nums">
                <TweenNumber value={totals.protein} format={(v) => fmt1(v)} />
              </td>
              <td className="h-11 px-3 text-right text-[13px] tabular-nums">
                <TweenNumber value={totals.carbs} format={(v) => fmt1(v)} />
              </td>
              <td className="h-11 px-3 text-right text-[13px] tabular-nums">
                <TweenNumber value={totals.fat} format={(v) => fmt1(v)} />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
