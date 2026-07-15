/**
 * Coordinates the propose → approve/reject → execute lifecycle for desktop
 * automation.
 *
 * When the model proposes actions (via the `propose_automation` tool), a task
 * is persisted with status `proposed` and a Promise is parked. The renderer
 * shows an approval card; the user's decision resolves the parked Promise so
 * the model's tool call can continue with the outcome. This keeps the human
 * firmly in the loop for anything that touches the machine.
 */
import type { BrowserWindow } from 'electron'
import type { AutomationAction, AutomationTask } from '@shared/types'
import type { Config } from '../services/config'
import type { Database } from '../services/database'
import { IpcChannels } from '@shared/ipc-channels'
import { AutomationError, AutomationExecutor } from './executor'
import { createLogger } from '../services/logger'

const log = createLogger('automation:manager')

interface Pending {
  resolve: (task: AutomationTask) => void
}

export class AutomationManager {
  private readonly pending = new Map<string, Pending>()

  constructor(
    private readonly db: Database,
    private readonly config: Config,
    private readonly executor: AutomationExecutor,
    private readonly getWindow: () => BrowserWindow | null
  ) {}

  /**
   * Called from the tool handler. Creates the task, notifies the renderer, and
   * resolves once the user (or auto-approval) settles it and — if approved —
   * execution completes.
   */
  async propose(conversationId: string, actions: AutomationAction[]): Promise<AutomationTask> {
    const task = this.db.createAutomationTask(conversationId, actions)
    log.info('proposed task', task.id, `${actions.length} action(s)`)

    // Notify the renderer so it can render the approval card.
    this.emit()

    // Auto-approve path: only when the user has disabled the approval gate.
    if (!this.config.getRequireApproval()) {
      return this.execute(task.id)
    }

    return new Promise<AutomationTask>((resolve) => {
      this.pending.set(task.id, { resolve })
    })
  }

  async approve(taskId: string): Promise<AutomationTask> {
    const task = this.db.getAutomationTask(taskId)
    if (!task || task.status !== 'proposed') {
      return task ?? this.notFound(taskId)
    }
    const result = await this.execute(taskId)
    this.settle(taskId, result)
    return result
  }

  reject(taskId: string, reason = 'Rejected by user.'): AutomationTask {
    const task = this.db.getAutomationTask(taskId)
    if (!task || task.status !== 'proposed') {
      return task ?? this.notFound(taskId)
    }
    this.db.updateAutomationTask(taskId, {
      status: 'rejected',
      error: reason,
      resolvedAt: new Date().toISOString()
    })
    const updated = this.db.getAutomationTask(taskId)!
    this.settle(taskId, updated)
    this.emit()
    return updated
  }

  /**
   * Reject any still-pending proposals for a conversation. Called when the user
   * stops the response, so a parked `propose()` promise (and therefore the chat
   * turn) doesn't hang waiting on an approval that will never come.
   */
  cancelPending(conversationId: string): void {
    for (const task of this.db.listAutomationTasks(conversationId)) {
      if (task.status === 'proposed') {
        this.reject(task.id, 'Cancelled because the response was stopped.')
      }
    }
  }

  list(conversationId?: string): AutomationTask[] {
    return this.db.listAutomationTasks(conversationId)
  }

  private async execute(taskId: string): Promise<AutomationTask> {
    const task = this.db.getAutomationTask(taskId)
    if (!task) return this.notFound(taskId)

    this.db.updateAutomationTask(taskId, { status: 'approved' })
    this.emit()

    try {
      const transcript = await this.executor.run(task.actions)
      this.db.updateAutomationTask(taskId, {
        status: 'executed',
        result: transcript,
        resolvedAt: new Date().toISOString()
      })
    } catch (err) {
      const transcript = err instanceof AutomationError ? err.transcript : String(err)
      const reason = err instanceof Error ? err.message : String(err)
      this.db.updateAutomationTask(taskId, {
        status: 'failed',
        result: transcript,
        error: reason,
        resolvedAt: new Date().toISOString()
      })
    }
    this.emit()
    return this.db.getAutomationTask(taskId)!
  }

  private settle(taskId: string, task: AutomationTask): void {
    const pending = this.pending.get(taskId)
    if (pending) {
      pending.resolve(task)
      this.pending.delete(taskId)
    }
  }

  private emit(): void {
    const win = this.getWindow()
    win?.webContents.send(IpcChannels.AutomationList, this.list())
  }

  private notFound(taskId: string): AutomationTask {
    return {
      id: taskId,
      conversationId: '',
      actions: [],
      status: 'failed',
      error: 'Task not found.',
      createdAt: new Date().toISOString()
    }
  }
}
