'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'

export interface MatchBreakdown {
  interest: number
  aptitude: number
  readiness: number
  growth: number
  values: number
  barrierPenalty: number
}

export interface CareerMatch {
  careerId: string
  slug: string
  title: string
  score: number
  breakdown: MatchBreakdown
  rationale: string[]
}

const BARS: { key: keyof MatchBreakdown; label: string }[] = [
  { key: 'interest', label: 'Interest fit' },
  { key: 'aptitude', label: 'Aptitude fit' },
  { key: 'readiness', label: 'Skill readiness' },
  { key: 'growth', label: 'Mobility potential' },
  { key: 'values', label: 'Reachability' },
]

function scoreTone(score: number): 'success' | 'default' | 'warn' {
  if (score >= 70) return 'success'
  if (score >= 50) return 'default'
  return 'warn'
}

export default function CareerMatchCard({
  match,
  onBuild,
  building,
}: {
  match: CareerMatch
  onBuild: (careerId: string) => void
  building?: boolean
}) {
  const [open, setOpen] = useState(false)
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-semibold text-ink">{match.title}</h3>
          <p className="mt-0.5 text-sm text-muted">{match.rationale[0]}</p>
        </div>
        <Badge tone={scoreTone(match.score)}>{match.score}% match</Badge>
      </div>

      <button
        onClick={() => setOpen((v) => !v)}
        className="mt-3 text-xs font-medium text-primary hover:underline"
      >
        {open ? 'Hide' : 'Why this match?'}
      </button>

      {open && (
        <div className="mt-3 space-y-2 border-t border-line pt-3">
          {BARS.map((b) => (
            <div key={b.key} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-xs text-muted">{b.label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${match.breakdown[b.key]}%` }}
                />
              </div>
              <span className="w-8 shrink-0 text-right font-mono text-xs text-ink">
                {match.breakdown[b.key]}
              </span>
            </div>
          ))}
          {match.breakdown.barrierPenalty >= 60 && (
            <p className="pt-1 text-xs text-warn">
              High entry barrier — the roadmap prioritizes funded, need-blind steps.
            </p>
          )}
          <ul className="mt-2 space-y-1">
            {match.rationale.map((r, i) => (
              <li key={i} className="flex gap-2 text-xs text-muted">
                <span className="text-accent">✓</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4">
        <Button size="sm" onClick={() => onBuild(match.careerId)} loading={building}>
          Build my roadmap →
        </Button>
      </div>
    </Card>
  )
}
