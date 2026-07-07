'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts'
import { CHART, TOOLTIP_STYLE } from './chart-theme'

export interface FunnelPoint {
  label: string
  completion: number
}

export default function OnboardingFunnel({ data }: { data: FunnelPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 16, right: 16, bottom: 0, left: -16 }} barCategoryGap="30%">
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
          cursor={{ fill: 'rgba(18,23,43,0.04)' }}
          formatter={(value: number) => [`${value}%`, 'Tasks complete']}
        />
        <Bar dataKey="completion" name="Tasks complete" fill={CHART.program} radius={[4, 4, 0, 0]}>
          <LabelList dataKey="completion" position="top" formatter={(v: number) => `${v}%`} style={{ fontSize: 11, fill: '#6B7280' }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
