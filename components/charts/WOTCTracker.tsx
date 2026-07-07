'use client'

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { CHART, TOOLTIP_STYLE } from './chart-theme'

export interface WOTCData {
  captured: number
  inReview: number
  unclaimed: number
}

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export default function WOTCTracker({ data }: { data: WOTCData }) {
  const slices = [
    { name: 'Captured', value: data.captured, color: CHART.positive },
    { name: 'In review', value: data.inReview, color: CHART.caution },
    { name: 'Unclaimed', value: data.unclaimed, color: CHART.neutral },
  ].filter((s) => s.value > 0)

  const total = data.captured + data.inReview + data.unclaimed

  if (total === 0) {
    return <p className="py-16 text-center text-sm text-muted">No WOTC-eligible hires yet.</p>
  }

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={slices}
            dataKey="value"
            nameKey="name"
            innerRadius={62}
            outerRadius={88}
            paddingAngle={2}
            stroke="#FFFFFF"
            strokeWidth={2}
          >
            {slices.map((s) => (
              <Cell key={s.name} fill={s.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number) => fmt(value)} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, color: '#6B7280' }}
            formatter={(name: string) => {
              const slice = slices.find((s) => s.name === name)
              return `${name} · ${slice ? fmt(slice.value) : ''}`
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute left-1/2 top-[104px] -translate-x-1/2 text-center">
        <p className="font-mono text-lg font-semibold text-ink">{fmt(total)}</p>
        <p className="text-[11px] text-muted">total eligible</p>
      </div>
    </div>
  )
}
