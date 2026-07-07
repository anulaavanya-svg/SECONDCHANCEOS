'use client'

import { useMemo, useState } from 'react'
import Button from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Notification'
import { decisionTrees, ISSUE_TYPES } from '@/lib/decision-trees'

interface EmployeeOption {
  id: string
  name: string
}

export default function DecisionTree({ employees }: { employees: EmployeeOption[] }) {
  const { notify } = useToast()
  const [issueType, setIssueType] = useState<string>(ISSUE_TYPES[0])
  const [path, setPath] = useState<string[]>(['start'])
  const [logging, setLogging] = useState(false)
  const [employeeId, setEmployeeId] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const tree = decisionTrees[issueType]
  const nodeId = path[path.length - 1]
  const node = tree.nodes[nodeId]
  const isTerminal = node.options.length === 0

  const breadcrumb = useMemo(
    () =>
      path.map((id) => {
        const text = tree.nodes[id].text
        return text.length > 42 ? text.slice(0, 42) + '…' : text
      }),
    [path, tree]
  )

  function reset(nextIssue?: string) {
    if (nextIssue) setIssueType(nextIssue)
    setPath(['start'])
    setLogging(false)
    setNote('')
  }

  async function logOutcome() {
    if (!employeeId) {
      notify('Choose the employee this case is about.', 'error')
      return
    }
    setSaving(true)
    const res = await fetch('/api/manager-actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeId,
        issueType,
        decisionPath: path,
        resolutionNote: note,
        isResolved: true,
      }),
    })
    setSaving(false)
    if (res.ok) {
      notify('Outcome logged. The documentation trail keeps this fair and defensible.')
      reset()
    } else {
      notify('Could not log the outcome.', 'error')
    }
  }

  return (
    <div className="rounded-card border border-line bg-surface p-5 shadow-card">
      {/* Issue type tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {ISSUE_TYPES.map((key) => (
          <button
            key={key}
            onClick={() => reset(key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              issueType === key
                ? 'bg-primary text-white'
                : 'bg-bg text-muted hover:bg-line/60 hover:text-ink'
            }`}
          >
            {decisionTrees[key].label}
          </button>
        ))}
      </div>

      <p className="mb-3 text-xs text-muted">{tree.description}</p>

      {/* Breadcrumb */}
      {path.length > 1 && (
        <div className="mb-3 flex flex-wrap items-center gap-1 text-[11px] text-muted">
          {breadcrumb.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-line">›</span>}
              <span className={i === breadcrumb.length - 1 ? 'font-medium text-ink' : ''}>
                {crumb}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* Current node */}
      <div
        className={`rounded-card border p-5 ${
          isTerminal
            ? nodeId === 'end'
              ? 'border-accent/40 bg-accent-light/60'
              : 'border-warn/40 bg-warn-light/60'
            : 'border-line bg-bg/60'
        }`}
      >
        <p className="text-sm leading-relaxed text-ink">{node.text}</p>

        {!isTerminal && (
          <div className="mt-4 flex flex-col gap-2">
            {node.options.map((opt) => (
              <button
                key={opt.label}
                onClick={() => setPath((p) => [...p, opt.next])}
                className="rounded-lg border border-line bg-white px-4 py-2.5 text-left text-sm font-medium text-ink transition-colors hover:border-primary/40 hover:bg-primary/[0.04]"
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {isTerminal && !logging && (
          <div className="mt-4 flex items-center gap-2">
            <Button variant={nodeId === 'end' ? 'accent' : 'primary'} onClick={() => setLogging(true)}>
              {nodeId === 'end' ? 'Resolved — log outcome' : 'Log escalation'}
            </Button>
          </div>
        )}

        {isTerminal && logging && (
          <div className="mt-4 space-y-3">
            <div>
              <label htmlFor="dt-employee" className="mb-1.5 block text-sm font-medium text-ink">
                Employee
              </label>
              <select
                id="dt-employee"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select employee…</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>
            <Textarea
              label="Resolution notes"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What was discussed, support offered, expectations set, follow-up date…"
            />
            <div className="flex gap-2">
              <Button onClick={logOutcome} loading={saving}>
                Save to record
              </Button>
              <Button variant="secondary" onClick={() => setLogging(false)}>
                Back
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => reset()}>
          ↺ Reset
        </Button>
      </div>
    </div>
  )
}
