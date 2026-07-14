// OpportunityGraph AI — the HPI-v1 assessment instrument.
//
// Item mix by design:
//  - Situational Judgment Tests (SJTs): predict performance with SMALLER
//    subgroup differences than pure cognitive tests — an equity property.
//  - Short validated self-report scales (Big Five / grit / mindset / efficacy).
//  - Light reasoning tasks (fluid/verbal/quant), time-boxed.
//  - RIASEC interest items produce the Holland shape used for career fit.
//
// Keep this list stable; scoring in potential.ts derives dimension coverage
// (and therefore measurement confidence) from it.

import type { Item } from './types'

export const INSTRUMENT_VERSION = 'hpi-v1'

export const ITEMS: Item[] = [
  // ── Fluid reasoning (task + SJT) ─────────────────────────────────────────
  {
    id: 'fr-seq-1',
    kind: 'task',
    dimension: 'fluidReasoning',
    prompt: 'What number continues the pattern?  2, 6, 12, 20, 30, ___',
    options: ['36', '40', '42', '44'],
    answerIndex: 2, // differences 4,6,8,10,12 → 42
  },
  {
    id: 'fr-sjt-1',
    kind: 'sjt',
    dimension: 'fluidReasoning',
    prompt:
      'You are given a task you have never done before, with no instructions. What do you do first?',
    options: [
      { label: 'Wait until someone explains exactly how to do it.', credit: 0.1 },
      { label: 'Break it into smaller parts and test one part to see what happens.', credit: 1.0 },
      { label: 'Copy how a similar task was done, even if it may not fit.', credit: 0.5 },
      { label: 'Skip it and move to something familiar.', credit: 0.2 },
    ],
  },

  // ── Verbal reasoning (task) ──────────────────────────────────────────────
  {
    id: 'vr-analogy-1',
    kind: 'task',
    dimension: 'verbalReasoning',
    prompt: 'Scarce is to plentiful as reckless is to ___',
    options: ['dangerous', 'careful', 'quick', 'wealthy'],
    answerIndex: 1,
  },

  // ── Quantitative reasoning (task) ────────────────────────────────────────
  {
    id: 'qr-word-1',
    kind: 'task',
    dimension: 'quantReasoning',
    prompt:
      'A program costs $240. A grant covers 35% of it. About how much do you still pay?',
    options: ['$84', '$120', '$156', '$205'],
    answerIndex: 2, // 240 * 0.65 = 156
  },

  // ── Conscientiousness / reliability (Big Five-derived) ───────────────────
  {
    id: 'co-likert-1',
    kind: 'likert',
    dimension: 'conscientiousness',
    prompt: 'I follow through on commitments, even when no one is checking.',
  },
  {
    id: 'co-likert-2',
    kind: 'likert',
    dimension: 'conscientiousness',
    prompt: 'I often leave things until the last minute.',
    reverse: true,
  },
  {
    id: 'co-sjt-1',
    kind: 'sjt',
    dimension: 'conscientiousness',
    prompt: 'You promised a deadline but realize you are running late. What do you do?',
    options: [
      { label: 'Say nothing and hope no one notices.', credit: 0.0 },
      { label: 'Tell them early, and propose a new realistic time.', credit: 1.0 },
      { label: 'Rush and hand in something unfinished on time.', credit: 0.4 },
      { label: 'Wait until they ask before responding.', credit: 0.2 },
    ],
  },

  // ── Openness / curiosity ─────────────────────────────────────────────────
  {
    id: 'op-likert-1',
    kind: 'likert',
    dimension: 'openness',
    prompt: 'I enjoy learning about topics far outside my usual interests.',
  },
  {
    id: 'op-likert-2',
    kind: 'likert',
    dimension: 'openness',
    prompt: 'I prefer to stick to what I already know rather than try new approaches.',
    reverse: true,
  },

  // ── Adaptability / resilience (grit-adjacent) ────────────────────────────
  {
    id: 'ad-likert-1',
    kind: 'likert',
    dimension: 'adaptability',
    prompt: 'When plans change suddenly, I adjust without getting stuck.',
  },
  {
    id: 'ad-sjt-1',
    kind: 'sjt',
    dimension: 'adaptability',
    prompt: 'You worked hard on a plan and it fails badly. A week later, you are most likely to:',
    options: [
      { label: 'Have given up on that goal.', credit: 0.1 },
      { label: 'Be trying a changed version of the plan.', credit: 1.0 },
      { label: 'Be waiting for the right moment, unsure what to change.', credit: 0.4 },
      { label: 'Be blaming the circumstances and doing the same thing again.', credit: 0.2 },
    ],
  },

  // ── Growth mindset (Dweck) ───────────────────────────────────────────────
  {
    id: 'gm-likert-1',
    kind: 'likert',
    dimension: 'growthMindset',
    prompt: 'How good I am at something can change a lot with effort and practice.',
  },
  {
    id: 'gm-likert-2',
    kind: 'likert',
    dimension: 'growthMindset',
    prompt: 'People are born with a fixed amount of talent that they cannot really change.',
    reverse: true,
  },

  // ── Self-efficacy & agency (Bandura) ─────────────────────────────────────
  {
    id: 'se-likert-1',
    kind: 'likert',
    dimension: 'selfEfficacy',
    prompt: 'If I work at it, I can usually solve problems that seem hard at first.',
  },
  {
    id: 'se-likert-2',
    kind: 'likert',
    dimension: 'selfEfficacy',
    prompt: 'What happens in my life is mostly outside of my control.',
    reverse: true,
  },

  // ── Intrinsic motivation (Self-Determination Theory) ─────────────────────
  {
    id: 'im-likert-1',
    kind: 'likert',
    dimension: 'intrinsicMotivation',
    prompt: 'I get absorbed in work that I find genuinely interesting.',
  },
  {
    id: 'im-likert-2',
    kind: 'likert',
    dimension: 'intrinsicMotivation',
    prompt: 'I only put in effort when there is a reward or a grade at stake.',
    reverse: true,
  },

  // ── RIASEC interest items (one per Holland code) ─────────────────────────
  { id: 'ri-R', kind: 'interest', riasec: 'R', prompt: 'I like building, fixing, or working with my hands and tools.' },
  { id: 'ri-I', kind: 'interest', riasec: 'I', prompt: 'I like investigating problems, analyzing data, and figuring out why things work.' },
  { id: 'ri-A', kind: 'interest', riasec: 'A', prompt: 'I like creating, designing, writing, or expressing ideas.' },
  { id: 'ri-S', kind: 'interest', riasec: 'S', prompt: 'I like helping, teaching, or supporting other people.' },
  { id: 'ri-E', kind: 'interest', riasec: 'E', prompt: 'I like leading, persuading, starting things, and taking charge.' },
  { id: 'ri-C', kind: 'interest', riasec: 'C', prompt: 'I like organizing, keeping things accurate, and working with clear systems.' },
]

/** Fast lookup by id (used by the scoring engine and API validation). */
export const ITEMS_BY_ID: Record<string, Item> = Object.fromEntries(
  ITEMS.map((it) => [it.id, it])
)
