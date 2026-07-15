/**
 * Generic modal shell with overlay, header, and Esc-to-close. Body/footer are
 * provided by callers.
 */
import { useEffect, type ReactNode } from 'react'
import { CloseIcon } from './Icons'

interface Props {
  title: string
  onClose(): void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}

export function Modal({ title, onClose, children, footer, wide }: Props): JSX.Element {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div
        className={`modal ${wide ? 'modal--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal__header">
          <div className="modal__title">{title}</div>
          <button className="icon-btn" onClick={onClose} title="Close" aria-label="Close">
            <CloseIcon size={18} />
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>
  )
}

/** A labeled on/off toggle row used inside settings. */
export function Switch({
  label,
  desc,
  checked,
  onChange
}: {
  label: string
  desc?: string
  checked: boolean
  onChange(next: boolean): void
}): JSX.Element {
  return (
    <div className="switch">
      <div>
        <div className="switch__label">{label}</div>
        {desc && <div className="switch__desc">{desc}</div>}
      </div>
      <button
        className={`toggle ${checked ? 'on' : ''}`}
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
      >
        <span className="toggle__knob" />
      </button>
    </div>
  )
}
