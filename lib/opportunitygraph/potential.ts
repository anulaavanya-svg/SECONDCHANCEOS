// OpportunityGraph AI — Human Potential Index (HPI) scoring engine.
//
// Turns raw assessment responses into a nine-dimension profile, a RIASEC
// interest shape, and a composite HPI — each with an explicit confidence that
// widens when few items are answered (few items → wide interval → we SAY so,
// rather than faking precision).
//
// SCORING PHILOSOPHY
//  - The product-critical output is the profile SHAPE + trajectory (strengths,
//    growth levers), not a single ranking number. A lone number would recreate
//    the GPA problem the platform exists to solve.
//  - Sensitive/protected attributes are never inputs. Declared context is used
//    only for a small, capped, transparent opportunity-adjustment on
//    crystallized (knowledge-loaded) dimensions.

import {
  DIMENSION_KEYS,
  RIASEC_KEYS,
  type Constraints,
  type DimensionKey,
  type DimensionScore,
  type Dimensions,
  type Item,
  type PotentialResult,
  type Responses,
  type Riasec,
} from './types'
import { ITEMS } from './instrument'

// HPI composite weights (sum = 1.00). Conscientiousness carries the largest
// non-cognitive weight — it is the most replicated predictor of training and
// job performance (Barrick & Mount meta-analyses).
const HPI_WEIGHTS: Dimensions = {
  fluidReasoning: 0.14,
  verbalReasoning: 0.08,
  quantReasoning: 0.08,
  conscientiousness: 0.16,
  openness: 0.1,
  adaptability: 0.12,
  growthMindset: 0.11,
  selfEfficacy: 0.11,
  intrinsicMotivation: 0.1,
}

// Crystallized dimensions most sensitive to prior educational access; eligible
// for a small opportunity-adjustment when first-gen context is declared.
const CRYSTALLIZED: DimensionKey[] = ['verbalReasoning', 'quantReasoning']
const CONTEXT_BONUS_MAX = 5 // capped, transparent; never lowers any score

function clamp(v: number, lo = 0, hi = 100): number {
  if (Number.isNaN(v)) return lo
  return Math.min(hi, Math.max(lo, v))
}

function round1(v: number): number {
  return Math.round(v * 10) / 10
}

// Normalize a single item response to a 0-100 contribution for its dimension.
function scoreItem(item: Item, raw: number): number | null {
  if (raw === undefined || raw === null || Number.isNaN(raw)) return null
  switch (item.kind) {
    case 'likert': {
      // 1..5 Likert → 0..100, reverse-scored where the item is negatively keyed.
      const v = Math.min(5, Math.max(1, raw))
      const norm = ((v - 1) / 4) * 100
      return item.reverse ? 100 - norm : norm
    }
    case 'sjt': {
      const opt = item.options[raw]
      return opt ? opt.credit * 100 : null
    }
    case 'task': {
      return raw === item.answerIndex ? 100 : 0
    }
    case 'interest':
      return null // interest items feed RIASEC, not dimensions
  }
}

// Per-dimension confidence: rises with items answered, saturating.
// 0 items → 0; 1 item → ~0.55; 2 → ~0.75; 3+ → ~0.85+. Tasks are binary and
// noisier, so a dimension measured only by a single task is capped lower.
function dimensionConfidence(itemsAnswered: number, onlyBinary: boolean): number {
  if (itemsAnswered <= 0) return 0
  const base = 1 - Math.exp(-0.9 * itemsAnswered)
  const cap = onlyBinary && itemsAnswered < 2 ? 0.5 : 0.95
  return Math.min(cap, base)
}

export interface ScoreOptions {
  constraints?: Constraints
}

export function scorePotential(responses: Responses, opts: ScoreOptions = {}): PotentialResult {
  // ── Dimension scores ──────────────────────────────────────────────────────
  const detail: DimensionScore[] = DIMENSION_KEYS.map((key) => {
    const items = ITEMS.filter((it) => it.kind !== 'interest' && it.dimension === key)
    const contributions: number[] = []
    let onlyBinary = true
    for (const it of items) {
      const s = scoreItem(it, responses[it.id])
      if (s === null) continue
      if (it.kind !== 'task') onlyBinary = false
      contributions.push(s)
    }
    const answered = contributions.length
    const value = answered === 0 ? 50 : contributions.reduce((a, b) => a + b, 0) / answered
    return {
      key,
      value: clamp(value),
      confidence: dimensionConfidence(answered, onlyBinary),
      itemsAnswered: answered,
    }
  })

  // ── Optional, capped, transparent context adjustment ─────────────────────
  const firstGen = Boolean(opts.constraints?.firstGen)
  let contextAdjusted = false
  if (firstGen) {
    for (const d of detail) {
      if (CRYSTALLIZED.includes(d.key)) {
        // Opportunity-adjust upward only, proportional to remaining headroom,
        // so equal potential under unequal access reads closer to equal.
        const bonus = Math.min(CONTEXT_BONUS_MAX, (100 - d.value) * 0.08)
        if (bonus > 0) {
          d.value = clamp(d.value + bonus)
          contextAdjusted = true
        }
      }
    }
  }

  const dimensions = Object.fromEntries(
    detail.map((d) => [d.key, round1(d.value)])
  ) as Dimensions

  // ── RIASEC interest vector ───────────────────────────────────────────────
  const riasec = {} as Riasec
  for (const key of RIASEC_KEYS) {
    const items = ITEMS.filter((it) => it.kind === 'interest' && it.riasec === key)
    const vals = items
      .map((it) => responses[it.id])
      .filter((v): v is number => v !== undefined && !Number.isNaN(v))
      .map((v) => ((Math.min(5, Math.max(1, v)) - 1) / 4) * 100)
    riasec[key] = vals.length ? round1(vals.reduce((a, b) => a + b, 0) / vals.length) : 50
  }

  // ── HPI composite (confidence-weighted so unmeasured dims pull toward the
  //    prior of 50 rather than dominating the number) ───────────────────────
  let weighted = 0
  let weightSum = 0
  for (const d of detail) {
    const w = HPI_WEIGHTS[d.key] * (0.4 + 0.6 * d.confidence)
    weighted += dimensions[d.key] * w
    weightSum += w
  }
  const hpi = round1(weightSum > 0 ? weighted / weightSum : 50)

  // Overall confidence = coverage-weighted mean of per-dimension confidence.
  const overallConfidence =
    round1(
      (detail.reduce((a, d) => a + d.confidence, 0) / detail.length) * 100
    ) / 100

  // ── Strengths & growth levers ────────────────────────────────────────────
  const ranked = [...detail].sort((a, b) => b.value - a.value)
  const strengths = ranked.slice(0, 3).map((d) => d.key)
  const growthLevers = [...detail]
    .sort((a, b) => a.value - b.value)
    .slice(0, 3)
    .map((d) => d.key)

  return {
    dimensions,
    dimensionDetail: detail.map((d) => ({ ...d, value: round1(d.value), confidence: round1(d.confidence * 100) / 100 })),
    riasec,
    hpi,
    confidence: overallConfidence,
    strengths,
    growthLevers,
    contextAdjusted,
  }
}
