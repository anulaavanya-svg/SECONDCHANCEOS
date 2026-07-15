/**
 * Empty-state welcome screen shown when a conversation has no messages yet.
 * Offers a few starter prompts that seed the composer.
 */
import { SparkleIcon } from './Icons'

interface Suggestion {
  title: string
  desc: string
  prompt: string
}

const SUGGESTIONS: Suggestion[] = [
  {
    title: 'Draft something',
    desc: 'Write an email, outline, or plan',
    prompt: 'Help me draft a friendly email asking a colleague to review my project proposal.'
  },
  {
    title: 'Explain code',
    desc: 'Understand or debug a snippet',
    prompt: 'Explain what this code does and how I could improve it:\n\n```\n\n```'
  },
  {
    title: 'Research a topic',
    desc: 'Get an answer with sources',
    prompt: 'Research the latest approaches to running local AI models on consumer laptops.'
  },
  {
    title: 'Remember this',
    desc: 'Teach Nila about you',
    prompt: 'Remember that I prefer concise answers and I work in the Pacific time zone.'
  }
]

export function Welcome({ onPick }: { onPick: (prompt: string) => void }): JSX.Element {
  return (
    <div className="welcome">
      <div className="welcome__logo">N</div>
      <div className="welcome__title">Hello, I&apos;m Nila</div>
      <div className="welcome__subtitle">
        Your desktop assistant with memory, voice, research, screenshots, and — with your
        approval — a little help around your machine. What can I do for you?
      </div>
      <div className="welcome__suggestions">
        {SUGGESTIONS.map((s) => (
          <button className="suggestion" key={s.title} onClick={() => onPick(s.prompt)}>
            <div className="row" style={{ marginBottom: 4 }}>
              <SparkleIcon size={15} />
              <span className="suggestion__title">{s.title}</span>
            </div>
            <div className="suggestion__desc">{s.desc}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
