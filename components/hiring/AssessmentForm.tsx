'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'

const DIMENSIONS = [
  { key: 'skillsScore', label: 'Skills', hint: 'Role-relevant abilities, certifications, hands-on aptitude' },
  { key: 'reliabilityScore', label: 'Reliability', hint: 'Work history consistency, references, follow-through' },
  { key: 'growthScore', label: 'Growth', hint: 'Learning orientation, training completed, trajectory' },
  { key: 'readinessScore', label: 'Readiness', hint: 'Stability factors, transportation, availability' },
] as const

type ScoreKey = (typeof DIMENSIONS)[number]['key']

export default function AssessmentForm({
  candidateId,
  onSaved,
  onCancel,
}: {
  candidateId: string
  onSaved: () => void
  onCancel: () => void
}) {
  const [scores, setScores] = useState<Record<ScoreKey, number>>({
    skillsScore: 60,
    reliabilityScore: 60,
    growthScore: 60,
    readinessScore: 60,
  })
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const composite =
    scores.skillsScore * 0.3 +
    scores.reliabilityScore * 0.3 +
    scores.growthScore * 0.2 +
    scores.readinessScore * 0.2

  async function submit() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/candidates/${candidateId}/score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...scores, notes }),
      })
      if (!res.ok) throw new Error('Could not save the assessment.')
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      {DIMENSIONS.map((d) => (
        <div key={d.key}>
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor={d.key} className="text-sm font-medium text-ink">
              {d.label}
            </label>
            <span className="font-mono text-sm text-primary">{scores[d.key]}</span>
          </div>
          <input
            id={d.key}
            type="range"
            min={0}
            max={100}
            value={scores[d.key]}
            onChange={(e) => setScores((s) => ({ ...s, [d.key]: Number(e.target.value) }))}
            className="w-full accent-[#1D3557]"
          />
          <p className="mt-0.5 text-xs text-muted">{d.hint}</p>
        </div>
      ))}

      <div className="flex items-center justify-between rounded-lg border border-line bg-bg/60 px-4 py-2.5">
        <span className="text-sm font-medium text-ink">Composite (weighted)</span>
        <span className="font-mono text-lg font-semibold text-primary">{composite.toFixed(1)}</span>
      </div>

      <Textarea
        label="Notes"
        name="notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Evidence behind the scores — competencies observed, references, certifications…"
      />

      <p className="rounded-lg border border-line bg-bg/60 px-3 py-2 text-xs text-muted">
        Scoring is based on competencies only. Criminal history adjudication is handled separately
        by your compliance process.
      </p>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={submit} loading={saving}>
          Save assessment
        </Button>
      </div>
    </div>
  )
}
