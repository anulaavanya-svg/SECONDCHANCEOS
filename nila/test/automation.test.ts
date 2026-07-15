import { afterEach, describe, expect, it, vi } from 'vitest'

// The automation executor imports `electron` for `shell`; stub it so these
// tests run under plain Node without the Electron runtime.
vi.mock('electron', () => ({
  shell: {
    openPath: vi.fn(async () => ''),
    openExternal: vi.fn(async () => undefined)
  }
}))

import { AutomationManager } from '../src/main/automation/manager'
import { AutomationExecutor } from '../src/main/automation/executor'
import { Database } from '../src/main/services/database'
import type { Config } from '../src/main/services/config'
import type { AutomationAction } from '../src/shared/types'

const ACTIONS: AutomationAction[] = [
  { type: 'run-shell', description: 'say hi', params: { command: 'echo hi' } }
]

function makeManager(requireApproval: boolean, run: () => Promise<string>) {
  const db = new Database(':memory:')
  const config = { getRequireApproval: () => requireApproval } as unknown as Config
  const executor = { run: vi.fn(run) } as unknown as AutomationExecutor
  const manager = new AutomationManager(db, config, executor, () => null)
  return { db, manager, executor }
}

describe('AutomationManager', () => {
  let cleanup: (() => void) | null = null
  afterEach(() => {
    cleanup?.()
    cleanup = null
  })

  it('auto-approves and executes when approval is disabled', async () => {
    const { db, manager, executor } = makeManager(false, async () => 'ok output')
    cleanup = () => db.close()

    const result = await manager.propose('c1', ACTIONS)
    expect(result.status).toBe('executed')
    expect(result.result).toBe('ok output')
    expect(executor.run).toHaveBeenCalledOnce()
  })

  it('parks a proposal until the user approves it', async () => {
    const { db, manager, executor } = makeManager(true, async () => 'done')
    cleanup = () => db.close()

    const pending = manager.propose('c2', ACTIONS)
    const task = db.listAutomationTasks('c2')[0]
    expect(task.status).toBe('proposed')
    expect(executor.run).not.toHaveBeenCalled()

    await manager.approve(task.id)
    const settled = await pending
    expect(settled.status).toBe('executed')
    expect(executor.run).toHaveBeenCalledOnce()
  })

  it('rejects a proposal without executing', async () => {
    const { db, manager, executor } = makeManager(true, async () => 'done')
    cleanup = () => db.close()

    const pending = manager.propose('c3', ACTIONS)
    const task = db.listAutomationTasks('c3')[0]
    manager.reject(task.id)

    const settled = await pending
    expect(settled.status).toBe('rejected')
    expect(executor.run).not.toHaveBeenCalled()
  })

  it('cancelPending settles a parked proposal when the response is stopped', async () => {
    const { db, manager } = makeManager(true, async () => 'done')
    cleanup = () => db.close()

    const pending = manager.propose('c4', ACTIONS)
    manager.cancelPending('c4')

    const settled = await pending
    expect(settled.status).toBe('rejected')
    expect(settled.error).toMatch(/stopped/i)
  })

  it('records a failure when execution throws', async () => {
    const { db, manager } = makeManager(false, async () => {
      throw new Error('boom')
    })
    cleanup = () => db.close()

    const result = await manager.propose('c5', ACTIONS)
    expect(result.status).toBe('failed')
    expect(result.error).toContain('boom')
  })
})

describe('AutomationExecutor', () => {
  const workspace = process.cwd()
  const files = {
    resolvePath: () => workspace,
    write: vi.fn(async () => undefined)
  } as unknown as import('../src/main/services/files').FileService

  it('runs a shell command and captures output', async () => {
    const executor = new AutomationExecutor(files)
    const transcript = await executor.run([
      { type: 'run-shell', description: 'echo', params: { command: 'echo nila-test' } }
    ])
    expect(transcript).toContain('nila-test')
  })

  it('throws for an unknown action type', async () => {
    const executor = new AutomationExecutor(files)
    await expect(
      executor.run([{ type: 'bogus' as never, description: 'x', params: {} }])
    ).rejects.toThrow()
  })
})
