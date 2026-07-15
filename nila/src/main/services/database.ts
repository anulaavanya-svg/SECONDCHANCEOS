/**
 * SQLite persistence via better-sqlite3.
 *
 * Holds conversations, messages, long-term memory, and the audit log of
 * desktop-automation tasks. All access goes through typed methods here so the
 * rest of the app never writes raw SQL.
 */
import BetterSqlite3, { type Database as Db } from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import type {
  AutomationAction,
  AutomationStatus,
  AutomationTask,
  ChatMessage,
  Conversation,
  ImageAttachment,
  MemoryEntry,
  MemoryKind,
  MemoryUpsertRequest,
  ModelId,
  Role
} from '@shared/types'
import { createLogger } from './logger'

const log = createLogger('database')

const SCHEMA = `
CREATE TABLE IF NOT EXISTS conversations (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  model       TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id               TEXT PRIMARY KEY,
  conversation_id  TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role             TEXT NOT NULL,
  content          TEXT NOT NULL,
  images_json      TEXT,
  tools_json       TEXT,
  created_at       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS memory (
  id          TEXT PRIMARY KEY,
  kind        TEXT NOT NULL,
  key         TEXT NOT NULL,
  value       TEXT NOT NULL,
  importance  REAL NOT NULL DEFAULT 0.5,
  source      TEXT NOT NULL DEFAULT 'assistant',
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  UNIQUE(kind, key)
);
CREATE INDEX IF NOT EXISTS idx_memory_importance ON memory(importance DESC);

CREATE TABLE IF NOT EXISTS automation_tasks (
  id               TEXT PRIMARY KEY,
  conversation_id  TEXT NOT NULL,
  actions_json     TEXT NOT NULL,
  status           TEXT NOT NULL,
  result           TEXT,
  error            TEXT,
  created_at       TEXT NOT NULL,
  resolved_at      TEXT
);
CREATE INDEX IF NOT EXISTS idx_automation_conversation ON automation_tasks(conversation_id, created_at);
`

function now(): string {
  return new Date().toISOString()
}

export class Database {
  private readonly db: Db

  constructor(dbPath: string) {
    mkdirSync(dirname(dbPath), { recursive: true })
    this.db = new BetterSqlite3(dbPath)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
    this.db.exec(SCHEMA)
    log.info('database ready at', dbPath)
  }

  close(): void {
    this.db.close()
  }

  /* ---------------------------------------------------------------- */
  /* Conversations                                                     */
  /* ---------------------------------------------------------------- */

  createConversation(title: string, model: ModelId): Conversation {
    const conv: Conversation = {
      id: randomUUID(),
      title,
      model,
      createdAt: now(),
      updatedAt: now()
    }
    this.db
      .prepare(
        `INSERT INTO conversations (id, title, model, created_at, updated_at)
         VALUES (@id, @title, @model, @createdAt, @updatedAt)`
      )
      .run(conv)
    return conv
  }

  listConversations(): Conversation[] {
    const rows = this.db
      .prepare(
        `SELECT c.id, c.title, c.model, c.created_at AS createdAt, c.updated_at AS updatedAt,
                (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS messageCount
         FROM conversations c
         ORDER BY c.updated_at DESC`
      )
      .all() as Conversation[]
    return rows
  }

  getConversation(id: string): Conversation | null {
    const row = this.db
      .prepare(
        `SELECT id, title, model, created_at AS createdAt, updated_at AS updatedAt
         FROM conversations WHERE id = ?`
      )
      .get(id) as Conversation | undefined
    return row ?? null
  }

  renameConversation(id: string, title: string): void {
    this.db
      .prepare(`UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?`)
      .run(title, now(), id)
  }

  touchConversation(id: string, model?: ModelId): void {
    if (model) {
      this.db
        .prepare(`UPDATE conversations SET updated_at = ?, model = ? WHERE id = ?`)
        .run(now(), model, id)
    } else {
      this.db.prepare(`UPDATE conversations SET updated_at = ? WHERE id = ?`).run(now(), id)
    }
  }

