/**
 * Scrollable transcript: messages, the live streaming bubble, and any
 * desktop-automation cards for the active conversation. Auto-scrolls to the
 * bottom as content grows unless the user has scrolled up to read history.
 */
import { useEffect, useRef } from 'react'
import { useApp } from '../state/store'
import { MessageBubble } from './MessageBubble'
import { AutomationCard } from './AutomationCard'

export function MessageList(): JSX.Element {
  const { messages, streaming, automation } = useApp()
  const scrollRef = useRef<HTMLDivElement>(null)
  const pinnedRef = useRef(true)

  // Track whether the user is pinned to the bottom.
  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    pinnedRef.current = distance < 120
  }

  useEffect(() => {
    if (pinnedRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streaming?.text, automation])

  const streamingMessageExists =
    streaming && messages.some((m) => m.id === streaming.messageId)

  return (
    <div className="chat" ref={scrollRef} onScroll={onScroll}>
      <div className="chat__inner">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {streaming && !streamingMessageExists && (
          <MessageBubble
            message={{
              id: streaming.messageId,
              conversationId: '',
              role: 'assistant',
              content: '',
              createdAt: new Date().toISOString()
            }}
            streaming
            streamingText={streaming.text}
          />
        )}

        {automation.map((task) => (
          <AutomationCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  )
}
