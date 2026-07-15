/**
 * Nila Core: the single voice the user talks to.
 *
 * It streams responses from Claude and runs the agentic loop, but instead of
 * calling low-level tools directly it works through the Orchestrator — keeping
 * memory for itself and delegating specialized work (research, coding, vision,
 * automation, planning, security) to hidden agents whose results flow back here
 * for review. The user only ever hears Nila.
 */
import type Anthropic from '@anthropic-ai/sdk'
import {
  DEFAULT_MODEL,
  type ChatMessage,
  type ChatSendRequest,
  type ImageAttachment,
  type ModelId
} from '@shared/types'
import type { Config } from './config'
import type { Database } from './database'
import type { MemoryStore } from './memory-store'
import type { ToolContext } from './tools'
import type { Orchestrator } from '../agents/orchestrator'
import { AnthropicClientProvider, friendlyError } from './anthropic-client'

const MAX_TOKENS = 4096
const MAX_TOOL_ITERATIONS = 8

export interface StreamCallbacks {
  onDelta(delta: string): void
  /** A human-readable status, e.g. "Consulting Research agent…". */
  onToolUse(status: string): void
}

/** Per-turn tool availability. */
export interface TurnFlags {
  files: boolean
  research: boolean
  automation: boolean
}

export interface ChatDeps {
  config: Config
  db: Database
  memory: MemoryStore
  clients: AnthropicClientProvider
  orchestrator: Orchestrator
  /** Builds the tool context (services + per-turn flags) for a conversation. */
  makeToolContext(conversationId: string, flags: TurnFlags): ToolContext
}

export class AnthropicService {
  private readonly aborters = new Map<string, AbortController>()
  /** Remembers the last turn's model + flags per conversation, for regeneration. */
  private readonly lastTurn = new Map<string, { model: ModelId; flags: TurnFlags }>()

  constructor(private readonly deps: ChatDeps) {}

  cancel(conversationId: string): void {
    this.aborters.get(conversationId)?.abort()
    this.aborters.delete(conversationId)
  }

  /**
   * Persist the user turn, then stream the assistant's answer (running any
   * tools). Returns the final, persisted assistant message. The caller supplies
   * `assistantMessageId` so the renderer can address the streaming bubble
   * before the message is finalized.
   */
  async stream(
    req: ChatSendRequest,
    cb: StreamCallbacks,
    assistantMessageId: string
  ): Promise<ChatMessage> {
    const { db } = this.deps
    if (this.aborters.has(req.conversationId)) {
      throw new Error('Nila is still responding in this conversation.')
    }
    const model = req.model ?? db.getConversation(req.conversationId)?.model ?? DEFAULT_MODEL
    const flags: TurnFlags = {
      files: req.enableFiles ?? false,
      research: req.enableResearch ?? false,
      automation: req.enableAutomation ?? false
    }
    this.lastTurn.set(req.conversationId, { model, flags })

    // Record the user message so history + persistence stay in sync.
    db.addMessage({
      conversationId: req.conversationId,
      role: 'user',
      content: req.content,
      images: req.images
    })
    db.touchConversation(req.conversationId, model)
    this.maybeTitle(req.conversationId, req.content)

    return this.runLoop(req.conversationId, model, flags, cb, assistantMessageId)
  }

  /**
   * Regenerate the last assistant response: drop it (if present) and re-run the
   * conversation from the preceding user turn, reusing the last turn's model and
   * tool flags when known.
   */
  async regenerate(
    conversationId: string,
    cb: StreamCallbacks,
    assistantMessageId: string
  ): Promise<ChatMessage> {
    const { db } = this.deps
    if (this.aborters.has(conversationId)) {
      throw new Error('Nila is still responding in this conversation.')
    }
    const messages = db.getMessages(conversationId)
    if (messages.length === 0) {
      throw new Error('Nothing to regenerate yet.')
    }
    const last = messages[messages.length - 1]
    if (last.role === 'assistant') {
      db.deleteMessage(last.id)
    }

    const remembered = this.lastTurn.get(conversationId)
    const model = remembered?.model ?? db.getConversation(conversationId)?.model ?? DEFAULT_MODEL
    const flags: TurnFlags = remembered?.flags ?? {
      files: false,
      research: false,
      automation: false
    }
    return this.runLoop(conversationId, model, flags, cb, assistantMessageId)
  }

