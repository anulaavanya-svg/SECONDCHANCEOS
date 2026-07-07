import { prisma } from '@/lib/prisma'

export type OnboardingPhase = 'day1' | 'd1_30' | 'd30_60' | 'd60_90'

export interface PhaseDefinition {
  phase: OnboardingPhase
  title: string
  subtitle: string
  dueByDay: number
  tasks: string[]
}

// Grounded in Self-Determination Theory: early phases build competence and
// relatedness (mentor, team); later phases build autonomy (goals, advancement).
export const ONBOARDING_PHASES: PhaseDefinition[] = [
  {
    phase: 'day1',
    title: 'Day 1 — Orientation',
    subtitle: 'Get grounded. Meet the people in your corner.',
    dueByDay: 1,
    tasks: [
      'Meet your team and site leader',
      'Review role expectations and schedule',
      'Meet your assigned mentor',
      'Complete safety and workplace basics training',
    ],
  },
  {
    phase: 'd1_30',
    title: 'Days 1-30 — Stabilization',
    subtitle: 'Build your routine. Learn where support lives.',
    dueByDay: 30,
    tasks: [
      'Weekly mentor check-ins',
      'Core skills training modules',
      'Learn where to find support resources',
      'First informal manager 1:1',
    ],
  },
  {
    phase: 'd30_60',
    title: 'Days 30-60 — Growth',
    subtitle: 'Set goals. Get feedback. Find your footing.',
    dueByDay: 60,
    tasks: [
      'Set 2-3 personal goals with your manager',
      'First formal feedback conversation',
      'Team integration activity',
      'Mid-program pulse survey',
    ],
  },
  {
    phase: 'd60_90',
    title: 'Days 60-90 — Advancement',
    subtitle: "You're building real momentum. Plan what's next.",
    dueByDay: 90,
    tasks: [
      'Advancement and skill-path conversation',
      'Retention check-in',
      'Transition to standard performance review cycle',
      '90-day reflection survey',
    ],
  },
]

export const PHASE_ORDER: OnboardingPhase[] = ['day1', 'd1_30', 'd30_60', 'd60_90']

export function phaseLabel(phase: string): string {
  return ONBOARDING_PHASES.find((p) => p.phase === phase)?.title ?? phase
}

export function stageForDay(day: number): string {
  if (day <= 30) return 'stabilization'
  if (day <= 60) return 'growth'
  if (day <= 90) return 'advancement'
  return 'complete'
}

export function daysSinceHire(hireDate: Date, now: Date = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - hireDate.getTime()) / 86_400_000))
}

/** Create the full 90-day task set for a newly hired employee. */
export async function seedOnboardingTasks(employeeId: string) {
  const data = ONBOARDING_PHASES.flatMap((phaseDef) =>
    phaseDef.tasks.map((title) => ({
      employeeId,
      phase: phaseDef.phase,
      title,
      dueByDay: phaseDef.dueByDay,
    }))
  )
  await prisma.onboardingTask.createMany({ data })
}
