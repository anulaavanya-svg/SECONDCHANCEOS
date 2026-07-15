import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Capabilities, ToolRegistry, type ToolContext } from '../src/main/services/tools'
import { Database } from '../src/main/services/database'
import { MemoryStore } from '../src/main/services/memory-store'

/**
 * Exercises the capability registry: name-based spec selection and dispatch of
 * the memory capabilities against a real in-memory database.
 */
function makeContext(): { ctx: ToolContext; db: Database } {
  const db = new Database(':memory:')
  const memory = new MemoryStore(db)
  const ctx = {
    conversationId: 'c1',
    db,
    memory,
    files: {} as ToolContext['files'],
    research: {} as ToolContext['research'],
    screenshot: {} as ToolContext['screenshot'],
    automation: {} as ToolContext['automation'],
    flags: { files: false, research: false, automation: false }
  }
  return { ctx, db }
}

describe('ToolRegistry.specsFor', () => {
  const registry = new ToolRegistry()

  it('returns specs for the requested capability names', () => {
    const specs = registry.specsFor([Capabilities.Remember, Capabilities.WebResearch])
    expect(specs.map((s) => s.name).sort()).toEqual(['remember', 'web_research'])
  })

  it('silently skips unknown names', () => {
    const specs = registry.specsFor(['nope', Capabilities.Recall])
    expect(specs.map((s) => s.name)).toEqual(['recall'])
  })

  it('reports capability existence via has()', () => {
    expect(registry.has('read_file')).toBe(true)
    expect(registry.has('does_not_exist')).toBe(false)
  })
})

describe('ToolRegistry.dispatch', () => {
  const registry = new ToolRegistry()
  let ctx: ToolContext
  let db: Database

  beforeEach(() => {
    const made = makeContext()
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

  it('reports an error for an unknown capability', async () => {
    const result = await registry.dispatch('does_not_exist', {}, ctx)
    expect(result.isError).toBe(true)
    expect(String(result.content)).toContain('not available')
  })
})
