'use client'

import { useCallback, useEffect, useState } from 'react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import { Textarea } from '@/components/ui/Input'

interface Question {
  key: string
  text: string
  type: 'scale' | 'text'
}

interface Survey {
  id: string
  title: string
  waveLabel: string | null
  questionCount: number
  questions: Question[]
  alreadyResponded: boolean
}

const WAVE_LABELS: Record<string, string> = {
  day_14: 'Day 14',
  day_30: 'Day 30',
  day_60: 'Day 60',
  day_90: 'Day 90',
}

export default function SurveysPage() {
  const [surveys, setSurveys] = useState<Survey[] | null>(null)
  const [active, setActive] = useState<Survey | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    fetch('/api/surveys')
      .then(async (r) => {
        if (!r.ok) throw new Error('Could not load surveys.')
        setSurveys(await r.json())
      })
      .catch((e) => setError(e.message))
  }, [])

  useEffect(load, [load])

  if (error) {
    return (
      <div className="p-6">
        <EmptyState icon="⚠️" title="Surveys unavailable" message={error} />
      </div>
    )
  }
  if (!surveys) return <Spinner label="Loading surveys…" />

  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="font-display text-xl font-bold text-ink">Pulse Surveys</h1>
        <p className="text-sm text-muted">
          Quick, anonymous check-ins. Your honest answers shape how the program supports you.
        </p>
      </div>

      {surveys.length === 0 ? (
        <EmptyState icon="📝" title="No surveys right now" message="New pulse surveys appear here as you reach each program milestone." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {surveys.map((s) => (
            <Card key={s.id} className="flex flex-col">
              <div className="mb-2 flex items-center gap-2">
                {s.waveLabel && <Badge>{WAVE_LABELS[s.waveLabel] ?? s.waveLabel}</Badge>}
                {s.alreadyResponded && <Badge tone="success">Submitted</Badge>}
              </div>
              <h3 className="font-display text-sm font-semibold text-ink">{s.title}</h3>
              <p className="mt-1 flex-1 text-sm text-muted">
                {s.questionCount} questions · about {Math.max(2, Math.ceil(s.questionCount * 0.6))}{' '}
                minutes
              </p>
              <Button
                className="mt-4 self-start"
                variant={s.alreadyResponded ? 'secondary' : 'primary'}
                disabled={s.alreadyResponded}
                onClick={() => {
                  setSubmitted(false)
                  setActive(s)
                }}
              >
                {s.alreadyResponded ? 'Completed' : 'Start survey'}
              </Button>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!active}
        onClose={() => setActive(null)}
        title={submitted ? undefined : active?.title}
      >
        {active &&
          (submitted ? (
            <div className="py-6 text-center">
              <div className="mb-3 text-3xl">💚</div>
              <h3 className="font-display text-lg font-semibold text-ink">Thanks!</h3>
              <p className="mt-1 text-sm text-muted">
                Your responses were submitted anonymously to your program team.
              </p>
              <Button className="mt-5" onClick={() => setActive(null)}>
                Done
              </Button>
            </div>
          ) : (
            <SurveyForm
              survey={active}
              onSubmitted={() => {
                setSubmitted(true)
                load()
              }}
            />
          ))}
      </Modal>
    </div>
  )
}

function SurveyForm({ survey, onSubmitted }: { survey: Survey; onSubmitted: () => void }) {
  const [answers, setAnswers] = useState<Record<string, number | string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const scaleQuestions = survey.questions.filter((q) => q.type === 'scale')
  const answeredScales = scaleQuestions.filter((q) => typeof answers[q.key] === 'number')
  const ready = answeredScales.length === scaleQuestions.length

  async function submit() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/surveys/${survey.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses: answers }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Could not submit your responses.')
      }
      onSubmitted()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      {survey.questions.map((q, i) => (
        <div key={q.key}>
          <p className="mb-2 text-sm font-medium text-ink">
            <span className="mr-1.5 font-mono text-xs text-muted">{i + 1}.</span>
            {q.text}
          </p>
          {q.type === 'scale' ? (
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setAnswers((a) => ({ ...a, [q.key]: n }))}
                  className={`h-10 w-10 rounded-lg border text-sm font-medium transition-colors ${
                    answers[q.key] === n
                      ? 'border-primary bg-primary text-white'
                      : 'border-line bg-white text-ink hover:border-primary/40'
                  }`}
                >
                  {n}
                </button>
              ))}
              <span className="ml-2 self-center text-[11px] text-muted">
                1 = strongly disagree · 5 = strongly agree
              </span>
            </div>
          ) : (
            <Textarea
              value={(answers[q.key] as string) ?? ''}
              onChange={(e) => setAnswers((a) => ({ ...a, [q.key]: e.target.value }))}
              placeholder="Your thoughts (optional)…"
            />
          )}
        </div>
      ))}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center justify-between border-t border-line pt-4">
        <p className="text-xs text-muted">Responses are reported in aggregate only.</p>
        <Button onClick={submit} loading={saving} disabled={!ready}>
          Submit
        </Button>
      </div>
    </div>
  )
}
