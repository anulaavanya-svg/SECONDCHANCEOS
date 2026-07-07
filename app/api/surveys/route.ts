import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, authErrorStatus } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// List surveys for the org. For EMPLOYEE, includes whether they already responded.
export async function GET(_request: NextRequest) {
  try {
    const session = await requireAuth()
    if (session.user.role === 'RESEARCHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const surveys = await prisma.survey.findMany({
      where: { organizationId: session.user.organizationId },
      select: {
        id: true,
        title: true,
        waveLabel: true,
        questions: true,
        _count: { select: { responses: true } },
      },
    })

    let respondedIds = new Set<string>()
    if (session.user.role === 'EMPLOYEE') {
      const me = await prisma.employee.findFirst({
        where: { organizationId: session.user.organizationId, userId: session.user.id },
        select: { id: true },
      })
      if (me) {
        const mine = await prisma.surveyResponse.findMany({
          where: { employeeId: me.id },
          select: { surveyId: true },
        })
        respondedIds = new Set(mine.map((r) => r.surveyId))
      }
    }

    return NextResponse.json(
      surveys.map((s) => ({
        id: s.id,
        title: s.title,
        waveLabel: s.waveLabel,
        questionCount: Array.isArray(s.questions) ? (s.questions as unknown[]).length : 0,
        questions: s.questions,
        responseCount: s._count.responses,
        alreadyResponded: respondedIds.has(s.id),
      }))
    )
  } catch (error) {
    const status = authErrorStatus(error)
    if (status) return NextResponse.json({ error: 'Unauthorized' }, { status })
    console.error('GET /api/surveys failed:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// ADMIN creates a survey: { title, waveLabel, questions }
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    const body = await request.json()
    const title = String(body.title ?? '').trim()
    if (!title || !Array.isArray(body.questions)) {
      return NextResponse.json({ error: 'title and questions are required' }, { status: 400 })
    }

    const survey = await prisma.survey.create({
      data: {
        organizationId: session.user.organizationId,
        title,
        waveLabel: body.waveLabel ? String(body.waveLabel) : null,
        questions: body.questions,
      },
    })
    return NextResponse.json(survey, { status: 201 })
  } catch (error) {
    const status = authErrorStatus(error)
    if (status) return NextResponse.json({ error: 'Unauthorized' }, { status })
    console.error('POST /api/surveys failed:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
