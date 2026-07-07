import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAdmin, authErrorStatus } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { seedOnboardingTasks } from '@/lib/onboarding'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

// Role-scoped listing:
//   ADMIN    → all employees in the org
//   MANAGER  → direct reports only
//   EMPLOYEE → own record only
export async function GET(_request: NextRequest) {
  try {
    const session = await requireAuth()
    const { role, id: userId, organizationId } = session.user

    let where: Prisma.EmployeeWhereInput = { organizationId }
    if (role === 'MANAGER') where = { organizationId, managerId: userId }
    else if (role === 'EMPLOYEE') where = { organizationId, userId }
    else if (role === 'RESEARCHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const employees = await prisma.employee.findMany({
      where,
      include: {
        site: { select: { name: true } },
        mentor: { select: { id: true, fullName: true } },
        manager: { select: { id: true, fullName: true } },
        user: { select: { fullName: true } },
        candidate: { select: { fullName: true } },
        onboardingTasks: { select: { id: true, isComplete: true, phase: true } },
        performanceMetrics: { orderBy: { metricDate: 'desc' }, take: 1 },
      },
      orderBy: { hireDate: 'desc' },
    })
    return NextResponse.json(employees)
  } catch (error) {
    const status = authErrorStatus(error)
    if (status) return NextResponse.json({ error: 'Unauthorized' }, { status })
    console.error('GET /api/employees failed:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin()
    const body = await request.json()
    const jobTitle = String(body.jobTitle ?? '').trim()
    if (!jobTitle) {
      return NextResponse.json({ error: 'jobTitle is required' }, { status: 400 })
    }

    const employee = await prisma.employee.create({
      data: {
        organizationId: session.user.organizationId,
        jobTitle,
        hireDate: body.hireDate ? new Date(body.hireDate) : new Date(),
        siteId: body.siteId ?? null,
        managerId: body.managerId ?? null,
        mentorId: body.mentorId ?? null,
        candidateId: body.candidateId ?? null,
        userId: body.userId ?? null,
      },
    })
    await seedOnboardingTasks(employee.id)

    return NextResponse.json(employee, { status: 201 })
  } catch (error) {
    const status = authErrorStatus(error)
    if (status) return NextResponse.json({ error: 'Unauthorized' }, { status })
    console.error('POST /api/employees failed:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
