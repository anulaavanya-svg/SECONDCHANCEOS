'use client'

import { useEffect } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  /** 'modal' centers the dialog; 'panel' slides over from the right */
  variant?: 'modal' | 'panel'
}

export default function Modal({ open, onClose, title, children, variant = 'modal' }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={onClose} />
      {variant === 'modal' ? (
        <div className="absolute left-1/2 top-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 px-4">
          <div className="max-h-[85vh] overflow-y-auto rounded-card border border-line bg-surface p-6 shadow-panel scroll-thin">
            <ModalHeader title={title} onClose={onClose} />
            {children}
          </div>
        </div>
      ) : (
        <div className="absolute inset-y-0 right-0 w-full max-w-xl">
          <div className="h-full overflow-y-auto border-l border-line bg-surface p-6 shadow-panel scroll-thin">
            <ModalHeader title={title} onClose={onClose} />
            {children}
          </div>
        </div>
      )}
    </div>
  )
}

function ModalHeader({ title, onClose }: { title?: string; onClose: () => void }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      {title ? <h2 className="font-display text-lg font-semibold text-ink">{title}</h2> : <span />}
      <button
        onClick={onClose}
        aria-label="Close"
        className="rounded-md p-1 text-muted transition-colors hover:bg-bg hover:text-ink"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}
