/**
 * Registers every IPC handler against the service container.
 *
 * Convention: `ipcMain.handle` handlers return their data directly and throw on
 * error — Electron rejects the renderer's `invoke` promise with the message, so
 * the renderer can use ordinary try/catch. Streaming (chat) is the exception:
 * it acknowledges immediately and pushes chunks via `webContents.send`.
 */
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { randomUUID } from 'node:crypto'
import { IpcChannels } from '@shared/ipc-channels'
import type {
  AppInfo,
  ChatSendRequest,
  ResearchRequest,
  ScreenshotAnalyzeRequest,
  SettingsUpdate
} from '@shared/types'
import {
  DEFAULT_MODEL,
  MODELS,
  type ImageAttachment,
  type MemoryKind,
  type MemoryUpsertRequest
} from '@shared/types'
import type { Services } from '../container'
import { conversationToMarkdown, safeExportName } from '../services/export'
import {
  assertNoNullBytes,
  clampNumber,
  oneOf,
  optionalString,
  requireString
} from '../services/validation'
import { createLogger } from '../services/logger'

const MEMORY_KINDS: MemoryKind[] = ['fact', 'preference', 'project', 'person', 'note']
const THEMES = ['dark', 'light', 'system'] as const
const MODEL_IDS = MODELS.map((m) => m.id)

const log = createLogger('ipc')

export function registerIpc(services: Services, getWindow: () => BrowserWindow | null): void {
  registerChat(services, getWindow)
  registerConversations(services)
  registerMemory(services)
  registerFiles(services)
  registerScreenshot(services)
  registerResearch(services)
  registerAutomation(services)
  registerSettings(services)
  registerApp(services)
  log.info('IPC handlers registered')
}

/* ------------------------------------------------------------------ */
/* Chat (streaming)                                                    */
/* ------------------------------------------------------------------ */

function registerChat(services: Services, getWindow: () => BrowserWindow | null): void {
  // Shared plumbing: wire a streaming run's callbacks to the renderer and
  // return the pre-generated assistant message id immediately.
  const startStream = (
    conversationId: string,
    run: (
      cb: { onDelta(delta: string): void; onToolUse(name: string): void },
      assistantMessageId: string
    ) => Promise<ReturnType<Services['db']['addMessage']>>
  ): { messageId: string } => {
    const assistantMessageId = randomUUID()
    const win = getWindow()

    void run(
      {
        onDelta: (delta) =>
          win?.webContents.send(IpcChannels.ChatStreamChunk, {
            conversationId,
            messageId: assistantMessageId,
            delta
          }),
        onToolUse: (name) =>
          win?.webContents.send(IpcChannels.Notify, {
            level: 'info',
            title: `Using tool: ${name}`
          })
      },
      assistantMessageId
    )
      .then((message) => {
        win?.webContents.send(IpcChannels.ChatStreamDone, { conversationId, message })
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        log.warn('chat stream failed', message)
        win?.webContents.send(IpcChannels.ChatStreamError, { conversationId, message })
      })

    return { messageId: assistantMessageId }
  }

  ipcMain.handle(IpcChannels.ChatSend, (_e, req: ChatSendRequest) => {
    const clean = validateChatSend(req)
    return startStream(clean.conversationId, (cb, id) => services.chat.stream(clean, cb, id))
  })

  ipcMain.handle(IpcChannels.ChatRegenerate, (_e, conversationId: string) => {
    const id = requireString(conversationId, 'conversationId', 128)
    return startStream(id, (cb, mid) => services.chat.regenerate(id, cb, mid))
  })

  ipcMain.handle(IpcChannels.ChatCancel, (_e, conversationId: string) => {
    const id = requireString(conversationId, 'conversationId', 128)
    services.chat.cancel(id)
    // Settle any pending approval so the interrupted turn doesn't hang.
    services.automation.cancelPending(id)
  })
}

/** Max attachments and per-image base64 size (≈11 MB decoded) accepted per turn. */
const MAX_IMAGES = 8
const MAX_IMAGE_BASE64 = 15_000_000
const SUPPORTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'] as const

function validateChatSend(req: ChatSendRequest): ChatSendRequest {
  const conversationId = requireString(req?.conversationId, 'conversationId', 128)
  const content = optionalString(req?.content, 'content', 200_000)
  const images = validateImages(req?.images)
  if (!content.trim() && images.length === 0) {
    throw new Error('A message or an image is required.')
  }
  return {
    conversationId,
    content,
    images: images.length ? images : undefined,
    model: req?.model ? oneOf(req.model, MODEL_IDS, 'model') : undefined,
    enableFiles: Boolean(req?.enableFiles),
    enableResearch: Boolean(req?.enableResearch),
    enableAutomation: Boolean(req?.enableAutomation)
  }
}

