/**
 * Memory manager: browse, search, add, and delete the long-term facts Nila
 * keeps about the user. These entries are injected into the system prompt each
 * turn, so the assistant recalls them across sessions.
 */
import { useEffect, useState } from 'react'
import type { MemoryEntry, MemoryKind } from '@shared/types'
import { useApp } from '../state/store'
import { Modal } from './Modal'
import { TrashIcon } from './Icons'

const KINDS: MemoryKind[] = ['fact', 'preference', 'project', 'person', 'note']

export function MemoryPanel(): JSX.Element {
  const { setModal, notify } = useApp()
  const [entries, setEntries] = useState<MemoryEntry[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  // New-entry form
  const [kind, setKind] = useState<MemoryKind>('fact')
  const [key, setKey] = useState('')
  const [value, setValue] = useState('')

  const refresh = async (q?: string) => {
    setLoading(true)
    try {
      const list = q?.trim() ? await window.nila.memory.search(q) : await window.nila.memory.list()
      setEntries(list)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  useEffect(() => {
    const handle = window.setTimeout(() => refresh(query), 250)
    return () => window.clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const add = async () => {
    if (!key.trim() || !value.trim()) return
    await window.nila.memory.upsert({ kind, key: key.trim(), value: value.trim(), source: 'user' })
    setKey('')
    setValue('')
    notify({ level: 'success', title: 'Memory saved' })
    void refresh(query)
  }

  const remove = async (id: string) => {
    await window.nila.memory.delete(id)
    void refresh(query)
  }

  return (
    <Modal title="Nila's memory" wide onClose={() => setModal(null)}>
      <input
        className="input"
        placeholder="Search memory…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ marginBottom: 16 }}
      />

      {/* Add form */}
      <div className="field" style={{ background: 'var(--bg-panel)', padding: 14, borderRadius: 10, border: '1px solid var(--border-soft)' }}>
        <label className="field__label">Teach Nila something new</label>
        <div className="row" style={{ marginBottom: 8 }}>
          <select className="select" style={{ width: 140 }} value={kind} onChange={(e) => setKind(e.target.value as MemoryKind)}>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <input className="input" placeholder="Label (e.g. time zone)" value={key} onChange={(e) => setKey(e.target.value)} />
        </div>
        <div className="row">
          <input className="input" placeholder="Value (e.g. Pacific Time)" value={value} onChange={(e) => setValue(e.target.value)} />
          <button className="btn btn--primary" onClick={add} disabled={!key.trim() || !value.trim()}>
            Add
          </button>
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        {loading ? (
          <div className="row muted" style={{ padding: 20, justifyContent: 'center' }}>
            <span className="spinner" /> Loading…
          </div>
        ) : entries.length === 0 ? (
          <div className="muted" style={{ padding: 20, textAlign: 'center' }}>
            {query ? 'No matching memories.' : 'No memories yet. Nila will save important facts as you chat.'}
          </div>
        ) : (
          entries.map((entry) => (
            <div className="memory-item" key={entry.id}>
              <span className="memory-item__kind">{entry.kind}</span>
              <div className="memory-item__body">
                <div className="memory-item__key">{entry.key}</div>
                <div className="memory-item__value">{entry.value}</div>
              </div>
              <button className="memory-item__delete" title="Forget" onClick={() => remove(entry.id)}>
                <TrashIcon size={15} />
              </button>
            </div>
          ))
        )}
      </div>
    </Modal>
  )
}
