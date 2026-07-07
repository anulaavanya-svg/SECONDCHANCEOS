import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, authErrorStatus } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Submit a survey response: { responses: { [questionKey]: number | string } }
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth()
    if (session.user.role === 'RESEARCHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const survey = await prisma.survey.findFirst({
      where: { id: params.id, organizationId: session.user.organizationId },
    })
    if (!survey) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    if (!body.responses || typeof body.responses !== 'object') {
      return NextResponse.json({ error: 'responses object is required' }, { status: 400 })
    }

    // Link to the responder's employee record when one exists (used only in
    // aggregate; individual responses are never surfaced with identity)
    const me = await prisma.employee.findFirst({
      where: { organizationId: session.user.organizationId, userId: session.user.id },
      select: { id: true },
    })

    if (me) {
      const existing = await prisma.surveyResponse.findFirst({
        where: { surveyId: survey.id, employeeId: me.id },
      })
      if (existing) {
        return NextResponse.json({ error: 'You have already responded to this survey.' }, { status: 400 })
      }
    }

    const response = await prisma.surveyResponse.create({
      data: {
        surveyId: survey.id,
        employeeId: me?.id ?? null,
        responses: body.responses,
      },
    })
    return NextResponse.json({ id: response.id, submittedAt: response.submittedAt }, { status: 201 })
  } catch (error) {
    const status = authErrorStatus(error)
    if (status) return NextResponse.json({ error: 'Unauthorized' }, { status })
    console.error('POST /api/surveys/[id]/respond failed:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
