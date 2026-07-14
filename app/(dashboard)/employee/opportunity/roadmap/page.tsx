'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Card, { CardHeader } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import RoadmapTimeline, { type RoadmapStep, type StepStatus } from '@/components/opportunity/RoadmapTimeline'

interface Roadmap {
  id: string
  title: string
  summary: string
  matchScore: number
  horizonMonths: number
  career: { title: string; slug: string }
  steps: RoadmapStep[]
}

export default function RoadmapPage() {
  const [roadmaps, setRoadmaps] = useState<Roadmap[] | null>(null)
  const [pendingStep, setPendingStep] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/opportunitygraph/roadmap')
      .then((r) => r.json())
      .then((d) => setRoadmaps(d.roadmaps ?? []))
      .catch(() => setRoadmaps([]))
  }, [])

  async function updateStep(stepId: string, status: StepStatus) {
    setPendingStep(stepId)
    // Optimistic update.
    setRoadmaps((prev) =>
      prev
        ? prev.map((r) => ({
            ...r,
            steps: r.steps.map((s) => (s.id === stepId ? { ...s, status } : s)),
          }))
        : prev
    )
    try {
      await fetch(`/api/opportunitygraph/steps/${stepId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
    } finally {
      setPendingStep(null)
    }
  }

  if (!roadmaps) return <Spinner label="Loading your roadmaps…" />

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">My roadmaps</h1>
          <p className="text-sm text-muted">
            Every step is a concrete, affordable action — check them off as you go.
          </p>
        </div>
        <Link href="/employee/opportunity">
          <Button variant="secondary">← Back to matches</Button>
        </Link>
      </div>

      {roadmaps.length === 0 ? (
        <EmptyState
          icon="🗺️"
          title="No roadmaps yet"
          message="Pick a career match and build a roadmap to see your step-by-step path here."
          action={
            <Link href="/employee/opportunity">
              <Button>See my matches</Button>
            </Link>
          }
        />
      ) : (
        roadmaps.map((r) => {
          const done = r.steps.filter((s) => s.status === 'DONE').length
          const pct = r.steps.length ? Math.round((done / r.steps.length) * 100) : 0
          return (
            <Card key={r.id}>
              <CardHeader
                title={r.title}
                subtitle={r.summary}
                action={<Badge tone="default">{Math.round(r.matchScore)}% match</Badge>}
              />
              <div className="mb-4 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg">
                  <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="font-mono text-xs text-muted">
                  {done}/{r.steps.length} done · ~{r.horizonMonths} mo
                </span>
              </div>
              <RoadmapTimeline steps={r.steps} onUpdateStep={updateStep} pendingStepId={pendingStep} />
            </Card>
          )
        })
      )}
    </div>
  )
}
