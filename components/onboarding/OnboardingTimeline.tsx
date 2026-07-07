const MILESTONES = [
  { day: 1, label: 'Orientation' },
  { day: 30, label: 'Stabilized' },
  { day: 60, label: 'Growing' },
  { day: 90, label: 'Advancing' },
]

export default function OnboardingTimeline({ day }: { day: number }) {
  const progress = Math.min(100, (day / 90) * 100)

  return (
    <div className="rounded-card border border-line bg-surface p-5 shadow-card">
      <h3 className="mb-4 font-display text-sm font-semibold text-ink">Your 90-day journey</h3>
      <div className="relative mx-2 h-1.5 rounded-full bg-line">
        <div
          className="absolute h-full rounded-full bg-accent transition-all"
          style={{ width: `${progress}%` }}
        />
        {MILESTONES.map((m) => {
          const left = (m.day / 90) * 100
          const reached = day >= m.day
          return (
            <div
              key={m.day}
              className="absolute -translate-x-1/2"
              style={{ left: `${left}%`, top: '-5px' }}
            >
              <div
                className={`h-4 w-4 rounded-full border-2 border-white shadow ${
                  reached ? 'bg-accent' : 'bg-line'
                }`}
              />
              <p className="mt-1.5 -translate-x-1/2 whitespace-nowrap pl-4 text-center text-[10px] text-muted">
                Day {m.day}
                <br />
                <span className={reached ? 'font-medium text-ink' : ''}>{m.label}</span>
              </p>
            </div>
          )
        })}
      </div>
      <div className="h-10" />
    </div>
  )
}
