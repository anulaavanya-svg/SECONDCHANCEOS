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

export type ModalKind = 'settings' | 'memory' | null

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
  approveAutomation(id: string): Promise<void>
  rejectAutomation(id: string): Promise<void>
  saveSettings(update: Partial<Settings> & { apiKey?: string }): Promise<void>
  notify(payload: NotifyPayload): void
  dismissToast(id: number): void
  refreshConversations(): Promise<void>
}

type AppContextValue = AppState & AppActions

const AppContext = createContext<AppContextValue | null>(null)

let toastSeq = 0

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

  // Keep a ref to the active id for use inside stable IPC callbacks.
  const activeIdRef = useRef<string | null>(null)
  activeIdRef.current = activeId

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
        notify({ level: 'error', title: 'Startup error', body: String(err) })
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
    const offChunk = window.nila.chat.onChunk((chunk) => {
      if (chunk.conversationId !== activeIdRef.current) return
      setStreaming((prev) => {
        if (!prev || prev.messageId !== chunk.messageId) {
          return { messageId: chunk.messageId, text: chunk.delta, tools: [] }
        }
        return { ...prev, text: prev.text + chunk.delta }
      })
    })

    const offDone = window.nila.chat.onDone((done) => {
      void refreshConversations()
      if (done.conversationId !== activeIdRef.current) return
      setMessages((prev) => {
        const exists = prev.some((m) => m.id === done.message.id)
        return exists ? prev : [...prev, done.message]
      })
      setStreaming(null)
    })

    const offError = window.nila.chat.onError((err) => {
      setStreaming(null)
      notify({ level: 'error', title: 'Assistant error', body: err.message })
    })

    return () => {
      offChunk()
      offDone()
      offError()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshConversations, notify])

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

  /* ---- internal helpers ---- */
  const selectConversationInternal = async (id: string) => {
    setActiveId(id)
    activeIdRef.current = id
    const [{ messages: msgs }, tasks] = await Promise.all([
      window.nila.conversations.get(id),
      window.nila.automation.list(id)
    ])
    setMessages(msgs)
    setAutomation(tasks)
    setStreaming(null)
  }

  /* ---- actions ---- */
  const selectConversation = useCallback(async (id: string) => {
    await selectConversationInternal(id)
  }, [])

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
    [conversations]
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
      notify({ level: 'error', title: 'Could not send', body: String(err) })
    }
  }, [notify])

  const cancelStreaming = useCallback(() => {
    if (activeIdRef.current) void window.nila.chat.cancel(activeIdRef.current)
    setStreaming(null)
  }, [])

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
      approveAutomation,
      rejectAutomation,
      saveSettings,
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
      approveAutomation,
      rejectAutomation,
      saveSettings,
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