  deleteConversation(id: string): void {
    this.db.prepare(`DELETE FROM conversations WHERE id = ?`).run(id)
  }

  /* ---------------------------------------------------------------- */
  /* Messages                                                          */
  /* ---------------------------------------------------------------- */

  addMessage(input: {
    conversationId: string
    role: Role
    content: string
    images?: ImageAttachment[]
    toolsUsed?: string[]
    id?: string
  }): ChatMessage {
    const message: ChatMessage = {
      id: input.id ?? randomUUID(),
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
      images: input.images,
      toolsUsed: input.toolsUsed,
      createdAt: now()
    }
    this.db
      .prepare(
        `INSERT INTO messages (id, conversation_id, role, content, images_json, tools_json, created_at)
         VALUES (@id, @conversationId, @role, @content, @imagesJson, @toolsJson, @createdAt)`
      )
      .run({
        id: message.id,
        conversationId: message.conversationId,
        role: message.role,
        content: message.content,
        imagesJson: message.images ? JSON.stringify(message.images) : null,
        toolsJson: message.toolsUsed ? JSON.stringify(message.toolsUsed) : null,
        createdAt: message.createdAt
      })
    this.touchConversation(input.conversationId)
    return message
  }

  updateMessageContent(id: string, content: string, toolsUsed?: string[]): void {
    this.db
      .prepare(`UPDATE messages SET content = ?, tools_json = ? WHERE id = ?`)
      .run(content, toolsUsed ? JSON.stringify(toolsUsed) : null, id)
  }

  getMessages(conversationId: string): ChatMessage[] {
    const rows = this.db
      .prepare(
        `SELECT id, conversation_id AS conversationId, role, content,
                images_json AS imagesJson, tools_json AS toolsJson, created_at AS createdAt
         FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`
      )
      .all(conversationId) as Array<{
      id: string
      conversationId: string
      role: Role
      content: string
      imagesJson: string | null
      toolsJson: string | null
      createdAt: string
    }>

    return rows.map((r) => ({
      id: r.id,
      conversationId: r.conversationId,
      role: r.role,
      content: r.content,
      images: r.imagesJson ? (JSON.parse(r.imagesJson) as ImageAttachment[]) : undefined,
      toolsUsed: r.toolsJson ? (JSON.parse(r.toolsJson) as string[]) : undefined,
      createdAt: r.createdAt
    }))
  }

  /* ---------------------------------------------------------------- */
  /* Memory                                                            */
  /* ---------------------------------------------------------------- */

  upsertMemory(input: MemoryUpsertRequest): MemoryEntry {
    const existing = input.id
      ? (this.db.prepare(`SELECT * FROM memory WHERE id = ?`).get(input.id) as
          | Record<string, unknown>
          | undefined)
      : (this.db
          .prepare(`SELECT * FROM memory WHERE kind = ? AND key = ?`)
          .get(input.kind, input.key) as Record<string, unknown> | undefined)

    const entry: MemoryEntry = {
      id: (existing?.id as string) ?? input.id ?? randomUUID(),
      kind: input.kind,
      key: input.key,
      value: input.value,
      importance: input.importance ?? (existing?.importance as number) ?? 0.5,
      source: input.source ?? (existing?.source as MemoryEntry['source']) ?? 'assistant',
      createdAt: (existing?.created_at as string) ?? now(),
      updatedAt: now()
    }

    this.db
      .prepare(
        `INSERT INTO memory (id, kind, key, value, importance, source, created_at, updated_at)
         VALUES (@id, @kind, @key, @value, @importance, @source, @createdAt, @updatedAt)
         ON CONFLICT(kind, key) DO UPDATE SET
           value = excluded.value,
           importance = excluded.importance,
           source = excluded.source,
           updated_at = excluded.updated_at`
      )
      .run(entry)
    return entry
  }

  listMemory(): MemoryEntry[] {
    return this.mapMemoryRows(
      this.db
        .prepare(
          `SELECT id, kind, key, value, importance, source,
                  created_at AS createdAt, updated_at AS updatedAt
           FROM memory ORDER BY importance DESC, updated_at DESC`
        )
        .all()
    )
  }

