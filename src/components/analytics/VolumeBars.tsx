import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartTooltip, SectionCard, VIZ } from './shared'
import type { RangeKey } from './analyticsData'
import { logsForWeekIdx, volumePoints } from './analyticsData'

export default function VolumeBars({
  range,
  onOpenDay,
}: {
  range: RangeKey
  onOpenDay: (date: string) => void
}) {
  const data = useMemo(() => volumePoints(range), [range])
  const peak = data.reduce((a, b) => (b.volume > a.volume ? b : a), data[0])
  const current = data[data.length - 1]

  const openWeek = (week: number) => {
    const trained = logsForWeekIdx(week - 1).find((l) => l.workout)
    if (trained) onOpenDay(trained.date)
  }

  return (
    <SectionCard eyebrow="Training Volume" title="Weekly kg lifted" className="h-full">
      <div className="h-[360px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 4, bottom: 0, left: -14 }}
            onClick={(s) => {
              const payload = (s as { activePayload?: { payload?: { week?: number } }[] })?.activePayload?.[0]?.payload
              if (payload?.week) openWeek(payload.week)
            }}
            className="cursor-pointer"
          >
            <CartesianGrid stroke={VIZ.grid} vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: VIZ.muted, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              interval={data.length > 8 ? 1 : 0}
            />
            <YAxis
              tick={{ fill: VIZ.muted, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
            <Bar dataKey="volume" name="Volume" radius={[2, 2, 0, 0]} animationDuration={700}>
              {data.map((d) => (
                <Cell
                  key={d.week}
                  fill={d.week === peak.week || d.week === current.week ? VIZ[1] : VIZ[4]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="tnum mt-3 text-[12px] text-vault-faint">
        Peak week: {peak.volume.toLocaleString()} kg (W{peak.week}) · white = best / current
      </p>
    </SectionCard>
  )
}
