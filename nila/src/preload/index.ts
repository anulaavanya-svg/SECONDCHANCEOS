/**
 * Preload script. Runs in an isolated context with access to Node/Electron and
 * exposes a single, typed `window.nila` object to the renderer via
 * contextBridge. The renderer never touches ipcRenderer directly.
 */
import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannels } from '@shared/ipc-channels'
import type { NilaApi } from '@shared/api'
import type {
  ChatStreamChunk,
  ChatStreamDone,
  ChatStreamError,
  MenuAction,
  NotifyPayload
} from '@shared/types'

/** Subscribe to a main→renderer channel and return an unsubscribe function. */
function on<T>(channel: string, cb: (payload: T) => void): () => void {
  const listener = (_event: Electron.IpcRendererEvent, payload: T): void => cb(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

const api: NilaApi = {
  chat: {
    send: (req) => ipcRenderer.invoke(IpcChannels.ChatSend, req),
    regenerate: (conversationId) => ipcRenderer.invoke(IpcChannels.ChatRegenerate, conversationId),
    cancel: (conversationId) => ipcRenderer.invoke(IpcChannels.ChatCancel, conversationId),
    onChunk: (cb) => on<ChatStreamChunk>(IpcChannels.ChatStreamChunk, cb),
    onDone: (cb) => on<ChatStreamDone>(IpcChannels.ChatStreamDone, cb),
    onError: (cb) => on<ChatStreamError>(IpcChannels.ChatStreamError, cb)
  },

  conversations: {
    list: () => ipcRenderer.invoke(IpcChannels.ConversationList),
    get: (id) => ipcRenderer.invoke(IpcChannels.ConversationGet, id),
    create: (title) => ipcRenderer.invoke(IpcChannels.ConversationCreate, title),
    rename: (id, title) => ipcRenderer.invoke(IpcChannels.ConversationRename, id, title),
    delete: (id) => ipcRenderer.invoke(IpcChannels.ConversationDelete, id),
    export: (id) => ipcRenderer.invoke(IpcChannels.ConversationExport, id),
    search: (query) => ipcRenderer.invoke(IpcChannels.ConversationSearch, query)
  },

  memory: {
    list: () => ipcRenderer.invoke(IpcChannels.MemoryList),
    search: (query) => ipcRenderer.invoke(IpcChannels.MemorySearch, query),
    upsert: (entry) => ipcRenderer.invoke(IpcChannels.MemoryUpsert, entry),
    delete: (id) => ipcRenderer.invoke(IpcChannels.MemoryDelete, id)
  },

  files: {
    read: (path) => ipcRenderer.invoke(IpcChannels.FileRead, path),
    write: (path, content) => ipcRenderer.invoke(IpcChannels.FileWrite, path, content),
    list: (dir) => ipcRenderer.invoke(IpcChannels.FileList, dir),
    stat: (path) => ipcRenderer.invoke(IpcChannels.FileStat, path),
    pickOpen: () => ipcRenderer.invoke(IpcChannels.FilePickOpen),
    pickSave: (defaultName) => ipcRenderer.invoke(IpcChannels.FilePickSave, defaultName)
  },

  screenshot: {
    sources: () => ipcRenderer.invoke(IpcChannels.ScreenshotSources),
    capture: (sourceId) => ipcRenderer.invoke(IpcChannels.ScreenshotCapture, sourceId),
    analyze: (req) => ipcRenderer.invoke(IpcChannels.ScreenshotAnalyze, req)
  },

  research: {
    run: (req) => ipcRenderer.invoke(IpcChannels.ResearchRun, req)
  },

  automation: {
    list: (conversationId) => ipcRenderer.invoke(IpcChannels.AutomationList, conversationId),
    approve: (taskId) => ipcRenderer.invoke(IpcChannels.AutomationApprove, taskId),
    reject: (taskId) => ipcRenderer.invoke(IpcChannels.AutomationReject, taskId)
  },

  settings: {
    get: () => ipcRenderer.invoke(IpcChannels.SettingsGet),
    set: (update) => ipcRenderer.invoke(IpcChannels.SettingsSet, update),
    testKey: (apiKey) => ipcRenderer.invoke(IpcChannels.SettingsTestKey, apiKey)
  },

  app: {
    info: () => ipcRenderer.invoke(IpcChannels.AppInfo),
    openExternal: (url) => ipcRenderer.invoke(IpcChannels.AppOpenExternal, url),
    onNotify: (cb) => on<NotifyPayload>(IpcChannels.Notify, cb),
    onMenuAction: (cb) => on<MenuAction>(IpcChannels.MenuAction, cb)
  }
}

/** Also surface the live automation list pushed from main. */
const automationEvents = {
  onList: (cb: (tasks: import('@shared/types').AutomationTask[]) => void) =>
    on<import('@shared/types').AutomationTask[]>(IpcChannels.AutomationList, cb)
}

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('nila', api)
  contextBridge.exposeInMainWorld('nilaEvents', automationEvents)
} else {
  // Fallback for the (unused) non-isolated case.
  const g = globalThis as unknown as { nila: NilaApi; nilaEvents: typeof automationEvents }
  g.nila = api
  g.nilaEvents = automationEvents
}
