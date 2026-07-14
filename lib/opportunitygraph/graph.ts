// OpportunityGraph AI — knowledge-graph traversal.
//
// Operations over the People → Skills → Careers → Opportunities graph:
//   1. skillGaps        — set difference of required vs held skills (weighted)
//   2. rankOpportunities— gap-closing value × accessibility (equity enforced here)
//   3. generateRoadmap  — an ordered, affordability-constrained path to a career
//
// Accessibility is where fairness lives in the RANKING, not just the marketing:
// need-blind and free options are up-weighted; unaffordable or past-deadline
// options are filtered out.

import type { CareerNode, Constraints, HeldSkill } from './types'

export interface OpportunityNode {
  id: string
  slug: string
  title: string
  type: 'SCHOLARSHIP' | 'INTERNSHIP' | 'APPRENTICESHIP' | 'COURSE' | 'PROGRAM' | 'MENTORSHIP'
  provider: string
  costUsd: number
  needBlind: boolean
  remoteOk: boolean
  locationState: string | null
  weeklyHours: number | null
  estWeeks: number | null
  deadline: Date | null
  targetsUnderserved: boolean
  builds: { skillId: string; buildsWeight: number }[]
}

export interface SkillGap {
  skillId: string
  name: string
  importance: number // 0-1, the career-skill edge weight
  currentProficiency: number // 0-1
  gapValue: number // importance * (1 - proficiency)
}

export interface RankedOpportunity {
  opportunity: OpportunityNode
  score: number
  accessibility: number // 0-1
  gapClosingValue: number
  closesSkillIds: string[]
}

export interface GeneratedStep {
  order: number
  phase: 'foundation' | 'build' | 'launch'
  kind: 'skill' | 'opportunity' | 'milestone'
  title: string
  description: string
  estWeeks: number | null
  skillId: string | null
  opportunityId: string | null
}

export interface GeneratedRoadmap {
  horizonMonths: number
  steps: GeneratedStep[]
}

function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0
  return Math.min(1, Math.max(0, v))
}

const GAP_THRESHOLD = 0.05

/** Required skills the user has not yet mastered, weighted by importance. */
export function skillGaps(
  career: CareerNode,
  held: HeldSkill[],
  skillNames: Map<string, string>
): SkillGap[] {
  const byId = new Map(held.map((h) => [h.skillId, clamp01(h.proficiency)]))
  return career.skills
    .map((s): SkillGap => {
      const prof = byId.get(s.skillId) ?? 0
      return {
        skillId: s.skillId,
        name: skillNames.get(s.skillId) ?? s.skillId,
        importance: s.importance,
        currentProficiency: prof,
        gapValue: s.importance * (1 - prof),
      }
    })
    .filter((g) => g.gapValue > GAP_THRESHOLD)
    .sort((a, b) => b.gapValue - a.gapValue)
}

// How reachable is this opportunity for THIS user, given declared constraints?
// Returns 0 to hard-filter options that are truly out of reach.
function accessibility(opp: OpportunityNode, c: Constraints, now: Date): number {
  // Deadline already passed → not reachable.
  if (opp.deadline && opp.deadline.getTime() < now.getTime()) return 0

  const effectiveCost = opp.needBlind ? 0 : opp.costUsd

  // A user who can only take fully funded options: filter anything with real cost.
  if (c.needBlindOnly && effectiveCost > 0) return 0

  let acc = 1

  if (c.maxCostUsd !== undefined && effectiveCost > c.maxCostUsd) {
    acc *= clamp01((c.maxCostUsd + 200) / (effectiveCost + 200))
  }

  // Location: in-person option in a different state, no remote → hard to reach.
  if (!opp.remoteOk && c.locationState && opp.locationState && opp.locationState !== c.locationState) {
    acc *= 0.2
  }

  // Time budget.
  if (c.weeklyHours !== undefined && opp.weeklyHours && opp.weeklyHours > c.weeklyHours) {
    acc *= clamp01(c.weeklyHours / opp.weeklyHours)
  }

  // Deadline within two weeks is a feasibility risk (still surfaced, just lower).
  if (opp.deadline) {
    const days = (opp.deadline.getTime() - now.getTime()) / 86_400_000
    if (days < 14) acc *= 0.7
  }

  return clamp01(acc)
}

/** Rank opportunities by how much career-relevant skill gap they close, scaled
 *  by how reachable they are and a mild quality/equity multiplier. */
export function rankOpportunities(
  gaps: SkillGap[],
  opportunities: OpportunityNode[],
  constraints: Constraints = {},
  now: Date = new Date()
): RankedOpportunity[] {
  const gapById = new Map(gaps.map((g) => [g.skillId, g]))

  return opportunities
    .map((opp): RankedOpportunity => {
      let gapClosingValue = 0
      const closesSkillIds: string[] = []
      for (const b of opp.builds) {
        const g = gapById.get(b.skillId)
        if (!g) continue
        gapClosingValue += b.buildsWeight * g.gapValue
        closesSkillIds.push(b.skillId)
      }
      const acc = accessibility(opp, constraints, now)
      // Equity multiplier: options built for underserved learners get a nudge.
      const quality = 1 + (opp.targetsUnderserved ? 0.1 : 0) + (opp.needBlind ? 0.05 : 0)
      const score = gapClosingValue * acc * quality
      return { opportunity: opp, score, accessibility: acc, gapClosingValue, closesSkillIds }
    })
    .filter((r) => r.accessibility > 0 && r.gapClosingValue > 0)
    .sort((a, b) => b.score - a.score)
}

