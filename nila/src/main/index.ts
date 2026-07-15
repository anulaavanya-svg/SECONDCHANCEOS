/**
 * Main-process entry point. Boots the Electron app, builds the service
 * container, wires IPC, and manages the window lifecycle.
 */
import { app, BrowserWindow, session } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createServices, type Services } from './container'
import { createMainWindow } from './window'
import { registerIpc } from './ipc'
import { buildMenu } from './menu'
import { createLogger } from './services/logger'

const log = createLogger('main')

let mainWindow: BrowserWindow | null = null
let services: Services | null = null

const getWindow = (): BrowserWindow | null => mainWindow

// Ensure a single running instance.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.secondchanceos.nila')

    // Allow screen capture prompts to resolve to the primary display.
    session.defaultSession.setDisplayMediaRequestHandler((_request, callback) => {
      callback({})
    })

    app.on('browser-window-created', (_e, win) => {
      optimizer.watchWindowShortcuts(win)
    })

    services = createServices(getWindow)
    registerIpc(services, getWindow)
    buildMenu(getWindow)

    mainWindow = createMainWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createMainWindow()
      }
    })

    log.info('Nila ready')
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('before-quit', () => {
    services?.db.close()
  })
}
