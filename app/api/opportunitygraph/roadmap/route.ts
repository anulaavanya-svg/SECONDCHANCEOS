import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, authErrorStatus } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { matchCareers } from '@/lib/opportunitygraph/matching'
import { skillGaps, rankOpportunities, generateRoadmap } from '@/lib/opportunitygraph/graph'
import { loadCareerNode, loadOpportunityNodes, loadSkillNames } from '@/lib/opportunitygraph/data'
import {
  profileToMatchInput,
  profileHeldSkills,
  profileConstraints,
} from '@/lib/opportunitygraph/profile-adapter'

export const dynamic = 'force-dynamic'

// GET — the signed-in user's generated roadmaps, newest first.
export async function GET() {
  try {
    const session = await requireAuth()
    const roadmaps = await prisma.roadmap.findMany({
      where: { userId: session.user.id },
      include: {
        career: { select: { title: true, slug: true } },
        steps: { orderBy: { order: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ roadmaps })
  } catch (error) {
    const status = authErrorStatus(error)
    if (status) return NextResponse.json({ error: 'Unauthorized' }, { status })
    console.error('GET /api/opportunitygraph/roadmap failed:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST { careerId } — generate and persist a personalized roadmap to a career.
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const body = await request.json().catch(() => ({}))
    const careerId = String(body.careerId ?? '')
    if (!careerId) return NextResponse.json({ error: 'careerId is required' }, { status: 400 })

    const profile = await prisma.potentialProfile.findUnique({
      where: { userId: session.user.id },
    })
    if (!profile) {
      return NextResponse.json({ error: 'Take the potential assessment first.' }, { status: 409 })
    }

    const career = await loadCareerNode(careerId)
    if (!career) return NextResponse.json({ error: 'Career not found' }, { status: 404 })

    const [opportunities, skillNames] = await Promise.all([
      loadOpportunityNodes(),
      loadSkillNames(),
    ])

    const held = profileHeldSkills(profile)
    const constraints = profileConstraints(profile)
    const gaps = skillGaps(career, held, skillNames)
    const ranked = rankOpportunities(gaps, opportunities, constraints)
    const generated = generateRoadmap(career, gaps, ranked)

    const matchScore = matchCareers(profileToMatchInput(profile), [career])[0]?.score ?? 0

    // One roadmap per user+career: replace any prior generation.
    const roadmap = await prisma.$transaction(async (tx) => {
      await tx.roadmap.deleteMany({ where: { userId: session.user.id, careerId } })
      return tx.roadmap.create({
        data: {
          userId: session.user.id,
          careerId,
          title: `Your path to ${career.title}`,
          summary: `${gaps.length} skill gaps identified · ${generated.steps.length} steps · ~${generated.horizonMonths} months`,
          matchScore,
          horizonMonths: generated.horizonMonths,
          steps: {
            create: generated.steps.map((s) => ({
              order: s.order,
              phase: s.phase,
              kind: s.kind,
              title: s.title,
              description: s.description,
              estWeeks: s.estWeeks,
              skillId: s.skillId,
              opportunityId: s.opportunityId,
            })),
          },
        },
        include: {
          career: { select: { title: true, slug: true } },
          steps: { orderBy: { order: 'asc' } },
        },
      })
    })

    return NextResponse.json({ roadmap }, { status: 201 })
  } catch (error) {
    const status = authErrorStatus(error)
    if (status) return NextResponse.json({ error: 'Unauthorized' }, { status })
    console.error('POST /api/opportunitygraph/roadmap failed:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
