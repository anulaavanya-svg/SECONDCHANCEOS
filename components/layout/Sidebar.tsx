'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import RoleBadge from '@/components/layout/RoleBadge'

interface NavItem {
  href: string
  label: string
  icon: string
}

const NAV: Record<string, NavItem[]> = {
  ADMIN: [
    { href: '/admin', label: 'Dashboard', icon: '📊' },
    { href: '/admin/hiring', label: 'Hiring', icon: '🗂️' },
    { href: '/admin/opportunity', label: 'OpportunityGraph', icon: '🕸️' },
    { href: '/manager/toolkit', label: 'Manager Toolkit', icon: '🧭' },
    { href: '/researcher/console', label: 'Research', icon: '🔬' },
  ],
  MANAGER: [
    { href: '/manager/team', label: 'My Team', icon: '👥' },
    { href: '/manager/toolkit', label: 'Toolkit', icon: '🧭' },
    { href: '/manager/assistant', label: 'Coaching Assistant', icon: '💬' },
  ],
  EMPLOYEE: [
    { href: '/employee/onboarding', label: 'My 90-Day Plan', icon: '🗺️' },
    { href: '/employee/opportunity', label: 'OpportunityGraph', icon: '🕸️' },
    { href: '/employee/resources', label: 'Resources', icon: '🧰' },
    { href: '/employee/surveys', label: 'Surveys', icon: '📝' },
    { href: '/employee/assistant', label: 'Assistant', icon: '💬' },
  ],
  RESEARCHER: [{ href: '/researcher/console', label: 'Research Console', icon: '🔬' }],
}

export default function Sidebar({
  name,
  role,
  orgName,
}: {
  name: string
  role: string
  orgName?: string
}) {
  const pathname = usePathname()
  const items = NAV[role] ?? []

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-line bg-surface">
      <div className="px-5 pb-2 pt-5">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-display text-sm font-bold text-white">
            2C
          </span>
          <span className="font-display text-base font-bold text-ink">
            SecondChance<span className="text-accent">OS</span>
          </span>
        </Link>
      </div>

      <div className="px-4 py-3">
        <RoleBadge name={name} role={role} orgName={orgName} />
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2 scroll-thin">
        {items.map((item) => {
          const active =
            item.href === pathname ||
            (item.href !== '/admin' && pathname.startsWith(item.href + '/')) ||
            (item.href === '/admin' && pathname === '/admin')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active ? 'bg-primary/[0.08] text-primary' : 'text-muted hover:bg-bg hover:text-ink'
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-line p-3">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-bg hover:text-ink"
        >
          <span className="text-base leading-none">↩︎</span>
          Sign out
        </button>
      </div>
    </aside>
  )
}
