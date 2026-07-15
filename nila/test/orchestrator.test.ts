import { afterEach, describe, expect, it, vi } from 'vitest'
import { Orchestrator } from '../src/main/agents/orchestrator'
import { AgentRunner } from '../src/main/agents/agent-runner'
import { ToolRegistry, type ToolContext } from '../src/main/services/tools'
import { Database } from '../src/main/services/database'
import { MemoryStore } from '../src/main/services/memory-store'

function makeContext(flags: Partial<ToolContext['flags']>): { ctx: ToolContext; db: Database } {
  const db = new Database(':memory:')
  const ctx = {
    conversationId: 'c1',
    db,
    memory: new MemoryStore(db),
    files: {} as ToolContext['files'],
    research: {} as ToolContext['research'],
    screenshot: {} as ToolContext['screenshot'],
    automation: {} as ToolContext['automation'],
    flags: { files: false, research: false, automation: false, ...flags }
  }
  return { ctx, db }
}

/** A runner stub that records what it was asked to do and returns a canned result. */
function stubRunner(result = 'agent output'): AgentRunner {
  return {
    run: vi.fn(async (def: { id: string; label: string }) => ({
      agentId: def.id,
      label: def.label,
      result,
      capabilitiesUsed: []
    }))
  } as unknown as AgentRunner
}

describe('Orchestrator.nilaSpecs', () => {
  const registry = new ToolRegistry()

  it('always exposes memory capabilities and the always-on agents', () => {
    const { ctx, db } = makeContext({})
    const names = new Orchestrator(registry, stubRunner()).nilaSpecs(ctx).map((s) => s.name)
    expect(names).toContain('remember')
    expect(names).toContain('recall')
    expect(names).toContain('vision_agent')
    expect(names).toContain('planning_agent')
    expect(names).toContain('memory_agent')
    expect(names).toContain('security_agent')
    // Flag-gated agents are hidden when their flags are off.
    expect(names).not.toContain('research_agent')
    expect(names).not.toContain('coding_agent')
    expect(names).not.toContain('automation_agent')
    db.close()
  })

  it('exposes gated agents when their flags are on', () => {
    const { ctx, db } = makeContext({ research: true, files: true, automation: true })
    const names = new Orchestrator(registry, stubRunner()).nilaSpecs(ctx).map((s) => s.name)
    expect(names).toContain('research_agent')
    expect(names).toContain('coding_agent')
    expect(names).toContain('automation_agent')
    db.close()
  })
})

describe('Orchestrator.dispatch', () => {
  const registry = new ToolRegistry()
  let cleanup: (() => void) | null = null
  afterEach(() => {
    cleanup?.()
    cleanup = null
  })

  it('routes memory capabilities directly, without an agent', async () => {
    const { ctx, db } = makeContext({})
    cleanup = () => db.close()
    const runner = stubRunner()
    const orch = new Orchestrator(registry, runner)

    const result = await orch.dispatch(
      'remember',
      { kind: 'fact', key: 'k', value: 'v' },
      ctx,
      { model: 'claude-opus-4-8' }
    )
    expect(result.isError).toBe(false)
    expect(db.listMemory()).toHaveLength(1)
    expect(runner.run).not.toHaveBeenCalled()
  })

  it('delegates to an available agent and reports activity', async () => {
    const { ctx, db } = makeContext({ research: true })
    cleanup = () => db.close()
    const runner = stubRunner('the sky is blue')
    const orch = new Orchestrator(registry, runner)
    const activity: string[] = []

    const result = await orch.dispatch(
      'research_agent',
      { objective: 'why is the sky blue' },
      ctx,
      { model: 'claude-opus-4-8', onActivity: (s) => activity.push(s) }
    )

    expect(runner.run).toHaveBeenCalledOnce()
    expect(result.isError).toBe(false)
    expect(String(result.content)).toContain('the sky is blue')
    expect(activity.some((a) => /research/i.test(a))).toBe(true)
    db.close()
  })

  it('refuses to delegate to a gated agent that is off', async () => {
    const { ctx, db } = makeContext({ research: false })
    cleanup = () => db.close()
    const runner = stubRunner()
    const orch = new Orchestrator(registry, runner)

    const result = await orch.dispatch(
      'research_agent',
      { objective: 'x' },
      ctx,
      { model: 'claude-opus-4-8' }
    )
    expect(result.isError).toBe(true)
    expect(runner.run).not.toHaveBeenCalled()
  })

  it('requires an objective when delegating', async () => {
    const { ctx, db } = makeContext({})
    cleanup = () => db.close()
    const orch = new Orchestrator(registry, stubRunner())

    const result = await orch.dispatch('planning_agent', {}, ctx, { model: 'claude-opus-4-8' })
    expect(result.isError).toBe(true)
    expect(String(result.content)).toMatch(/objective/i)
  })
})
