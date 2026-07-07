import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, authErrorStatus } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { Session } from 'next-auth'

export const dynamic = 'force-dynamic'

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
    const employee = await findAuthorizedEmployee(session, params.id)
    if (!employee) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const tasks = await prisma.onboardingTask.findMany({
      where: { employeeId: employee.id },
      orderBy: [{ dueByDay: 'asc' }, { id: 'asc' }],
    })
    return NextResponse.json(tasks)
  } catch (error) {
    const status = authErrorStatus(error)
    if (status) return NextResponse.json({ error: 'Unauthorized' }, { status })
    console.error('GET /api/employees/[id]/onboarding failed:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// Toggle a task's completion: { taskId, isComplete }
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth()
    const employee = await findAuthorizedEmployee(session, params.id)
    if (!employee) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const taskId = String(body.taskId ?? '')
    const isComplete = Boolean(body.isComplete)
    if (!taskId) return NextResponse.json({ error: 'taskId is required' }, { status: 400 })

    const task = await prisma.onboardingTask.findFirst({
      where: { id: taskId, employeeId: employee.id },
    })
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

    const updated = await prisma.onboardingTask.update({
      where: { id: task.id },
      data: { isComplete, completedAt: isComplete ? new Date() : null },
    })
    return NextResponse.json(updated)
  } catch (error) {
    const status = authErrorStatus(error)
    if (status) return NextResponse.json({ error: 'Unauthorized' }, { status })
    console.error('PATCH /api/employees/[id]/onboarding failed:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
