'use client'

import { Candidate } from './types'

export default function CandidateCard({
  candidate,
  onClick,
}: {
  candidate: Candidate
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-lg border border-line bg-surface p-3 text-left shadow-card transition-shadow hover:shadow-panel focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
    >
      <p className="text-sm font-semibold text-ink">{candidate.fullName}</p>
      <p className="mt-0.5 text-xs text-muted">{candidate.roleApplied}</p>
      {candidate.assessment && (
        <div className="mt-2 flex items-center gap-2">
          <span className="font-mono text-sm font-semibold text-primary">
            {candidate.assessment.compositeScore.toFixed(1)}
          </span>
          <span className="text-[11px] text-muted">composite</span>
        </div>
      )}
    </button>
  )
}
