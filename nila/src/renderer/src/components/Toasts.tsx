/**
 * Transient toast notifications, driven by the app store. Used for tool-use
 * hints, automation prompts, and error surfacing.
 */
import { useApp } from '../state/store'
import { CloseIcon } from './Icons'

export function Toasts(): JSX.Element {
  const { toasts, dismissToast } = useApp()
  return (
    <div className="toasts">
      {toasts.map((toast) => (
        <div className="toast" key={toast.id}>
          <span className={`toast__dot ${toast.level}`} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="toast__title">{toast.title}</div>
            {toast.body && <div className="toast__body">{toast.body}</div>}
          </div>
          <button className="icon-btn" style={{ width: 24, height: 24 }} onClick={() => dismissToast(toast.id)}>
            <CloseIcon size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
