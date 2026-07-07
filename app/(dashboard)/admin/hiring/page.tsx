'use client'

import { useCallback, useEffect, useState } from 'react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Notification'
import CandidatePipeline from '@/components/hiring/CandidatePipeline'
import CandidateScorecard from '@/components/hiring/CandidateScorecard'
import AssessmentForm from '@/components/hiring/AssessmentForm'
import InterviewGuide from '@/components/hiring/InterviewGuide'
import { Candidate, PIPELINE_COLUMNS } from '@/components/hiring/types'

export default function HiringPage() {
  const { notify } = useToast()
  const [candidates, setCandidates] = useState<Candidate[] | null>(null)
  const [selected, setSelected] = useState<Candidate | null>(null)
  const [scoring, setScoring] = useState(false)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/candidates')
      if (!res.ok) throw new Error('Could not load candidates.')
      const data: Candidate[] = await res.json()
      setCandidates(data)
      setSelected((prev) => (prev ? data.find((c) => c.id === prev.id) ?? null : null))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function updateStatus(candidate: Candidate, status: Candidate['status']) {
    const res = await fetch(`/api/candidates/${candidate.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      notify(
        status === 'HIRED'
          ? `${candidate.fullName} hired — 90-day onboarding plan created.`
          : `${candidate.fullName} moved to ${status.toLowerCase()}.`
      )
      await load()
    } else {
      notify('Could not update status.', 'error')
    }
  }

  if (error) {
    return (
      <div className="p-6">
        <EmptyState icon="⚠️" title="Hiring module unavailable" message={error} />
      </div>
    )
  }
  if (!candidates) return <Spinner label="Loading pipeline…" />

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Hiring Pipeline</h1>
          <p className="text-sm text-muted">
            Competency-based assessment — skills, reliability, growth, and readiness.
          </p>
        </div>
        <Button onClick={() => setAdding(true)}>+ Add candidate</Button>
      </div>

      {candidates.length === 0 ? (
        <EmptyState
          icon="🗂️"
          title="No candidates yet"
          message="Add your first candidate to start the competency-based pipeline."
          action={<Button onClick={() => setAdding(true)}>Add candidate</Button>}
        />
      ) : (
        <CandidatePipeline candidates={candidates} onSelect={setSelected} />
      )}

      {/* Candidate detail slide-over */}
      <Modal
        open={!!selected}
        onClose={() => {
          setSelected(null)
          setScoring(false)
        }}
        title={selected?.fullName}
        variant="panel"
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{selected.roleApplied}</Badge>
              <Badge tone="neutral">{selected.status}</Badge>
              {selected.certifications.map((c) => (
                <Badge key={c} tone="info">
                  {c}
                </Badge>
              ))}
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted">Email</dt>
                <dd className="text-ink">{selected.email ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted">Source</dt>
                <dd className="text-ink">{selected.source ?? '—'}</dd>
              </div>
            </dl>

            {scoring ? (
              <div>
                <h3 className="mb-3 font-display text-sm font-semibold text-ink">
                  Competency assessment
                </h3>
                <AssessmentForm
                  candidateId={selected.id}
                  onSaved={() => {
                    setScoring(false)
                    notify('Assessment saved.')
                    load()
                  }}
                  onCancel={() => setScoring(false)}
                />
              </div>
            ) : (
              <>
                {selected.assessment ? (
                  <CandidateScorecard assessment={selected.assessment} />
                ) : (
                  <p className="rounded-lg border border-dashed border-line bg-bg/50 px-4 py-3 text-sm text-muted">
                    Not yet assessed. Use the competency scoring form to evaluate this candidate.
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => setScoring(true)}>
                    {selected.assessment ? 'Re-score candidate' : 'Score this candidate'}
                  </Button>
                  {PIPELINE_COLUMNS.filter((c) => c.status !== selected.status).map((c) => (
                    <Button
                      key={c.status}
                      variant={c.status === 'REJECTED' ? 'danger' : 'secondary'}
                      size="sm"
                      onClick={() => updateStatus(selected, c.status)}
                    >
                      → {c.label}
                    </Button>
                  ))}
                </div>

                <div className="border-t border-line pt-4">
                  <h3 className="mb-3 font-display text-sm font-semibold text-ink">
                    Structured interview guide
                  </h3>
                  <InterviewGuide roleApplied={selected.roleApplied} />
                </div>

                <p className="rounded-lg border border-line bg-bg/60 px-3 py-2 text-xs text-muted">
                  Scoring is based on competencies only. Criminal history adjudication is handled
                  separately by your compliance process.
                </p>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Add candidate modal */}
      <AddCandidateModal
        open={adding}
        onClose={() => setAdding(false)}
        onAdded={() => {
          setAdding(false)
          notify('Candidate added to pipeline.')
          load()
        }}
      />
    </div>
  )
}

function AddCandidateModal({
  open,
  onClose,
  onAdded,
}: {
  open: boolean
  onClose: () => void
  onAdded: () => void
}) {
  const [form, setForm] = useState({ fullName: '', email: '', roleApplied: '', source: '', certifications: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email || undefined,
          roleApplied: form.roleApplied,
          source: form.source || undefined,
          certifications: form.certifications
            .split(',')
            .map((c) => c.trim())
            .filter(Boolean),
        }),
      })
      if (!res.ok) throw new Error('Could not add the candidate.')
      setForm({ fullName: '', email: '', roleApplied: '', source: '', certifications: '' })
      onAdded()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add candidate">
      <form onSubmit={submit} className="space-y-4">
        <Input label="Full name" name="fullName" required value={form.fullName} onChange={set('fullName')} />
        <Input label="Email (optional)" name="email" type="email" value={form.email} onChange={set('email')} />
        <Input label="Role applied for" name="roleApplied" required value={form.roleApplied} onChange={set('roleApplied')} placeholder="Assembly Technician" />
        <Input label="Source (optional)" name="source" value={form.source} onChange={set('source')} placeholder="Reentry partner, referral…" />
        <Input label="Certifications (comma-separated)" name="certifications" value={form.certifications} onChange={set('certifications')} placeholder="OSHA 10, Forklift Operator" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            Add candidate
          </Button>
        </div>
      </form>
    </Modal>
  )
}