function validateImages(images: unknown): ImageAttachment[] {
  if (images === undefined || images === null) return []
  if (!Array.isArray(images)) throw new Error('images must be an array.')
  if (images.length > MAX_IMAGES) {
    throw new Error(`Too many attachments (max ${MAX_IMAGES}).`)
  }
  return images.map((img: Record<string, unknown>) => {
    const data = requireString(img?.data, 'image data', MAX_IMAGE_BASE64)
    const mediaType = oneOf(img?.mediaType, SUPPORTED_IMAGE_TYPES, 'image mediaType')
    return { data, mediaType, name: img?.name ? requireString(img.name, 'image name', 256) : undefined }
  })
}

/* ------------------------------------------------------------------ */
/* Conversations                                                       */
/* ------------------------------------------------------------------ */

function registerConversations(services: Services): void {
  ipcMain.handle(IpcChannels.ConversationList, () => services.db.listConversations())

  ipcMain.handle(IpcChannels.ConversationGet, (_e, id: string) => {
    const conversation = services.db.getConversation(requireString(id, 'id', 128))
    if (!conversation) throw new Error('Conversation not found.')
    return { conversation, messages: services.db.getMessages(conversation.id) }
  })

  ipcMain.handle(IpcChannels.ConversationCreate, (_e, title?: string) =>
    services.db.createConversation(
      optionalString(title, 'title', 200).trim() || 'New chat',
      services.config.getModel() ?? DEFAULT_MODEL
    )
  )

  ipcMain.handle(IpcChannels.ConversationRename, (_e, id: string, title: string) => {
    services.db.renameConversation(
      requireString(id, 'id', 128),
      requireString(title, 'title', 200).trim() || 'Untitled'
    )
  })

  ipcMain.handle(IpcChannels.ConversationDelete, (_e, id: string) => {
    services.db.deleteConversation(requireString(id, 'id', 128))
  })

  ipcMain.handle(IpcChannels.ConversationExport, async (_e, id: string) => {
    const conversation = services.db.getConversation(requireString(id, 'id', 128))
    if (!conversation) throw new Error('Conversation not found.')
    const messages = services.db.getMessages(id)
    const markdown = conversationToMarkdown(conversation.title, messages)

    const result = await dialog.showSaveDialog({
      title: 'Export conversation',
      defaultPath: `${safeExportName(conversation.title)}.md`,
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    })
    if (result.canceled || !result.filePath) return null
    await services.files.write(result.filePath, markdown, true)
    return result.filePath
  })

  ipcMain.handle(IpcChannels.ConversationSearch, (_e, query: string) =>
    services.db.searchConversations(optionalString(query, 'query', 512))
  )
}

/* ------------------------------------------------------------------ */
/* Memory                                                              */
/* ------------------------------------------------------------------ */

function registerMemory(services: Services): void {
  ipcMain.handle(IpcChannels.MemoryList, () => services.db.listMemory())
  ipcMain.handle(IpcChannels.MemorySearch, (_e, query: string) => services.db.searchMemory(query))
  ipcMain.handle(IpcChannels.MemoryUpsert, (_e, entry: Record<string, unknown>) => {
    const validated: MemoryUpsertRequest = {
      id: entry.id ? requireString(entry.id, 'id', 128) : undefined,
      kind: oneOf(entry.kind, MEMORY_KINDS, 'kind'),
      key: assertNoNullBytes(requireString(entry.key, 'key', 512).trim(), 'key'),
      value: assertNoNullBytes(requireString(entry.value, 'value', 8_192).trim(), 'value'),
      importance: clampNumber(entry.importance, 0, 1, 0.5),
      source: 'user'
    }
    if (!validated.key || !validated.value) {
      throw new Error('Memory key and value are required.')
    }
    return services.db.upsertMemory(validated)
  })
  ipcMain.handle(IpcChannels.MemoryDelete, (_e, id: string) =>
    services.db.deleteMemory(requireString(id, 'id', 128))
  )
}

/* ------------------------------------------------------------------ */
/* Files                                                               */
/* ------------------------------------------------------------------ */

function registerFiles(services: Services): void {
  ipcMain.handle(IpcChannels.FileRead, (_e, path: string) => services.files.read(path, true))
  ipcMain.handle(IpcChannels.FileWrite, (_e, path: string, content: string) =>
    services.files.write(path, content, true)
  )
  ipcMain.handle(IpcChannels.FileList, (_e, dir: string) => services.files.list(dir, true))
  ipcMain.handle(IpcChannels.FileStat, (_e, path: string) => services.files.statPath(path, true))

  ipcMain.handle(IpcChannels.FilePickOpen, async () => {
    const result = await dialog.showOpenDialog({ properties: ['openFile'] })
    return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0]
  })

  ipcMain.handle(IpcChannels.FilePickSave, async (_e, defaultName?: string) => {
    const result = await dialog.showSaveDialog({ defaultPath: defaultName })
    return result.canceled || !result.filePath ? null : result.filePath
  })

  ipcMain.handle(IpcChannels.FilePickDirectory, async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory']
    })
    return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0]
  })
}

