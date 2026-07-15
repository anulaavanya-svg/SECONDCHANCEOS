/**
 * Settings modal: API key, default model, workspace directory, automation
 * approval, voice output, theme, and the assistant persona. Saves through the
 * store, which persists via the main process.
 */
import { useEffect, useState } from 'react'
import { MODELS, type ModelId, type Settings } from '@shared/types'
import { useApp } from '../state/store'
import { listVoices, synthesisSupported, speak } from '../lib/voice'
import { Modal, Switch } from './Modal'

export function SettingsModal(): JSX.Element {
  const { settings, saveSettings, setModal, notify } = useApp()
  const [draft, setDraft] = useState<Settings | null>(settings)
  const [apiKey, setApiKey] = useState('')
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])

  useEffect(() => setDraft(settings), [settings])

  useEffect(() => {
    if (!synthesisSupported()) return
    const load = () => setVoices(listVoices())
    load()
    window.speechSynthesis.onvoiceschanged = load
    return () => {
      window.speechSynthesis.onvoiceschanged = null
    }
  }, [])

  if (!draft) return <Modal title="Settings" onClose={() => setModal(null)}>Loading…</Modal>

  const patch = (p: Partial<Settings>) => setDraft({ ...draft, ...p })

  const testKey = async () => {
    setTesting(true)
    try {
      const result = await window.nila.settings.testKey(apiKey || undefined)
      notify({
        level: result.ok ? 'success' : 'error',
        title: result.ok ? 'API key works' : 'API key problem',
        body: result.message
      })
    } finally {
      setTesting(false)
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      await saveSettings({
        ...draft,
        apiKey: apiKey.trim() ? apiKey.trim() : undefined
      })
      notify({ level: 'success', title: 'Settings saved' })
      setModal(null)
    } catch (err) {
      notify({ level: 'error', title: 'Could not save', body: String(err) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title="Settings"
      wide
      onClose={() => setModal(null)}
      footer={
        <>
          <button className="btn btn--ghost" onClick={() => setModal(null)}>
            Cancel
          </button>
          <button className="btn btn--primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </>
      }
    >
      {/* API key */}
      <div className="field">
        <label className="field__label">Anthropic API key</label>
        <div className="row">
          <input
            className="input"
            type="password"
            placeholder={draft.apiKeyConfigured ? '•••••••• (configured)' : 'sk-ant-…'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <button className="btn btn--ghost" onClick={testKey} disabled={testing} style={{ whiteSpace: 'nowrap' }}>
            {testing ? 'Testing…' : 'Test'}
          </button>
        </div>
        <div className="field__hint">
          Stored encrypted on this device. Get a key at console.anthropic.com. Leave blank to keep
          the existing key.
        </div>
      </div>

      {/* Model */}
      <div className="field">
        <label className="field__label">Default model</label>
        <select
          className="select"
          value={draft.model}
          onChange={(e) => patch({ model: e.target.value as ModelId })}
        >
          {MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label} — {m.description}
            </option>
          ))}
        </select>
      </div>

      {/* Workspace */}
      <div className="field">
        <label className="field__label">Workspace folder</label>
        <div className="row">
          <input
            className="input"
            value={draft.workspaceDir}
            onChange={(e) => patch({ workspaceDir: e.target.value })}
          />
          <button
            className="btn btn--ghost"
            style={{ whiteSpace: 'nowrap' }}
            onClick={async () => {
              const dir = await window.nila.files.pickDirectory()
              if (dir) patch({ workspaceDir: dir })
            }}
          >
            Browse…
          </button>
        </div>
        <div className="field__hint">
          File tools and automation are confined to this folder for your safety.
        </div>
      </div>

      {/* Theme */}
      <div className="field">
        <label className="field__label">Appearance</label>
        <select
          className="select"
          value={draft.theme}
          onChange={(e) => patch({ theme: e.target.value as Settings['theme'] })}
        >
          <option value="system">Match system</option>
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </select>
      </div>

      {/* Voice */}
      {synthesisSupported() && (
        <div className="field">
          <label className="field__label">Voice output</label>
          <select
            className="select"
            value={draft.voiceUri ?? ''}
            onChange={(e) => patch({ voiceUri: e.target.value || null })}
          >
            <option value="">Default voice</option>
            {voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
          <div className="row" style={{ marginTop: 8 }}>
            <span className="muted" style={{ fontSize: 12 }}>
              Rate {draft.voiceRate.toFixed(1)}×
            </span>
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.1}
              value={draft.voiceRate}
              onChange={(e) => patch({ voiceRate: Number(e.target.value) })}
              style={{ flex: 1 }}
            />
            <button
              className="btn btn--ghost"
              onClick={() => speak('Hi, I am Nila. This is how I sound.', { voiceUri: draft.voiceUri, rate: draft.voiceRate })}
            >
              Preview
            </button>
          </div>
        </div>
      )}

      {/* Persona */}
      <div className="field">
        <label className="field__label">Assistant persona</label>
        <textarea
          className="textarea"
          value={draft.persona}
          onChange={(e) => patch({ persona: e.target.value })}
        />
        <div className="field__hint">The system instructions that shape Nila&apos;s voice and behavior.</div>
      </div>

      {/* Automation */}
      <Switch
        label="Require approval for desktop actions"
        desc="Strongly recommended. When off, Nila runs proposed actions automatically."
        checked={draft.requireAutomationApproval}
        onChange={(v) => patch({ requireAutomationApproval: v })}
      />
    </Modal>
  )
}
