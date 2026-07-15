/**
 * Central application state for the renderer.
 *
 * Uses a small React context rather than a heavyweight state library. It owns
 * conversations, the active thread's messages, live streaming buffers, the
 * automation queue, settings, and transient UI (toasts, open modal). All IPC
 * calls funnel through the actions exposed here so components stay declarative.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react'
import type {
  AutomationTask,
  ChatMessage,
  Conversation,
  ImageAttachment,
  ModelId,
  NotifyPayload,
  Settings
} from '@shared/types'

export type ModalKind = 'settings' | 'memory' | 'command' | null

interface Toast extends NotifyPayload {
  id: number
}

interface StreamingState {
  messageId: string
  text: string
  tools: string[]
}

interface AppState {
  ready: boolean
  settings: Settings | null
  conversations: Conversation[]
  activeId: string | null
  messages: ChatMessage[]
  streaming: StreamingState | null
  automation: AutomationTask[]
  toasts: Toast[]
  modal: ModalKind
}

interface AppActions {
  setModal(modal: ModalKind): void
  newConversation(): Promise<void>
  selectConversation(id: string): Promise<void>
  deleteConversation(id: string): Promise<void>
  renameConversation(id: string, title: string): Promise<void>
  sendMessage(input: {
    content: string
    images?: ImageAttachment[]
    model: ModelId
    enableFiles: boolean
    enableResearch: boolean
    enableAutomation: boolean
  }): Promise<void>
  cancelStreaming(): void
  regenerate(): Promise<void>
  approveAutomation(id: string): Promise<void>
  rejectAutomation(id: string): Promise<void>
  saveSettings(update: Partial<Settings> & { apiKey?: string }): Promise<void>
  exportActiveConversation(): Promise<void>
  toggleTheme(): void
  notify(payload: NotifyPayload): void
  dismissToast(id: number): void
  refreshConversations(): Promise<void>
}

type AppContextValue = AppState & AppActions

const AppContext = createContext<AppContextValue | null>(null)

let toastSeq = 0

/** Strip the "Error: " prefix Electron prepends to rejected invoke messages. */
function cleanError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err)
  return message.replace(/^Error:\s*/i, '')
}

