/**
 * The chat brain: streams responses from Claude, runs the agentic tool loop,
 * and persists the conversation. Text deltas are streamed to the renderer as
 * they arrive; tool calls (memory, files, research, screenshots, automation)
 * are executed between turns until the model produces a final answer.
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
import { ToolRegistry, type ToolContext } from './tools'
import { AnthropicClientProvider, friendlyError } from './anthropic-client'
import { createLogger } from './logger'

const log = createLogger('anthropic')

const MAX_TOKENS = 4096
const MAX_TOOL_ITERATIONS = 8

export interface StreamCallbacks {
  onDelta(delta: string): void
  onToolUse(name: string): void
}

export interface ChatDeps {
  config: Config
  db: Database
  memory: MemoryStore
  clients: AnthropicClientProvider
  tools: ToolRegistry
  /** Builds the per-request tool context (services + flags). */
  makeToolContext(req: ChatSendRequest): ToolContext
}

export class AnthropicService {
  private readonly aborters = new Map<string, AbortController>()

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
    const model = req.model ?? db.getConversation(req.conversationId)?.model ?? DEFAULT_MODEL

    // Record the user message so history + persistence stay in sync.
    db.addMessage({
      conversationId: req.conversationId,
      role: 'user',
      content: req.content,
      images: req.images
    })
    db.touchConversation(req.conversationId, model)
    this.maybeTitle(req.conversationId, req.content)

    const client = this.deps.clients.get()
    const toolCtx = this.deps.makeToolContext(req)
    const toolSpecs = this.deps.tools.specs(toolCtx)
    const system = this.buildSystemPrompt(model)
    const messages = this.buildHistory(req.conversationId)

    const controller = new AbortController()
    this.aborters.set(req.conversationId, controller)

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

        // Execute each requested tool and collect results.
        const results: Anthropic.ToolResultBlockParam[] = []
        for (const use of toolUses) {
          toolsUsed.add(use.name)
          cb.onToolUse(use.name)
          const { content, isError } = await this.deps.tools.dispatch(
            use.name,
            (use.input as Record<string, unknown>) ?? {},
            toolCtx
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
      this.aborters.delete(req.conversationId)
      if (controller.signal.aborted) {
        // Persist whatever we streamed before cancellation.
        return this.persistAssistant(
          req.conversationId,
          fullText || '_(cancelled)_',
          toolsUsed,
          assistantMessageId
        )
      }
      throw new Error(friendlyError(err))
    }

    this.aborters.delete(req.conversationId)
    return this.persistAssistant(
      req.conversationId,
      fullText.trim(),
      toolsUsed,
      assistantMessageId
    )
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
    parts.push(`Today's date is ${new Date().toISOString().slice(0, 10)}.`)
    parts.push(`You are currently running as model ${model}.`)

    const memoryBlock = this.deps.memory.buildContextBlock()
    if (memoryBlock) parts.push(memoryBlock)

    parts.push(
      'Tool guidance: prefer answering directly for simple questions. Use tools when they ' +
        'genuinely help — save durable facts with `remember`, read/write workspace files when ' +
        'asked, research the web for current information, capture the screen when the user refers ' +
        'to what they see, and propose desktop actions (which require the user to approve) only ' +
        'when the user wants something done on their machine.'
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
