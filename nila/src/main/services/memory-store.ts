/**
 * Higher-level memory helpers on top of the raw database table.
 *
 * Nila's "persistent memory" is a small key/value knowledge base the model can
 * read and write via tools. This service formats the most important entries
 * into a compact block that is injected into the system prompt every turn, so
 * the assistant remembers the user across sessions.
 */
import type { MemoryEntry } from '@shared/types'
import type { Database } from './database'

export class MemoryStore {
  constructor(private readonly db: Database) {}

  /**
   * Render the highest-importance memories as a plain-text block for the system
   * prompt. Returns an empty string when there is nothing worth injecting.
   */
  buildContextBlock(limit = 40): string {
    const entries = this.db.topMemory(limit)
    if (entries.length === 0) return ''

    const byKind = groupByKind(entries)
    const sections: string[] = []
    for (const [kind, items] of byKind) {
      const lines = items.map((e) => `- ${e.key}: ${e.value}`).join('\n')
      sections.push(`${titleForKind(kind)}:\n${lines}`)
    }

    return [
      'What you remember about the user (long-term memory):',
      sections.join('\n\n')
    ].join('\n')
  }

  list(): MemoryEntry[] {
    return this.db.listMemory()
  }

  search(query: string): MemoryEntry[] {
    return this.db.searchMemory(query)
  }
}

function groupByKind(entries: MemoryEntry[]): Map<MemoryEntry['kind'], MemoryEntry[]> {
  const map = new Map<MemoryEntry['kind'], MemoryEntry[]>()
  for (const entry of entries) {
    const bucket = map.get(entry.kind) ?? []
    bucket.push(entry)
    map.set(entry.kind, bucket)
  }
  return map
}

function titleForKind(kind: MemoryEntry['kind']): string {
  switch (kind) {
    case 'fact':
      return 'Facts'
    case 'preference':
      return 'Preferences'
    case 'project':
      return 'Projects'
    case 'person':
      return 'People'
    case 'note':
      return 'Notes'
    default:
      return 'Other'
  }
}
