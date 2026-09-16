import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartTooltip, SectionCard, VIZ } from './shared'
import type { RangeKey } from './analyticsData'
import { weightPoints } from './analyticsData'

type SeriesKey = 'actual' | 'trend' | 'target'

const LEGEND: { key: SeriesKey; label: string; swatch: CSSProperties }[] = [
  { key: 'actual', label: 'Actual', swatch: { background: VIZ[1] } },
  {
    key: 'trend',
    label: 'Trend',
    swatch: {
      background: `repeating-linear-gradient(90deg, ${VIZ[2]} 0 4px, transparent 4px 7px)`,
    },
  },
  {
    key: 'target',
    label: 'Target',
    swatch: {
      background: `repeating-linear-gradient(90deg, ${VIZ[3]} 0 2px, transparent 2px 5px)`,
    },
  },
]

export default function WeightTrend({
  range,
  onOpenDay,
}: {
  range: RangeKey
  onOpenDay: (date: string) => void
}) {
  const data = useMemo(() => weightPoints(range), [range])
  const [hidden, setHidden] = useState<Set<SeriesKey>>(new Set())

  const toggle = (k: SeriesKey) =>
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })

  const min = Math.floor(Math.min(...data.map((d) => Math.min(d.actual, d.target))) - 1)
  const max = Math.ceil(Math.max(...data.map((d) => Math.max(d.actual, d.target))) + 1)

  return (
    <SectionCard
      eyebrow="Body Weight"
      title="Trend vs target"
      className="h-full"
      aside={
        <div className="flex items-center gap-2">
          {LEGEND.map((l) => {
            const off = hidden.has(l.key)
            return (
              <button
                key={l.key}
                onClick={() => toggle(l.key)}
                aria-pressed={!off}
                className={`flex items-center gap-2 border px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] transition-all ${
                  off
                    ? 'border-vault-border text-vault-faint opacity-60'
                    : 'border-white/25 text-white'
                }`}
              >
                <span className="h-[3px] w-4" style={l.swatch} aria-hidden />
                {l.label}
              </button>
            )
          })}
        </div>
      }
    >
      <div className="h-[360px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 8, right: 8, bottom: 0, left: -18 }}
            onClick={(s) => {
              const payload = (s as { activePayload?: { payload?: { date?: string } }[] })?.activePayload?.[0]?.payload
              if (payload?.date) onOpenDay(payload.date)
            }}
            className="cursor-pointer"
          >
            <CartesianGrid stroke={VIZ.grid} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: VIZ.muted, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[min, max]}
              tick={{ fill: VIZ.muted, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `${v}`}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.15)' }} />
            {/* Goal zone — subtle white band under the target line */}
            <Area
              type="monotone"
              dataKey="target"
              name="Goal zone"
              stroke="none"
              fill="#ffffff"
              fillOpacity={0.04}
              legendType="none"
              tooltipType="none"
              isAnimationActive
              animationDuration={800}
            />
            {!hidden.has('target') && (
              <Line
                type="monotone"
                dataKey="target"
                name="Target"
                stroke={VIZ[3]}
                strokeWidth={1.5}
                strokeDasharray="2 4"
                dot={false}
                animationDuration={1000}
                animationBegin={0}
              />
            )}
            {!hidden.has('trend') && (
              <Line
                type="monotone"
                dataKey="trend"
                name="Trend"
                stroke={VIZ[2]}
                strokeWidth={1.5}
                strokeDasharray="6 4"
                dot={false}
                animationDuration={1000}
                animationBegin={200}
              />
            )}
            {!hidden.has('actual') && (
              <Line
                type="monotone"
                dataKey="actual"
                name="Actual"
                stroke={VIZ[1]}
                strokeWidth={2}
                dot={{ r: 3, fill: VIZ[1], strokeWidth: 0 }}
                activeDot={{ r: 4, fill: VIZ[1], strokeWidth: 0 }}
                connectNulls
                animationDuration={1000}
                animationBegin={400}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-3 text-[12px] text-vault-faint">
        Click a week point to open that day's full log.
      </p>
    </SectionCard>
  )
}
