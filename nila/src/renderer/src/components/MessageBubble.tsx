/**
 * Renders one chat message: avatar, role, any image attachments, the Markdown
 * body, and (for assistant turns) a footer with copy / speak actions and the
 * tools that were used.
 */
import { memo, useState } from 'react'
import type { ChatMessage } from '@shared/types'
import { Markdown } from '../lib/markdown'
import { speak, cancelSpeech, synthesisSupported } from '../lib/voice'
import { useApp } from '../state/store'
import { CheckIcon, MicIcon } from './Icons'

interface Props {
  message: ChatMessage
  streaming?: boolean
  streamingText?: string
}

/**
 * Memoized so that finalized messages don't re-render while the streaming
 * bubble updates on every delta. Only the active streaming bubble (whose
 * `streamingText` changes) re-renders.
 */
export const MessageBubble = memo(function MessageBubble({
  message,
  streaming,
  streamingText
}: Props): JSX.Element {
  const { settings } = useApp()
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'
  const content = streaming ? streamingText ?? '' : message.content

  const copy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  const onSpeak = () => {
    speak(content, { voiceUri: settings?.voiceUri, rate: settings?.voiceRate })
  }

  return (
    <div className="message">
      <div className={`message__avatar message__avatar--${isUser ? 'user' : 'assistant'}`}>
        {isUser ? 'You'.charAt(0) : 'N'}
      </div>
      <div className="message__body">
        <div className="message__role">{isUser ? 'You' : 'Nila'}</div>

        {message.images && message.images.length > 0 && (
          <div className="message__images">
            {message.images.map((img, idx) => (
              <img
                key={idx}
                className="message__image"
                src={`data:${img.mediaType};base64,${img.data}`}
                alt={img.name ?? 'attachment'}
              />
            ))}
          </div>
        )}

        {content ? (
          <Markdown text={content} />
        ) : streaming ? (
          <div className="md">
            <span className="cursor" />
          </div>
        ) : null}
        {streaming && content && <span className="cursor" />}

        {!isUser && !streaming && content && (
          <div className="message__tools">
            <button className="tool-chip" onClick={copy}>
              {copied ? (
                <span className="row" style={{ gap: 4 }}>
                  <CheckIcon size={12} /> Copied
                </span>
              ) : (
                'Copy'
              )}
            </button>
            {synthesisSupported() && (
              <button className="tool-chip" onClick={onSpeak} onDoubleClick={cancelSpeech}>
                <span className="row" style={{ gap: 4 }}>
                  <MicIcon size={12} /> Speak
                </span>
              </button>
            )}
            {message.toolsUsed?.map((tool) => (
              <span className="tool-chip" key={tool}>
                {toolLabel(tool)}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
})

function toolLabel(tool: string): string {
  const labels: Record<string, string> = {
    remember: 'Saved to memory',
    recall: 'Searched memory',
    read_file: 'Read file',
    write_file: 'Wrote file',
    list_files: 'Listed files',
    web_research: 'Researched web',
    capture_screen: 'Viewed screen',
    propose_automation: 'Proposed action'
  }
  return labels[tool] ?? tool
}
