import { describe, expect, it } from 'vitest'
import { likePattern, makeSnippet } from '../src/main/services/search'

describe('makeSnippet', () => {
  it('centers the snippet on the first match with ellipses', () => {
    const text = 'The quick brown fox jumps over the lazy dog near the river bank today'
    const snippet = makeSnippet(text, 'lazy', 10)
    expect(snippet).toContain('lazy')
    expect(snippet.startsWith('… ')).toBe(true)
    expect(snippet.endsWith(' …')).toBe(true)
  })

  it('does not add a leading ellipsis when the match is at the start', () => {
    const snippet = makeSnippet('hello world this is a longer sentence here', 'hello', 8)
    expect(snippet.startsWith('…')).toBe(false)
    expect(snippet).toContain('hello')
  })

  it('collapses whitespace', () => {
    expect(makeSnippet('a\n\n  b   c', 'b')).toBe('a b c')
  })

  it('is case-insensitive when locating the match', () => {
    const snippet = makeSnippet('Alpha BETA gamma delta epsilon', 'beta', 6)
    expect(snippet.toLowerCase()).toContain('beta')
  })

  it('falls back to a leading slice when there is no match', () => {
    const long = 'x'.repeat(200)
    const snippet = makeSnippet(long, 'zzz', 20)
    expect(snippet.endsWith('…')).toBe(true)
    expect(snippet.length).toBeLessThan(long.length)
  })

  it('returns a leading slice for an empty query', () => {
    expect(makeSnippet('short text', '')).toBe('short text')
  })
})

describe('likePattern', () => {
  it('wraps the query in wildcards', () => {
    expect(likePattern('hello')).toBe('%hello%')
  })

  it('strips SQL LIKE metacharacters to prevent injection into the pattern', () => {
    expect(likePattern('a%b_c\\d')).toBe('%abcd%')
  })
})
