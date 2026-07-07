'use client'

import { createContext, useCallback, useContext, useState } from 'react'

interface Toast {
  id: number
  tone: 'success' | 'error' | 'info'
  message: string
}

const ToastContext = createContext<{ notify: (message: string, tone?: Toast['tone']) => void }>({
  notify: () => {},
})

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const notify = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, tone, message }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
  }, [])

  const toneStyles = {
    success: 'border-accent/30 bg-accent-light text-accent',
    error: 'border-red-200 bg-red-50 text-red-700',
    info: 'border-primary/20 bg-primary/5 text-primary',
  }

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-lg border px-4 py-2.5 text-sm font-medium shadow-card ${toneStyles[t.tone]}`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
