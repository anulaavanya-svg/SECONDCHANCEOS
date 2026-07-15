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
import { DEFAULT_MODEL } from '@shared/types'
import type { Services } from '../container'
import { createLogger } from '../services/logger'

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
  ipcMain.handle(IpcChannels.ChatSend, async (_e, req: ChatSendRequest) => {
    const assistantMessageId = randomUUID()
    const win = getWindow()

    // Kick off streaming without blocking the invoke response.
    void services.chat
      .stream(
        req,
        {
          onDelta: (delta) =>
            win?.webContents.send(IpcChannels.ChatStreamChunk, {
              conversationId: req.conversationId,
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
        win?.webContents.send(IpcChannels.ChatStreamDone, {
          conversationId: req.conversationId,
          message
        })
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        log.warn('chat stream failed', message)
        win?.webContents.send(IpcChannels.ChatStreamError, {
          conversationId: req.conversationId,
          message
        })
      })

    return { messageId: assistantMessageId }
  })

  ipcMain.handle(IpcChannels.ChatCancel, (_e, conversationId: string) => {
    services.chat.cancel(conversationId)
  })
}

/* ------------------------------------------------------------------ */
/* Conversations                                                       */
/* ------------------------------------------------------------------ */

function registerConversations(services: Services): void {
  ipcMain.handle(IpcChannels.ConversationList, () => services.db.listConversations())

  ipcMain.handle(IpcChannels.ConversationGet, (_e, id: string) => {
    const conversation = services.db.getConversation(id)
    if (!conversation) throw new Error('Conversation not found.')
    return { conversation, messages: services.db.getMessages(id) }
  })

  ipcMain.handle(IpcChannels.ConversationCreate, (_e, title?: string) =>
    services.db.createConversation(title?.trim() || 'New chat', services.config.getModel() ?? DEFAULT_MODEL)
  )

  ipcMain.handle(IpcChannels.ConversationRename, (_e, id: string, title: string) => {
    services.db.renameConversation(id, title)
  })

  ipcMain.handle(IpcChannels.ConversationDelete, (_e, id: string) => {
    services.db.deleteConversation(id)
  })
}

/* ------------------------------------------------------------------ */
/* Memory                                                              */
/* ------------------------------------------------------------------ */

function registerMemory(services: Services): void {
  ipcMain.handle(IpcChannels.MemoryList, () => services.db.listMemory())
  ipcMain.handle(IpcChannels.MemorySearch, (_e, query: string) => services.db.searchMemory(query))
  ipcMain.handle(IpcChannels.MemoryUpsert, (_e, entry) =>
    services.db.upsertMemory({ ...entry, source: entry.source ?? 'user' })
  )
  ipcMain.handle(IpcChannels.MemoryDelete, (_e, id: string) => services.db.deleteMemory(id))
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
}

/* ------------------------------------------------------------------ */
/* Screenshot                                                          */
/* ------------------------------------------------------------------ */

function registerScreenshot(services: Services): void {
  ipcMain.handle(IpcChannels.ScreenshotSources, () => services.screenshot.sources())
  ipcMain.handle(IpcChannels.ScreenshotCapture, (_e, sourceId?: string) =>
    services.screenshot.capture(sourceId)
  )
  ipcMain.handle(IpcChannels.ScreenshotAnalyze, (_e, req: ScreenshotAnalyzeRequest) =>
    services.chat.describeImage(req.data, req.mediaType, req.prompt, req.model)
  )
}

/* ------------------------------------------------------------------ */
/* Research                                                            */
/* ------------------------------------------------------------------ */

function registerResearch(services: Services): void {
  ipcMain.handle(IpcChannels.ResearchRun, (_e, req: ResearchRequest) => services.research.run(req))
}

/* ------------------------------------------------------------------ */
/* Automation                                                          */
/* ------------------------------------------------------------------ */

function registerAutomation(services: Services): void {
  ipcMain.handle(IpcChannels.AutomationList, (_e, conversationId?: string) =>
    services.automation.list(conversationId)
  )
  ipcMain.handle(IpcChannels.AutomationApprove, (_e, taskId: string) =>
    services.automation.approve(taskId)
  )
  ipcMain.handle(IpcChannels.AutomationReject, (_e, taskId: string) =>
    services.automation.reject(taskId)
  )
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

function registerSettings(services: Services): void {
  ipcMain.handle(IpcChannels.SettingsGet, () => services.config.toSettings())

  ipcMain.handle(IpcChannels.SettingsSet, (_e, update: SettingsUpdate) => {
    if (update.apiKey !== undefined) services.config.setApiKey(update.apiKey)
    const { apiKey: _apiKey, ...rest } = update
    services.config.update(rest)
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
