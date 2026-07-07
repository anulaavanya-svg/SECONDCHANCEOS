// The product's visual signature: an employee ID badge/credential.
// Dark navy gradient card with a lanyard punch hole — reinforces the
// identity-transition theme at the heart of the product.

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'HR Administrator',
  MANAGER: 'Frontline Manager',
  EMPLOYEE: 'Team Member',
  RESEARCHER: 'Program Researcher',
}

export default function RoleBadge({
  name,
  role,
  orgName,
}: {
  name: string
  role: string
  orgName?: string
}) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div
      className="relative overflow-hidden rounded-xl p-4 pt-6 text-white shadow-card"
      style={{ background: 'linear-gradient(180deg, #1D3557 0%, #12233F 100%)' }}
    >
      {/* Lanyard punch hole */}
      <div className="absolute left-1/2 top-2 h-1.5 w-8 -translate-x-1/2 rounded-full bg-black/40 ring-1 ring-white/10" />

      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/10 font-display text-sm font-bold ring-1 ring-white/20">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-semibold">{name}</p>
          <p className="truncate text-xs text-white/60">{ROLE_LABELS[role] ?? role}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2.5">
        <span className="truncate text-[10px] uppercase tracking-wider text-white/40">
          {orgName ?? 'SecondChanceOS'}
        </span>
        <span className="font-mono text-[10px] text-accent">ACTIVE</span>
      </div>
    </div>
  )
}
