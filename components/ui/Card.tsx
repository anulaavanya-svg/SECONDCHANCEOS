import { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean
}

export default function Card({ padded = true, className = '', children, ...props }: CardProps) {
  return (
    <div
      className={`rounded-card border border-line bg-surface shadow-card ${padded ? 'p-5' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
