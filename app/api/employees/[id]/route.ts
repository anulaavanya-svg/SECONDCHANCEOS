import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, authErrorStatus } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { Session } from 'next-auth'

export const dynamic = 'force-dynamic'

// ADMIN, the employee's manager, or the employee themself.
async function findAuthorizedEmployee(session: Session, employeeId: string) {
  const { role, id: userId, organizationId } = session.user
  return prisma.employee.findFirst({
    where: {
      id: employeeId,
      organizationId,
      ...(role === 'MANAGER' ? { managerId: userId } : {}),
      ...(role === 'EMPLOYEE' ? { userId } : {}),
      ...(role === 'RESEARCHER' ? { id: 'blocked' } : {}),
    },
  })
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth()
    const authorized = await findAuthorizedEmployee(session, params.id)
    if (!authorized) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const employee = await prisma.employee.findUnique({
      where: { id: authorized.id },
      include: {
        site: { select: { name: true } },
        mentor: { select: { id: true, fullName: true } },
        manager: { select: { id: true, fullName: true } },
        user: { select: { fullName: true } },
        candidate: { select: { fullName: true } },
        onboardingTasks: { orderBy: [{ dueByDay: 'asc' }, { id: 'asc' }] },
        mentorLogs: {
          orderBy: { contactDate: 'desc' },
          include: { mentor: { select: { fullName: true } } },
        },
        managerActions: { orderBy: { createdAt: 'desc' } },
        performanceMetrics: { orderBy: { metricDate: 'desc' }, take: 3 },
      },
    })
    return NextResponse.json(employee)
  } catch (error) {
    const status = authErrorStatus(error)
    if (status) return NextResponse.json({ error: 'Unauthorized' }, { status })
    console.error('GET /api/employees/[id] failed:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth()
    if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    const authorized = await findAuthorizedEmployee(session, params.id)
    if (!authorized) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const data: Record<string, unknown> = {}
    if (typeof body.onboardingStage === 'string') data.onboardingStage = body.onboardingStage
    if (typeof body.employmentStatus === 'string') data.employmentStatus = body.employmentStatus
    if (typeof body.jobTitle === 'string') data.jobTitle = body.jobTitle
    if (body.mentorId !== undefined) data.mentorId = body.mentorId
    if (body.managerId !== undefined && session.user.role === 'ADMIN') data.managerId = body.managerId

    const updated = await prisma.employee.update({ where: { id: authorized.id }, data })
    return NextResponse.json(updated)
  } catch (error) {
    const status = authErrorStatus(error)
    if (status) return NextResponse.json({ error: 'Unauthorized' }, { status })
    console.error('PATCH /api/employees/[id] failed:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
