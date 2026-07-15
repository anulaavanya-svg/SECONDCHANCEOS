/**
 * Voice interaction using the Web Speech API, which ships with Chromium (and
 * therefore Electron's renderer). Provides:
 *   - useSpeechRecognition: push-to-talk dictation into the composer
 *   - speak / cancelSpeech / listVoices: spoken assistant replies
 *
 * These are best-effort: if the platform lacks the APIs, the hooks degrade to
 * no-ops and report `supported: false` so the UI can hide the controls.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

/* ----------------------------- recognition ----------------------------- */

// The Web Speech API is not in the standard TS lib; declare the minimum shape.
interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>
  resultIndex: number
}

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike
    webkitSpeechRecognition?: new () => SpeechRecognitionLike
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export interface UseSpeechRecognition {
  supported: boolean
  listening: boolean
  start(): void
  stop(): void
}

/**
 * @param onTranscript called with the accumulated final transcript when the
 *        user stops speaking (or a final result arrives).
 * @param onInterim optional live partial transcript for inline feedback.
 */
export function useSpeechRecognition(
  onTranscript: (text: string) => void,
  onInterim?: (text: string) => void
): UseSpeechRecognition {
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const finalRef = useRef('')
  const supported = getRecognitionCtor() !== null

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor()
    if (!Ctor) return
    const recognition = new Ctor()
    recognition.lang = navigator.language || 'en-US'
    recognition.continuous = true
    recognition.interimResults = true
    finalRef.current = ''

    recognition.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const transcript = result[0]?.transcript ?? ''
        if (result.isFinal) finalRef.current += transcript
        else interim += transcript
      }
      if (interim && onInterim) onInterim(interim)
    }

    recognition.onerror = () => setListening(false)
    recognition.onend = () => {
      setListening(false)
      const text = finalRef.current.trim()
      if (text) onTranscript(text)
    }

    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }, [onTranscript, onInterim])

  useEffect(() => () => recognitionRef.current?.abort(), [])

  return { supported, listening, start, stop }
}

/* ----------------------------- synthesis ------------------------------- */

export function synthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function listVoices(): SpeechSynthesisVoice[] {
  if (!synthesisSupported()) return []
  return window.speechSynthesis.getVoices()
}

/** Speak text aloud, optionally with a specific voice URI and rate. */
export function speak(text: string, opts: { voiceUri?: string | null; rate?: number } = {}): void {
  if (!synthesisSupported() || !text.trim()) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(stripMarkdown(text))
  utterance.rate = opts.rate ?? 1
  if (opts.voiceUri) {
    const voice = listVoices().find((v) => v.voiceURI === opts.voiceUri)
    if (voice) utterance.voice = voice
  }
  window.speechSynthesis.speak(utterance)
}

export function cancelSpeech(): void {
  if (synthesisSupported()) window.speechSynthesis.cancel()
}

/** Strip Markdown noise so spoken output sounds natural. */
function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' (code block) ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[*_#>]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}
