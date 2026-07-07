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

export interface RetentionPoint {
  label: string
  program: number | null
  baseline: number
}

export default function RetentionCurve({ data }: { data: RetentionPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        <XAxis dataKey="label" stroke={CHART.axis} fontSize={12} tickLine={false} axisLine={{ stroke: CHART.grid }} />
        <YAxis
          domain={[0, 100]}
          stroke={CHART.axis}
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value: number, name: string) => [`${value}%`, name]}
        />
        <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, color: '#6B7280' }} />
        <Line
          name="Program cohort"
          type="monotone"
          dataKey="program"
          stroke={CHART.program}
          strokeWidth={2}
          dot={{ r: 4, fill: CHART.program, strokeWidth: 0 }}
          connectNulls
        />
        <Line
          name="Standard onboarding"
          type="monotone"
          dataKey="baseline"
          stroke={CHART.baseline}
          strokeWidth={2}
          strokeDasharray="5 4"
          dot={{ r: 4, fill: CHART.baseline, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
