// OpportunityGraph AI — adapt a stored PotentialProfile row into the plain
// inputs the pure engines expect (matching + graph).

import type { PotentialProfile } from '@prisma/client'
import type { Constraints, Dimensions, HeldSkill, Riasec } from './types'
import type { MatchInput } from './matching'

export function profileDimensions(p: PotentialProfile): Dimensions {
  return {
    fluidReasoning: p.fluidReasoning,
    verbalReasoning: p.verbalReasoning,
    quantReasoning: p.quantReasoning,
    conscientiousness: p.conscientiousness,
    openness: p.openness,
    adaptability: p.adaptability,
    growthMindset: p.growthMindset,
    selfEfficacy: p.selfEfficacy,
    intrinsicMotivation: p.intrinsicMotivation,
  }
}

export function profileRiasec(p: PotentialProfile): Riasec {
  const v = (p.riasec ?? {}) as Partial<Riasec>
  return {
    R: Number(v.R ?? 50),
    I: Number(v.I ?? 50),
    A: Number(v.A ?? 50),
    S: Number(v.S ?? 50),
    E: Number(v.E ?? 50),
    C: Number(v.C ?? 50),
  }
}

export function profileConstraints(p: PotentialProfile): Constraints {
  return ((p.constraints ?? {}) as Constraints) || {}
}

export function profileHeldSkills(p: PotentialProfile): HeldSkill[] {
  const raw = p.declaredSkills
  if (!Array.isArray(raw)) return []
  return raw
    .filter((e): e is { skillId: string; proficiency: number } => Boolean(e) && typeof e === 'object')
    .map((e) => ({ skillId: String(e.skillId), proficiency: Number(e.proficiency) || 0 }))
}

export function profileToMatchInput(p: PotentialProfile): MatchInput {
  return {
    profile: { dimensions: profileDimensions(p), riasec: profileRiasec(p) },
    heldSkills: profileHeldSkills(p),
    constraints: profileConstraints(p),
  }
}
