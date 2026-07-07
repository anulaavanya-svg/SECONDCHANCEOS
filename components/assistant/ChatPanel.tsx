'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function ChatPanel({
  persona,
  title,
  subtitle,
  starters,
}: {
  persona: 'manager' | 'employee'
  title: string
  subtitle: string
  starters: string[]
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  async function send(text: string) {
    const content = text.trim()
    if (!content || loading) return
    setError('')
    setInput('')
    const history: Message[] = [...messages, { role: 'user', content }]
    setMessages(history)
    setLoading(true)

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona, messages: history }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'The assistant is unavailable right now.')
      }

      // Stream plain-text chunks into the last assistant bubble
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }])
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          setMessages((prev) => {
            const next = [...prev]
            next[next.length - 1] = {
              role: 'assistant',
              content: next[next.length - 1].content + chunk,
            }
            return next
          })
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
      setMessages((prev) => (prev[prev.length - 1]?.role === 'assistant' && prev[prev.length - 1].content === '' ? prev.slice(0, -1) : prev))
    } finally {
      setLoading(false)
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    send(input)
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="border-b border-line bg-surface px-6 py-4">
        <h1 className="font-display text-lg font-bold text-ink">{title}</h1>
        <p className="text-sm text-muted">{subtitle}</p>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5 scroll-thin">
        {messages.length === 0 ? (
          <div className="mx-auto max-w-lg pt-10 text-center">
            <div className="mb-3 text-3xl">💬</div>
            <p className="mb-6 text-sm text-muted">
              Ask anything — or start from one of these:
            </p>
            <div className="space-y-2">
              {starters.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="w-full rounded-lg border border-line bg-surface px-4 py-2.5 text-left text-sm text-ink shadow-card transition-colors hover:border-primary/40 hover:bg-primary/[0.04]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'rounded-br-sm bg-primary text-white'
                      : 'rounded-bl-sm border border-line bg-surface text-ink shadow-card'
                  }`}
                >
                  {m.content || (loading && i === messages.length - 1 ? <TypingDots /> : '')}
                </div>
              </div>
            ))}
            {loading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm border border-line bg-surface px-4 py-3 shadow-card">
                  <TypingDots />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="mx-6 mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <form onSubmit={onSubmit} className="border-t border-line bg-surface px-6 py-4">
        <div className="mx-auto flex max-w-2xl gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question…"
            className="flex-1 rounded-lg border border-line bg-white px-4 py-2.5 text-sm text-ink placeholder:text-muted/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-light disabled:cursor-not-allowed disabled:bg-primary/50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
}

function TypingDots() {
  return (
    <span className="inline-flex gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  )
}
