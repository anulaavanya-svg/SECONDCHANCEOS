/**
 * Runs a single specialized agent to completion.
 *
 * An agent gets a focused objective, its own system prompt, and a narrow set of
 * capabilities. It executes a bounded tool loop (non-streaming) and returns a
 * synthesized text result for Nila Core to review. Agents never stream to the
 * user and never delegate further.
 */
import type Anthropic from '@anthropic-ai/sdk'
import type { ModelId } from '@shared/types'
import type { AnthropicClientProvider } from '../services/anthropic-client'
import type { ToolContext, ToolRegistry } from '../services/tools'
import { createLogger } from '../services/logger'
import type { AgentDefinition } from './definitions'

const log = createLogger('agent')

export interface AgentResult {
  agentId: string
  label: string
  result: string
  capabilitiesUsed: string[]
}

export class AgentRunner {
  constructor(
    private readonly clients: AnthropicClientProvider,
    private readonly tools: ToolRegistry
  ) {}

  async run(
    def: AgentDefinition,
    objective: string,
    ctx: ToolContext,
    model: ModelId
  ): Promise<AgentResult> {
    const client = this.clients.get()
    const toolSpecs = this.tools.specsFor(def.capabilities, ctx)
    const messages: Anthropic.MessageParam[] = [{ role: 'user', content: objective }]
    const capabilitiesUsed = new Set<string>()
    let finalText = ''

    log.info(`agent:${def.id} start`, objective.slice(0, 120))

    for (let i = 0; i < def.maxIterations; i++) {
      const response = await client.messages.create({
        model,
        max_tokens: def.maxTokens,
        system: def.systemPrompt,
        tools: toolSpecs.length ? toolSpecs : undefined,
        messages
      })

      finalText = textOf(response)
      const toolUses = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
      )

      if (response.stop_reason !== 'tool_use' || toolUses.length === 0) break

      messages.push({ role: 'assistant', content: response.content as Anthropic.ContentBlockParam[] })

      const results: Anthropic.ToolResultBlockParam[] = []
      for (const use of toolUses) {
        capabilitiesUsed.add(use.name)
        const { content, isError } = await this.tools.dispatch(
          use.name,
          (use.input as Record<string, unknown>) ?? {},
          ctx
        )
        results.push({
          type: 'tool_result',
          tool_use_id: use.id,
          content: content as Anthropic.ToolResultBlockParam['content'],
          is_error: isError
        })
      }
      messages.push({ role: 'user', content: results })
    }

    log.info(`agent:${def.id} done`, `${finalText.length} chars`)
    return {
      agentId: def.id,
      label: def.label,
      result: finalText.trim() || '(the agent produced no result)',
      capabilitiesUsed: [...capabilitiesUsed]
    }
  }
}

function textOf(response: Anthropic.Message): string {
  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
}
