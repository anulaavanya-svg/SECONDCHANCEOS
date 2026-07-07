'use client'

import { useState } from 'react'

const GUIDES = [
  {
    title: 'Opening a coaching conversation',
    why: 'A non-punitive opening keeps the employee out of threat response, so you get real information instead of defensiveness.',
    script:
      '"Thanks for making time. This isn\'t a disciplinary conversation — I want to understand how things are going and figure out what would help. What\'s been working for you so far? What\'s been harder than expected?"',
  },
  {
    title: 'Giving feedback (strength-based, specific)',
    why: 'Anchoring feedback in an observed strength makes the correction feel like investment, which sustains motivation and effort.',
    script:
      '"Your assembly quality has been consistently strong — your error rate is one of the lowest on the line. I want to work on pace next. On yesterday\'s shift the takt fell behind by about 15 minutes. Let\'s look at what slowed things down and what would fix it."',
  },
  {
    title: 'Setting expectations without triggering shame',
    why: 'Framing expectations as universal standards — not personal doubts — protects identity and avoids the shame spiral that predicts disengagement.',
    script:
      '"I hold everyone on this team to the same standard: shifts start at 6, and if something comes up, I need a call before start time. That\'s the same deal for every person here. Is there anything that would make that hard for you, so we can solve it now?"',
  },
  {
    title: 'Responding to disclosures of hardship',
    why: 'The first response to a disclosure determines whether the employee ever brings a problem to you again. Listen, normalize, and route to resources — don\'t investigate.',
    script:
      '"I appreciate you telling me — that took some trust. You don\'t owe me the details. Let\'s focus on what would help: we have a transportation stipend and a legal-appointment policy that covers this. Want me to connect you with the right person today?"',
  },
]

export default function ConversationGuide() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <div className="space-y-2">
      {GUIDES.map((g, i) => (
        <div key={g.title} className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="flex w-full items-center justify-between px-5 py-3.5 text-left"
          >
            <span className="text-sm font-semibold text-ink">{g.title}</span>
            <span className={`text-muted transition-transform ${open === i ? 'rotate-180' : ''}`}>⌄</span>
          </button>
          {open === i && (
            <div className="border-t border-line px-5 py-4">
              <p className="mb-3 text-xs text-muted">
                <span className="font-semibold uppercase tracking-wider">Why it works: </span>
                {g.why}
              </p>
              <blockquote className="rounded-lg border-l-2 border-accent bg-accent-light/50 px-4 py-3 text-sm italic leading-relaxed text-ink">
                {g.script}
              </blockquote>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
