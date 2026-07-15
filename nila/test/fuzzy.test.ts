import { describe, expect, it } from 'vitest'
import { fuzzyFilter, fuzzyScore } from '../src/renderer/src/lib/fuzzy'

describe('fuzzyScore', () => {
  it('returns 0 for an empty query (everything matches)', () => {
    expect(fuzzyScore('', 'anything')).toBe(0)
  })

  it('matches subsequences in order', () => {
    expect(fuzzyScore('nc', 'New chat')).not.toBeNull()
    expect(fuzzyScore('chat', 'New chat')).not.toBeNull()
  })

  it('returns null when characters are out of order or missing', () => {
    expect(fuzzyScore('zzz', 'New chat')).toBeNull()
    expect(fuzzyScore('tahc', 'chat')).toBeNull()
  })

  it('returns null when the query is longer than the text', () => {
    expect(fuzzyScore('longer', 'no')).toBeNull()
  })

  it('scores consecutive and word-boundary matches higher', () => {
    const consecutive = fuzzyScore('chat', 'chat log')!
    const scattered = fuzzyScore('chat', 'c-h-a-t')!
    expect(consecutive).toBeGreaterThan(scattered)
  })

  it('is case-insensitive', () => {
    expect(fuzzyScore('NEW', 'new chat')).not.toBeNull()
  })
})

describe('fuzzyFilter', () => {
  const items = ['New chat', 'Open settings', 'Open memory', 'Export conversation']

  it('returns all items for an empty query', () => {
    expect(fuzzyFilter('', items, (s) => s)).toHaveLength(4)
  })

  it('filters out non-matches', () => {
    const result = fuzzyFilter('open', items, (s) => s)
    expect(result).toContain('Open settings')
    expect(result).toContain('Open memory')
    expect(result).not.toContain('New chat')
  })

  it('ranks the best match first', () => {
    const result = fuzzyFilter('export', items, (s) => s)
    expect(result[0]).toBe('Export conversation')
  })
})
