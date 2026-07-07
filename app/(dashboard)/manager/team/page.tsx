'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Modal from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Notification'
import TeamTable, { TeamMember } from '@/components/manager/TeamTable'
import { decisionTrees } from '@/lib/decision-trees'

interface ApiEmployee {
  id: string
  jobTitle: string
  hireDate: string
  onboardingStage: string
  employmentStatus: string
  user: { fullName: string } | null
  candidate: { fullName: string } | null
  mentor: { fullName: string } | null
  onboardingTasks: { isComplete: boolean }[]
  performanceMetrics: { engagementScore: number | null }[]
}

interface EmployeeDetail {
  id: string
  jobTitle: string
  user: { fullName: string } | null
  candidate: { fullName: string } | null
  onboardingTasks: { id: string; phase: string; title: string; isComplete: boolean }[]
  mentorLogs: {
    id: string
    contactDate: string
    channel: string | null
    notes: string | null
    mentor: { fullName: string }
  }[]
  managerActions: {
    id: string
    issueType: string
    resolutionNote: string | null
    isResolved: boolean
    createdAt: string
  }[]
}

function dayOf(hireDate: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(hireDate).getTime()) / 86_400_000))
}

function riskFor(e: ApiEmployee): 'low' | 'medium' | 'high' {
  const day = dayOf(e.hireDate)
  const total = e.onboardingTasks.length
  const done = e.onboardingTasks.filter((t) => t.isComplete).length
  const expected = Math.min(1, day / 90)
  const actual = total > 0 ? done / total : 0
  const engagement = e.performanceMetrics[0]?.engagementScore ?? null

  let score = 0
  if (actual < expected - 0.25) score += 2
  else if (actual < expected - 0.1) score += 1
  if (engagement !== null && engagement < 2.5) score += 2
  else if (engagement !== null && engagement < 3.2) score += 1

  if (score >= 3) return 'high'
  if (score >= 1) return 'medium'
  return 'low'
}

export default function TeamPage() {
  const { notify } = useToast()
  const [employees, setEmployees] = useState<ApiEmployee[] | null>(null)
  const [selected, setSelected] = useState<TeamMember | null>(null)
  const [detail, setDetail] = useState<EmployeeDetail | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/employees')
      .then(async (r) => {
        if (!r.ok) throw new Error('Could not load your team.')
        setEmployees(await r.json())
      })
      .catch((e) => setError(e.message))
  }, [])

  useEffect(() => {
    if (!selected) {
      setDetail(null)
      return
    }
    fetch(`/api/employees/${selected.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setDetail)
      .catch(() => {})
  }, [selected])

  if (error) {
    return (
      <div className="p-6">
        <EmptyState icon="⚠️" title="Team view unavailable" message={error} />
      </div>
    )
  }
  if (!employees) return <Spinner label="Loading your team…" />

  const members: TeamMember[] = employees.map((e) => ({
    id: e.id,
    name: e.user?.fullName ?? e.candidate?.fullName ?? 'Employee',
    jobTitle: e.jobTitle,
    day: dayOf(e.hireDate),
    stage: e.onboardingStage,
    mentorName: e.mentor?.fullName ?? null,
    tasksDone: e.onboardingTasks.filter((t) => t.isComplete).length,
    tasksTotal: e.onboardingTasks.length,
    risk: riskFor(e),
    employmentStatus: e.employmentStatus,
  }))

  const active = members.filter((m) => m.employmentStatus === 'active')

  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="font-display text-xl font-bold text-ink">My Team</h1>
        <p className="text-sm text-muted">
          {active.length} active {active.length === 1 ? 'report' : 'reports'} — onboarding status,
          mentorship, and early risk signals.
        </p>
      </div>

      {members.length === 0 ? (
        <EmptyState
          icon="👥"
          title="No direct reports yet"
          message="Employees assigned to you will appear here with their onboarding progress."
        />
      ) : (
        <TeamTable members={members} onSelect={setSelected} />
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name} variant="panel">
        {selected && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Badge>{selected.jobTitle}</Badge>
              <Badge tone="neutral">Day {selected.day}</Badge>
              <Badge tone={selected.risk === 'low' ? 'success' : selected.risk === 'medium' ? 'warn' : 'danger'}>
                {selected.risk} risk
              </Badge>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href="/manager/toolkit">
                <Button size="sm">Log decision tree</Button>
              </Link>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => notify(`Message sent to ${selected.mentorName ?? 'the mentor team'}.`)}
              >
                Message mentor
              </Button>
              <Button size="sm" variant="ghost" onClick={() => notify('Full profiles are managed by HR.', 'info')}>
                View profile
              </Button>
            </div>

            {!detail ? (
              <Spinner label="Loading details…" />
            ) : (
              <>
                <section>
                  <h3 className="mb-2 font-display text-sm font-semibold text-ink">
                    Onboarding checklist
                  </h3>
                  <ul className="space-y-1.5">
                    {detail.onboardingTasks.map((t) => (
                      <li key={t.id} className="flex items-center gap-2 text-sm">
                        <span className={t.isComplete ? 'text-accent' : 'text-line'}>
                          {t.isComplete ? '✓' : '○'}
                        </span>
                        <span className={t.isComplete ? 'text-muted' : 'text-ink'}>{t.title}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h3 className="mb-2 font-display text-sm font-semibold text-ink">Mentor log</h3>
                  {detail.mentorLogs.length === 0 ? (
                    <p className="text-sm text-muted">No mentor contact recorded yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {detail.mentorLogs.map((log) => (
                        <div key={log.id} className="rounded-lg border border-line bg-bg/50 px-3 py-2">
                          <p className="text-xs text-muted">
                            {new Date(log.contactDate).toLocaleDateString()} ·{' '}
                            {log.mentor.fullName}
                            {log.channel ? ` · ${log.channel.replace('_', ' ')}` : ''}
                          </p>
                          {log.notes && <p className="mt-1 text-sm text-ink">{log.notes}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section>
                  <h3 className="mb-2 font-display text-sm font-semibold text-ink">
                    Manager actions
                  </h3>
                  {detail.managerActions.length === 0 ? (
                    <p className="text-sm text-muted">No decision-tree cases logged.</p>
                  ) : (
                    <div className="space-y-2">
                      {detail.managerActions.map((a) => (
                        <div key={a.id} className="rounded-lg border border-line bg-bg/50 px-3 py-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-ink">
                              {decisionTrees[a.issueType]?.label ?? a.issueType}
                            </p>
                            <Badge tone={a.isResolved ? 'success' : 'warn'}>
                              {a.isResolved ? 'Resolved' : 'Open'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted">
                            {new Date(a.createdAt).toLocaleDateString()}
                          </p>
                          {a.resolutionNote && (
                            <p className="mt-1 text-sm text-muted">{a.resolutionNote}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
