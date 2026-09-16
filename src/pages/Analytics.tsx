import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { FileText } from 'lucide-react'
import KpiRow from '@/components/analytics/KpiRow'
import WeightTrend from '@/components/analytics/WeightTrend'
import VolumeBars from '@/components/analytics/VolumeBars'
import { MacroBullets, MacroDonut } from '@/components/analytics/MacroSection'
import Heatmap from '@/components/analytics/Heatmap'
import PrBoard from '@/components/analytics/PrBoard'
import InsightStrip from '@/components/analytics/InsightStrip'
import DayDrawer from '@/components/analytics/DayDrawer'
import type { RangeKey } from '@/components/analytics/analyticsData'
import { computeKpis, RANGE_OPTIONS } from '@/components/analytics/analyticsData'

/**
 * Analytics — /analytics (design/analytics.md).
 * 16 weeks of deterministic mock data rendered as a monochrome,
 * editorial analytics page. Viz ramp only — no hue.
 */
export default function Analytics() {
  const [range, setRange] = useState<RangeKey>('16W')
  const [drawerDate, setDrawerDate] = useState<string | null>(null)
  const kpis = useMemo(() => computeKpis(range), [range])

  return (
    <div className="space-y-6">
      {/* Page header — eyebrow + title + range selector + report link */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Analytics</p>
          <h2 className="mt-1 text-[28px] font-bold leading-tight text-white md:text-[34px]">
            Your progress, measured
          </h2>
          <p className="mt-1 text-[13px] text-vault-muted">
            Rachel Cheung · Body Composition Reset · coached by Dan Kan
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div
            role="tablist"
            aria-label="Date range"
            className="flex border border-vault-border p-0.5"
          >
            {RANGE_OPTIONS.map((r) => (
              <button
                key={r}
                role="tab"
                aria-selected={range === r}
                onClick={() => setRange(r)}
                className={`px-3.5 py-1.5 text-[12px] uppercase tracking-[0.1em] transition-colors ${
                  range === r
                    ? 'bg-white text-vault-btn-text'
                    : 'text-vault-muted hover:text-white'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <Link to="/plan-summary" className="btn-ghost hidden items-center gap-2 md:flex">
            <FileText className="h-4 w-4" strokeWidth={1.5} />
            Report
          </Link>
        </div>
      </div>

      {/* §1 — KPI stat row */}
      <KpiRow kpis={kpis} range={range} />

      {/* §2 + §3 — weight trend (2/3) + volume (1/3) */}
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2" key={`wt-${range}`}>
          <WeightTrend range={range} onOpenDay={setDrawerDate} />
        </div>
        <div key={`vb-${range}`}>
          <VolumeBars range={range} onOpenDay={setDrawerDate} />
        </div>
      </div>

      {/* §4 — macro donut + bullet bars */}
      <div className="grid gap-6 lg:grid-cols-2">
        <MacroDonut range={range} key={`md-${range}`} />
        <MacroBullets range={range} key={`mb-${range}`} />
      </div>

      {/* §5 — consistency heatmap */}
      <Heatmap onOpenDay={setDrawerDate} />

      {/* §6 — PR board */}
      <PrBoard />

      {/* §7 — insight strip */}
      <InsightStrip />

      {/* Shared day drawer */}
      <DayDrawer date={drawerDate} onClose={() => setDrawerDate(null)} onNav={setDrawerDate} />
    </div>
  )
}
