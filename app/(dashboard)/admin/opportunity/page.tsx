'use client'

import { useEffect, useState } from 'react'
import Card, { CardHeader } from '@/components/ui/Card'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'

interface Insights {
  cohortSize: number
  suppressed: boolean
  message?: string
  meanHpi?: number
  meanConfidence?: number
  dimensionMeans?: Record<string, number>
  hpiDistribution?: { band: string; count: number }[]
  riasecMean?: Record<string, number>
  underservedReachPct?: number
  roadmapsGenerated?: number
  meanTargetWageUsd?: number
  stepCompletionPct?: number
}

const DIM_LABEL: Record<string, string> = {
  fluidReasoning: 'Problem-solving',
  verbalReasoning: 'Verbal',
  quantReasoning: 'Quant',
  conscientiousness: 'Reliability',
  openness: 'Curiosity',
  adaptability: 'Adaptability',
  growthMindset: 'Growth mindset',
  selfEfficacy: 'Self-efficacy',
  intrinsicMotivation: 'Motivation',
}

export default function OpportunityInsights() {
  const [data, setData] = useState<Insights | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/opportunitygraph/insights')
      .then(async (r) => {
        if (!r.ok) throw new Error('Could not load insights.')
        setData(await r.json())
      })
      .catch((e) => setError(e.message))
  }, [])

  if (error) return <div className="p-6"><EmptyState icon="⚠️" title="Unavailable" message={error} /></div>
  if (!data) return <Spinner label="Loading mobility insights…" />

  if (data.suppressed) {
    return (
      <div className="p-6">
        <h1 className="mb-4 font-display text-xl font-bold text-ink">OpportunityGraph Insights</h1>
        <EmptyState icon="🔒" title="Aggregates suppressed" message={data.message} />
      </div>
    )
  }

  const maxDist = Math.max(1, ...(data.hpiDistribution ?? []).map((d) => d.count))

  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="font-display text-xl font-bold text-ink">OpportunityGraph Insights</h1>
        <p className="text-sm text-muted">
          Anonymized, aggregate-only mobility metrics — no individual profiles are ever shown.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Profiles (n)" value={String(data.cohortSize)} />
        <StatTile label="Mean HPI" value={String(data.meanHpi ?? '—')} />
        <StatTile label="Underserved reach" value={`${data.underservedReachPct ?? 0}%`} sub="first-gen / funded-only" />
        <StatTile label="Roadmap step completion" value={`${data.stepCompletionPct ?? 0}%`} positive />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="HPI distribution" subtitle="How measured potential is spread across the cohort" />
          <div className="space-y-2">
            {(data.hpiDistribution ?? []).map((d) => (
              <div key={d.band} className="flex items-center gap-3">
                <span className="w-16 shrink-0 font-mono text-xs text-muted">{d.band}</span>
                <div className="h-4 flex-1 overflow-hidden rounded bg-bg">
                  <div className="h-full rounded bg-primary" style={{ width: `${(d.count / maxDist) * 100}%` }} />
                </div>
                <span className="w-6 text-right font-mono text-xs text-ink">{d.count}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Cohort dimension means" subtitle="Average potential by dimension (0-100)" />
          <div className="space-y-2">
            {Object.entries(data.dimensionMeans ?? {}).map(([k, v]) => (
              <div key={k} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-xs text-muted">{DIM_LABEL[k] ?? k}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-bg">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${v}%` }} />
                </div>
                <span className="w-8 text-right font-mono text-xs text-ink">{v}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Mobility signal"
          subtitle="Where the cohort is aiming, and how well the graph closes the distance"
        />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatTile label="Roadmaps generated" value={String(data.roadmapsGenerated ?? 0)} />
          <StatTile
            label="Mean target wage"
            value={data.meanTargetWageUsd ? `$${(data.meanTargetWageUsd / 1000).toFixed(0)}k` : '—'}
          />
          <StatTile label="Mean confidence" value={data.meanConfidence ? `${Math.round(data.meanConfidence * 100)}%` : '—'} />
        </div>
      </Card>

      <p className="text-xs text-muted">
        Data governance: this view exposes only cohort-level aggregates, suppressed below a
        k-anonymity threshold. Sensitive attributes are never inputs to any score.
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
      <p className={`mt-2 font-mono text-2xl font-semibold ${positive ? 'text-accent' : 'text-ink'}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </Card>
  )
}
