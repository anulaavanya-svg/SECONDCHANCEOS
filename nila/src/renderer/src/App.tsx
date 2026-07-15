/**
 * Root component. Renders the sidebar + chat layout, mounts modals and toasts,
 * and shows a lightweight boot state while the store initializes.
 */
import { useApp } from './state/store'
import { Sidebar } from './components/Sidebar'
import { ChatView } from './components/ChatView'
import { SettingsModal } from './components/SettingsModal'
import { MemoryPanel } from './components/MemoryPanel'
import { CommandPalette } from './components/CommandPalette'
import { Toasts } from './components/Toasts'

export function App(): JSX.Element {
  const { ready, settings, modal } = useApp()

  if (!ready) {
    return (
      <div className="welcome">
        <div className="welcome__logo">N</div>
        <div className="row muted">
          <span className="spinner" /> Starting Nila…
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <Sidebar />
      <ChatView />

      {settings && !settings.apiKeyConfigured && <FirstRunBanner />}
      {modal === 'settings' && <SettingsModal />}
      {modal === 'memory' && <MemoryPanel />}
      {modal === 'command' && <CommandPalette />}
      <Toasts />
    </div>
  )
}

/**
 * Gentle nudge shown once when no API key is configured, opening Settings.
 */
function FirstRunBanner(): JSX.Element {
  const { setModal } = useApp()
  return (
    <div className="overlay" onMouseDown={() => setModal('settings')}>
      <div className="modal" style={{ maxWidth: 440 }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal__body" style={{ textAlign: 'center' }}>
          <div className="welcome__logo" style={{ margin: '0 auto 16px' }}>
            N
          </div>
          <h2 style={{ marginBottom: 8 }}>Welcome to Nila</h2>
          <p className="muted" style={{ marginBottom: 20 }}>
            To start chatting, add your Anthropic API key. It&apos;s stored encrypted on this device
            and never leaves your machine except to talk to Anthropic.
          </p>
          <button className="btn btn--primary" onClick={() => setModal('settings')} style={{ width: '100%' }}>
            Add API key
          </button>
        </div>
      </div>
    </div>
  )
}
