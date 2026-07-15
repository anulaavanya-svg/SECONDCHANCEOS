/**
 * Left rail: brand, "New chat", the time-bucketed conversation list, and footer
 * shortcuts to Memory and Settings.
 */
import type { Conversation } from '@shared/types'
import { useApp } from '../state/store'
import { timeBucket } from '../lib/format'
import { BrainIcon, PlusIcon, SettingsIcon, TrashIcon } from './Icons'

const BUCKET_ORDER = ['Today', 'Yesterday', 'Previous 7 days', 'Older'] as const

export function Sidebar(): JSX.Element {
  const { conversations, activeId, newConversation, selectConversation, deleteConversation, setModal } =
    useApp()

  const groups = groupConversations(conversations)

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__logo">N</div>
        <div className="sidebar__title">Nila</div>
      </div>

      <button className="sidebar__new" onClick={() => newConversation()}>
        <PlusIcon size={16} />
        New chat
      </button>

      <div className="sidebar__list">
        {conversations.length === 0 && (
          <div className="muted" style={{ padding: '16px 10px', fontSize: 13 }}>
            No conversations yet. Start one above.
          </div>
        )}
        {BUCKET_ORDER.map((bucket) => {
          const items = groups.get(bucket)
          if (!items || items.length === 0) return null
          return (
            <div key={bucket}>
              <div className="sidebar__section-label">{bucket}</div>
              {items.map((conv) => (
                <div
                  key={conv.id}
                  className={`conversation ${conv.id === activeId ? 'active' : ''}`}
                  onClick={() => selectConversation(conv.id)}
                >
                  <span className="conversation__title">{conv.title}</span>
                  <button
                    className="conversation__delete"
                    title="Delete"
                    onClick={(e) => {
                      e.stopPropagation()
                      void deleteConversation(conv.id)
                    }}
                  >
                    <TrashIcon size={14} />
                  </button>
                </div>
              ))}
            </div>
          )
        })}
      </div>

      <div className="sidebar__footer">
        <button className="sidebar__footer-btn" onClick={() => setModal('memory')}>
          <BrainIcon size={16} />
          Memory
        </button>
        <button className="sidebar__footer-btn" onClick={() => setModal('settings')}>
          <SettingsIcon size={16} />
          Settings
        </button>
      </div>
    </aside>
  )
}

function groupConversations(conversations: Conversation[]): Map<string, Conversation[]> {
  const map = new Map<string, Conversation[]>()
  for (const conv of conversations) {
    const bucket = timeBucket(conv.updatedAt)
    const list = map.get(bucket) ?? []
    list.push(conv)
    map.set(bucket, list)
  }
  return map
}
