type Tone = 'default' | 'success' | 'warn' | 'danger' | 'info' | 'neutral'

const tones: Record<Tone, string> = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-accent-light text-accent',
  warn: 'bg-warn-light text-warn',
  danger: 'bg-red-50 text-red-700',
  info: 'bg-blue-50 text-blue-700',
  neutral: 'bg-gray-100 text-gray-600',
}

export default function Badge({
  tone = 'default',
  children,
  className = '',
}: {
  tone?: Tone
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  )
}
