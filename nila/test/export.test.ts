import { describe, expect, it } from 'vitest'
import { conversationToMarkdown, safeExportName } from '../src/main/services/export'
import type { ChatMessage } from '../src/shared/types'

function msg(partial: Partial<ChatMessage>): ChatMessage {
  return {
    id: 'x',
    conversationId: 'c',
    role: 'user',
    content: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...partial
  }
}

describe('conversationToMarkdown', () => {
  it('renders a title heading and alternating role headings', () => {
    const md = conversationToMarkdown('My chat', [
      msg({ role: 'user', content: 'Hello' }),
      msg({ role: 'assistant', content: 'Hi there' })
    ])
    expect(md).toContain('# My chat')
    expect(md).toContain('## You')
    expect(md).toContain('## Nila')
    expect(md).toContain('Hello')
    expect(md).toContain('Hi there')
    // "You" must appear before "Nila".
    expect(md.indexOf('## You')).toBeLessThan(md.indexOf('## Nila'))
  })

  it('includes a tools-used footnote when tools were invoked', () => {
    const md = conversationToMarkdown('t', [
      msg({ role: 'assistant', content: 'done', toolsUsed: ['web_research', 'remember'] })
    ])
    expect(md).toContain('*Tools used: web_research, remember*')
  })

  it('omits the tools footnote when none were used', () => {
    const md = conversationToMarkdown('t', [msg({ role: 'assistant', content: 'done' })])
    expect(md).not.toContain('Tools used')
  })

  it('handles an empty conversation', () => {
    expect(conversationToMarkdown('empty', [])).toBe('# empty\n')
  })
})

describe('safeExportName', () => {
  it('strips unsafe characters', () => {
    expect(safeExportName('Hello / World: <test>')).toBe('Hello  World test')
  })

  it('falls back to a default for empty/all-unsafe titles', () => {
    expect(safeExportName('///')).toBe('conversation')
    expect(safeExportName('')).toBe('conversation')
  })

  it('caps the length at 60 characters', () => {
    const long = 'a'.repeat(200)
    expect(safeExportName(long).length).toBe(60)
  })
})
