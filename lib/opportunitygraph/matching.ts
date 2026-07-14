// OpportunityGraph AI — Opportunity Mapping Engine (career matching).
//
// Produces a ranked, fully EXPLAINABLE set of career matches. Every match
// ships with its term breakdown and a plain-language rationale, because
// steering vulnerable users with a black box is both an ethics and a trust
// failure. This deterministic weighted model is also the baseline any future
// learning-to-rank model must beat (see docs/OPPORTUNITYGRAPH_BLUEPRINT.md).

import {
  RIASEC_KEYS,
  type CareerMatch,
  type CareerNode,
  type Constraints,
  type Dimensions,
  type HeldSkill,
  type MatchBreakdown,
  type PotentialResult,
  type Riasec,
} from './types'

// Interpretable default weights (sum = 1.00). A minus term penalizes paths the
// user realistically cannot access.
const W = {
  interest: 0.25,
  aptitude: 0.2,
  readiness: 0.2,
  growth: 0.2,
  values: 0.15,
  barrier: 0.15, // subtracted
}

const EDUCATION_COST: Record<string, number> = {
  hs: 0,
  certificate: 4000,
  associate: 12000,
  bachelor: 40000,
  graduate: 70000,
}
const EDUCATION_YEARS: Record<string, number> = {
  hs: 0,
  certificate: 0.75,
  associate: 2,
  bachelor: 4,
  graduate: 6,
}

const WAGE_REFERENCE = 110_000 // normalization ceiling for the growth term
const OUTLOOK_MULT: Record<string, number> = {
  declining: 0.6,
  stable: 0.85,
  growing: 1.0,
  'high-growth': 1.15,
}

function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0
  return Math.min(1, Math.max(0, v))
}

function cosine(a: Riasec, b: Riasec): number {
  let dot = 0
  let na = 0
  let nb = 0
  for (const k of RIASEC_KEYS) {
    dot += a[k] * b[k]
    na += a[k] * a[k]
    nb += b[k] * b[k]
  }
  if (na === 0 || nb === 0) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

// Do the user's measured strengths meet the career's cognitive/behavioral
// demands? Under-meeting a demand costs; over-meeting does not add credit.
function aptitudeFit(dims: Dimensions, demands: Partial<Dimensions>): number {
  const keys = Object.keys(demands) as (keyof Dimensions)[]
  if (keys.length === 0) return 0.7 // no stated demands → neutral-positive
  let total = 0
  for (const k of keys) {
    const target = demands[k] ?? 0
    if (target <= 0) {
      total += 1
      continue
    }
    total += clamp01(dims[k] / target)
  }
  return total / keys.length
}

// Importance-weighted fraction of the career's required skills the user already
// holds (proficiency-weighted). No declared skills → 0, which is expected: the
// roadmap engine exists precisely to close that gap.
function skillReadiness(held: HeldSkill[], required: CareerNode['skills']): number {
  if (required.length === 0) return 0.5
  const byId = new Map(held.map((h) => [h.skillId, clamp01(h.proficiency)]))
  let num = 0
  let den = 0
  for (const r of required) {
    den += r.importance
    num += r.importance * (byId.get(r.skillId) ?? 0)
  }
  return den > 0 ? num / den : 0
}

// Upward-mobility potential: median wage (normalized) scaled by outlook.
function growthPotential(career: CareerNode): number {
  const wage = career.medianWageUsd ?? 45_000
  const base = clamp01(wage / WAGE_REFERENCE)
  const mult = OUTLOOK_MULT[career.growthOutlook] ?? 0.85
  return clamp01(base * mult)
}

// Is the required education reachable within the user's declared cost and time?
function valuesFit(career: CareerNode, c: Constraints): number {
  const cost = EDUCATION_COST[career.typicalEducation] ?? 20_000
  const years = EDUCATION_YEARS[career.typicalEducation] ?? 2
  let fit = 1

  if (c.maxCostUsd !== undefined && cost > c.maxCostUsd) {
    // Scale down when the path costs more than the user can fund out of pocket.
    fit *= clamp01((c.maxCostUsd + 4000) / (cost + 4000))
  }
  if (c.weeklyHours !== undefined && years >= 4 && c.weeklyHours < 15) {
    // Very limited weekly time makes long degree paths less realistic near-term.
    fit *= 0.8
  }
  // Shorter paths get a mild reachability bonus for constrained users.
  if (years <= 1) fit = Math.min(1, fit + 0.1)
  return clamp01(fit)
}

// Access barrier the constraints make worse (e.g., costly + not need-blind).
function accessBarrier(career: CareerNode, c: Constraints): number {
  let barrier = clamp01(career.entryBarrier)
  const cost = EDUCATION_COST[career.typicalEducation] ?? 20_000
  if (c.needBlindOnly && cost > 0) barrier = Math.min(1, barrier + 0.15)
  if (c.maxCostUsd !== undefined && cost > c.maxCostUsd) barrier = Math.min(1, barrier + 0.1)
  return barrier
}

function rationaleFor(b: MatchBreakdown, career: CareerNode): string[] {
  const out: string[] = []
  const ordered: [keyof MatchBreakdown, string][] = [
    ['interest', 'Strong fit with your interest profile'],
    ['aptitude', 'Your measured strengths meet what this work demands'],
    ['growth', 'High upward-mobility potential (pay and outlook)'],
    ['readiness', 'You already hold several of the core skills'],
    ['values', 'The path is reachable within your stated constraints'],
  ]
  for (const [k, msg] of ordered) {
    if (b[k] >= 65) out.push(msg)
  }
  if (b.barrierPenalty >= 60) {
    out.push('Note: entry barrier is high — the roadmap prioritizes funded, need-blind steps')
  }
  if (out.length === 0) out.push('A balanced match across interest, aptitude, and reachability')
  return out.slice(0, 3)
}

export interface MatchInput {
  profile: Pick<PotentialResult, 'dimensions' | 'riasec'>
  heldSkills?: HeldSkill[]
  constraints?: Constraints
}

export function matchCareers(input: MatchInput, careers: CareerNode[]): CareerMatch[] {
  const held = input.heldSkills ?? []
  const constraints = input.constraints ?? {}

  const matches = careers.map((career): CareerMatch => {
    const interest = clamp01(cosine(input.profile.riasec, career.riasec))
    const aptitude = clamp01(aptitudeFit(input.profile.dimensions, career.demands))
    const readiness = clamp01(skillReadiness(held, career.skills))
    const growth = growthPotential(career)
    const values = valuesFit(career, constraints)
    const barrier = accessBarrier(career, constraints)

    const raw =
      W.interest * interest +
      W.aptitude * aptitude +
      W.readiness * readiness +
      W.growth * growth +
      W.values * values -
      W.barrier * barrier

    // raw ranges roughly [-0.15, 1.0]; map to a friendly 0-100.
    const score = Math.round(clamp01((raw + W.barrier) / (1 + W.barrier)) * 1000) / 10

    const breakdown: MatchBreakdown = {
      interest: Math.round(interest * 100),
      aptitude: Math.round(aptitude * 100),
      readiness: Math.round(readiness * 100),
      growth: Math.round(growth * 100),
      values: Math.round(values * 100),
      barrierPenalty: Math.round(barrier * 100),
    }

    return {
      careerId: career.id,
      slug: career.slug,
      title: career.title,
      score,
      breakdown,
      rationale: rationaleFor(breakdown, career),
    }
  })

  return matches.sort((a, b) => b.score - a.score)
}
