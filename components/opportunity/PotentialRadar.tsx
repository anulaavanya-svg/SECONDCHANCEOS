'use client'

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { CHART, TOOLTIP_STYLE } from '@/components/charts/chart-theme'

export interface RadarDatum {
  dimension: string
  value: number
}

export default function PotentialRadar({ data }: { data: RadarDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <RadarChart data={data} margin={{ top: 12, right: 24, bottom: 12, left: 24 }}>
        <PolarGrid stroke={CHART.grid} />
        <PolarAngleAxis dataKey="dimension" tick={{ fill: CHART.axis, fontSize: 11 }} />
        <PolarRadiusAxis domain={[0, 100]} tick={{ fill: CHART.axis, fontSize: 10 }} axisLine={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [`${v}`, 'Score']} />
        <Radar
          name="Potential"
          dataKey="value"
          stroke={CHART.program}
          fill={CHART.program}
          fillOpacity={0.25}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
