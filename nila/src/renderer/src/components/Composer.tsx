/**
 * The message composer: auto-growing textarea, image attachments (paste, file,
 * or screenshot), per-turn tool toggles (files / research / automation), model
 * picker, push-to-talk voice input, and send/stop.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MODELS, type ImageAttachment, type ModelId } from '@shared/types'
import { useApp } from '../state/store'
import { fileToBase64 } from '../lib/format'
import { useSpeechRecognition } from '../lib/voice'
import {
  matchSlashCommands,
  resolveSlash,
  type SlashActionId,
  type SlashCommand
} from '../lib/slash'
import { ScreenSourcePicker } from './ScreenSourcePicker'
import {
  CameraIcon,
  CloseIcon,
  FolderIcon,
  GlobeIcon,
  ImageIcon,
  MicIcon,
  SendIcon,
  StopIcon,
  TerminalIcon
} from './Icons'

export interface ComposerHandle {
  setText(text: string): void
}

interface Props {
  seededPrompt?: string
  onConsumeSeed?: () => void
}

export function Composer({ seededPrompt, onConsumeSeed }: Props): JSX.Element {
  const {
    settings,
    streaming,
    sendMessage,
    cancelStreaming,
    notify,
    newConversation,
    exportActiveConversation,
    setModal
  } = useApp()
  const [text, setText] = useState('')
  const [attachments, setAttachments] = useState<ImageAttachment[]>([])
  const [model, setModel] = useState<ModelId>(settings?.model ?? 'claude-opus-4-8')
  const [enableFiles, setEnableFiles] = useState(false)
  const [enableResearch, setEnableResearch] = useState(false)
  const [enableAutomation, setEnableAutomation] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isStreaming = streaming !== null

  // Sync default model when settings load/change.
  useEffect(() => {
    if (settings?.model) setModel(settings.model)
  }, [settings?.model])

  // Consume a seeded prompt from the welcome screen.
  useEffect(() => {
    if (seededPrompt) {
      setText(seededPrompt)
      onConsumeSeed?.()
      textareaRef.current?.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seededPrompt])

  // Auto-resize the textarea.
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [text])

  const appendTranscript = useCallback((transcript: string) => {
    setText((prev) => (prev ? `${prev} ${transcript}` : transcript))
    textareaRef.current?.focus()
  }, [])

  const recognition = useSpeechRecognition(appendTranscript)

  const addImages = useCallback(async (files: FileList | File[]) => {
    const images: ImageAttachment[] = []
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      const { data, mediaType } = await fileToBase64(file)
      images.push({ data, mediaType, name: file.name })
    }
    if (images.length) setAttachments((prev) => [...prev, ...images])
  }, [])

  const onPaste = useCallback(
    (e: React.ClipboardEvent) => {
      const files = Array.from(e.clipboardData.files)
      if (files.some((f) => f.type.startsWith('image/'))) {
        void addImages(files)
      }
    },
    [addImages]
  )

  const captureScreen = useCallback(
    async (sourceId?: string) => {
      setPickerOpen(false)
      setCapturing(true)
      try {
        const shot = await window.nila.screenshot.capture(sourceId)
        setAttachments((prev) => [
          ...prev,
          { data: shot.data, mediaType: shot.mediaType, name: 'screenshot.png' }
        ])
        notify({ level: 'success', title: 'Screenshot attached', body: 'Send a message to analyze it.' })
      } catch (err) {
        notify({ level: 'error', title: 'Capture failed', body: String(err) })
      } finally {
        setCapturing(false)
      }
    },
    [notify]
  )

  // Slash-command autocomplete state.
  const slashMatches = useMemo(() => matchSlashCommands(text), [text])
  const [slashIndex, setSlashIndex] = useState(0)
  useEffect(() => setSlashIndex(0), [text])
  const slashOpen = slashMatches.length > 0

  const applyFlags = useCallback((flags?: SlashCommand['flags']) => {
    if (!flags) return
    if (flags.files) setEnableFiles(true)
    if (flags.research) setEnableResearch(true)
    if (flags.automation) setEnableAutomation(true)
  }, [])

  const runAction = useCallback(
    (action: SlashActionId) => {
      switch (action) {
        case 'new':
          void newConversation()
          break
        case 'export':
          void exportActiveConversation()
          break
        case 'memory':
          setModal('memory')
          break
        case 'settings':
          setModal('settings')
          break
        case 'command-palette':
          setModal('command')
          break
        case 'screenshot':
          setPickerOpen(true)
          break
      }
    },
    [newConversation, exportActiveConversation, setModal]
  )

  const doSend = useCallback(
    (content: string, flags: { files: boolean; research: boolean; automation: boolean }) => {
      void sendMessage({
        content,
        images: attachments.length ? attachments : undefined,
        model,
        enableFiles: flags.files,
        enableResearch: flags.research,
        enableAutomation: flags.automation
      })
      setText('')
      setAttachments([])
    },
    [attachments, model, sendMessage]
  )

  const submit = useCallback(() => {
    if (isStreaming) return
    const raw = text.trim()

    const resolved = resolveSlash(raw)
    if (resolved) {
      const { command, arg } = resolved
      if (command.kind === 'action') {
        runAction(command.action!)
        setText('')
        return
      }
      // Modifier: with no argument, just light up the toggles and keep composing.
      if (!arg) {
        applyFlags(command.flags)
        setText('')
        return
      }
      const content = command.wrap ? command.wrap(arg) : arg
      doSend(content, {
        files: enableFiles || !!command.flags?.files,
        research: enableResearch || !!command.flags?.research,
        automation: enableAutomation || !!command.flags?.automation
      })
      return
    }

    if (!raw && attachments.length === 0) return
    doSend(raw, { files: enableFiles, research: enableResearch, automation: enableAutomation })
  }, [
    isStreaming,
    text,
    attachments,
    enableFiles,
    enableResearch,
    enableAutomation,
    doSend,
    runAction,
    applyFlags
  ])

  const acceptSlash = useCallback((command: SlashCommand) => {
    if (command.kind === 'action') {
      runAction(command.action!)
      setText('')
    } else {
      // Fill in the command and a trailing space, ready for the argument.
      setText(`/${command.name} `)
      textareaRef.current?.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runAction])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (slashOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSlashIndex((i) => Math.min(i + 1, slashMatches.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSlashIndex((i) => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
        e.preventDefault()
        acceptSlash(slashMatches[slashIndex])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setText('')
        return
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="composer">
      <div className="composer__inner">
        {slashOpen && (
          <div className="slash-menu">
            {slashMatches.map((command, index) => (
              <button
                key={command.name}
                className={`slash-item ${index === slashIndex ? 'active' : ''}`}
                onMouseEnter={() => setSlashIndex(index)}
                onClick={() => acceptSlash(command)}
              >
                <span className="slash-item__name">/{command.name}</span>
                <span className="slash-item__desc">{command.description}</span>
              </button>
            ))}
          </div>
        )}
        <div className="composer__box">
          {attachments.length > 0 && (
            <div className="composer__attachments">
              {attachments.map((img, idx) => (
                <div className="composer__attachment" key={idx}>
                  <img src={`data:${img.mediaType};base64,${img.data}`} alt={img.name} />
                  <button onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}>
                    <CloseIcon size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={text}
            rows={1}
            placeholder={recognition.listening ? 'Listening…' : 'Message Nila…  (/ for commands)'}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
          />

          <div className="composer__row">
            <ToggleChip
              active={enableResearch}
              onClick={() => setEnableResearch((v) => !v)}
              icon={<GlobeIcon size={14} />}
              label="Research"
            />
            <ToggleChip
              active={enableFiles}
              onClick={() => setEnableFiles((v) => !v)}
              icon={<FolderIcon size={14} />}
              label="Files"
            />
            <ToggleChip
              active={enableAutomation}
              onClick={() => setEnableAutomation((v) => !v)}
              icon={<TerminalIcon size={14} />}
              label="Automate"
            />

            <div className="composer__spacer" />

            <select
              className="select"
              style={{ width: 'auto', padding: '6px 8px' }}
              value={model}
              onChange={(e) => setModel(e.target.value as ModelId)}
              title="Model"
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>

            <button
              className="icon-btn"
              title="Attach image"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon size={18} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => e.target.files && addImages(e.target.files)}
            />

            <button
              className="icon-btn"
              title="Capture screen or window"
              disabled={capturing}
              onClick={() => setPickerOpen(true)}
            >
              {capturing ? <span className="spinner" /> : <CameraIcon size={18} />}
            </button>

            {recognition.supported && (
              <button
                className={`icon-btn ${recognition.listening ? 'active listening' : ''}`}
                title={recognition.listening ? 'Stop listening' : 'Speak'}
                onClick={() => (recognition.listening ? recognition.stop() : recognition.start())}
              >
                <MicIcon size={18} />
              </button>
            )}

            {isStreaming ? (
              <button className="icon-btn icon-btn--danger active" title="Stop" onClick={cancelStreaming}>
                <StopIcon size={18} />
              </button>
            ) : (
              <button
                className="icon-btn icon-btn--send"
                title="Send"
                disabled={!text.trim() && attachments.length === 0}
                onClick={submit}
              >
                <SendIcon size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      {pickerOpen && (
        <ScreenSourcePicker onPick={(id) => captureScreen(id)} onClose={() => setPickerOpen(false)} />
      )}
    </div>
  )
}

function ToggleChip({
  active,
  onClick,
  icon,
  label
}: {
  active: boolean
  onClick: () => void
  icon: JSX.Element
  label: string
}): JSX.Element {
  return (
    <button className={`toggle-chip ${active ? 'active' : ''}`} onClick={onClick}>
      {icon}
      {label}
    </button>
  )
}
