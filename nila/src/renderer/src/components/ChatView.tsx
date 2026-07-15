/**
 * The main conversation pane: topbar, transcript (or welcome screen), and the
 * composer. Owns the "seeded prompt" state so welcome suggestions can prefill
 * the composer.
 */
import { useState } from 'react'
import { MODELS } from '@shared/types'
import { useApp } from '../state/store'
import { MessageList } from './MessageList'
import { Composer } from './Composer'
import { Welcome } from './Welcome'

export function ChatView(): JSX.Element {
  const { activeId, conversations, messages, settings, exportActiveConversation } = useApp()
  const [seed, setSeed] = useState<string | undefined>()

  const active = conversations.find((c) => c.id === activeId)
  const modelLabel =
    MODELS.find((m) => m.id === (active?.model ?? settings?.model))?.label ?? 'Nila'
  const hasContent = messages.length > 0

  return (
    <main className="main">
      <div className="topbar">
        <div className="topbar__title">{active?.title ?? 'New chat'}</div>
        <div className="topbar__actions">
          <span className="pill">{modelLabel}</span>
          {hasContent && (
            <button className="btn btn--ghost" onClick={() => exportActiveConversation()} title="Export to Markdown (Ctrl/Cmd+E)">
              Export
            </button>
          )}
        </div>
      </div>

      {hasContent ? <MessageList /> : <Welcome onPick={(prompt) => setSeed(prompt)} />}

      <Composer seededPrompt={seed} onConsumeSeed={() => setSeed(undefined)} />
    </main>
  )
}