export function AppProvider({ children }: { children: ReactNode }): JSX.Element {
  const [ready, setReady] = useState(false)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streaming, setStreaming] = useState<StreamingState | null>(null)
  const [automation, setAutomation] = useState<AutomationTask[]>([])
  const [toasts, setToasts] = useState<Toast[]>([])
  const [modal, setModal] = useState<ModalKind>(null)

  // Keep refs to the latest active id / settings for use inside stable IPC
  // callbacks (menu actions, streaming subscriptions) without stale closures.
  const activeIdRef = useRef<string | null>(null)
  activeIdRef.current = activeId
  const settingsRef = useRef<Settings | null>(null)
  settingsRef.current = settings

  // Streaming deltas arrive faster than the screen refreshes; buffer them and
  // flush once per animation frame so we re-render (and re-parse Markdown) at
  // most ~60fps instead of on every token.
  const streamBufferRef = useRef<{ messageId: string; text: string } | null>(null)
  const rafRef = useRef<number | null>(null)

  const clearStreamRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    streamBufferRef.current = null
  }, [])

  const notify = useCallback((payload: NotifyPayload) => {
    const id = ++toastSeq
    setToasts((prev) => [...prev, { ...payload, id }])
    // Auto-dismiss after a few seconds.
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4500)
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const refreshConversations = useCallback(async () => {
    const list = await window.nila.conversations.list()
    setConversations(list)
  }, [])

  const applyTheme = useCallback((theme: Settings['theme']) => {
    const resolved =
      theme === 'system'
        ? window.matchMedia('(prefers-color-scheme: light)').matches
          ? 'light'
          : 'dark'
        : theme
    document.documentElement.setAttribute('data-theme', resolved)
  }, [])

  /* ---- bootstrap ---- */
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const [loadedSettings, list] = await Promise.all([
          window.nila.settings.get(),
          window.nila.conversations.list()
        ])
        if (!mounted) return
        setSettings(loadedSettings)
        applyTheme(loadedSettings.theme)
        setConversations(list)
        if (list.length > 0) {
          await selectConversationInternal(list[0].id)
        }
      } catch (err) {
        notify({ level: 'error', title: 'Startup error', body: cleanError(err) })
      } finally {
        if (mounted) setReady(true)
      }
    })()
    return () => {
      mounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---- streaming subscriptions ---- */
  useEffect(() => {
    const flush = (): void => {
      rafRef.current = null
      const buffer = streamBufferRef.current
      if (!buffer) return
      setStreaming((prev) =>
        prev && prev.messageId === buffer.messageId
          ? { ...prev, text: buffer.text }
          : { messageId: buffer.messageId, text: buffer.text, tools: [] }
      )
    }

    const offChunk = window.nila.chat.onChunk((chunk) => {
      if (chunk.conversationId !== activeIdRef.current) return
      const buffer = streamBufferRef.current
      if (buffer && buffer.messageId === chunk.messageId) {
        buffer.text += chunk.delta
      } else {
        streamBufferRef.current = { messageId: chunk.messageId, text: chunk.delta }
      }
      if (rafRef.current === null) rafRef.current = requestAnimationFrame(flush)
    })

    const offDone = window.nila.chat.onDone((done) => {
      void refreshConversations()
      clearStreamRaf()
      if (done.conversationId !== activeIdRef.current) return
      setMessages((prev) =>
        prev.some((m) => m.id === done.message.id) ? prev : [...prev, done.message]
      )
      setStreaming(null)
    })

    const offError = window.nila.chat.onError((err) => {
      clearStreamRaf()
      setStreaming(null)
      notify({ level: 'error', title: 'Assistant error', body: err.message })
    })

    return () => {
      offChunk()
      offDone()
      offError()
      clearStreamRaf()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshConversations, notify, clearStreamRaf])

  /* ---- automation + notification subscriptions ---- */
  useEffect(() => {
    const offAuto = window.nilaEvents.onList((tasks) => {
      setAutomation(tasks)
      const pending = tasks.find((t) => t.status === 'proposed')
      if (pending) {
        notify({ level: 'warning', title: 'Nila wants to run an action', body: 'Review and approve below.' })
      }
    })
    const offNotify = window.nila.app.onNotify((payload) => notify(payload))
    return () => {
      offAuto()
      offNotify()
    }
  }, [notify])

  /* ---- native menu / global shortcut actions ---- */
  useEffect(() => {
    const off = window.nila.app.onMenuAction((action) => {
      switch (action) {
        case 'new-chat':
          void newConversation()
          break
        case 'settings':
          setModal('settings')
          break
        case 'memory':
          setModal('memory')
          break
        case 'export':
          void exportActiveConversation()
          break
        case 'toggle-theme':
          toggleTheme()
          break
        case 'command-palette':
          setModal((prev) => (prev === 'command' ? null : 'command'))
          break
      }
    })
    return off
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---- internal helpers ---- */
  const selectConversationInternal = useCallback(
    async (id: string) => {
      setActiveId(id)
      activeIdRef.current = id
      const [{ messages: msgs }, tasks] = await Promise.all([
        window.nila.conversations.get(id),
        window.nila.automation.list(id)
      ])
      setMessages(msgs)
      setAutomation(tasks)
      clearStreamRaf()
      setStreaming(null)
    },
    [clearStreamRaf]
  )

  /* ---- actions ---- */
  const selectConversation = useCallback(
    async (id: string) => {
      await selectConversationInternal(id)
    },
    [selectConversationInternal]
  )

  const newConversation = useCallback(async () => {
    const conv = await window.nila.conversations.create()
    setConversations((prev) => [conv, ...prev])
    setActiveId(conv.id)
    activeIdRef.current = conv.id
    setMessages([])
    setAutomation([])
    setStreaming(null)
  }, [])

  const deleteConversation = useCallback(
    async (id: string) => {
      await window.nila.conversations.delete(id)
      const remaining = conversations.filter((c) => c.id !== id)
      setConversations(remaining)
      if (activeIdRef.current === id) {
        if (remaining.length > 0) {
          await selectConversationInternal(remaining[0].id)
        } else {
          setActiveId(null)
          activeIdRef.current = null
          setMessages([])
          setAutomation([])
        }
      }
    },
    [conversations, selectConversationInternal]
  )

  const renameConversation = useCallback(async (id: string, title: string) => {
    await window.nila.conversations.rename(id, title)
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)))
  }, [])

  const sendMessage = useCallback<AppActions['sendMessage']>(async (input) => {
    let conversationId = activeIdRef.current
    if (!conversationId) {
      const conv = await window.nila.conversations.create()
      conversationId = conv.id
      setConversations((prev) => [conv, ...prev])
      setActiveId(conv.id)
      activeIdRef.current = conv.id
    }

    // Optimistically append the user's message.
    const optimistic: ChatMessage = {
      id: `local-${Date.now()}`,
      conversationId,
      role: 'user',
      content: input.content,
      images: input.images,
      createdAt: new Date().toISOString()
    }
    setMessages((prev) => [...prev, optimistic])

    try {
      const { messageId } = await window.nila.chat.send({
        conversationId,
        content: input.content,
        images: input.images,
        model: input.model,
        enableFiles: input.enableFiles,
        enableResearch: input.enableResearch,
        enableAutomation: input.enableAutomation
      })
      setStreaming({ messageId, text: '', tools: [] })
    } catch (err) {
      // Roll back the optimistic message so the UI reflects reality.
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      notify({ level: 'error', title: 'Could not send', body: cleanError(err) })
    }
  }, [notify])

  const cancelStreaming = useCallback(() => {
    if (activeIdRef.current) void window.nila.chat.cancel(activeIdRef.current)
    clearStreamRaf()
    setStreaming(null)
  }, [clearStreamRaf])

  const regenerate = useCallback(async () => {
    const id = activeIdRef.current
    if (!id) return
    // Optimistically drop the last assistant message from the view.
    setMessages((prev) => {
      if (prev.length && prev[prev.length - 1].role === 'assistant') {
        return prev.slice(0, -1)
      }
      return prev
    })
    try {
      const { messageId } = await window.nila.chat.regenerate(id)
      setStreaming({ messageId, text: '', tools: [] })
    } catch (err) {
      notify({ level: 'error', title: 'Could not regenerate', body: cleanError(err) })
    }
  }, [notify])

  const approveAutomation = useCallback(async (id: string) => {
    await window.nila.automation.approve(id)
    if (activeIdRef.current) {
      setAutomation(await window.nila.automation.list(activeIdRef.current))
    }
  }, [])

  const rejectAutomation = useCallback(async (id: string) => {
    await window.nila.automation.reject(id)
    if (activeIdRef.current) {
      setAutomation(await window.nila.automation.list(activeIdRef.current))
    }
  }, [])

  const saveSettings = useCallback(
    async (update: Partial<Settings> & { apiKey?: string }) => {
      const next = await window.nila.settings.set(update)
      setSettings(next)
      applyTheme(next.theme)
    },
    [applyTheme]
  )

  const exportActiveConversation = useCallback(async () => {
    const id = activeIdRef.current
    if (!id) {
      notify({ level: 'warning', title: 'Nothing to export', body: 'Open a conversation first.' })
      return
    }
    try {
      const path = await window.nila.conversations.export(id)
      if (path) notify({ level: 'success', title: 'Exported', body: path })
    } catch (err) {
      notify({ level: 'error', title: 'Export failed', body: cleanError(err) })
    }
  }, [notify])

  const toggleTheme = useCallback(() => {
    const current = settingsRef.current?.theme ?? 'system'
    const next: Settings['theme'] = current === 'dark' ? 'light' : 'dark'
    void saveSettings({ theme: next })
  }, [saveSettings])

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      settings,
      conversations,
      activeId,
      messages,
      streaming,
      automation,
      toasts,
      modal,
      setModal,
      newConversation,
      selectConversation,
      deleteConversation,
      renameConversation,
      sendMessage,
      cancelStreaming,
      regenerate,
      approveAutomation,
      rejectAutomation,
      saveSettings,
      exportActiveConversation,
      toggleTheme,
      notify,
      dismissToast,
      refreshConversations
    }),
    [
      ready,
      settings,
      conversations,
      activeId,
      messages,
      streaming,
      automation,
      toasts,
      modal,
      newConversation,
      selectConversation,
      deleteConversation,
      renameConversation,
      sendMessage,
      cancelStreaming,
      regenerate,
      approveAutomation,
      rejectAutomation,
      saveSettings,
      exportActiveConversation,
      toggleTheme,
      notify,
      dismissToast,
      refreshConversations
    ]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
