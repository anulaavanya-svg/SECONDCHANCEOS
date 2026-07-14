import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, authErrorStatus } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { ITEMS_BY_ID, INSTRUMENT_VERSION } from '@/lib/opportunitygraph/instrument'
import { scorePotential } from '@/lib/opportunitygraph/potential'
import { loadSkillNames } from '@/lib/opportunitygraph/data'
import type { Constraints, HeldSkill, Responses } from '@/lib/opportunitygraph/types'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

// Accept only responses to known items, with sane numeric bounds. Unknown keys
// are dropped rather than trusted.
function sanitizeResponses(raw: unknown): Responses {
  const out: Responses = {}
  if (!raw || typeof raw !== 'object') return out
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    const item = ITEMS_BY_ID[id]
    if (!item) continue
    const n = Number(value)
    if (Number.isNaN(n)) continue
    if (item.kind === 'likert' || item.kind === 'interest') {
      if (n >= 1 && n <= 5) out[id] = Math.round(n)
    } else {
      const max = item.kind === 'sjt' ? item.options.length : item.options.length
      if (n >= 0 && n < max) out[id] = Math.round(n)
    }
  }
  return out
}

function sanitizeConstraints(raw: unknown): Constraints | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>
  const c: Constraints = {}
  if (r.maxCostUsd !== undefined && !Number.isNaN(Number(r.maxCostUsd)))
    c.maxCostUsd = Math.max(0, Number(r.maxCostUsd))
  if (typeof r.needBlindOnly === 'boolean') c.needBlindOnly = r.needBlindOnly
  if (typeof r.locationState === 'string') c.locationState = r.locationState.slice(0, 2).toUpperCase()
  if (typeof r.remoteOk === 'boolean') c.remoteOk = r.remoteOk
  if (r.weeklyHours !== undefined && !Number.isNaN(Number(r.weeklyHours)))
    c.weeklyHours = Math.max(0, Number(r.weeklyHours))
  if (typeof r.firstGen === 'boolean') c.firstGen = r.firstGen
  return Object.keys(c).length ? c : undefined
}

async function sanitizeSkills(raw: unknown): Promise<HeldSkill[]> {
  if (!Array.isArray(raw)) return []
  const known = await loadSkillNames()
  const out: HeldSkill[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const skillId = String((entry as Record<string, unknown>).skillId ?? '')
    if (!known.has(skillId)) continue
    const proficiency = Math.min(1, Math.max(0, Number((entry as Record<string, unknown>).proficiency ?? 0)))
    out.push({ skillId, proficiency })
  }
  return out
}

// POST — submit assessment responses, compute the HPI profile, and persist.
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    const body = await request.json().catch(() => ({}))

    const responses = sanitizeResponses(body.responses)
    if (Object.keys(responses).length < 5) {
      return NextResponse.json(
        { error: 'Please answer more of the assessment before submitting.' },
        { status: 400 }
      )
    }
    const constraints = sanitizeConstraints(body.constraints)
    const declaredSkills = await sanitizeSkills(body.declaredSkills)

    const result = scorePotential(responses, { constraints })

    const profileData = {
      fluidReasoning: result.dimensions.fluidReasoning,
      verbalReasoning: result.dimensions.verbalReasoning,
      quantReasoning: result.dimensions.quantReasoning,
      conscientiousness: result.dimensions.conscientiousness,
      openness: result.dimensions.openness,
      adaptability: result.dimensions.adaptability,
      growthMindset: result.dimensions.growthMindset,
      selfEfficacy: result.dimensions.selfEfficacy,
      intrinsicMotivation: result.dimensions.intrinsicMotivation,
      hpi: result.hpi,
      confidence: result.confidence,
      riasec: result.riasec as unknown as Prisma.InputJsonValue,
      strengths: result.strengths,
      growthLevers: result.growthLevers,
      constraints: (constraints ?? undefined) as unknown as Prisma.InputJsonValue,
      declaredSkills: declaredSkills as unknown as Prisma.InputJsonValue,
    }

    const profile = await prisma.potentialProfile.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, ...profileData },
      update: profileData,
    })

    await prisma.potentialAssessment.create({
      data: {
        userId: session.user.id,
        instrument: INSTRUMENT_VERSION,
        responses: responses as unknown as Prisma.InputJsonValue,
        derived: result as unknown as Prisma.InputJsonValue,
      },
    })

    return NextResponse.json({ profile, result }, { status: 201 })
  } catch (error) {
    const status = authErrorStatus(error)
    if (status) return NextResponse.json({ error: 'Unauthorized' }, { status })
    console.error('POST /api/opportunitygraph/assessment failed:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
