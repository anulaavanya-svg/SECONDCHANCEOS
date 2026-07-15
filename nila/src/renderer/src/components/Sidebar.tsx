/**
 * Left rail: brand, "New chat", a search box, the time-bucketed conversation
 * list (or full-text search results), and footer shortcuts to Memory/Settings.
 */
import { useEffect, useState } from 'react'
import type { Conversation, ConversationSearchResult } from '@shared/types'
import { useApp } from '../state/store'
import { timeBucket } from '../lib/format'
import { BrainIcon, CloseIcon, PlusIcon, SettingsIcon, TrashIcon } from './Icons'

const BUCKET_ORDER = ['Today', 'Yesterday', 'Previous 7 days', 'Older'] as const

export function Sidebar(): JSX.Element {
  const { conversations, activeId, newConversation, selectConversation, deleteConversation, setModal } =
    useApp()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ConversationSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const searchMode = query.trim().length > 0

  // Debounced full-text search.
  useEffect(() => {
    if (!searchMode) {
      setResults([])
      return
    }
    let cancelled = false
    setSearching(true)
    const handle = window.setTimeout(async () => {
      try {
        const found = await window.nila.conversations.search(query)
        if (!cancelled) setResults(found)
      } finally {
        if (!cancelled) setSearching(false)
      }
    }, 200)
    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
  }, [query, searchMode])

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

      <div className="sidebar__search">
        <input
          className="sidebar__search-input"
          placeholder="Search conversations…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {searchMode && (
          <button className="sidebar__search-clear" title="Clear" onClick={() => setQuery('')}>
            <CloseIcon size={13} />
          </button>
        )}
      </div>

      <div className="sidebar__list">
        {searchMode ? (
          <SearchResults
            results={results}
            searching={searching}
            activeId={activeId}
            onSelect={selectConversation}
          />
        ) : (
          <>
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
          </>
        )}
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

function SearchResults({
  results,
  searching,
  activeId,
  onSelect
}: {
  results: ConversationSearchResult[]
  searching: boolean
  activeId: string | null
  onSelect(id: string): void
}): JSX.Element {
  if (searching && results.length === 0) {
    return (
      <div className="row muted" style={{ padding: 16, justifyContent: 'center' }}>
        <span className="spinner" /> Searching…
      </div>
    )
  }
  if (results.length === 0) {
    return (
      <div className="muted" style={{ padding: '16px 10px', fontSize: 13 }}>
        No matching conversations.
      </div>
    )
  }
  return (
    <>
      <div className="sidebar__section-label">
        {results.length} result{results.length === 1 ? '' : 's'}
      </div>
      {results.map((result) => (
        <div
          key={result.id}
          className={`conversation conversation--result ${result.id === activeId ? 'active' : ''}`}
          onClick={() => onSelect(result.id)}
        >
          <div style={{ minWidth: 0 }}>
            <div className="conversation__title">{result.title}</div>
            <div className="conversation__snippet">{result.snippet}</div>
          </div>
        </div>
      ))}
    </>
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
