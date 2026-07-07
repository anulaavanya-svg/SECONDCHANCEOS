import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, authErrorStatus } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { CandidateStatus } from '@prisma/client'
import { seedOnboardingTasks } from '@/lib/onboarding'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAdmin()
    const candidate = await prisma.candidate.findFirst({
      where: { id: params.id, organizationId: session.user.organizationId },
      include: { assessment: true },
    })
    if (!candidate) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(candidate)
  } catch (error) {
    const status = authErrorStatus(error)
    if (status) return NextResponse.json({ error: 'Unauthorized' }, { status })
    console.error('GET /api/candidates/[id] failed:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAdmin()
    const body = await request.json()
    const newStatus = body.status as CandidateStatus | undefined
    if (!newStatus || !Object.values(CandidateStatus).includes(newStatus)) {
      return NextResponse.json({ error: 'Valid status is required' }, { status: 400 })
    }

    const candidate = await prisma.candidate.findFirst({
      where: { id: params.id, organizationId: session.user.organizationId },
      include: { employee: { select: { id: true } } },
    })
    if (!candidate) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updated = await prisma.candidate.update({
      where: { id: candidate.id },
      data: { status: newStatus },
      include: { assessment: true },
    })

    // Hiring a candidate creates their employee record with a full 90-day plan
    if (newStatus === 'HIRED' && !candidate.employee) {
      const employee = await prisma.employee.create({
        data: {
          organizationId: session.user.organizationId,
          candidateId: candidate.id,
          jobTitle: candidate.roleApplied,
          hireDate: new Date(),
          onboardingStage: 'stabilization',
        },
      })
      await seedOnboardingTasks(employee.id)
    }

    return NextResponse.json(updated)
  } catch (error) {
    const status = authErrorStatus(error)
    if (status) return NextResponse.json({ error: 'Unauthorized' }, { status })
    console.error('PATCH /api/candidates/[id] failed:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
