import { redirect } from 'next/navigation'
import { getCurrentSession } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { daysSinceHire, stageForDay } from '@/lib/onboarding'
import EmptyState from '@/components/ui/EmptyState'
import OnboardingClient from './OnboardingClient'

export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  const session = await getCurrentSession()
  if (!session?.user) redirect('/login')

  const employee = await prisma.employee.findFirst({
    where: { organizationId: session.user.organizationId, userId: session.user.id },
    include: {
      onboardingTasks: { orderBy: [{ dueByDay: 'asc' }, { id: 'asc' }] },
      mentor: { select: { fullName: true } },
      mentorLogs: { orderBy: { contactDate: 'desc' }, take: 1 },
    },
  })

  if (!employee) {
    return (
      <div className="p-6">
        <EmptyState
          icon="🗺️"
          title="No onboarding plan yet"
          message="Your employee profile hasn't been linked to an onboarding plan. Reach out to your manager or HR to get set up."
        />
      </div>
    )
  }

  const day = daysSinceHire(employee.hireDate)

  return (
    <OnboardingClient
      employeeId={employee.id}
      firstName={session.user.name.split(' ')[0]}
      day={day}
      stage={stageForDay(day)}
      tasks={employee.onboardingTasks.map((t) => ({
        id: t.id,
        phase: t.phase,
        title: t.title,
        isComplete: t.isComplete,
      }))}
      mentorName={employee.mentor?.fullName ?? null}
      lastContactDate={employee.mentorLogs[0]?.contactDate.toISOString() ?? null}
      lastChannel={employee.mentorLogs[0]?.channel ?? null}
    />
  )
}
