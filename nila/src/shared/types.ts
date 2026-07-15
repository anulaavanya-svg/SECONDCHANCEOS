/**
 * Shared type definitions used across the main process, preload bridge, and
 * renderer. These describe the wire format for every IPC call, so they must
 * stay serializable (no class instances, functions, or Dates — use ISO
 * strings for timestamps).
 */

/* ------------------------------------------------------------------ */
/* Models                                                              */
/* ------------------------------------------------------------------ */

export type ModelId =
  | 'claude-opus-4-8'
  | 'claude-sonnet-5'
  | 'claude-haiku-4-5-20251001'
  | 'claude-fable-5'

export interface ModelInfo {
  id: ModelId
  label: string
  description: string
  supportsVision: boolean
}

export const MODELS: ModelInfo[] = [
  {
    id: 'claude-opus-4-8',
    label: 'Opus 4.8',
    description: 'Most capable — best for complex coding and reasoning.',
    supportsVision: true
  },
  {
    id: 'claude-sonnet-5',
    label: 'Sonnet 5',
    description: 'Balanced speed and capability for everyday work.',
    supportsVision: true
  },
  {
    id: 'claude-haiku-4-5-20251001',
    label: 'Haiku 4.5',
    description: 'Fastest and most economical for quick tasks.',
    supportsVision: true
  }
]

export const DEFAULT_MODEL: ModelId = 'claude-opus-4-8'

/* ------------------------------------------------------------------ */
/* Chat / messages                                                     */
/* ------------------------------------------------------------------ */

export type Role = 'user' | 'assistant'

export interface ImageAttachment {
  /** Base64-encoded image data (no data: prefix). */
  data: string
  /** e.g. "image/png", "image/jpeg". */
  mediaType: string
  /** Optional short label shown in the UI. */
  name?: string
}

export interface ChatMessage {
  id: string
  conversationId: string
  role: Role
  content: string
  /** Optional image attachments (screenshots, pasted images). */
  images?: ImageAttachment[]
  /** Names of tools that were invoked while producing this message. */
  toolsUsed?: string[]
  createdAt: string
}

export interface Conversation {
  id: string
  title: string
  model: ModelId
  createdAt: string
  updatedAt: string
  /** Present only in list responses; number of messages. */
  messageCount?: number
}

export interface ChatSendRequest {
  conversationId: string
  content: string
  images?: ImageAttachment[]
  model?: ModelId
  /** Enable web-research tool for this turn. */
  enableResearch?: boolean
  /** Enable file-system tools for this turn. */
  enableFiles?: boolean
  /** Enable desktop-automation proposals for this turn. */
  enableAutomation?: boolean
}

export interface ChatStreamChunk {
  conversationId: string
  messageId: string
  /** Incremental text delta. */
  delta: string
}

export interface ChatStreamDone {
  conversationId: string
  message: ChatMessage
}

export interface ChatStreamError {
  conversationId: string
  message: string
}

/* ------------------------------------------------------------------ */
/* Memory                                                              */
/* ------------------------------------------------------------------ */

export type MemoryKind = 'fact' | 'preference' | 'project' | 'person' | 'note'

export interface MemoryEntry {
  id: string
  kind: MemoryKind
  key: string
  value: string
  /** 0..1 confidence/importance used for ranking. */
  importance: number
  source: 'user' | 'assistant' | 'system'
  createdAt: string
  updatedAt: string
}

export interface MemoryUpsertRequest {
  id?: string
  kind: MemoryKind
  key: string
  value: string
  importance?: number
  source?: MemoryEntry['source']
}

/* ------------------------------------------------------------------ */
/* Files                                                               */
/* ------------------------------------------------------------------ */

export interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
  size: number
  modifiedAt: string
}

export interface FileReadResult {
  path: string
  content: string
  size: number
  truncated: boolean
}

