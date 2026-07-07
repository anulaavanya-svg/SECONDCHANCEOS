'use client'

import { useEffect, useState } from 'react'
import Card, { CardHeader } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import RetentionCurve from '@/components/charts/RetentionCurve'
import EngagementTrend from '@/components/charts/EngagementTrend'

interface ResearchData {
  cohortSize: number
  sitesActive: number
  retention: { label: string; program: number | null; baseline: number }[]
  engagementTrend: { wave: string; n: number; avg: number | null }[]
  psychSafetyTrend: { wave: string; n: number; avg: number | null }[]
  managerSelfEfficacy: { pre: number; post: number; trainingCompletionRate: number }
}

export default function ResearchConsole() {
  const [data, setData] = useState<ResearchData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/analytics/research')
      .then(async (r) => {
        if (!r.ok) throw new Error('Could not load research data.')
        setData(await r.json())
      })
      .catch((e) => setError(e.message))
  }, [])

  if (error) {
    return (
      <div className="p-6">
        <EmptyState icon="⚠️" title="Console unavailable" message={error} />
      </div>
    )
  }
  if (!data) return <Spinner label="Loading anonymized aggregates…" />

  // Merge the two survey trends into one chart series by wave
  const waves = Array.from(
    new Set([...data.engagementTrend.map((t) => t.wave), ...data.psychSafetyTrend.map((t) => t.wave)])
  )
  const trend = waves.map((wave) => ({
    wave,
    engagement: data.engagementTrend.find((t) => t.wave === wave)?.avg ?? null,
    psychSafety: data.psychSafetyTrend.find((t) => t.wave === wave)?.avg ?? null,
  }))

  const efficacyDelta = data.managerSelfEfficacy.post - data.managerSelfEfficacy.pre

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Research Console</h1>
          <p className="text-sm text-muted">
            Anonymized, aggregate-only program metrics. No individual-level data is available in
            this view.
          </p>
        </div>
        <a href="/api/analytics/research?format=csv" download>
          <Button variant="secondary">↓ Export CSV</Button>
        </a>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Cohort size (n)" value={String(data.cohortSize)} />
        <StatTile label="Sites active" value={String(data.sitesActive)} />
        <StatTile
          label="Manager training"
          value={`${data.managerSelfEfficacy.trainingCompletionRate}%`}
          sub="modules completed"
        />
        <StatTile
          label="Self-efficacy Δ"
          value={`+${efficacyDelta.toFixed(1)}`}
          sub={`${data.managerSelfEfficacy.pre.toFixed(1)} → ${data.managerSelfEfficacy.post.toFixed(1)} (1-10, pre/post)`}
          positive
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Retention (aggregate)" subtitle="Program cohort vs industry baseline" />
          <RetentionCurve data={data.retention} />
        </Card>
        <Card>
          <CardHeader
            title="Survey wave trends"
            subtitle={`Engagement & psychological safety (1-5 scale) · n=${data.engagementTrend.reduce((a, t) => a + t.n, 0)} responses`}
          />
          {trend.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted">No survey responses yet.</p>
          ) : (
            <EngagementTrend data={trend} />
          )}
        </Card>
      </div>

      <p className="text-xs text-muted">
        Data governance: this console exposes only cohort-level aggregates. Names, individual
        records, and any compliance data are excluded at the query layer, not just the UI.
      </p>
    </div>
  )
}

function StatTile({
  label,
  value,
  sub,
  positive,
}: {
  label: string
  value: string
  sub?: string
  positive?: boolean
}) {
  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className={`mt-2 font-mono text-2xl font-semibold ${positive ? 'text-accent' : 'text-ink'}`}>
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </Card>
  )
}
