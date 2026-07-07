import { redirect } from 'next/navigation'
import { getCurrentSession } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import DecisionTree from '@/components/manager/DecisionTree'
import ConversationGuide from '@/components/manager/ConversationGuide'
import TrainingModule from '@/components/manager/TrainingModule'

export const dynamic = 'force-dynamic'

export default async function ToolkitPage() {
  const session = await getCurrentSession()
  if (!session?.user) redirect('/login')

  const [employees, modules, completions] = await Promise.all([
    prisma.employee.findMany({
      where: {
        organizationId: session.user.organizationId,
        employmentStatus: 'active',
        ...(session.user.role === 'MANAGER' ? { managerId: session.user.id } : {}),
      },
      select: {
        id: true,
        jobTitle: true,
        user: { select: { fullName: true } },
        candidate: { select: { fullName: true } },
      },
      orderBy: { hireDate: 'desc' },
    }),
    prisma.trainingModule.findMany({ where: { audience: 'MANAGER' } }),
    prisma.trainingCompletion.findMany({ where: { userId: session.user.id } }),
  ])

  const completionMap = new Map(completions.map((c) => [c.moduleId, c.completedAt]))

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="font-display text-xl font-bold text-ink">Manager Toolkit</h1>
        <p className="text-sm text-muted">
          Structured decision support — coaching first, documentation always, the same standard
          for every employee.
        </p>
      </div>

      <section>
        <h2 className="mb-3 font-display text-base font-semibold text-ink">Decision trees</h2>
        <DecisionTree
          employees={employees.map((e) => ({
            id: e.id,
            name: `${e.user?.fullName ?? e.candidate?.fullName ?? 'Employee'} — ${e.jobTitle}`,
          }))}
        />
      </section>

      <section>
        <h2 className="mb-3 font-display text-base font-semibold text-ink">Conversation guides</h2>
        <ConversationGuide />
      </section>

      <section>
        <h2 className="mb-3 font-display text-base font-semibold text-ink">Your training</h2>
        <TrainingModule
          modules={modules.map((m) => ({
            id: m.id,
            title: m.title,
            description: m.description,
            completed: completionMap.has(m.id),
            completedAt: completionMap.get(m.id)?.toISOString() ?? null,
          }))}
        />
      </section>
    </div>
  )
}
