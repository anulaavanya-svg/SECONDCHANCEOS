import { describe, expect, it } from 'vitest'
import { MemoryStore } from '../src/main/services/memory-store'
import type { Database } from '../src/main/services/database'
import type { MemoryEntry } from '../src/shared/types'

function entry(partial: Partial<MemoryEntry>): MemoryEntry {
  return {
    id: Math.random().toString(36).slice(2),
    kind: 'fact',
    key: 'k',
    value: 'v',
    importance: 0.5,
    source: 'assistant',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial
  }
}

function makeStore(entries: MemoryEntry[]): MemoryStore {
  const db = { topMemory: () => entries } as unknown as Database
  return new MemoryStore(db)
}

describe('MemoryStore.buildContextBlock', () => {
  it('returns an empty string when there are no memories', () => {
    expect(makeStore([]).buildContextBlock()).toBe('')
  })

  it('renders a header and grouped entries', () => {
    const block = makeStore([
      entry({ kind: 'preference', key: 'answers', value: 'concise' }),
      entry({ kind: 'fact', key: 'timezone', value: 'Pacific' })
    ]).buildContextBlock()

    expect(block).toContain('long-term memory')
    expect(block).toContain('Preferences:')
    expect(block).toContain('- answers: concise')
    expect(block).toContain('Facts:')
    expect(block).toContain('- timezone: Pacific')
  })

  it('groups multiple entries of the same kind under one heading', () => {
    const block = makeStore([
      entry({ kind: 'person', key: 'manager', value: 'Dana' }),
      entry({ kind: 'person', key: 'mentor', value: 'Sam' })
    ]).buildContextBlock()

    expect(block.match(/People:/g)?.length).toBe(1)
    expect(block).toContain('- manager: Dana')
    expect(block).toContain('- mentor: Sam')
  })
})
