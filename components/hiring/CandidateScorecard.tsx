'use client'

import Badge from '@/components/ui/Badge'
import { Assessment } from './types'

const DIMENSIONS: { key: keyof Assessment; label: string; weight: string }[] = [
  { key: 'skillsScore', label: 'Skills', weight: '30%' },
  { key: 'reliabilityScore', label: 'Reliability', weight: '30%' },
  { key: 'growthScore', label: 'Growth', weight: '20%' },
  { key: 'readinessScore', label: 'Readiness', weight: '20%' },
]

const REC_LABELS: Record<string, { label: string; tone: 'success' | 'info' | 'warn' }> = {
  recommended: { label: 'Recommended', tone: 'success' },
  recommended_with_support: { label: 'Recommended with support', tone: 'info' },
  needs_review: { label: 'Needs review', tone: 'warn' },
}

export default function CandidateScorecard({ assessment }: { assessment: Assessment }) {
  const rec = REC_LABELS[assessment.recommendation] ?? {
    label: assessment.recommendation,
    tone: 'info' as const,
  }

  return (
    <div className="rounded-card border border-line bg-bg/50 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted">Composite score</p>
          <p className="font-mono text-2xl font-semibold text-ink">
            {assessment.compositeScore.toFixed(1)}
            <span className="ml-1 text-sm font-normal text-muted">/ 100</span>
          </p>
        </div>
        <Badge tone={rec.tone}>{rec.label}</Badge>
      </div>

      <div className="space-y-3">
        {DIMENSIONS.map((d) => {
          const value = assessment[d.key] as number
          return (
            <div key={d.key}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-ink">
                  {d.label} <span className="text-muted">· {d.weight}</span>
                </span>
                <span className="font-mono text-muted">{value}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      {assessment.notes && (
        <p className="mt-4 border-t border-line pt-3 text-sm text-muted">{assessment.notes}</p>
      )}
    </div>
  )
}
