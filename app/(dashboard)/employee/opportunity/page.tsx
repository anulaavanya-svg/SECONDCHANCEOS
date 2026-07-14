'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Card, { CardHeader } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Notification'
import PotentialRadar from '@/components/opportunity/PotentialRadar'
import CareerMatchCard, { type CareerMatch } from '@/components/opportunity/CareerMatchCard'

interface Profile {
  fluidReasoning: number
  verbalReasoning: number
  quantReasoning: number
  conscientiousness: number
  openness: number
  adaptability: number
  growthMindset: number
  selfEfficacy: number
  intrinsicMotivation: number
  hpi: number
  confidence: number
  strengths: string[]
  growthLevers: string[]
}

const SHORT_LABEL: Record<string, string> = {
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

const DIM_ORDER = Object.keys(SHORT_LABEL)

export default function OpportunityDashboard() {
  const router = useRouter()
  const { notify } = useToast()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [matches, setMatches] = useState<CareerMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [building, setBuilding] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const pRes = await fetch('/api/opportunitygraph/profile')
        const pData = await pRes.json()
        if (!pData.profile) {
          setLoading(false)
          return
        }
        setProfile(pData.profile)
        const mRes = await fetch('/api/opportunitygraph/matches?limit=6')
        if (mRes.ok) {
          const mData = await mRes.json()
          setMatches(mData.matches ?? [])
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function buildRoadmap(careerId: string) {
    setBuilding(careerId)
    try {
      const res = await fetch('/api/opportunitygraph/roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ careerId }),
      })
      if (!res.ok) throw new Error('Could not build roadmap.')
      notify('Roadmap generated.', 'success')
      router.push('/employee/opportunity/roadmap')
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Something went wrong.', 'error')
    } finally {
      setBuilding(null)
    }
  }

  if (loading) return <Spinner label="Loading your OpportunityGraph…" />

  if (!profile) {
    return (
      <div className="p-6">
        <div className="mb-4">
          <h1 className="font-display text-xl font-bold text-ink">OpportunityGraph</h1>
          <p className="text-sm text-muted">Discover your potential and map it to real opportunities.</p>
        </div>
        <EmptyState
          icon="🧭"
          title="Start by measuring your potential"
          message="A short assessment measures how you think, work, and stay motivated — then we map it to careers, funded programs, and a step-by-step roadmap."
          action={
            <Link href="/employee/opportunity/assessment">
              <Button>Take the assessment →</Button>
            </Link>
          }
        />
      </div>
    )
  }

  const radarData = DIM_ORDER.map((k) => ({
    dimension: SHORT_LABEL[k],
    value: (profile as unknown as Record<string, number>)[k],
  }))
  const confidencePct = Math.round(profile.confidence * 100)

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Your OpportunityGraph</h1>
          <p className="text-sm text-muted">
            Potential measured across nine dimensions, mapped to careers you can actually reach.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/employee/opportunity/roadmap">
            <Button variant="secondary">My roadmaps</Button>
          </Link>
          <Link href="/employee/opportunity/assessment">
            <Button variant="secondary">Retake assessment</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* HPI + radar */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Human Potential Index"
            subtitle={`Composite of nine developable dimensions · measurement confidence ${confidencePct}%`}
            action={<Badge tone="default">HPI {profile.hpi}</Badge>}
          />
          <PotentialRadar data={radarData} />
          {confidencePct < 60 && (
            <p className="mt-2 text-xs text-warn">
              Confidence is modest — answering more of the assessment sharpens your profile.
            </p>
          )}
        </Card>

        {/* Strengths & levers */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Your strengths" />
            <ul className="space-y-2">
              {profile.strengths.map((s) => (
                <li key={s} className="flex items-center gap-2 text-sm text-ink">
                  <span className="text-accent">▲</span>
                  {SHORT_LABEL[s] ?? s}
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardHeader title="High-leverage to develop" />
            <ul className="space-y-2">
              {profile.growthLevers.map((s) => (
                <li key={s} className="flex items-center gap-2 text-sm text-ink">
                  <span className="text-warn">◆</span>
                  {SHORT_LABEL[s] ?? s}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">
              These aren't weaknesses — they're where growth moves your index the most.
            </p>
          </Card>
        </div>
      </div>

      {/* Career matches */}
      <div>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-base font-semibold text-ink">Career matches</h2>
          <span className="text-xs text-muted">Ranked by fit, mobility, and reachability</span>
        </div>
        {matches.length === 0 ? (
          <EmptyState icon="🔍" title="No matches yet" message="Try retaking the assessment." />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {matches.map((m) => (
              <CareerMatchCard
                key={m.careerId}
                match={m}
                onBuild={buildRoadmap}
                building={building === m.careerId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