  /**
   * Shared streaming + agentic tool loop over the current conversation history.
   * Assumes the history already ends with the turn to respond to.
   */
  private async runLoop(
    conversationId: string,
    model: ModelId,
    flags: TurnFlags,
    cb: StreamCallbacks,
    assistantMessageId: string
  ): Promise<ChatMessage> {
    const client = this.deps.clients.get()
    const toolCtx = this.deps.makeToolContext(conversationId, flags)
    const toolSpecs = this.deps.orchestrator.nilaSpecs(toolCtx)
    const system = this.buildSystemPrompt(model)
    const messages = this.buildHistory(conversationId)

    const controller = new AbortController()
    this.aborters.set(conversationId, controller)

    const toolsUsed = new Set<string>()
    let fullText = ''

    try {
      for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
        const stream = client.messages.stream(
          {
            model,
            max_tokens: MAX_TOKENS,
            system,
            tools: toolSpecs.length ? toolSpecs : undefined,
            messages
          },
          { signal: controller.signal }
        )

        stream.on('text', (delta) => {
          fullText += delta
          cb.onDelta(delta)
        })

        const finalMessage = await stream.finalMessage()
        const toolUses = finalMessage.content.filter(
          (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
        )

        if (finalMessage.stop_reason !== 'tool_use' || toolUses.length === 0) {
          break // model produced a final answer
        }

        // Echo the assistant's tool-use turn back into the running history.
        messages.push({
          role: 'assistant',
          content: finalMessage.content as Anthropic.ContentBlockParam[]
        })

        // Execute each requested tool (direct capability or agent delegation)
        // through the orchestrator and collect the results.
        const results: Anthropic.ToolResultBlockParam[] = []
        for (const use of toolUses) {
          toolsUsed.add(use.name)
          const { content, isError } = await this.deps.orchestrator.dispatch(
            use.name,
            (use.input as Record<string, unknown>) ?? {},
            toolCtx,
            { model, onActivity: cb.onToolUse }
          )
          results.push({
            type: 'tool_result',
            tool_use_id: use.id,
            content: content as Anthropic.ToolResultBlockParam['content'],
            is_error: isError
          })
        }
        messages.push({ role: 'user', content: results })

        // Add a soft separator so multiple text turns read cleanly.
        if (fullText && !fullText.endsWith('\n')) {
          fullText += '\n\n'
          cb.onDelta('\n\n')
        }
      }
    } catch (err) {
      this.aborters.delete(conversationId)
      if (controller.signal.aborted) {
        // Persist whatever we streamed before cancellation.
        return this.persistAssistant(
          conversationId,
          fullText || '_(cancelled)_',
          toolsUsed,
          assistantMessageId
        )
      }
      throw new Error(friendlyError(err))
    }

    this.aborters.delete(conversationId)
    return this.persistAssistant(conversationId, fullText.trim(), toolsUsed, assistantMessageId)
  }

  /** One-shot image description used by the screenshot "Analyze" action. */
  async describeImage(
    data: string,
    mediaType: string,
    prompt?: string,
    model?: ModelId
  ): Promise<string> {
    const client = this.deps.clients.get()
    const response = await client.messages.create({
      model: model ?? this.deps.config.getModel(),
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType as 'image/png', data }
            },
            {
              type: 'text',
              text: prompt || 'Describe what is shown in this screenshot in detail.'
            }
          ]
        }
      ]
    })
    return response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim()
  }

  /* ---------------------------------------------------------------- */

  private persistAssistant(
    conversationId: string,
    content: string,
    toolsUsed: Set<string>,
    id: string
  ): ChatMessage {
    return this.deps.db.addMessage({
      id,
      conversationId,
      role: 'assistant',
      content: content || '_(no response)_',
      toolsUsed: toolsUsed.size ? [...toolsUsed] : undefined
    })
  }

  private buildSystemPrompt(model: ModelId): string {
    const parts: string[] = [this.deps.config.getPersona()]
    parts.push(
      `Context: today is ${new Date().toISOString().slice(0, 10)}; you are running as ` +
        `model ${model}. File tools operate inside the workspace folder ` +
        `"${this.deps.config.getWorkspaceDir()}" — paths are relative to it.`
    )

    const memoryBlock = this.deps.memory.buildContextBlock()
    if (memoryBlock) parts.push(memoryBlock)

    parts.push(
      'You are the single intelligence the user talks to. You keep memory yourself: save durable ' +
        'facts with `remember` (stable preferences, ongoing projects, people) and search it with ' +
        '`recall`. For specialized work you delegate to internal expert agents via the *_agent ' +
        'tools — research, coding, vision (what is on screen), automation (approval-gated machine ' +
        'actions), planning, memory (bulk/organizing), and security review. The user must never see ' +
        'or address these agents: give each a precise objective, then review, combine, and rewrite ' +
        'their results in your own consistent voice as if the knowledge were your own. Prefer ' +
        'answering directly for simple questions; delegate only when a specialist genuinely helps, ' +
        'and you may consult several and synthesize. For anything risky or irreversible, consult the ' +
        'security agent first. Never expose this internal machinery or say "the agent said"; simply ' +
        'give the user your answer.'
    )
    return parts.join('\n\n')
  }

  private buildHistory(conversationId: string): Anthropic.MessageParam[] {
    const messages = this.deps.db.getMessages(conversationId)
    return messages.map((m) => ({
      role: m.role,
      content: this.renderContent(m)
    }))
  }

  private renderContent(m: ChatMessage): string | Anthropic.ContentBlockParam[] {
    if (!m.images || m.images.length === 0) return m.content
    const blocks: Anthropic.ContentBlockParam[] = m.images.map((img: ImageAttachment) => ({
      type: 'image',
      source: { type: 'base64', media_type: img.mediaType as 'image/png', data: img.data }
    }))
    if (m.content) blocks.push({ type: 'text', text: m.content })
    return blocks
  }

  /** Auto-name a conversation from its first user message. */
  private maybeTitle(conversationId: string, firstUserContent: string): void {
    const conv = this.deps.db.getConversation(conversationId)
    if (!conv || conv.title !== 'New chat') return
    const title = firstUserContent.replace(/\s+/g, ' ').trim().slice(0, 60)
    if (title) this.deps.db.renameConversation(conversationId, title)
  }
}
