/**
 * Orchestration layer between Nila Core and the specialized agents.
 *
 * Nila Core asks the orchestrator for its tool surface and dispatches tool
 * calls through it. The orchestrator exposes:
 *   - a small set of *direct* capabilities Nila keeps for itself (memory), and
 *   - one *delegation* tool per available agent (gated by per-turn flags).
 *
 * When Nila delegates, the orchestrator runs the agent and returns its result
 * as the tool output — so the agent's work flows back to Nila, who reviews and
 * speaks the final answer. The user only ever hears Nila.
 */
import type Anthropic from '@anthropic-ai/sdk'
import type { ModelId } from '@shared/types'
import type { ToolContext, ToolRegistry, ToolResult } from '../services/tools'
import { Capabilities } from '../services/tools'
import { createLogger } from '../services/logger'
import { AgentRunner } from './agent-runner'
import { AGENTS, AGENTS_BY_ID, agentIdFromTool, delegationToolName, type AgentGate } from './definitions'

const log = createLogger('orchestrator')

/** Capabilities Nila Core keeps for itself, without delegating. */
const CORE_CAPABILITIES = [Capabilities.Remember, Capabilities.Recall]

export interface DispatchOptions {
  model: ModelId
  /** Called when an agent starts, so Nila Core can surface live status. */
  onActivity?: (label: string) => void
}

export class Orchestrator {
  constructor(
    private readonly tools: ToolRegistry,
    private readonly runner: AgentRunner
  ) {}

  /** The full tool surface Nila Core is offered for this turn. */
  nilaSpecs(ctx: ToolContext): Anthropic.Tool[] {
    const coreSpecs = this.tools.specsFor(CORE_CAPABILITIES, ctx)
    const delegationSpecs = AGENTS.filter((a) => gatePasses(a.gate, ctx)).map<Anthropic.Tool>(
      (a) => ({
        name: delegationToolName(a.id),
        description: a.description,
        input_schema: {
          type: 'object',
          properties: {
            objective: {
              type: 'string',
              description: 'A precise, self-contained instruction for the specialist.'
            },
            context: {
              type: 'string',
              description: 'Optional extra context (constraints, prior findings) the specialist needs.'
            }
          },
          required: ['objective']
        }
      })
    )
    return [...coreSpecs, ...delegationSpecs]
  }

  /**
   * Dispatch a tool call from Nila Core: either a direct capability or a
   * delegation to a specialized agent.
   */
  async dispatch(
    name: string,
    input: Record<string, unknown>,
    ctx: ToolContext,
    opts: DispatchOptions
  ): Promise<{ content: ToolResult; isError: boolean }> {
    const agentId = agentIdFromTool(name)
    if (agentId) {
      return this.delegate(agentId, input, ctx, opts)
    }
    // Direct core capability (memory).
    if (!CORE_CAPABILITIES.includes(name as (typeof CORE_CAPABILITIES)[number])) {
      return { content: `Tool "${name}" is not available to Nila directly.`, isError: true }
    }
    return this.tools.dispatch(name, input, ctx)
  }

  private async delegate(
    agentId: string,
    input: Record<string, unknown>,
    ctx: ToolContext,
    opts: DispatchOptions
  ): Promise<{ content: ToolResult; isError: boolean }> {
    const def = AGENTS_BY_ID[agentId]
    if (!def || !gatePasses(def.gate, ctx)) {
      return { content: `The ${agentId} agent is not available right now.`, isError: true }
    }
    const objective = String(input.objective ?? '').trim()
    if (!objective) {
      return { content: 'An objective is required to delegate to an agent.', isError: true }
    }
    const context = input.context ? `\n\nContext: ${String(input.context)}` : ''

    opts.onActivity?.(`Consulting ${def.label}…`)
    log.info('delegate', agentId, objective.slice(0, 100))

    try {
      const result = await this.runner.run(def, objective + context, ctx, opts.model)
      const header = `[${def.label} result]`
      return { content: `${header}\n${result.result}`, isError: false }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      log.warn('delegation failed', agentId, message)
      return { content: `The ${def.label} could not complete the task: ${message}`, isError: true }
    }
  }
}

function gatePasses(gate: AgentGate, ctx: ToolContext): boolean {
  switch (gate) {
    case 'always':
      return true
    case 'files':
      return ctx.flags.files
    case 'research':
      return ctx.flags.research
    case 'automation':
      return ctx.flags.automation
    default:
      return false
  }
}
