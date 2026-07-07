// Manager decision trees. Each tree scaffolds a coaching-first, documented
// response path so decisions are structured and auditable rather than
// stigma-driven. Terminal nodes (no options) prompt the manager to log the
// outcome via POST /api/manager-actions.

export interface TreeNode {
  text: string
  options: { label: string; next: string }[]
}

export interface DecisionTree {
  label: string
  description: string
  nodes: Record<string, TreeNode>
}

export const decisionTrees: Record<string, DecisionTree> = {
  attendance: {
    label: 'Attendance Issue',
    description: 'Missed shifts, late arrivals, or unexplained absences.',
    nodes: {
      start: {
        text: 'An employee missed a scheduled shift.',
        options: [
          { label: 'First occurrence', next: 'inquire' },
          { label: 'Repeat pattern (2nd+)', next: 'pattern' },
        ],
      },
      inquire: {
        text: 'Have a private, non-punitive conversation to understand the cause before assuming intent.',
        options: [
          { label: 'Logistical cause (transport, housing, legal appointment)', next: 'support' },
          { label: 'No clear cause identified', next: 'documentPlan' },
        ],
      },
      support: {
        text: 'Connect employee to the relevant resource. Document the conversation and support offered.',
        options: [{ label: 'Mark resolved', next: 'end' }],
      },
      documentPlan: {
        text: 'Document the conversation. Set a clear, written attendance expectation with a specific follow-up date.',
        options: [{ label: 'Proceed to follow-up', next: 'followup' }],
      },
      followup: {
        text: 'Follow up on the agreed date.',
        options: [
          { label: 'Resolved', next: 'end' },
          { label: 'Not resolved — escalate', next: 'escalate' },
        ],
      },
      pattern: {
        text: 'Check prior documentation before deciding next step.',
        options: [
          { label: 'No prior support attempted', next: 'inquire' },
          { label: 'Support already attempted', next: 'escalate' },
        ],
      },
      escalate: {
        text: 'Move to a formal, documented performance-improvement conversation with HR involved. This is a standard process step for any employee.',
        options: [],
      },
      end: {
        text: 'Case resolved. Continue standard monitoring. Log the resolution.',
        options: [],
      },
    },
  },

  conflict: {
    label: 'Team Conflict',
    description: 'Friction between coworkers or with a supervisor.',
    nodes: {
      start: {
        text: 'A conflict has been reported involving this employee.',
        options: [
          { label: 'You witnessed it directly', next: 'separate' },
          { label: 'Reported secondhand', next: 'gatherFacts' },
        ],
      },
      gatherFacts: {
        text: 'Speak with each person involved separately before forming a view. Secondhand reports carry bias — collect specifics: what happened, when, who was present.',
        options: [
          { label: 'Accounts roughly align', next: 'separate' },
          { label: 'Accounts conflict significantly', next: 'neutralObserver' },
        ],
      },
      neutralObserver: {
        text: 'Ask a neutral third party (shift lead, HR) to help establish facts. Do not act on assumptions about who is "the type" to cause conflict.',
        options: [{ label: 'Facts established', next: 'separate' }],
      },
      separate: {
        text: 'Meet each party one-on-one, privately. Use neutral language: describe behavior, not character. Ask what each person needs to work productively.',
        options: [
          { label: 'Misunderstanding — both open to resolution', next: 'facilitate' },
          { label: 'One party escalating or hostile', next: 'boundary' },
        ],
      },
      facilitate: {
        text: 'Facilitate a brief joint conversation focused on working agreements going forward, not on relitigating the incident. Document agreements made.',
        options: [{ label: 'Agreement reached', next: 'end' }],
      },
      boundary: {
        text: 'Set clear behavioral expectations in writing for the escalating party — the same standard applied to any employee. Schedule a follow-up check within one week.',
        options: [
          { label: 'Behavior improved at follow-up', next: 'end' },
          { label: 'Behavior continues', next: 'escalate' },
        ],
      },
      escalate: {
        text: 'Involve HR for a formal, documented process. Apply the identical standard you would apply to any employee in this situation.',
        options: [],
      },
      end: {
        text: 'Conflict resolved. Monitor team dynamics at regular 1:1s. Log the resolution.',
        options: [],
      },
    },
  },

  performance: {
    label: 'Performance Concern',
    description: 'Quality, pace, or skill gaps in the work itself.',
    nodes: {
      start: {
        text: 'An employee is not meeting a performance expectation.',
        options: [
          { label: 'First 30 days on the job', next: 'earlyStage' },
          { label: 'Past the 30-day mark', next: 'diagnose' },
        ],
      },
      earlyStage: {
        text: 'Performance gaps in the first 30 days are usually training gaps, not effort gaps. Review what training the employee has actually received versus what the task assumes.',
        options: [
          { label: 'Training gap found', next: 'retrain' },
          { label: 'Training was completed', next: 'diagnose' },
        ],
      },
      retrain: {
        text: 'Pair the employee with a mentor or trainer for the specific skill. Set a realistic re-check date. Frame it as investment, not remediation.',
        options: [{ label: 'Re-check scheduled', next: 'recheck' }],
      },
      diagnose: {
        text: 'Have a specific, example-based conversation: "Here is the expectation, here is what I observed." Ask what is getting in the way — listen before prescribing.',
        options: [
          { label: 'Skill gap', next: 'retrain' },
          { label: 'External stressor disclosed', next: 'supportRoute' },
          { label: 'Unclear expectations', next: 'clarify' },
        ],
      },
      supportRoute: {
        text: 'Connect the employee to the relevant support resource. Agree on what performance looks like during the stabilization period. Document the plan.',
        options: [{ label: 'Plan in place', next: 'recheck' }],
      },
      clarify: {
        text: 'Re-set expectations in writing with concrete, measurable examples. Confirm understanding by asking the employee to describe the standard back.',
        options: [{ label: 'Expectations confirmed', next: 'recheck' }],
      },
      recheck: {
        text: 'Review progress on the agreed date against the specific examples discussed.',
        options: [
          { label: 'Meeting expectations', next: 'end' },
          { label: 'Still below expectations', next: 'escalate' },
        ],
      },
      escalate: {
        text: 'Begin a formal performance-improvement plan with HR — the standard process for any employee. The documentation trail you built makes this fair and defensible.',
        options: [],
      },
      end: {
        text: 'Performance on track. Recognize the improvement explicitly — it reinforces the behavior. Log the resolution.',
        options: [],
      },
    },
  },

  communication: {
    label: 'Communication Issue',
    description: 'Missed messages, tone concerns, or withdrawal.',
    nodes: {
      start: {
        text: 'You have noticed a communication concern with this employee.',
        options: [
          { label: 'Not responding to messages / withdrawn', next: 'withdrawn' },
          { label: 'Tone or style concerns raised', next: 'tone' },
        ],
      },
      withdrawn: {
        text: 'Withdrawal is often a safety signal, not defiance. Check in privately and informally: "I noticed you have been quiet — how are things going?" No agenda, no documentation yet.',
        options: [
          { label: 'Employee opens up about a stressor', next: 'supportRoute' },
          { label: 'Employee says everything is fine', next: 'lowerBarrier' },
        ],
      },
      lowerBarrier: {
        text: 'Reduce the cost of speaking up: shorter written check-ins, a preferred channel, or mentor-mediated communication. Revisit in one week.',
        options: [
          { label: 'Communication improving', next: 'end' },
          { label: 'Still withdrawn', next: 'mentorLoop' },
        ],
      },
      mentorLoop: {
        text: 'Ask the mentor to check in — peers often hear what managers cannot. Do not ask the mentor to report content, only whether support is needed.',
        options: [
          { label: 'Support need identified', next: 'supportRoute' },
          { label: 'No underlying issue found', next: 'end' },
        ],
      },
      tone: {
        text: 'Address the specific behavior, not the person. Describe the observed moment and its impact factually. Ask for their perspective — communication norms may simply be unfamiliar.',
        options: [
          { label: 'Norm gap — employee receptive', next: 'coach' },
          { label: 'Pattern continues after coaching', next: 'escalate' },
        ],
      },
      coach: {
        text: 'Agree on one concrete communication practice to use going forward. Model it yourself in your next interactions. Check in after two weeks.',
        options: [{ label: 'Practice adopted', next: 'end' }],
      },
      supportRoute: {
        text: 'Connect the employee to the relevant resource (mentor, HR, external support). Document that support was offered — not the personal details.',
        options: [{ label: 'Support connected', next: 'end' }],
      },
      escalate: {
        text: 'Move to a documented expectations conversation with HR guidance — the same standard used for any employee.',
        options: [],
      },
      end: {
        text: 'Communication back on track. Keep the channel that worked. Log the resolution.',
        options: [],
      },
    },
  },
}

export type IssueType = keyof typeof decisionTrees
export const ISSUE_TYPES = Object.keys(decisionTrees) as IssueType[]
