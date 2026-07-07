'use client'

import { Candidate, PIPELINE_COLUMNS } from './types'
import CandidateCard from './CandidateCard'

export default function CandidatePipeline({
  candidates,
  onSelect,
}: {
  candidates: Candidate[]
  onSelect: (candidate: Candidate) => void
}) {
  return (
    <div className="overflow-x-auto pb-2 scroll-thin">
      <div className="flex min-w-[1080px] gap-3">
        {PIPELINE_COLUMNS.map((col) => {
          const items = candidates.filter((c) => c.status === col.status)
          return (
            <div key={col.status} className="w-1/6 min-w-[170px] rounded-card border border-line bg-bg/70 p-2.5">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  {col.label}
                </span>
                <span className="rounded-full bg-line/70 px-1.5 font-mono text-[11px] text-muted">
                  {items.length}
                </span>
              </div>
              <div className="space-y-2">
                {items.map((c) => (
                  <CandidateCard key={c.id} candidate={c} onClick={() => onSelect(c)} />
                ))}
                {items.length === 0 && (
                  <p className="px-1 py-3 text-center text-xs text-muted/70">Empty</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
