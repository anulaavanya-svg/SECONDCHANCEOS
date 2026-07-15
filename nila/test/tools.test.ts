import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ToolRegistry, type ToolContext } from '../src/main/services/tools'
import { Database } from '../src/main/services/database'
import { MemoryStore } from '../src/main/services/memory-store'

/**
 * Exercises the tool registry: which tools are exposed for a given set of
 * per-turn flags, and the memory tools' dispatch behavior (using a real
 * in-memory database).
 */
function makeContext(flags: Partial<ToolContext['flags']>): { ctx: ToolContext; db: Database } {
  const db = new Database(':memory:')
  const memory = new MemoryStore(db)
  const ctx = {
    conversationId: 'c1',
    db,
    memory,
    // These services are not invoked by the tools under test.
    files: {} as ToolContext['files'],
    research: {} as ToolContext['research'],
    screenshot: {} as ToolContext['screenshot'],
    automation: {} as ToolContext['automation'],
    flags: { files: false, research: false, automation: false, ...flags }
  }
  return { ctx, db }
}

describe('ToolRegistry.specs', () => {
  const registry = new ToolRegistry()

  it('always exposes memory + screen tools', () => {
    const { ctx, db } = makeContext({})
    const names = registry.specs(ctx).map((s) => s.name)
    expect(names).toContain('remember')
    expect(names).toContain('recall')
    expect(names).toContain('capture_screen')
    // Gated tools are absent when their flags are off.
    expect(names).not.toContain('read_file')
    expect(names).not.toContain('web_research')
    expect(names).not.toContain('propose_automation')
    db.close()
  })

  it('exposes file tools only when the files flag is set', () => {
    const { ctx, db } = makeContext({ files: true })
    const names = registry.specs(ctx).map((s) => s.name)
    expect(names).toContain('read_file')
    expect(names).toContain('write_file')
    expect(names).toContain('list_files')
    db.close()
  })

  it('exposes research and automation tools behind their flags', () => {
    const { ctx, db } = makeContext({ research: true, automation: true })
    const names = registry.specs(ctx).map((s) => s.name)
    expect(names).toContain('web_research')
    expect(names).toContain('propose_automation')
    db.close()
  })
})

describe('ToolRegistry.dispatch', () => {
  const registry = new ToolRegistry()
  let ctx: ToolContext
  let db: Database

  beforeEach(() => {
    const made = makeContext({})
    ctx = made.ctx
    db = made.db
  })
  afterEach(() => db.close())

  it('remember persists a memory entry', async () => {
    const result = await registry.dispatch(
      'remember',
      { kind: 'preference', key: 'tone', value: 'concise' },
      ctx
    )
    expect(result.isError).toBe(false)
    expect(db.listMemory()).toHaveLength(1)
    expect(db.listMemory()[0].value).toBe('concise')
  })

  it('recall finds a stored memory', async () => {
    db.upsertMemory({ kind: 'fact', key: 'city', value: 'Seattle' })
    const result = await registry.dispatch('recall', { query: 'seattle' }, ctx)
    expect(result.isError).toBe(false)
    expect(String(result.content)).toContain('Seattle')
  })

  it('rejects a disabled tool', async () => {
    const result = await registry.dispatch('read_file', { path: 'x.txt' }, ctx)
    expect(result.isError).toBe(true)
    expect(String(result.content)).toContain('not available')
  })

  it('reports an error for an unknown tool', async () => {
    const result = await registry.dispatch('does_not_exist', {}, ctx)
    expect(result.isError).toBe(true)
  })
})
