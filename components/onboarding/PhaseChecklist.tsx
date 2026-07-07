'use client'

import { useState } from 'react'

export interface TaskItem {
  id: string
  phase: string
  title: string
  isComplete: boolean
}

export function ProgressRing({ percent, day, stage }: { percent: number; day: number; stage: string }) {
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - percent / 100)

  return (
    <div className="flex items-center gap-5">
      <div className="relative h-32 w-32">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#E1E4EA" strokeWidth="10" />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="#1E9E76"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-2xl font-bold text-ink">{percent}%</span>
          <span className="text-[11px] text-muted">complete</span>
        </div>
      </div>
      <div>
        <p className="font-display text-lg font-semibold text-ink">
          Day {day} — {stage} phase
        </p>
        <p className="mt-1 max-w-sm text-sm text-muted">
          You&apos;re building real momentum. Every task you check is a step toward your 90-day
          milestone — keep going.
        </p>
      </div>
    </div>
  )
}

export default function PhaseChecklist({
  title,
  subtitle,
  tasks,
  currentPhase,
  onToggle,
}: {
  title: string
  subtitle: string
  tasks: TaskItem[]
  currentPhase: boolean
  onToggle: (task: TaskItem, isComplete: boolean) => Promise<void>
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const done = tasks.filter((t) => t.isComplete).length

  return (
    <div
      className={`rounded-card border bg-surface p-5 shadow-card ${
        currentPhase ? 'border-accent/50 ring-1 ring-accent/20' : 'border-line'
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-sm font-semibold text-ink">{title}</h3>
          <p className="mt-0.5 text-xs text-muted">{subtitle}</p>
        </div>
        <span className="shrink-0 rounded-full bg-bg px-2 py-0.5 font-mono text-[11px] text-muted">
          {done}/{tasks.length}
        </span>
      </div>

      <ul className="space-y-2">
        {tasks.map((task) => (
          <li key={task.id}>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-bg">
              <input
                type="checkbox"
                checked={task.isComplete}
                disabled={busy === task.id}
                onChange={async (e) => {
                  setBusy(task.id)
                  await onToggle(task, e.target.checked)
                  setBusy(null)
                }}
                className="mt-0.5 h-4 w-4 rounded border-line accent-[#1E9E76]"
              />
              <span className={`text-sm ${task.isComplete ? 'text-muted line-through' : 'text-ink'}`}>
                {task.title}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}
