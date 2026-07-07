import { NextRequest, NextResponse } from 'next/server'
import { requireManager, authErrorStatus } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { ISSUE_TYPES } from '@/lib/decision-trees'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await requireManager()
    const employeeId = request.nextUrl.searchParams.get('employeeId') ?? undefined

    const actions = await prisma.managerAction.findMany({
      where: {
        employee: {
          organizationId: session.user.organizationId,
          ...(session.user.role === 'MANAGER' ? { managerId: session.user.id } : {}),
        },
        ...(employeeId ? { employeeId } : {}),
      },
      include: {
        employee: {
          select: {
            id: true,
            jobTitle: true,
            user: { select: { fullName: true } },
            candidate: { select: { fullName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(actions)
  } catch (error) {
    const status = authErrorStatus(error)
    if (status) return NextResponse.json({ error: 'Unauthorized' }, { status })
    console.error('GET /api/manager-actions failed:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// Log a decision-tree walkthrough: { employeeId, issueType, decisionPath, resolutionNote, isResolved }
export async function POST(request: NextRequest) {
  try {
    const session = await requireManager()
    const body = await request.json()

    const issueType = String(body.issueType ?? '')
    if (!ISSUE_TYPES.includes(issueType as (typeof ISSUE_TYPES)[number])) {
      return NextResponse.json({ error: 'Valid issueType is required' }, { status: 400 })
    }
    if (!Array.isArray(body.decisionPath) || body.decisionPath.length === 0) {
      return NextResponse.json({ error: 'decisionPath is required' }, { status: 400 })
    }

    // The employee must be in-org and, for managers, a direct report
    const employee = await prisma.employee.findFirst({
      where: {
        id: String(body.employeeId ?? ''),
        organizationId: session.user.organizationId,
        ...(session.user.role === 'MANAGER' ? { managerId: session.user.id } : {}),
      },
    })
    if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 })

    const action = await prisma.managerAction.create({
      data: {
        employeeId: employee.id,
        managerId: session.user.id,
        issueType,
        decisionPath: body.decisionPath.map(String),
        resolutionNote: body.resolutionNote ? String(body.resolutionNote) : null,
        isResolved: Boolean(body.isResolved),
      },
    })
    return NextResponse.json(action, { status: 201 })
  } catch (error) {
    const status = authErrorStatus(error)
    if (status) return NextResponse.json({ error: 'Unauthorized' }, { status })
    console.error('POST /api/manager-actions failed:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
