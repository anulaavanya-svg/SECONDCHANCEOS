/**
 * Lazily constructs and caches the Anthropic SDK client from the current API
 * key. Rebuilds automatically when the key changes (e.g. the user updates it in
 * Settings). Throws a friendly, user-facing error when no key is configured.
 */
import Anthropic from '@anthropic-ai/sdk'
import type { Config } from './config'

export class MissingApiKeyError extends Error {
  constructor() {
    super(
      'No Anthropic API key is configured. Open Settings and add your key ' +
        '(from console.anthropic.com) to enable AI features.'
    )
    this.name = 'MissingApiKeyError'
  }
}

export class AnthropicClientProvider {
  private client: Anthropic | null = null
  private cachedKey: string | null = null

  constructor(private readonly config: Config) {}

  /** Returns a ready client, rebuilding it if the key changed. */
  get(): Anthropic {
    const key = this.config.getApiKey()
    if (!key) throw new MissingApiKeyError()
    if (!this.client || this.cachedKey !== key) {
      this.client = new Anthropic({ apiKey: key })
      this.cachedKey = key
    }
    return this.client
  }

  /** Lightweight validation used by Settings → "Test key". */
  async validate(apiKey: string): Promise<{ ok: boolean; message: string }> {
    const trimmed = apiKey.trim()
    if (!trimmed) return { ok: false, message: 'Enter an API key first.' }
    try {
      const client = new Anthropic({ apiKey: trimmed })
      await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4,
        messages: [{ role: 'user', content: 'ping' }]
      })
      return { ok: true, message: 'Key is valid.' }
    } catch (err) {
      return { ok: false, message: friendlyError(err) }
    }
  }
}

export function friendlyError(err: unknown): string {
  if (err instanceof MissingApiKeyError) return err.message
  const anyErr = err as { status?: number; message?: string }
  if (anyErr?.status === 401) return 'The API key was rejected (401). Double-check it in Settings.'
  if (anyErr?.status === 429) return 'Rate limited by Anthropic (429). Please try again shortly.'
  if (anyErr?.status === 529) return 'Anthropic is temporarily overloaded (529). Try again soon.'
  return anyErr?.message || String(err)
}
