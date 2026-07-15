/**
 * The typed API surface exposed to the renderer as `window.nila`.
 *
 * The preload script implements this interface with `contextBridge`, and the
 * renderer consumes it. Because both sides import this type, the contract can
 * never silently drift.
 */
import type {
  AppInfo,
  AutomationTask,
  ChatSendRequest,
  ChatStreamChunk,
  ChatStreamDone,
  ChatStreamError,
  Conversation,
  ConversationSearchResult,
  ChatMessage,
  CaptureSource,
  MenuAction,
  FileEntry,
  FileReadResult,
  FileStatResult,
  MemoryEntry,
  MemoryUpsertRequest,
  NotifyPayload,
  ResearchRequest,
  ResearchResult,
  ScreenshotAnalyzeRequest,
  ScreenshotResult,
  Settings,
  SettingsUpdate,
  TestKeyResult
} from './types'

export interface NilaApi {
  chat: {
    /** Start streaming a response. Resolves once the request is accepted. */
    send(req: ChatSendRequest): Promise<{ messageId: string }>
    /** Drop the last assistant reply and stream a fresh one. */
    regenerate(conversationId: string): Promise<{ messageId: string }>
    cancel(conversationId: string): Promise<void>
    onChunk(cb: (chunk: ChatStreamChunk) => void): () => void
    onDone(cb: (done: ChatStreamDone) => void): () => void
    onError(cb: (err: ChatStreamError) => void): () => void
  }

  conversations: {
    list(): Promise<Conversation[]>
    get(id: string): Promise<{ conversation: Conversation; messages: ChatMessage[] }>
    create(title?: string): Promise<Conversation>
    rename(id: string, title: string): Promise<void>
    delete(id: string): Promise<void>
    /** Export a conversation to a Markdown file. Returns the saved path, or null if cancelled. */
    export(id: string): Promise<string | null>
    /** Full-text search across conversation titles and message content. */
    search(query: string): Promise<ConversationSearchResult[]>
  }

  memory: {
    list(): Promise<MemoryEntry[]>
    search(query: string): Promise<MemoryEntry[]>
    upsert(entry: MemoryUpsertRequest): Promise<MemoryEntry>
    delete(id: string): Promise<void>
  }

  files: {
    read(path: string): Promise<FileReadResult>
    write(path: string, content: string): Promise<void>
    list(dir: string): Promise<FileEntry[]>
    stat(path: string): Promise<FileStatResult>
    pickOpen(): Promise<string | null>
    pickSave(defaultName?: string): Promise<string | null>
  }

  screenshot: {
    sources(): Promise<CaptureSource[]>
    capture(sourceId?: string): Promise<ScreenshotResult>
    analyze(req: ScreenshotAnalyzeRequest): Promise<string>
  }

  research: {
    run(req: ResearchRequest): Promise<ResearchResult>
  }

  automation: {
    list(conversationId?: string): Promise<AutomationTask[]>
    approve(taskId: string): Promise<AutomationTask>
    reject(taskId: string): Promise<AutomationTask>
  }

  settings: {
    get(): Promise<Settings>
    set(update: SettingsUpdate): Promise<Settings>
    testKey(apiKey?: string): Promise<TestKeyResult>
  }

  app: {
    info(): Promise<AppInfo>
    openExternal(url: string): Promise<void>
    onNotify(cb: (payload: NotifyPayload) => void): () => void
    onMenuAction(cb: (action: MenuAction) => void): () => void
  }
}
