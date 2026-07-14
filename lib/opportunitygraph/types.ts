// OpportunityGraph AI — shared domain types.
//
// These types are deliberately framework-free (no Prisma, no React) so the
// scoring, matching, and graph engines can be unit-tested in isolation and
// reused on both the server and, if needed, the client.

// ── Human Potential dimensions ─────────────────────────────────────────────
// Nine developable dimensions grounded in replicated psychology:
//  - Cognitive: fluid/verbal/quant reasoning (reported separately so a spike
//    in one is never masked by a weakness in another).
//  - Behavioral: Big Five-derived conscientiousness, openness, adaptability.
//  - Motivational/self-regulatory: growth mindset (Dweck), self-efficacy
//    (Bandura), intrinsic motivation (Self-Determination Theory).
export const DIMENSION_KEYS = [
  'fluidReasoning',
  'verbalReasoning',
  'quantReasoning',
  'conscientiousness',
  'openness',
  'adaptability',
  'growthMindset',
  'selfEfficacy',
  'intrinsicMotivation',
] as const

export type DimensionKey = (typeof DIMENSION_KEYS)[number]
export type Dimensions = Record<DimensionKey, number>

export const DIMENSION_LABELS: Record<DimensionKey, string> = {
  fluidReasoning: 'Fluid problem-solving',
  verbalReasoning: 'Verbal reasoning',
  quantReasoning: 'Quantitative reasoning',
  conscientiousness: 'Conscientiousness & reliability',
  openness: 'Curiosity & openness',
  adaptability: 'Adaptability & resilience',
  growthMindset: 'Growth mindset',
  selfEfficacy: 'Self-efficacy & agency',
  intrinsicMotivation: 'Intrinsic motivation',
}

// ── RIASEC / Holland vocational-interest vector ────────────────────────────
export const RIASEC_KEYS = ['R', 'I', 'A', 'S', 'E', 'C'] as const
export type RiasecKey = (typeof RIASEC_KEYS)[number]
export type Riasec = Record<RiasecKey, number>

export const RIASEC_LABELS: Record<RiasecKey, string> = {
  R: 'Realistic (building, hands-on)',
  I: 'Investigative (analyzing, research)',
  A: 'Artistic (creating, expressing)',
  S: 'Social (helping, teaching)',
  E: 'Enterprising (leading, persuading)',
  C: 'Conventional (organizing, detail)',
}

// ── Declared context (never an input to a score; only contextualizes &
//    filters). Sensitive attributes are intentionally NOT modeled here. ─────
export interface Constraints {
  maxCostUsd?: number
  needBlindOnly?: boolean
  locationState?: string
  remoteOk?: boolean
  weeklyHours?: number
  firstGen?: boolean
}

// A held or developing skill on a Person node of the graph.
export interface HeldSkill {
  skillId: string
  proficiency: number // 0-1
}

// ── Assessment instrument item shapes ──────────────────────────────────────
export interface LikertItem {
  id: string
  kind: 'likert'
  dimension: DimensionKey
  prompt: string
  reverse?: boolean
}

export interface InterestItem {
  id: string
  kind: 'interest'
  riasec: RiasecKey
  prompt: string
}

export interface SjtOption {
  label: string
  credit: number // 0-1, empirically-keyed credit toward the target dimension
}

export interface SjtItem {
  id: string
  kind: 'sjt'
  dimension: DimensionKey
  prompt: string
  options: SjtOption[]
}

export interface TaskItem {
  id: string
  kind: 'task'
  dimension: DimensionKey
  prompt: string
  options: string[]
  answerIndex: number
}

export type Item = LikertItem | InterestItem | SjtItem | TaskItem

// itemId -> response (likert value 1-5, or selected option index)
export type Responses = Record<string, number>

// ── Scoring output ─────────────────────────────────────────────────────────
export interface DimensionScore {
  key: DimensionKey
  value: number // 0-100
  confidence: number // 0-1, lower when few items answered
  itemsAnswered: number
}

export interface PotentialResult {
  dimensions: Dimensions
  dimensionDetail: DimensionScore[]
  riasec: Riasec
  hpi: number // 0-100
  confidence: number // 0-1 overall measurement confidence
  strengths: DimensionKey[]
  growthLevers: DimensionKey[]
  contextAdjusted: boolean
}

// ── Matching output ────────────────────────────────────────────────────────
export interface CareerNode {
  id: string
  slug: string
  title: string
  cluster: string
  medianWageUsd: number | null
  growthOutlook: string
  typicalEducation: string
  entryBarrier: number // 0-1
  riasec: Riasec
  demands: Partial<Dimensions>
  skills: { skillId: string; importance: number }[]
}

export interface MatchBreakdown {
  interest: number
  aptitude: number
  readiness: number
  growth: number
  values: number
  barrierPenalty: number
}

export interface CareerMatch {
  careerId: string
  slug: string
  title: string
  score: number // 0-100
  breakdown: MatchBreakdown
  rationale: string[]
}
