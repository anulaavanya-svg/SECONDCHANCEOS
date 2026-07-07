'use client'

import { useEffect, useState } from 'react'

interface NotificationItem {
  id: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

export default function TopBar({ title }: { title?: string }) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  useEffect(() => {
    fetch('/api/notifications')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => Array.isArray(data) && setNotifications(data))
      .catch(() => {})
  }, [])

  const unread = notifications.filter((n) => !n.isRead).length

  async function markAllRead() {
    if (unread === 0) return
    await fetch('/api/notifications', { method: 'PATCH' }).catch(() => {})
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface/90 px-6 backdrop-blur">
      <h1 className="font-display text-base font-semibold text-ink">{title}</h1>

      <div className="relative">
        <button
          onClick={() => {
            setOpen((o) => !o)
            if (!open) markAllRead()
          }}
          aria-label="Notifications"
          className="relative rounded-lg p-2 text-muted transition-colors hover:bg-bg hover:text-ink"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-warn px-1 font-mono text-[10px] font-semibold text-white">
              {unread}
            </span>
          )}
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <div className="absolute right-0 z-40 mt-2 w-80 rounded-card border border-line bg-surface p-2 shadow-panel">
              <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted">
                Notifications
              </p>
              {notifications.length === 0 ? (
                <p className="px-3 py-4 text-sm text-muted">You&apos;re all caught up.</p>
              ) : (
                <div className="max-h-80 overflow-y-auto scroll-thin">
                  {notifications.map((n) => (
                    <div key={n.id} className="rounded-lg px-3 py-2.5 hover:bg-bg">
                      <p className="text-sm font-medium text-ink">{n.title}</p>
                      <p className="mt-0.5 text-xs text-muted">{n.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </header>
  )
}
