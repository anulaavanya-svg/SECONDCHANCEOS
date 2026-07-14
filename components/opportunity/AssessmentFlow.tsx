'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Card, { CardHeader } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Notification'

interface ClientItem {
  id: string
  kind: 'likert' | 'interest' | 'sjt' | 'task'
  prompt: string
  scale?: 'likert5'
  options?: string[]
}

const LIKERT_LABELS = ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree']

export default function AssessmentFlow() {
  const router = useRouter()
  const { notify } = useToast()
  const [items, setItems] = useState<ClientItem[] | null>(null)
  const [responses, setResponses] = useState<Record<string, number>>({})
  const [firstGen, setFirstGen] = useState(false)
  const [needBlindOnly, setNeedBlindOnly] = useState(false)
  const [maxCostUsd, setMaxCostUsd] = useState('')
  const [locationState, setLocationState] = useState('')
  const [weeklyHours, setWeeklyHours] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/opportunitygraph/instrument')
      .then(async (r) => {
        if (!r.ok) throw new Error('Could not load the assessment.')
        const data = await r.json()
        setItems(data.items)
      })
      .catch((e) => setError(e.message))
  }, [])

  const answered = Object.keys(responses).length
  const total = items?.length ?? 0
  const progress = total ? Math.round((answered / total) * 100) : 0

  const grouped = useMemo(() => {
    const list = items ?? []
    return {
      scale: list.filter((i) => i.scale === 'likert5' && i.kind !== 'interest'),
      interest: list.filter((i) => i.kind === 'interest'),
      choice: list.filter((i) => i.kind === 'sjt' || i.kind === 'task'),
    }
  }, [items])

  function setAnswer(id: string, value: number) {
    setResponses((prev) => ({ ...prev, [id]: value }))
  }

  async function submit() {
    if (answered < 5) {
      setError('Please answer more questions before submitting.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const constraints: Record<string, unknown> = { firstGen, needBlindOnly }
      if (maxCostUsd) constraints.maxCostUsd = Number(maxCostUsd)
      if (locationState) constraints.locationState = locationState
      if (weeklyHours) constraints.weeklyHours = Number(weeklyHours)

      const res = await fetch('/api/opportunitygraph/assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses, constraints }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Submission failed.')
      }
      notify('Your potential profile is ready.', 'success')
      router.push('/employee/opportunity')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed.')
    } finally {
      setSubmitting(false)
    }
  }

  if (error && !items) {
    return <p className="p-6 text-sm text-red-700">{error}</p>
  }
  if (!items) return <Spinner label="Loading your assessment…" />

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-6 pb-24">
      <div>
        <h1 className="font-display text-xl font-bold text-ink">Human Potential Assessment</h1>
        <p className="text-sm text-muted">
          There are no right or wrong answers here — we measure how you think, work, and stay
          motivated. Sensitive information is never used to score you.
        </p>
      </div>

      {/* Sticky progress */}
      <div className="sticky top-0 z-10 -mx-6 border-y border-line bg-bg/90 px-6 py-2 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} />
          </div>
          <span className="font-mono text-xs text-muted">
            {answered}/{total}
          </span>
        </div>
      </div>

      {/* Self-report scales */}
      <Card>
        <CardHeader title="About how you work" subtitle="Rate how much each statement sounds like you." />
        <div className="space-y-5">
          {grouped.scale.map((item) => (
            <LikertRow key={item.id} item={item} value={responses[item.id]} onChange={setAnswer} />
          ))}
        </div>
      </Card>

      {/* Interests */}
      <Card>
        <CardHeader title="What you enjoy" subtitle="Rate how much you'd like each kind of work." />
        <div className="space-y-5">
          {grouped.interest.map((item) => (
            <LikertRow key={item.id} item={item} value={responses[item.id]} onChange={setAnswer} />
          ))}
        </div>
      </Card>

      {/* Situational + reasoning */}
      <Card>
        <CardHeader title="How you'd handle it" subtitle="Pick the answer closest to what you'd really do." />
        <div className="space-y-5">
          {grouped.choice.map((item) => (
            <ChoiceRow key={item.id} item={item} value={responses[item.id]} onChange={setAnswer} />
          ))}
        </div>
      </Card>

      {/* Context (optional, never penalizes) */}
      <Card>
        <CardHeader
          title="Your situation (optional)"
          subtitle="Used only to find opportunities you can actually access — never to lower your scores."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-muted">Most I can pay out of pocket ($)</span>
            <input
              type="number"
              value={maxCostUsd}
              onChange={(e) => setMaxCostUsd(e.target.value)}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              placeholder="0"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted">Hours/week available</span>
            <input
              type="number"
              value={weeklyHours}
              onChange={(e) => setWeeklyHours(e.target.value)}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              placeholder="10"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted">State (2-letter)</span>
            <input
              type="text"
              maxLength={2}
              value={locationState}
              onChange={(e) => setLocationState(e.target.value.toUpperCase())}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm uppercase focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              placeholder="TX"
            />
          </label>
          <div className="flex flex-col justify-center gap-2">
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={firstGen} onChange={(e) => setFirstGen(e.target.checked)} />
              First-generation student
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={needBlindOnly}
                onChange={(e) => setNeedBlindOnly(e.target.checked)}
              />
              Only show fully-funded options
            </label>
          </div>
        </div>
      </Card>

      {error && <p className="text-sm text-red-700">{error}</p>}

      {/* Sticky submit */}
      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-surface/95 p-4 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
          <span className="text-xs text-muted">{answered} of {total} answered</span>
          <Button onClick={submit} loading={submitting} disabled={answered < 5}>
            See my potential profile →
          </Button>
        </div>
      </div>
    </div>
  )
}

function LikertRow({
  item,
  value,
  onChange,
}: {
  item: ClientItem
  value?: number
  onChange: (id: string, v: number) => void
}) {
  return (
    <div>
      <p className="mb-2 text-sm text-ink">{item.prompt}</p>
      <div className="grid grid-cols-5 gap-1">
        {LIKERT_LABELS.map((label, i) => {
          const v = i + 1
          const active = value === v
          return (
            <button
              key={v}
              onClick={() => onChange(item.id, v)}
              className={`rounded-lg border px-1 py-2 text-[11px] leading-tight transition-colors ${
                active
                  ? 'border-primary bg-primary/[0.08] text-primary'
                  : 'border-line text-muted hover:bg-bg'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ChoiceRow({
  item,
  value,
  onChange,
}: {
  item: ClientItem
  value?: number
  onChange: (id: string, v: number) => void
}) {
  return (
    <div>
      <p className="mb-2 text-sm text-ink">{item.prompt}</p>
      <div className="space-y-1.5">
        {(item.options ?? []).map((label, i) => {
          const active = value === i
          return (
            <button
              key={i}
              onClick={() => onChange(item.id, i)}
              className={`block w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                active ? 'border-primary bg-primary/[0.08] text-primary' : 'border-line text-ink hover:bg-bg'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
