/**
 * Canonical list of IPC channel names shared between the main and renderer
 * processes. Keeping these in one place prevents typos and makes it trivial to
 * see the full surface area of the preload bridge.
 */
export const IpcChannels = {
  // Chat / conversation
  ChatSend: 'chat:send',
  ChatRegenerate: 'chat:regenerate',
  ChatStreamChunk: 'chat:stream-chunk',
  ChatStreamDone: 'chat:stream-done',
  ChatStreamError: 'chat:stream-error',
  ChatCancel: 'chat:cancel',

  // Conversations (persistence)
  ConversationList: 'conversation:list',
  ConversationGet: 'conversation:get',
  ConversationCreate: 'conversation:create',
  ConversationRename: 'conversation:rename',
  ConversationDelete: 'conversation:delete',
  ConversationExport: 'conversation:export',
  ConversationSearch: 'conversation:search',

  // Memory
  MemoryList: 'memory:list',
  MemorySearch: 'memory:search',
  MemoryUpsert: 'memory:upsert',
  MemoryDelete: 'memory:delete',

  // Files
  FileRead: 'file:read',
  FileWrite: 'file:write',
  FileList: 'file:list',
  FilePickOpen: 'file:pick-open',
  FilePickSave: 'file:pick-save',
  FilePickDirectory: 'file:pick-directory',
  FileStat: 'file:stat',

  // Screenshot
  ScreenshotCapture: 'screenshot:capture',
  ScreenshotSources: 'screenshot:sources',
  ScreenshotAnalyze: 'screenshot:analyze',

  // Research / browsing
  ResearchRun: 'research:run',

  // Desktop automation
  AutomationPropose: 'automation:propose',
  AutomationApprove: 'automation:approve',
  AutomationReject: 'automation:reject',
  AutomationList: 'automation:list',

  // Settings / config
  SettingsGet: 'settings:get',
  SettingsSet: 'settings:set',
  SettingsTestKey: 'settings:test-key',

  // App meta
  AppInfo: 'app:info',
  AppOpenExternal: 'app:open-external',

  // Main → renderer notifications
  Notify: 'app:notify',
  MenuAction: 'app:menu-action'
} as const

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels]
