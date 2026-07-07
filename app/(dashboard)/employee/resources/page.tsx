'use client'

import Card from '@/components/ui/Card'
import { useToast } from '@/components/ui/Notification'

const RESOURCES = [
  {
    icon: '🚌',
    title: 'Transportation assistance',
    description:
      'Bus passes, ride stipends, and carpool matching for getting to your shift reliably.',
    action: 'Request assistance',
  },
  {
    icon: '🎓',
    title: 'Skills training catalog',
    description:
      'Free courses in equipment operation, quality control, and lead-role readiness.',
    action: 'Browse catalog',
  },
  {
    icon: '💵',
    title: 'Financial literacy basics',
    description: 'Budgeting, banking, and building credit — practical short modules.',
    action: 'Start learning',
  },
  {
    icon: '⚖️',
    title: 'Legal-appointment accommodation',
    description:
      'Court dates and legal appointments are protected. See how to schedule around them, no questions asked.',
    action: 'Read the policy',
  },
  {
    icon: '🏠',
    title: 'Housing support directory',
    description: 'Local partners for stable housing, emergency placement, and rental guidance.',
    action: 'View directory',
  },
  {
    icon: '💚',
    title: 'Mental health resources',
    description: 'Confidential counseling and the employee assistance line, available 24/7.',
    action: 'Get support',
  },
]

export default function ResourcesPage() {
  const { notify } = useToast()

  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="font-display text-xl font-bold text-ink">Support Resources</h1>
        <p className="text-sm text-muted">
          Everything here is confidential and judgment-free. Using support is a strength, not a
          flag.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {RESOURCES.map((r) => (
          <Card key={r.title} className="flex flex-col">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/[0.07] text-xl">
              {r.icon}
            </div>
            <h3 className="font-display text-sm font-semibold text-ink">{r.title}</h3>
            <p className="mt-1 flex-1 text-sm text-muted">{r.description}</p>
            <button
              onClick={() => notify(`Request received — your program coordinator will follow up about "${r.title}".`)}
              className="mt-4 self-start text-sm font-medium text-primary hover:underline"
            >
              {r.action} →
            </button>
          </Card>
        ))}
      </div>
    </div>
  )
}
