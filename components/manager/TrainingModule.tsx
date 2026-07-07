'use client'

import Badge from '@/components/ui/Badge'

export interface TrainingModuleItem {
  id: string
  title: string
  description: string | null
  completed: boolean
  completedAt: string | null
}

export default function TrainingModule({ modules }: { modules: TrainingModuleItem[] }) {
  if (modules.length === 0) {
    return <p className="text-sm text-muted">No training modules assigned yet.</p>
  }

  return (
    <div className="space-y-2">
      {modules.map((m) => (
        <div
          key={m.id}
          className="flex items-start justify-between gap-3 rounded-card border border-line bg-surface p-4 shadow-card"
        >
          <div>
            <p className="text-sm font-semibold text-ink">{m.title}</p>
            {m.description && <p className="mt-0.5 text-xs text-muted">{m.description}</p>}
          </div>
          {m.completed ? (
            <Badge tone="success">
              Completed{m.completedAt ? ` ${new Date(m.completedAt).toLocaleDateString()}` : ''}
            </Badge>
          ) : (
            <Badge tone="warn">Not started</Badge>
          )}
        </div>
      ))}
    </div>
  )
}
