// OpportunityGraph AI — server-side data access.
//
// Bridges Prisma rows (Json columns, enums) to the framework-free node types
// the pure engines consume. Keeps API routes thin and the engines testable.

import { prisma } from '@/lib/prisma'
import type { CareerNode, Dimensions, HeldSkill, Riasec } from './types'
import type { OpportunityNode } from './graph'

const EMPTY_RIASEC: Riasec = { R: 50, I: 50, A: 50, S: 50, E: 50, C: 50 }

function asRiasec(value: unknown): Riasec {
  const v = (value ?? {}) as Partial<Riasec>
  return {
    R: Number(v.R ?? 50),
    I: Number(v.I ?? 50),
    A: Number(v.A ?? 50),
    S: Number(v.S ?? 50),
    E: Number(v.E ?? 50),
    C: Number(v.C ?? 50),
  }
}

function asDemands(value: unknown): Partial<Dimensions> {
  const v = (value ?? {}) as Record<string, unknown>
  const out: Partial<Dimensions> = {}
  for (const [k, raw] of Object.entries(v)) {
    const n = Number(raw)
    if (!Number.isNaN(n)) out[k as keyof Dimensions] = n
  }
  return out
}

/** Load every career with its weighted skill edges, mapped to engine nodes. */
export async function loadCareerNodes(): Promise<CareerNode[]> {
  const careers = await prisma.career.findMany({ include: { skills: true } })
  return careers.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    cluster: c.cluster,
    medianWageUsd: c.medianWageUsd,
    growthOutlook: c.growthOutlook,
    typicalEducation: c.typicalEducation,
    entryBarrier: c.entryBarrier,
    riasec: asRiasec(c.riasec),
    demands: asDemands(c.demands),
    skills: c.skills.map((s) => ({ skillId: s.skillId, importance: s.importance })),
  }))
}

export async function loadCareerNode(careerId: string): Promise<CareerNode | null> {
  const c = await prisma.career.findUnique({ where: { id: careerId }, include: { skills: true } })
  if (!c) return null
  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    cluster: c.cluster,
    medianWageUsd: c.medianWageUsd,
    growthOutlook: c.growthOutlook,
    typicalEducation: c.typicalEducation,
    entryBarrier: c.entryBarrier,
    riasec: asRiasec(c.riasec),
    demands: asDemands(c.demands),
    skills: c.skills.map((s) => ({ skillId: s.skillId, importance: s.importance })),
  }
}

/** Load all opportunities with their weighted skill-building edges. */
export async function loadOpportunityNodes(): Promise<OpportunityNode[]> {
  const opps = await prisma.opportunity.findMany({ include: { skills: true } })
  return opps.map((o) => ({
    id: o.id,
    slug: o.slug,
    title: o.title,
    type: o.type,
    provider: o.provider,
    costUsd: o.costUsd,
    needBlind: o.needBlind,
    remoteOk: o.remoteOk,
    locationState: o.locationState,
    weeklyHours: o.weeklyHours,
    estWeeks: o.estWeeks,
    deadline: o.deadline,
    targetsUnderserved: o.targetsUnderserved,
    builds: o.skills.map((s) => ({ skillId: s.skillId, buildsWeight: s.buildsWeight })),
  }))
}

export async function loadSkillNames(): Promise<Map<string, string>> {
  const skills = await prisma.skill.findMany({ select: { id: true, name: true } })
  return new Map(skills.map((s) => [s.id, s.name]))
}

export { EMPTY_RIASEC }
