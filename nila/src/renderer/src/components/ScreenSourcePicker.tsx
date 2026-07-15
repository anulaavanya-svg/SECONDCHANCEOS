/**
 * Lets the user pick which screen or window to capture. Fetches available
 * sources with thumbnails and returns the chosen source id to the caller, which
 * performs the full-resolution capture.
 */
import { useEffect, useState } from 'react'
import type { CaptureSource } from '@shared/types'
import { Modal } from './Modal'

interface Props {
  onPick(sourceId: string): void
  onClose(): void
}

export function ScreenSourcePicker({ onPick, onClose }: Props): JSX.Element {
  const [sources, setSources] = useState<CaptureSource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const list = await window.nila.screenshot.sources()
        if (mounted) setSources(list)
      } catch (err) {
        if (mounted) setError(String(err))
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  return (
    <Modal title="Capture a screen or window" wide onClose={onClose}>
      {loading ? (
        <div className="row muted" style={{ padding: 24, justifyContent: 'center' }}>
          <span className="spinner" /> Finding sources…
        </div>
      ) : error ? (
        <div className="muted" style={{ padding: 16 }}>
          {error}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 12
          }}
        >
          {sources.map((source) => (
            <button
              key={source.id}
              className="suggestion"
              style={{ padding: 8 }}
              onClick={() => onPick(source.id)}
            >
              <img
                src={source.thumbnail}
                alt={source.name}
                style={{
                  width: '100%',
                  height: 110,
                  objectFit: 'cover',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  marginBottom: 6
                }}
              />
              <div
                className="suggestion__title"
                style={{ fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {source.name}
              </div>
            </button>
          ))}
        </div>
      )}
    </Modal>
  )
}
