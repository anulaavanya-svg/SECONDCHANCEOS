import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, authErrorStatus } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { StepStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

const VALID: StepStatus[] = [StepStatus.NOT_STARTED, StepStatus.IN_PROGRESS, StepStatus.DONE]

// PATCH { status } — update a roadmap step. This is the outcome signal that,
// aggregated over users, retrains ranking in later versions.
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth()
    const body = await request.json().catch(() => ({}))
    const status = body.status as StepStatus
    if (!VALID.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Ownership check: the step must belong to a roadmap owned by this user.
    const step = await prisma.roadmapStep.findFirst({
      where: { id: params.id, roadmap: { userId: session.user.id } },
    })
    if (!step) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updated = await prisma.roadmapStep.update({
      where: { id: step.id },
      data: {
        status,
        completedAt: status === StepStatus.DONE ? new Date() : null,
      },
    })
    return NextResponse.json({ step: updated })
  } catch (error) {
    const status = authErrorStatus(error)
    if (status) return NextResponse.json({ error: 'Unauthorized' }, { status })
    console.error('PATCH /api/opportunitygraph/steps/[id] failed:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
