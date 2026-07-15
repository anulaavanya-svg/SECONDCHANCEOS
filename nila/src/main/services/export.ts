/**
 * Pure helpers for exporting a conversation to Markdown. Kept dependency-free
 * and side-effect-free so it can be unit-tested in isolation.
 */
import type { ChatMessage } from '@shared/types'

export function conversationToMarkdown(title: string, messages: ChatMessage[]): string {
  const lines: string[] = [`# ${title}`, '']
  for (const message of messages) {
    lines.push(`## ${message.role === 'user' ? 'You' : 'Nila'}`)
    lines.push('')
    lines.push(message.content)
    if (message.toolsUsed?.length) {
      lines.push('')
      lines.push(`*Tools used: ${message.toolsUsed.join(', ')}*`)
    }
    lines.push('')
  }
  return lines.join('\n')
}

/** A safe, filesystem-friendly default filename derived from a title. */
export function safeExportName(title: string): string {
  return title.replace(/[^\w\- ]+/g, '').trim().slice(0, 60) || 'conversation'
}
