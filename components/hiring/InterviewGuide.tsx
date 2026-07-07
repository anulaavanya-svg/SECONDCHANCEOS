'use client'

// Structured, competency-based interview questions. Role-specific sets keep
// interviews consistent and defensible; none reference background or record.
const BASE_QUESTIONS = [
  'Walk me through a typical day in your most recent role. What did you own?',
  'Tell me about a time you had to learn a new skill quickly. How did you approach it?',
  'Describe a time something went wrong on the job. What did you do next?',
  'What does dependable look like to you in a teammate?',
]

const ROLE_QUESTIONS: { match: RegExp; questions: string[] }[] = [
  {
    match: /assembl|machine|operator|technician/i,
    questions: [
      'Describe your experience reading work orders or technical drawings.',
      'How do you check your own work for quality before passing it down the line?',
      'Tell me about your experience with safety procedures on a production floor.',
    ],
  },
  {
    match: /warehouse|inventory|forklift|clerk/i,
    questions: [
      'What inventory or scanning systems have you worked with?',
      'How do you stay accurate when the pace picks up?',
      'Describe your experience operating material-handling equipment.',
    ],
  },
  {
    match: /quality|inspector|qc/i,
    questions: [
      'How do you decide when a part is out of spec versus acceptable?',
      'Tell me about a time you flagged a quality issue. How did you communicate it?',
      'What measurement tools are you comfortable with?',
    ],
  },
]

export default function InterviewGuide({ roleApplied }: { roleApplied: string }) {
  const roleSet = ROLE_QUESTIONS.find((r) => r.match.test(roleApplied))

  return (
    <div className="space-y-3">
      <Section title="Core competency questions" questions={BASE_QUESTIONS} />
      {roleSet && <Section title={`Role-specific — ${roleApplied}`} questions={roleSet.questions} />}
      <p className="text-xs text-muted">
        Ask every candidate the same questions in the same order. Score answers on observable
        evidence, not impressions.
      </p>
    </div>
  )
}

function Section({ title, questions }: { title: string; questions: string[] }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">{title}</p>
      <ol className="list-decimal space-y-1.5 pl-5 text-sm text-ink">
        {questions.map((q) => (
          <li key={q}>{q}</li>
        ))}
      </ol>
    </div>
  )
}