const PHASE_FOR_TYPE: Record<OpportunityNode['type'], GeneratedStep['phase']> = {
  COURSE: 'foundation',
  SCHOLARSHIP: 'foundation',
  MENTORSHIP: 'foundation',
  INTERNSHIP: 'build',
  PROGRAM: 'build',
  APPRENTICESHIP: 'build',
}

const PHASE_ORDER: Record<GeneratedStep['phase'], number> = {
  foundation: 0,
  build: 1,
  launch: 2,
}

/** Build an ordered, affordability-constrained roadmap from the user's current
 *  position to the target career: greedily select opportunities that cover the
 *  most uncovered gap, fill remaining high-value gaps with self-directed skill
 *  steps, and bookend with milestones. */
export function generateRoadmap(
  career: CareerNode,
  gaps: SkillGap[],
  ranked: RankedOpportunity[],
  opts: { maxOpportunities?: number } = {}
): GeneratedRoadmap {
  const maxOpps = opts.maxOpportunities ?? 4
  const covered = new Set<string>()
  const chosen: RankedOpportunity[] = []

  // Greedy set-cover: repeatedly take the opportunity closing the most
  // still-uncovered gap value.
  const pool = [...ranked]
  while (chosen.length < maxOpps && pool.length > 0) {
    let bestIdx = -1
    let bestMarginal = 0
    for (let i = 0; i < pool.length; i++) {
      const r = pool[i]
      let marginal = 0
      for (const sid of r.closesSkillIds) {
        if (covered.has(sid)) continue
        const g = gaps.find((x) => x.skillId === sid)
        if (g) marginal += g.gapValue
      }
      marginal *= r.accessibility
      if (marginal > bestMarginal) {
        bestMarginal = marginal
        bestIdx = i
      }
    }
    if (bestIdx === -1 || bestMarginal <= 0) break
    const [picked] = pool.splice(bestIdx, 1)
    chosen.push(picked)
    picked.closesSkillIds.forEach((sid) => covered.add(sid))
  }

  const steps: GeneratedStep[] = []

  // Milestones bookend the journey.
  steps.push({
    order: 0,
    phase: 'foundation',
    kind: 'milestone',
    title: `Commit to the path: ${career.title}`,
    description:
      'Confirm this target, set a weekly time budget, and tell one person who can hold you accountable.',
    estWeeks: 1,
    skillId: null,
    opportunityId: null,
  })

  // Opportunity steps, phased by type.
  for (const r of chosen) {
    const o = r.opportunity
    steps.push({
      order: 0,
      phase: PHASE_FOR_TYPE[o.type],
      kind: 'opportunity',
      title: o.title,
      description: `${o.provider} · ${o.needBlind ? 'Fully funded' : o.costUsd === 0 ? 'Free' : `$${o.costUsd}`}${
        r.closesSkillIds.length ? ` · builds ${r.closesSkillIds.length} of your target skills` : ''
      }.`,
      estWeeks: o.estWeeks,
      skillId: null,
      opportunityId: o.id,
    })
  }

  // Fill remaining high-value gaps with self-directed skill steps.
  const topUncovered = gaps.filter((g) => !covered.has(g.skillId)).slice(0, 3)
  for (const g of topUncovered) {
    steps.push({
      order: 0,
      phase: g.importance >= 0.7 ? 'foundation' : 'build',
      kind: 'skill',
      title: `Develop: ${g.name}`,
      description:
        'Self-directed practice with free resources, then apply it in a small real project you can show.',
      estWeeks: 4,
      skillId: g.skillId,
      opportunityId: null,
    })
  }

  // Launch milestone.
  steps.push({
    order: 0,
    phase: 'launch',
    kind: 'milestone',
    title: `Apply into ${career.title}`,
    description:
      'Package your projects and completed steps into a portfolio, line up references from the people you met, and apply to entry roles or programs.',
    estWeeks: 3,
    skillId: null,
    opportunityId: null,
  })

  // Stable ordering: by phase, then milestones first within a phase, then by weeks.
  steps.sort((a, b) => {
    if (PHASE_ORDER[a.phase] !== PHASE_ORDER[b.phase]) return PHASE_ORDER[a.phase] - PHASE_ORDER[b.phase]
    if (a.kind === 'milestone' && b.kind !== 'milestone') return a.phase === 'launch' ? 1 : -1
    if (b.kind === 'milestone' && a.kind !== 'milestone') return b.phase === 'launch' ? -1 : 1
    return (a.estWeeks ?? 0) - (b.estWeeks ?? 0)
  })
  steps.forEach((s, i) => (s.order = i + 1))

  const totalWeeks = steps.reduce((a, s) => a + (s.estWeeks ?? 0), 0)
  const horizonMonths = Math.max(3, Math.round(totalWeeks / 4.3))

  return { horizonMonths, steps }
}
