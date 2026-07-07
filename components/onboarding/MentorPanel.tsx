'use client'

import Button from '@/components/ui/Button'
import { useToast } from '@/components/ui/Notification'

const CHANNEL_LABELS: Record<string, string> = {
  in_person: 'In person',
  message: 'Message',
  call: 'Call',
  email: 'Email',
}

export default function MentorPanel({
  mentorName,
  lastContactDate,
  lastChannel,
}: {
  mentorName: string | null
  lastContactDate: string | null
  lastChannel: string | null
}) {
  const { notify } = useToast()

  if (!mentorName) {
    return (
      <div className="rounded-card border border-line bg-surface p-5 shadow-card">
        <h3 className="font-display text-sm font-semibold text-ink">Your mentor</h3>
        <p className="mt-2 text-sm text-muted">
          A mentor will be assigned to you shortly. In the meantime, your manager is your first
          point of contact.
        </p>
      </div>
    )
  }

  const initials = mentorName
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="rounded-card border border-line bg-surface p-5 shadow-card">
      <h3 className="mb-3 font-display text-sm font-semibold text-ink">Your mentor</h3>
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-bold text-primary">
          {initials}
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">{mentorName}</p>
          <p className="text-xs text-muted">Peer mentor · here to help you land well</p>
        </div>
      </div>

      {lastContactDate && (
        <p className="mt-3 rounded-lg bg-bg/70 px-3 py-2 text-xs text-muted">
          Last check-in: {new Date(lastContactDate).toLocaleDateString()}
          {lastChannel ? ` · ${CHANNEL_LABELS[lastChannel] ?? lastChannel}` : ''}
        </p>
      )}

      <Button
        className="mt-4 w-full"
        variant="secondary"
        onClick={() => notify(`Message sent to ${mentorName}. They usually reply within a day.`)}
      >
        Send message
      </Button>
    </div>
  )
}
