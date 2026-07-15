/**
 * Renders a proposed/completed desktop-automation task. When status is
 * "proposed" the user sees Approve / Reject buttons; nothing runs until they
 * approve. Completed tasks show their transcript.
 */
import type { AutomationAction, AutomationTask } from '@shared/types'
import { useApp } from '../state/store'
import { CheckIcon, CloseIcon, TerminalIcon } from './Icons'

export function AutomationCard({ task }: { task: AutomationTask }): JSX.Element {
  const { approveAutomation, rejectAutomation } = useApp()
  const pending = task.status === 'proposed'

  return (
    <div className="auto-card">
      <div className="auto-card__header">
        <TerminalIcon size={15} />
        Desktop action{task.actions.length > 1 ? `s (${task.actions.length})` : ''}
        <span className={`auto-card__status ${task.status}`}>{task.status}</span>
      </div>

      <div className="auto-card__actions">
        {task.actions.map((action, idx) => (
          <ActionRow key={idx} action={action} />
        ))}
      </div>

      {pending && (
        <div className="auto-card__footer">
          <button className="btn btn--primary" onClick={() => approveAutomation(task.id)}>
            <span className="row" style={{ gap: 6 }}>
              <CheckIcon size={15} /> Approve &amp; run
            </span>
          </button>
          <button className="btn btn--danger" onClick={() => rejectAutomation(task.id)}>
            <span className="row" style={{ gap: 6 }}>
              <CloseIcon size={15} /> Reject
            </span>
          </button>
        </div>
      )}

      {(task.result || task.error) && (
        <div className="auto-card__result">{task.error ? `Error: ${task.error}\n${task.result ?? ''}` : task.result}</div>
      )}
    </div>
  )
}

function ActionRow({ action }: { action: AutomationAction }): JSX.Element {
  return (
    <div className="auto-action">
      <span className="auto-action__type">{action.type}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div>{action.description}</div>
        <code className="auto-action__cmd">{summarizeParams(action)}</code>
      </div>
    </div>
  )
}

function summarizeParams(action: AutomationAction): string {
  const p = action.params
  switch (action.type) {
    case 'run-shell':
      return `$ ${p.command ?? ''}`
    case 'open-path':
      return p.path ?? ''
    case 'open-url':
      return p.url ?? ''
    case 'write-file':
      return `${p.path ?? ''} (${(p.content ?? '').length} chars)`
    case 'move-file':
      return `${p.from ?? ''} → ${p.to ?? ''}`
    case 'delete-file':
      return p.path ?? ''
    default:
      return JSON.stringify(p)
  }
}
