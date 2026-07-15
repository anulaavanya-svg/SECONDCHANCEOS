/**
 * Command palette (Cmd/Ctrl+K): fuzzy-search across app actions and open
 * conversations, navigate with the arrow keys, and run with Enter. Opened and
 * closed via the `command` modal state.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../state/store'
import { fuzzyFilter } from '../lib/fuzzy'
import {
  BrainIcon,
  PlusIcon,
  SettingsIcon,
  SparkleIcon,
  TerminalIcon
} from './Icons'

interface Command {
  id: string
  title: string
  hint?: string
  group: 'Actions' | 'Conversations'
  icon: JSX.Element
  run(): void
}

export function CommandPalette(): JSX.Element {
  const {
    conversations,
    activeId,
    setModal,
    newConversation,
    selectConversation,
    exportActiveConversation,
    toggleTheme
  } = useApp()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const commands = useMemo<Command[]>(() => {
    const actions: Command[] = [
      {
        id: 'new-chat',
        title: 'New chat',
        hint: '⌘N',
        group: 'Actions',
        icon: <PlusIcon size={16} />,
        run: () => void newConversation()
      },
      {
        id: 'export',
        title: 'Export current conversation',
        hint: '⌘E',
        group: 'Actions',
        icon: <SparkleIcon size={16} />,
        run: () => void exportActiveConversation()
      },
      {
        id: 'memory',
        title: 'Open memory',
        hint: '⌘M',
        group: 'Actions',
        icon: <BrainIcon size={16} />,
        run: () => setModal('memory')
      },
      {
        id: 'settings',
        title: 'Open settings',
        hint: '⌘,',
        group: 'Actions',
        icon: <SettingsIcon size={16} />,
        run: () => setModal('settings')
      },
      {
        id: 'toggle-theme',
        title: 'Toggle light / dark theme',
        group: 'Actions',
        icon: <TerminalIcon size={16} />,
        run: () => toggleTheme()
      }
    ]

    const convos: Command[] = conversations
      .filter((c) => c.id !== activeId)
      .slice(0, 40)
      .map((c) => ({
        id: `go-${c.id}`,
        title: c.title,
        group: 'Conversations',
        icon: <SparkleIcon size={16} />,
        run: () => void selectConversation(c.id)
      }))

    return [...actions, ...convos]
  }, [
    conversations,
    activeId,
    newConversation,
    exportActiveConversation,
    selectConversation,
    setModal,
    toggleTheme
  ])

  const filtered = useMemo(
    () => fuzzyFilter(query, commands, (c) => `${c.title} ${c.group}`),
    [query, commands]
  )

  // Keep the selection index valid whenever the result set changes.
  useEffect(() => setSelected(0), [query])

  useEffect(() => inputRef.current?.focus(), [])

  // Scroll the active item into view.
  useEffect(() => {
    const el = listRef.current?.querySelector('.palette__item.active')
    el?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  const run = (command?: Command) => {
    if (!command) return
    setModal(null)
    command.run()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      run(filtered[selected])
    } else if (e.key === 'Escape') {
      setModal(null)
    }
  }

  let lastGroup: string | null = null

  return (
    <div className="palette-overlay" onMouseDown={() => setModal(null)}>
      <div className="palette" onMouseDown={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="palette__input"
          placeholder="Type a command or search conversations…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <div className="palette__list" ref={listRef}>
          {filtered.length === 0 ? (
            <div className="palette__empty">No matching commands.</div>
          ) : (
            filtered.map((command, index) => {
              const showGroup = command.group !== lastGroup
              lastGroup = command.group
              return (
                <div key={command.id}>
                  {showGroup && <div className="palette__group">{command.group}</div>}
                  <button
                    className={`palette__item ${index === selected ? 'active' : ''}`}
                    onMouseEnter={() => setSelected(index)}
                    onClick={() => run(command)}
                  >
                    {command.icon}
                    <span className="palette__item-title">{command.title}</span>
                    {command.hint && <span className="palette__item-hint">{command.hint}</span>}
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