  searchMemory(query: string, limit = 20): MemoryEntry[] {
    const like = `%${query.replace(/[%_]/g, '')}%`
    return this.mapMemoryRows(
      this.db
        .prepare(
          `SELECT id, kind, key, value, importance, source,
                  created_at AS createdAt, updated_at AS updatedAt
           FROM memory
           WHERE key LIKE ? OR value LIKE ?
           ORDER BY importance DESC, updated_at DESC
           LIMIT ?`
        )
        .all(like, like, limit)
    )
  }

  /** Highest-importance memories, used to prime the system prompt. */
  topMemory(limit = 40): MemoryEntry[] {
    return this.mapMemoryRows(
      this.db
        .prepare(
          `SELECT id, kind, key, value, importance, source,
                  created_at AS createdAt, updated_at AS updatedAt
           FROM memory ORDER BY importance DESC, updated_at DESC LIMIT ?`
        )
        .all(limit)
    )
  }

  deleteMemory(id: string): void {
    this.db.prepare(`DELETE FROM memory WHERE id = ?`).run(id)
  }

  private mapMemoryRows(rows: unknown[]): MemoryEntry[] {
    return (rows as MemoryEntry[]).map((r) => ({
      ...r,
      kind: r.kind as MemoryKind,
      importance: Number(r.importance)
    }))
  }

  /* ---------------------------------------------------------------- */
  /* Automation audit log                                              */
  /* ---------------------------------------------------------------- */

  createAutomationTask(conversationId: string, actions: AutomationAction[]): AutomationTask {
    const task: AutomationTask = {
      id: randomUUID(),
      conversationId,
      actions,
      status: 'proposed',
      createdAt: now()
    }
    this.db
      .prepare(
        `INSERT INTO automation_tasks (id, conversation_id, actions_json, status, created_at)
         VALUES (@id, @conversationId, @actionsJson, @status, @createdAt)`
      )
      .run({
        id: task.id,
        conversationId,
        actionsJson: JSON.stringify(actions),
        status: task.status,
        createdAt: task.createdAt
      })
    return task
  }

  getAutomationTask(id: string): AutomationTask | null {
    const row = this.db.prepare(`SELECT * FROM automation_tasks WHERE id = ?`).get(id) as
      | Record<string, unknown>
      | undefined
    return row ? this.mapAutomationRow(row) : null
  }

  listAutomationTasks(conversationId?: string): AutomationTask[] {
    const rows = conversationId
      ? this.db
          .prepare(
            `SELECT * FROM automation_tasks WHERE conversation_id = ? ORDER BY created_at DESC`
          )
          .all(conversationId)
      : this.db.prepare(`SELECT * FROM automation_tasks ORDER BY created_at DESC LIMIT 200`).all()
    return (rows as Record<string, unknown>[]).map((r) => this.mapAutomationRow(r))
  }

  updateAutomationTask(
    id: string,
    patch: { status?: AutomationStatus; result?: string; error?: string; resolvedAt?: string }
  ): void {
    const current = this.getAutomationTask(id)
    if (!current) return
    this.db
      .prepare(
        `UPDATE automation_tasks
         SET status = ?, result = ?, error = ?, resolved_at = ?
         WHERE id = ?`
      )
      .run(
        patch.status ?? current.status,
        patch.result ?? current.result ?? null,
        patch.error ?? current.error ?? null,
        patch.resolvedAt ?? current.resolvedAt ?? null,
        id
      )
  }

  private mapAutomationRow(r: Record<string, unknown>): AutomationTask {
    return {
      id: r.id as string,
      conversationId: r.conversation_id as string,
      actions: JSON.parse(r.actions_json as string) as AutomationAction[],
      status: r.status as AutomationStatus,
      result: (r.result as string) ?? undefined,
      error: (r.error as string) ?? undefined,
      createdAt: r.created_at as string,
      resolvedAt: (r.resolved_at as string) ?? undefined
    }
  }
}
