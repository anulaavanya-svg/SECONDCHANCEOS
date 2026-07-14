import { NextResponse } from 'next/server'
import { requireResearcher, authErrorStatus } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { DIMENSION_KEYS, RIASEC_KEYS, type Constraints, type Riasec } from '@/lib/opportunitygraph/types'

export const dynamic = 'force-dynamic'

// k-anonymity threshold: no aggregate is returned for cohorts smaller than this.
const MIN_COHORT = 3

function mean(xs: number[]): number {
  if (xs.length === 0) return 0
  return Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10
}

// GET — anonymized, aggregate-only mobility insights. No individual records,
// names, or per-user rows are ever returned (data governance at the query
// layer, not just the UI).
export async function GET() {
  try {
    await requireResearcher()

    const profiles = await prisma.potentialProfile.findMany()
    const cohortSize = profiles.length

    if (cohortSize < MIN_COHORT) {
      return NextResponse.json({
        cohortSize,
        suppressed: true,
        message: `Aggregates are suppressed until at least ${MIN_COHORT} profiles exist (k-anonymity).`,
      })
    }

    // Dimension means across the cohort.
    const dimensionMeans = Object.fromEntries(
      DIMENSION_KEYS.map((k) => [k, mean(profiles.map((p) => (p as unknown as Record<string, number>)[k]))])
    )

    // HPI distribution in 20-point bands.
    const bands = ['0-20', '20-40', '40-60', '60-80', '80-100']
    const hpiDistribution = bands.map((label, i) => ({
      band: label,
      count: profiles.filter((p) => p.hpi >= i * 20 && p.hpi < (i + 1) * 20 + (i === 4 ? 1 : 0)).length,
    }))

    // Mean RIASEC shape.
    const riasecMean = Object.fromEntries(
      RIASEC_KEYS.map((k) => [
        k,
        mean(profiles.map((p) => Number((p.riasec as Partial<Riasec>)?.[k] ?? 50))),
      ])
    )

    // Reach into underserved learners (declared, aggregate only).
    const underserved = profiles.filter((p) => {
      const c = (p.constraints ?? {}) as Constraints
      return Boolean(c.firstGen || c.needBlindOnly)
    }).length

    // Roadmap / mobility signals.
    const roadmaps = await prisma.roadmap.findMany({
      include: { career: { select: { medianWageUsd: true } }, steps: { select: { status: true } } },
    })
    const stepsTotal = roadmaps.reduce((a, r) => a + r.steps.length, 0)
    const stepsDone = roadmaps.reduce(
      (a, r) => a + r.steps.filter((s) => s.status === 'DONE').length,
      0
    )

    return NextResponse.json({
      cohortSize,
      suppressed: false,
      meanHpi: mean(profiles.map((p) => p.hpi)),
      meanConfidence: mean(profiles.map((p) => p.confidence * 100)) / 100,
      dimensionMeans,
      hpiDistribution,
      riasecMean,
      underservedReachPct: Math.round((underserved / cohortSize) * 100),
      roadmapsGenerated: roadmaps.length,
      meanTargetWageUsd: Math.round(
        mean(roadmaps.map((r) => r.career.medianWageUsd ?? 0))
      ),
      stepCompletionPct: stepsTotal > 0 ? Math.round((stepsDone / stepsTotal) * 100) : 0,
    })
  } catch (error) {
    const status = authErrorStatus(error)
    if (status) return NextResponse.json({ error: 'Unauthorized' }, { status })
    console.error('GET /api/opportunitygraph/insights failed:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
