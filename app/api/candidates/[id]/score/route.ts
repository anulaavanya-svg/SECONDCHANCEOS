import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, authErrorStatus } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { clampScore, computeCompositeScore, recommendationForComposite } from '@/lib/scoring'

export const dynamic = 'force-dynamic'

// Competency-based scoring ONLY. This endpoint accepts the four competency
// dimensions and notes — criminal history is never an input to scoring.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await requireAdmin()
    const body = await request.json()

    const scores = {
      skillsScore: clampScore(Number(body.skillsScore)),
      reliabilityScore: clampScore(Number(body.reliabilityScore)),
      growthScore: clampScore(Number(body.growthScore)),
      readinessScore: clampScore(Number(body.readinessScore)),
    }
    for (const [key, value] of Object.entries(scores)) {
      if (body[key] === undefined || Number.isNaN(Number(body[key]))) {
        return NextResponse.json({ error: `${key} must be a number 0-100` }, { status: 400 })
      }
      void value
    }

    const candidate = await prisma.candidate.findFirst({
      where: { id: params.id, organizationId: session.user.organizationId },
    })
    if (!candidate) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const compositeScore = computeCompositeScore(scores)
    const recommendation = recommendationForComposite(compositeScore)
    const notes = body.notes ? String(body.notes) : null

    const assessment = await prisma.candidateAssessment.upsert({
      where: { candidateId: candidate.id },
      create: {
        candidateId: candidate.id,
        ...scores,
        compositeScore,
        recommendation,
        notes,
        assessedBy: session.user.id,
      },
      update: { ...scores, compositeScore, recommendation, notes, assessedBy: session.user.id },
    })

    if (candidate.status === 'APPLIED') {
      await prisma.candidate.update({ where: { id: candidate.id }, data: { status: 'ASSESSED' } })
    }

    return NextResponse.json(assessment, { status: 201 })
  } catch (error) {
    const status = authErrorStatus(error)
    if (status) return NextResponse.json({ error: 'Unauthorized' }, { status })
    console.error('POST /api/candidates/[id]/score failed:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
