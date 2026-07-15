/**
 * Native application menu. Standard roles (edit/view/window) plus Nila-specific
 * items that dispatch `MenuAction`s to the renderer over IPC, so menu items and
 * their keyboard accelerators drive the same UI actions as on-screen buttons.
 */
import { app, Menu, shell, type BrowserWindow, type MenuItemConstructorOptions } from 'electron'
import { IpcChannels } from '@shared/ipc-channels'
import type { MenuAction } from '@shared/types'

export function buildMenu(getWindow: () => BrowserWindow | null): void {
  const isMac = process.platform === 'darwin'

  const send = (action: MenuAction) => () =>
    getWindow()?.webContents.send(IpcChannels.MenuAction, action)

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { label: 'Settings…', accelerator: 'Cmd+,', click: send('settings') },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'quit' as const }
            ]
          }
        ]
      : []),
    {
      label: 'File',
      submenu: [
        { label: 'New Chat', accelerator: 'CmdOrCtrl+N', click: send('new-chat') },
        { label: 'Export Conversation…', accelerator: 'CmdOrCtrl+E', click: send('export') },
        { type: 'separator' },
        ...(isMac
          ? [{ role: 'close' as const }]
          : [
              { label: 'Settings…', accelerator: 'Ctrl+,', click: send('settings') },
              { type: 'separator' as const },
              { role: 'quit' as const }
            ])
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Memory…', accelerator: 'CmdOrCtrl+M', click: send('memory') },
        { label: 'Toggle Theme', accelerator: 'CmdOrCtrl+Shift+L', click: send('toggle-theme') },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'zoom' }, ...(isMac ? [{ role: 'front' as const }] : [])]
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Anthropic Console',
          click: () => void shell.openExternal('https://console.anthropic.com')
        }
      ]
    }
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
