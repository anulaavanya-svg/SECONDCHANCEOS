'use client'

import Badge from '@/components/ui/Badge'

export interface TeamMember {
  id: string
  name: string
  jobTitle: string
  day: number
  stage: string
  mentorName: string | null
  tasksDone: number
  tasksTotal: number
  risk: 'low' | 'medium' | 'high'
  employmentStatus: string
}

const STAGE_LABELS: Record<string, string> = {
  stabilization: 'Stabilization',
  growth: 'Growth',
  advancement: 'Advancement',
  complete: 'Complete',
}

const RISK_TONES = { low: 'success', medium: 'warn', high: 'danger' } as const

export default function TeamTable({
  members,
  onSelect,
}: {
  members: TeamMember[]
  onSelect: (m: TeamMember) => void
}) {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-bg/60 text-left text-xs uppercase tracking-wider text-muted">
              <th className="px-5 py-2.5 font-medium">Employee</th>
              <th className="px-4 py-2.5 font-medium">Role</th>
              <th className="px-4 py-2.5 font-medium">Day</th>
              <th className="px-4 py-2.5 font-medium">Stage</th>
              <th className="px-4 py-2.5 font-medium">Mentor</th>
              <th className="px-4 py-2.5 font-medium">Task progress</th>
              <th className="px-5 py-2.5 font-medium">Risk</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const pct = m.tasksTotal > 0 ? Math.round((m.tasksDone / m.tasksTotal) * 100) : 0
              return (
                <tr
                  key={m.id}
                  onClick={() => onSelect(m)}
                  className="cursor-pointer border-b border-line transition-colors last:border-0 hover:bg-bg/50"
                >
                  <td className="px-5 py-3">
                    <span className="font-medium text-ink">{m.name}</span>
                    {m.employmentStatus !== 'active' && (
                      <Badge tone="neutral" className="ml-2">
                        {m.employmentStatus}
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">{m.jobTitle}</td>
                  <td className="px-4 py-3 font-mono text-ink">{m.day}</td>
                  <td className="px-4 py-3 text-muted">{STAGE_LABELS[m.stage] ?? m.stage}</td>
                  <td className="px-4 py-3 text-muted">{m.mentorName ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-line">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="font-mono text-xs text-muted">
                        {m.tasksDone}/{m.tasksTotal}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={RISK_TONES[m.risk]}>{m.risk}</Badge>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
