/**
 * Configuration + settings store.
 *
 * Nila keeps two kinds of persistent state:
 *   - Structured data (conversations, messages, memory) → SQLite (see database.ts)
 *   - Small key/value settings + the API key → a JSON file in the data dir
 *
 * The API key is stored separately from the rest of the settings and is never
 * returned to the renderer; the renderer only learns whether one is configured.
 */
import { app, safeStorage } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { DEFAULT_MODEL, type ModelId, type Settings } from '@shared/types'
import { createLogger } from './logger'

const log = createLogger('config')

interface PersistedSettings {
  model: ModelId
  workspaceDir: string
  requireAutomationApproval: boolean
  voiceOutputEnabled: boolean
  voiceUri: string | null
  voiceRate: number
  theme: Settings['theme']
  persona: string
  /** Encrypted (base64) API key when safeStorage is available, else plaintext. */
  apiKeyEnc: string | null
  apiKeyIsEncrypted: boolean
}

const DEFAULT_PERSONA = [
  'You are Nila, a warm, capable desktop AI assistant.',
  'You help with everyday questions, writing, coding, research, and light desktop tasks.',
  'Be concise and friendly. When you take an action with a tool, briefly say what you did.',
  'You have persistent memory of the user across sessions — use it naturally, and',
  'remember important new facts the user shares.'
].join(' ')

function defaultSettings(workspaceDir: string): PersistedSettings {
  return {
    model: DEFAULT_MODEL,
    workspaceDir,
    requireAutomationApproval: true,
    voiceOutputEnabled: false,
    voiceUri: null,
    voiceRate: 1,
    theme: 'system',
    persona: DEFAULT_PERSONA,
    apiKeyEnc: null,
    apiKeyIsEncrypted: false
  }
}

export class Config {
  private readonly dataDir: string
  private readonly settingsPath: string
  private settings: PersistedSettings

  constructor() {
    this.dataDir = resolveDataDir()
    mkdirSync(this.dataDir, { recursive: true })
    this.settingsPath = join(this.dataDir, 'settings.json')

    const defaultWorkspace = join(homedir(), 'Nila')
    this.settings = defaultSettings(defaultWorkspace)
    this.load()
    // Ensure the workspace exists so file tools have somewhere to write.
    try {
      mkdirSync(this.settings.workspaceDir, { recursive: true })
    } catch (err) {
      log.warn('could not create workspace dir', String(err))
    }
  }

  private load(): void {
    if (!existsSync(this.settingsPath)) {
      this.persist()
      return
    }
    try {
      const raw = JSON.parse(readFileSync(this.settingsPath, 'utf8'))
      this.settings = { ...this.settings, ...raw }
    } catch (err) {
      log.error('failed to read settings, using defaults', String(err))
    }
  }

  private persist(): void {
    try {
      writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2), 'utf8')
    } catch (err) {
      log.error('failed to write settings', String(err))
    }
  }

  /* ---- paths ---- */

  getDataDir(): string {
    return this.dataDir
  }

  getDatabasePath(): string {
    return join(this.dataDir, 'nila.db')
  }

  getLogPath(): string {
    return join(this.dataDir, 'logs', 'nila.log')
  }

  getWorkspaceDir(): string {
    return this.settings.workspaceDir
  }

  /* ---- API key (never leaves the main process) ---- */

  getApiKey(): string | null {
    // Environment variable always wins, so power users can inject a key.
    if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY
    if (!this.settings.apiKeyEnc) return null
    if (!this.settings.apiKeyIsEncrypted) return this.settings.apiKeyEnc
    try {
      return safeStorage.decryptString(Buffer.from(this.settings.apiKeyEnc, 'base64'))
    } catch (err) {
      log.error('failed to decrypt API key', String(err))
      return null
    }
  }

  setApiKey(key: string): void {
    const trimmed = key.trim()
    if (!trimmed) {
      this.settings.apiKeyEnc = null
      this.settings.apiKeyIsEncrypted = false
      this.persist()
      return
    }
    if (safeStorage.isEncryptionAvailable()) {
      this.settings.apiKeyEnc = safeStorage.encryptString(trimmed).toString('base64')
      this.settings.apiKeyIsEncrypted = true
    } else {
      log.warn(
        'OS secure storage is unavailable; the API key will be stored unencrypted. ' +
          'On Linux this usually means no keyring (gnome-keyring/kwallet) is running.'
      )
      this.settings.apiKeyEnc = trimmed
      this.settings.apiKeyIsEncrypted = false
    }
    this.persist()
  }

  hasApiKey(): boolean {
    return this.getApiKey() !== null
  }

  /* ---- settings ---- */

  getModel(): ModelId {
    return (process.env.NILA_MODEL as ModelId) || this.settings.model
  }

  getPersona(): string {
    return this.settings.persona
  }

  getRequireApproval(): boolean {
    return this.settings.requireAutomationApproval
  }

  /** The renderer-safe view of settings (no raw key material). */
  toSettings(): Settings {
    return {
      apiKeyConfigured: this.hasApiKey(),
      model: this.getModel(),
      workspaceDir: this.settings.workspaceDir,
      requireAutomationApproval: this.settings.requireAutomationApproval,
      voiceOutputEnabled: this.settings.voiceOutputEnabled,
      voiceUri: this.settings.voiceUri,
      voiceRate: this.settings.voiceRate,
      theme: this.settings.theme,
      persona: this.settings.persona
    }
  }

  update(update: Partial<PersistedSettings & { workspaceDir: string }>): void {
    if (update.workspaceDir) {
      try {
        mkdirSync(update.workspaceDir, { recursive: true })
      } catch (err) {
        log.warn('could not create new workspace dir', String(err))
      }
    }
    this.settings = { ...this.settings, ...update }
    this.persist()
  }
}

function resolveDataDir(): string {
  if (process.env.NILA_DATA_DIR) return process.env.NILA_DATA_DIR
  // app.getPath('userData') is the OS-standard per-app data directory.
  try {
    return app.getPath('userData')
  } catch {
    // Fallback if called before app is ready (shouldn't happen in practice).
    return join(homedir(), '.nila')
  }
}
