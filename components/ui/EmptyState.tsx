export default function EmptyState({
  icon = '📋',
  title,
  message,
  action,
}: {
  icon?: string
  title: string
  message?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-line bg-surface/60 px-6 py-12 text-center">
      <div className="text-3xl">{icon}</div>
      <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
      {message && <p className="max-w-sm text-sm text-muted">{message}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