/* ------------------------------------------------------------------ */
/* Screenshot                                                          */
/* ------------------------------------------------------------------ */

function registerScreenshot(services: Services): void {
  ipcMain.handle(IpcChannels.ScreenshotSources, () => services.screenshot.sources())
  ipcMain.handle(IpcChannels.ScreenshotCapture, (_e, sourceId?: string) =>
    services.screenshot.capture(sourceId)
  )
  ipcMain.handle(IpcChannels.ScreenshotAnalyze, (_e, req: ScreenshotAnalyzeRequest) => {
    const data = requireString(req?.data, 'image data', MAX_IMAGE_BASE64)
    const mediaType = oneOf(req?.mediaType, SUPPORTED_IMAGE_TYPES, 'mediaType')
    const prompt = optionalString(req?.prompt, 'prompt', 4_000)
    const model = req?.model ? oneOf(req.model, MODEL_IDS, 'model') : undefined
    return services.chat.describeImage(data, mediaType, prompt || undefined, model)
  })
}

/* ------------------------------------------------------------------ */
/* Research                                                            */
/* ------------------------------------------------------------------ */

function registerResearch(services: Services): void {
  ipcMain.handle(IpcChannels.ResearchRun, (_e, req: ResearchRequest) => {
    const query = requireString(req?.query, 'query', 4_000)
    const model = req?.model ? oneOf(req.model, MODEL_IDS, 'model') : undefined
    const maxSources = clampNumber(req?.maxSources, 1, 10, 5)
    return services.research.run({ query, model, maxSources })
  })
}

/* ------------------------------------------------------------------ */
/* Automation                                                          */
/* ------------------------------------------------------------------ */

function registerAutomation(services: Services): void {
  ipcMain.handle(IpcChannels.AutomationList, (_e, conversationId?: string) =>
    services.automation.list(conversationId ? requireString(conversationId, 'conversationId', 128) : undefined)
  )
  ipcMain.handle(IpcChannels.AutomationApprove, (_e, taskId: string) =>
    services.automation.approve(requireString(taskId, 'taskId', 128))
  )
  ipcMain.handle(IpcChannels.AutomationReject, (_e, taskId: string) =>
    services.automation.reject(requireString(taskId, 'taskId', 128))
  )
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

function registerSettings(services: Services): void {
  ipcMain.handle(IpcChannels.SettingsGet, () => services.config.toSettings())

  ipcMain.handle(IpcChannels.SettingsSet, (_e, update: SettingsUpdate) => {
    if (update.apiKey !== undefined) {
      services.config.setApiKey(requireString(update.apiKey, 'apiKey', 512))
    }

    // Validate and coerce each field the renderer may set.
    const clean: Partial<SettingsUpdate> = {}
    if (update.model !== undefined) clean.model = oneOf(update.model, MODEL_IDS, 'model')
    if (update.theme !== undefined) clean.theme = oneOf(update.theme, THEMES, 'theme')
    if (update.workspaceDir !== undefined) {
      clean.workspaceDir = assertNoNullBytes(
        requireString(update.workspaceDir, 'workspaceDir', 4_096),
        'workspaceDir'
      )
    }
    if (update.persona !== undefined) clean.persona = requireString(update.persona, 'persona', 8_192)
    if (update.voiceUri !== undefined) {
      clean.voiceUri = update.voiceUri === null ? null : requireString(update.voiceUri, 'voiceUri', 512)
    }
    if (update.voiceRate !== undefined) clean.voiceRate = clampNumber(update.voiceRate, 0.5, 2, 1)
    if (update.voiceOutputEnabled !== undefined) {
      clean.voiceOutputEnabled = Boolean(update.voiceOutputEnabled)
    }
    if (update.requireAutomationApproval !== undefined) {
      clean.requireAutomationApproval = Boolean(update.requireAutomationApproval)
    }

    services.config.update(clean)
    return services.config.toSettings()
  })

  ipcMain.handle(IpcChannels.SettingsTestKey, (_e, apiKey?: string) => {
    const key = apiKey ?? services.config.getApiKey() ?? ''
    return services.clients.validate(key)
  })
}

/* ------------------------------------------------------------------ */
/* App meta                                                            */
/* ------------------------------------------------------------------ */

function registerApp(services: Services): void {
  ipcMain.handle(IpcChannels.AppInfo, (): AppInfo => {
    return {
      version: app.getVersion(),
      platform: process.platform,
      dataDir: services.config.getDataDir(),
      workspaceDir: services.config.getWorkspaceDir()
    }
  })

  ipcMain.handle(IpcChannels.AppOpenExternal, async (_e, url: string) => {
    if (!/^https?:\/\//i.test(url)) throw new Error('Only http(s) URLs may be opened.')
    await shell.openExternal(url)
  })
}
