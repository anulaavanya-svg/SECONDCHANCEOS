// Competency-based candidate scoring.
//
// SECURITY CONSTRAINT: scoring accepts ONLY the four competency dimensions.
// Criminal history is never an input to any score — compliance adjudication
// is a fully separate flow (see ComplianceRecord in the schema).

export interface AssessmentScores {
  skillsScore: number
  reliabilityScore: number
  growthScore: number
  readinessScore: number
}

export type Recommendation = 'recommended' | 'recommended_with_support' | 'needs_review'

const WEIGHTS = {
  skillsScore: 0.3,
  reliabilityScore: 0.3,
  growthScore: 0.2,
  readinessScore: 0.2,
} as const

export function clampScore(value: number): number {
  if (Number.isNaN(value)) return 0
  return Math.min(100, Math.max(0, value))
}

export function computeCompositeScore(scores: AssessmentScores): number {
  const composite =
    clampScore(scores.skillsScore) * WEIGHTS.skillsScore +
    clampScore(scores.reliabilityScore) * WEIGHTS.reliabilityScore +
    clampScore(scores.growthScore) * WEIGHTS.growthScore +
    clampScore(scores.readinessScore) * WEIGHTS.readinessScore
  return Math.round(composite * 10) / 10
}

export function recommendationForComposite(composite: number): Recommendation {
  if (composite >= 75) return 'recommended'
  if (composite >= 55) return 'recommended_with_support'
  return 'needs_review'
}

export const RECOMMENDATION_LABELS: Record<Recommendation, string> = {
  recommended: 'Recommended',
  recommended_with_support: 'Recommended with support',
  needs_review: 'Needs review',
}
