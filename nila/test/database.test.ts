import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Database } from '../src/main/services/database'

/**
 * Integration tests against a real (in-memory) SQLite database, exercising the
 * full persistence layer end-to-end.
 */
describe('Database', () => {
  let db: Database

  beforeEach(() => {
    db = new Database(':memory:')
  })

  afterEach(() => {
    db.close()
  })

  describe('conversations', () => {
    it('creates and lists conversations with message counts', () => {
      const conv = db.createConversation('First', 'claude-opus-4-8')
      db.addMessage({ conversationId: conv.id, role: 'user', content: 'hi' })

      const list = db.listConversations()
      expect(list).toHaveLength(1)
      expect(list[0].title).toBe('First')
      expect(list[0].messageCount).toBe(1)
    })

    it('renames and deletes conversations, cascading messages', () => {
      const conv = db.createConversation('Temp', 'claude-sonnet-5')
      db.addMessage({ conversationId: conv.id, role: 'user', content: 'x' })

      db.renameConversation(conv.id, 'Renamed')
      expect(db.getConversation(conv.id)?.title).toBe('Renamed')

      db.deleteConversation(conv.id)
      expect(db.getConversation(conv.id)).toBeNull()
      expect(db.getMessages(conv.id)).toHaveLength(0)
    })
  })

  describe('messages', () => {
    it('round-trips content, images, and tools in order', () => {
      const conv = db.createConversation('c', 'claude-opus-4-8')
      db.addMessage({
        conversationId: conv.id,
        role: 'user',
        content: 'look',
        images: [{ data: 'abc', mediaType: 'image/png', name: 'shot.png' }]
      })
      db.addMessage({
        conversationId: conv.id,
        role: 'assistant',
        content: 'done',
        toolsUsed: ['web_research']
      })

      const messages = db.getMessages(conv.id)
      expect(messages.map((m) => m.role)).toEqual(['user', 'assistant'])
      expect(messages[0].images?.[0].data).toBe('abc')
      expect(messages[1].toolsUsed).toEqual(['web_research'])
    })

    it('honors an explicit message id and can delete it', () => {
      const conv = db.createConversation('c', 'claude-opus-4-8')
      const msg = db.addMessage({ id: 'fixed-id', conversationId: conv.id, role: 'user', content: 'x' })
      expect(msg.id).toBe('fixed-id')
      db.deleteMessage('fixed-id')
      expect(db.getMessages(conv.id)).toHaveLength(0)
    })
  })

  describe('memory', () => {
    it('upserts by (kind, key), updating in place', () => {
      const first = db.upsertMemory({ kind: 'preference', key: 'tone', value: 'concise' })
      const second = db.upsertMemory({ kind: 'preference', key: 'tone', value: 'formal' })

      expect(second.id).toBe(first.id)
      const all = db.listMemory()
      expect(all).toHaveLength(1)
      expect(all[0].value).toBe('formal')
    })

    it('orders top memory by importance', () => {
      db.upsertMemory({ kind: 'fact', key: 'a', value: '1', importance: 0.2 })
      db.upsertMemory({ kind: 'fact', key: 'b', value: '2', importance: 0.9 })
      const top = db.topMemory(10)
      expect(top[0].key).toBe('b')
    })

    it('searches keys and values, and deletes', () => {
      const entry = db.upsertMemory({ kind: 'person', key: 'manager', value: 'Dana Kowalski' })
      expect(db.searchMemory('kowalski')).toHaveLength(1)
      expect(db.searchMemory('manager')).toHaveLength(1)
      db.deleteMemory(entry.id)
      expect(db.listMemory()).toHaveLength(0)
    })
  })

  describe('searchConversations', () => {
    it('matches by title and by message content, with snippets', () => {
      const a = db.createConversation('Travel planning', 'claude-opus-4-8')
      db.addMessage({ conversationId: a.id, role: 'user', content: 'Book a flight to Tokyo' })
      const b = db.createConversation('Groceries', 'claude-opus-4-8')
      db.addMessage({ conversationId: b.id, role: 'user', content: 'buy milk and eggs' })

      const byContent = db.searchConversations('Tokyo')
      expect(byContent).toHaveLength(1)
      expect(byContent[0].id).toBe(a.id)
      expect(byContent[0].snippet.toLowerCase()).toContain('tokyo')
      expect(byContent[0].titleMatch).toBe(false)

      const byTitle = db.searchConversations('groceries')
      expect(byTitle[0].titleMatch).toBe(true)
    })

    it('returns nothing for an empty query', () => {
      db.createConversation('x', 'claude-opus-4-8')
      expect(db.searchConversations('  ')).toHaveLength(0)
    })
  })

  describe('automation audit log', () => {
    it('creates, updates, and lists tasks', () => {
      const conv = db.createConversation('c', 'claude-opus-4-8')
      const task = db.createAutomationTask(conv.id, [
        { type: 'run-shell', description: 'echo', params: { command: 'echo hi' } }
      ])
      expect(task.status).toBe('proposed')

      db.updateAutomationTask(task.id, { status: 'executed', result: 'hi' })
      const updated = db.getAutomationTask(task.id)
      expect(updated?.status).toBe('executed')
      expect(updated?.result).toBe('hi')

      expect(db.listAutomationTasks(conv.id)).toHaveLength(1)
    })
  })
})