export interface FileStatResult {
  path: string
  exists: boolean
  isDirectory: boolean
  size: number
  modifiedAt: string
}

/* ------------------------------------------------------------------ */
/* Screenshot                                                          */
/* ------------------------------------------------------------------ */

export interface CaptureSource {
  id: string
  name: string
  /** Base64 PNG thumbnail (with data: prefix) for the picker UI. */
  thumbnail: string
}

export interface ScreenshotResult {
  /** Base64 PNG data (no data: prefix). */
  data: string
  mediaType: 'image/png'
  width: number
  height: number
}

export interface ScreenshotAnalyzeRequest {
  data: string
  mediaType: string
  prompt?: string
  model?: ModelId
}

/* ------------------------------------------------------------------ */
/* Research                                                            */
/* ------------------------------------------------------------------ */

export interface ResearchRequest {
  query: string
  model?: ModelId
  /** Maximum number of pages to fetch. */
  maxSources?: number
}

export interface ResearchSource {
  url: string
  title: string
  snippet: string
}

export interface ResearchResult {
  query: string
  answer: string
  sources: ResearchSource[]
}

/* ------------------------------------------------------------------ */
/* Desktop automation                                                  */
/* ------------------------------------------------------------------ */

export type AutomationActionType =
  | 'run-shell'
  | 'open-path'
  | 'open-url'
  | 'write-file'
  | 'move-file'
  | 'delete-file'

export interface AutomationAction {
  type: AutomationActionType
  /** Human-readable description shown in the approval dialog. */
  description: string
  /** Action-specific parameters. */
  params: Record<string, string>
}

export type AutomationStatus = 'proposed' | 'approved' | 'rejected' | 'executed' | 'failed'

export interface AutomationTask {
  id: string
  conversationId: string
  actions: AutomationAction[]
  status: AutomationStatus
  /** Populated after execution. */
  result?: string
  error?: string
  createdAt: string
  resolvedAt?: string
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

export interface Settings {
  apiKeyConfigured: boolean
  model: ModelId
  /** Directory automation/file tools are confined to. */
  workspaceDir: string
  /** Global toggle: require approval for every automation action. */
  requireAutomationApproval: boolean
  /** Enable spoken responses via speech synthesis. */
  voiceOutputEnabled: boolean
  /** Preferred speech-synthesis voice URI, if any. */
  voiceUri: string | null
  /** Speech synthesis rate (0.5–2). */
  voiceRate: number
  theme: 'dark' | 'light' | 'system'
  /** System prompt persona shown to the model. */
  persona: string
}

export interface SettingsUpdate {
  apiKey?: string
  model?: ModelId
  workspaceDir?: string
  requireAutomationApproval?: boolean
  voiceOutputEnabled?: boolean
  voiceUri?: string | null
  voiceRate?: number
  theme?: Settings['theme']
  persona?: string
}

export interface TestKeyResult {
  ok: boolean
  message: string
}

/* ------------------------------------------------------------------ */
/* App meta / notifications                                            */
/* ------------------------------------------------------------------ */

export interface AppInfo {
  version: string
  /** Node's process.platform value, e.g. "darwin" | "win32" | "linux". */
  platform: string
  dataDir: string
  workspaceDir: string
}

export type NotifyLevel = 'info' | 'success' | 'warning' | 'error'

export interface NotifyPayload {
  level: NotifyLevel
  title: string
  body?: string
}

/** Actions dispatched from the native application menu / global shortcuts. */
export type MenuAction =
  | 'new-chat'
  | 'settings'
  | 'memory'
  | 'export'
  | 'toggle-theme'
  | 'command-palette'

/* ------------------------------------------------------------------ */
/* Generic IPC envelope                                                */
/* ------------------------------------------------------------------ */

export interface IpcOk<T> {
  ok: true
  data: T
}

export interface IpcErr {
  ok: false
  error: string
  code?: string
}

export type IpcResult<T> = IpcOk<T> | IpcErr
