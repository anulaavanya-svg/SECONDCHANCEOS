import { afterEach, describe, expect, it, vi } from 'vitest'
import type Anthropic from '@anthropic-ai/sdk'
import { AgentRunner } from '../src/main/agents/agent-runner'
import { Capabilities, ToolRegistry, type ToolContext } from '../src/main/services/tools'
import { Database } from '../src/main/services/database'
import { MemoryStore } from '../src/main/services/memory-store'
import type { AnthropicClientProvider } from '../src/main/services/anthropic-client'
import type { AgentDefinition } from '../src/main/agents/definitions'

function toolUseResponse(): Anthropic.Message {
  return {
    id: 'm1',
    type: 'message',
    role: 'assistant',
    model: 'claude-opus-4-8',
    stop_reason: 'tool_use',
    stop_sequence: null,
    usage: { input_tokens: 1, output_tokens: 1 } as Anthropic.Usage,
    content: [
      { type: 'tool_use', id: 't1', name: 'recall', input: { query: 'city' } } as Anthropic.ToolUseBlock
    ]
  }
}

function finalResponse(text: string): Anthropic.Message {
  return {
    id: 'm2',
    type: 'message',
    role: 'assistant',
    model: 'claude-opus-4-8',
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: { input_tokens: 1, output_tokens: 1 } as Anthropic.Usage,
    content: [{ type: 'text', text, citations: [] } as Anthropic.TextBlock]
  }
}

const DEF: AgentDefinition = {
  id: 'memory',
  label: 'Memory agent',
  description: 'test',
  systemPrompt: 'test',
  capabilities: [Capabilities.Recall],
  gate: 'always',
  maxIterations: 4,
  maxTokens: 100
}

describe('AgentRunner', () => {
  let cleanup: (() => void) | null = null
  afterEach(() => {
    cleanup?.()
    cleanup = null
  })

  it('runs a tool loop: calls a capability, then returns the final synthesis', async () => {
    const db = new Database(':memory:')
    cleanup = () => db.close()
    db.upsertMemory({ kind: 'fact', key: 'city', value: 'Seattle' })

    const create = vi
      .fn()
      .mockResolvedValueOnce(toolUseResponse())
      .mockResolvedValueOnce(finalResponse('You live in Seattle.'))
    const clients = {
      get: () => ({ messages: { create } }) as unknown as Anthropic
    } as unknown as AnthropicClientProvider

    const ctx: ToolContext = {
      conversationId: 'c1',
      db,
      memory: new MemoryStore(db),
      files: {} as ToolContext['files'],
      research: {} as ToolContext['research'],
      screenshot: {} as ToolContext['screenshot'],
      automation: {} as ToolContext['automation'],
      flags: { files: false, research: false, automation: false }
    }

    const runner = new AgentRunner(clients, new ToolRegistry())
    const result = await runner.run(DEF, 'where do I live?', ctx, 'claude-opus-4-8')

    expect(create).toHaveBeenCalledTimes(2)
    expect(result.result).toContain('Seattle')
    expect(result.capabilitiesUsed).toContain('recall')
    expect(result.agentId).toBe('memory')
  })

  it('stops immediately when the model returns no tool call', async () => {
    const db = new Database(':memory:')
    cleanup = () => db.close()

    const create = vi.fn().mockResolvedValueOnce(finalResponse('Direct answer.'))
    const clients = {
      get: () => ({ messages: { create } }) as unknown as Anthropic
    } as unknown as AnthropicClientProvider

    const ctx: ToolContext = {
      conversationId: 'c1',
      db,
      memory: new MemoryStore(db),
      files: {} as ToolContext['files'],
      research: {} as ToolContext['research'],
      screenshot: {} as ToolContext['screenshot'],
      automation: {} as ToolContext['automation'],
      flags: { files: false, research: false, automation: false }
    }

    const runner = new AgentRunner(clients, new ToolRegistry())
    const result = await runner.run(DEF, 'hi', ctx, 'claude-opus-4-8')

    expect(create).toHaveBeenCalledOnce()
    expect(result.result).toBe('Direct answer.')
    expect(result.capabilitiesUsed).toHaveLength(0)
  })
})
