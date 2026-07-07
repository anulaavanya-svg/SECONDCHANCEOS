'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { CHART, TOOLTIP_STYLE } from './chart-theme'

export interface TrendPoint {
  wave: string
  engagement?: number | null
  psychSafety?: number | null
}

// 1-5 scale trends across survey waves (engagement + psychological safety)
export default function EngagementTrend({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -24 }}>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        <XAxis dataKey="wave" stroke={CHART.axis} fontSize={12} tickLine={false} axisLine={{ stroke: CHART.grid }} />
        <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} stroke={CHART.axis} fontSize={12} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => v.toFixed(2)} />
        <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, color: '#6B7280' }} />
        <Line
          name="Engagement"
          type="monotone"
          dataKey="engagement"
          stroke={CHART.program}
          strokeWidth={2}
          dot={{ r: 4, fill: CHART.program, strokeWidth: 0 }}
          connectNulls
        />
        <Line
          name="Psychological safety"
          type="monotone"
          dataKey="psychSafety"
          stroke={CHART.positive}
          strokeWidth={2}
          dot={{ r: 4, fill: CHART.positive, strokeWidth: 0 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
