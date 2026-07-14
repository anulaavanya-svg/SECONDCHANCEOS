'use client'

import Badge from '@/components/ui/Badge'

export type StepStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE'

export interface RoadmapStep {
  id: string
  order: number
  phase: 'foundation' | 'build' | 'launch'
  kind: 'skill' | 'opportunity' | 'milestone'
  title: string
  description: string
  estWeeks: number | null
  status: StepStatus
}

const PHASES: { key: RoadmapStep['phase']; label: string; caption: string }[] = [
  { key: 'foundation', label: 'Foundation', caption: 'Build the base skills and lock in your target' },
  { key: 'build', label: 'Build', caption: 'Real experience through funded programs & internships' },
  { key: 'launch', label: 'Launch', caption: 'Package your work and apply in' },
]

const KIND_ICON: Record<RoadmapStep['kind'], string> = {
  skill: '📚',
  opportunity: '🎯',
  milestone: '🚩',
}

const NEXT: Record<StepStatus, StepStatus> = {
  NOT_STARTED: 'IN_PROGRESS',
  IN_PROGRESS: 'DONE',
  DONE: 'NOT_STARTED',
}

const STATUS_LABEL: Record<StepStatus, string> = {
  NOT_STARTED: 'Not started',
  IN_PROGRESS: 'In progress',
  DONE: 'Done',
}

const STATUS_TONE: Record<StepStatus, 'neutral' | 'info' | 'success'> = {
  NOT_STARTED: 'neutral',
  IN_PROGRESS: 'info',
  DONE: 'success',
}

export default function RoadmapTimeline({
  steps,
  onUpdateStep,
  pendingStepId,
}: {
  steps: RoadmapStep[]
  onUpdateStep: (stepId: string, status: StepStatus) => void
  pendingStepId?: string | null
}) {
  return (
    <div className="space-y-6">
      {PHASES.map((phase) => {
        const phaseSteps = steps.filter((s) => s.phase === phase.key)
        if (phaseSteps.length === 0) return null
        return (
          <div key={phase.key}>
            <div className="mb-2 flex items-baseline gap-2">
              <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-primary">
                {phase.label}
              </h4>
              <span className="text-xs text-muted">{phase.caption}</span>
            </div>
            <ol className="space-y-2">
              {phaseSteps.map((step) => (
                <li
                  key={step.id}
                  className={`flex items-start gap-3 rounded-card border border-line bg-surface p-3 ${
                    step.status === 'DONE' ? 'opacity-70' : ''
                  }`}
                >
                  <span className="mt-0.5 text-lg leading-none">{KIND_ICON[step.kind]}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p
                        className={`text-sm font-medium text-ink ${
                          step.status === 'DONE' ? 'line-through' : ''
                        }`}
                      >
                        {step.title}
                      </p>
                      {step.estWeeks ? (
                        <span className="shrink-0 text-xs text-muted">~{step.estWeeks}w</span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-muted">{step.description}</p>
                  </div>
                  <button
                    onClick={() => onUpdateStep(step.id, NEXT[step.status])}
                    disabled={pendingStepId === step.id}
                    className="shrink-0 disabled:opacity-50"
                    title="Click to advance status"
                  >
                    <Badge tone={STATUS_TONE[step.status]}>{STATUS_LABEL[step.status]}</Badge>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        )
      })}
    </div>
  )
}
