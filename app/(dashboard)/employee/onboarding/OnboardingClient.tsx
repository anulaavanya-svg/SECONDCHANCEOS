'use client'

import { useState } from 'react'
import PhaseChecklist, { ProgressRing, TaskItem } from '@/components/onboarding/PhaseChecklist'
import MentorPanel from '@/components/onboarding/MentorPanel'
import OnboardingTimeline from '@/components/onboarding/OnboardingTimeline'
import { useToast } from '@/components/ui/Notification'

const PHASES = [
  { phase: 'day1', title: 'Day 1 — Orientation', subtitle: 'Get grounded. Meet the people in your corner.' },
  { phase: 'd1_30', title: 'Days 1-30 — Stabilization', subtitle: 'Build your routine. Learn where support lives.' },
  { phase: 'd30_60', title: 'Days 30-60 — Growth', subtitle: 'Set goals. Get feedback. Find your footing.' },
  { phase: 'd60_90', title: 'Days 60-90 — Advancement', subtitle: "You're building real momentum. Plan what's next." },
]

const STAGE_LABELS: Record<string, string> = {
  stabilization: 'Stabilization',
  growth: 'Growth',
  advancement: 'Advancement',
  complete: 'Program complete',
}

const STAGE_TO_PHASE: Record<string, string> = {
  stabilization: 'd1_30',
  growth: 'd30_60',
  advancement: 'd60_90',
}

export default function OnboardingClient(props: {
  employeeId: string
  firstName: string
  day: number
  stage: string
  tasks: TaskItem[]
  mentorName: string | null
  lastContactDate: string | null
  lastChannel: string | null
}) {
  const { notify } = useToast()
  const [tasks, setTasks] = useState(props.tasks)

  const done = tasks.filter((t) => t.isComplete).length
  const percent = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0
  const currentPhase = props.day <= 1 ? 'day1' : STAGE_TO_PHASE[props.stage] ?? 'd60_90'

  async function toggleTask(task: TaskItem, isComplete: boolean) {
    // Optimistic update; roll back on failure
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, isComplete } : t)))
    const res = await fetch(`/api/employees/${props.employeeId}/onboarding`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: task.id, isComplete }),
    })
    if (!res.ok) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, isComplete: !isComplete } : t)))
      notify('Could not save that change — try again.', 'error')
    } else if (isComplete) {
      notify('Nice work — task complete! 🎉')
    }
  }

  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="font-display text-xl font-bold text-ink">
          Welcome back, {props.firstName}
        </h1>
        <p className="text-sm text-muted">Your 90-day plan, one step at a time.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <div className="rounded-card border border-line bg-surface p-5 shadow-card">
            <ProgressRing
              percent={percent}
              day={props.day}
              stage={STAGE_LABELS[props.stage] ?? props.stage}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {PHASES.map((p) => (
              <PhaseChecklist
                key={p.phase}
                title={p.title}
                subtitle={p.subtitle}
                tasks={tasks.filter((t) => t.phase === p.phase)}
                currentPhase={p.phase === currentPhase}
                onToggle={toggleTask}
              />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <MentorPanel
            mentorName={props.mentorName}
            lastContactDate={props.lastContactDate}
            lastChannel={props.lastChannel}
          />
          <OnboardingTimeline day={props.day} />
        </div>
      </div>
    </div>
  )
}
