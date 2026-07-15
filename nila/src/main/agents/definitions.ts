/**
 * Definitions for Nila's hidden specialized agents.
 *
 * These agents are internal: the user never talks to them directly. Nila Core
 * delegates a focused objective to an agent, the agent works with its own
 * narrow toolset and system prompt, and its result flows back to Nila — who
 * reviews and speaks the final answer in one consistent voice.
 *
 * Agents deliberately have NO delegation tools of their own, so orchestration
 * stays centralized in Nila Core and there is no agent-to-agent recursion.
 */
import { Capabilities, type CapabilityName } from '../services/tools'

/** Which per-turn flag must be on for Nila to be offered this agent. */
export type AgentGate = 'always' | 'files' | 'research' | 'automation'

export interface AgentDefinition {
  id: string
  /** Human-friendly label used in status messages and tool chips. */
  label: string
  /** Description Nila sees when deciding whether to delegate. */
  description: string
  /** The agent's focused system prompt. */
  systemPrompt: string
  /** Capabilities this agent may use (a subset of the capability registry). */
  capabilities: CapabilityName[]
  gate: AgentGate
  maxIterations: number
  maxTokens: number
}

const REVIEW_CLOSING =
  'Return a clear, self-contained result for Nila to relay to the user. Be concise and factual. ' +
  'Do not address the user directly or adopt a persona — you are an internal specialist reporting ' +
  'to Nila.'

export const AGENTS: AgentDefinition[] = [
  {
    id: 'research',
    label: 'Research agent',
    description:
      'Delegate a research question that needs current or authoritative information from the web. ' +
      'Returns a synthesized, source-cited answer.',
    systemPrompt:
      'You are Nila\'s research specialist. Investigate the objective using web research, weigh the ' +
      'sources, and synthesize an accurate answer. Flag uncertainty and conflicting evidence. ' +
      REVIEW_CLOSING,
    capabilities: [Capabilities.WebResearch],
    gate: 'research',
    maxIterations: 4,
    maxTokens: 2048
  },
  {
    id: 'coding',
    label: 'Coding agent',
    description:
      'Delegate a programming task — writing, explaining, reviewing, or debugging code, or ' +
      'inspecting workspace files. Returns code and/or an explanation.',
    systemPrompt:
      'You are Nila\'s software engineering specialist. Read relevant workspace files before making ' +
      'claims, write correct idiomatic code, and explain trade-offs briefly. When you change files, ' +
      'summarize what and why. ' + REVIEW_CLOSING,
    capabilities: [Capabilities.ReadFile, Capabilities.WriteFile, Capabilities.ListFiles],
    gate: 'files',
    maxIterations: 8,
    maxTokens: 4096
  },
  {
    id: 'vision',
    label: 'Vision agent',
    description:
      "Delegate anything about what is currently on the user's screen. Captures the screen and " +
      'returns a detailed analysis.',
    systemPrompt:
      'You are Nila\'s vision specialist. Capture the screen and describe precisely what is relevant ' +
      'to the objective — text, UI state, errors, layout. Do not speculate beyond what is visible. ' +
      REVIEW_CLOSING,
    capabilities: [Capabilities.CaptureScreen],
    gate: 'always',
    maxIterations: 3,
    maxTokens: 2048
  },
  {
    id: 'automation',
    label: 'Automation agent',
    description:
      'Delegate a task that requires doing something on the machine (running a command, opening ' +
      'files/URLs, changing workspace files). Proposes actions for the user to approve.',
    systemPrompt:
      'You are Nila\'s automation specialist. Translate the objective into the smallest, safest set ' +
      'of concrete desktop actions and propose them for approval. Never assume approval. Explain each ' +
      'action in plain language. ' + REVIEW_CLOSING,
    capabilities: [Capabilities.ProposeAutomation],
    gate: 'automation',
    maxIterations: 4,
    maxTokens: 2048
  },
  {
    id: 'planning',
    label: 'Planning agent',
    description:
      'Delegate the breakdown of a complex goal into an ordered, actionable plan with milestones ' +
      'and risks. Returns a structured plan.',
    systemPrompt:
      'You are Nila\'s planning specialist. Break the objective into clear ordered steps with ' +
      'milestones, dependencies, and risks. Prefer concrete, checkable steps. ' + REVIEW_CLOSING,
    capabilities: [],
    gate: 'always',
    maxIterations: 1,
    maxTokens: 2048
  },
  {
    id: 'memory',
    label: 'Memory agent',
    description:
      'Delegate bulk memory work — retrieving all relevant context about a topic, or organizing / ' +
      'auditing what Nila remembers about the user.',
    systemPrompt:
      'You are Nila\'s memory specialist. Use recall to gather everything relevant to the objective, ' +
      'consolidate duplicates in your summary, and (only when clearly warranted) save cleaned-up ' +
      'entries. Report what you found and any changes you made. ' + REVIEW_CLOSING,
    capabilities: [Capabilities.Recall, Capabilities.Remember],
    gate: 'always',
    maxIterations: 4,
    maxTokens: 2048
  },
  {
    id: 'security',
    label: 'Security agent',
    description:
      'Delegate a review of a potentially risky action or request. Returns a risk assessment and a ' +
      'recommendation (allow / caution / block).',
    systemPrompt:
      'You are Nila\'s security specialist. Assess the described action for risk to the user\'s data, ' +
      'privacy, and system. Identify concrete dangers and give a recommendation: ALLOW, CAUTION (with ' +
      'conditions), or BLOCK (with reason). Be specific and proportionate. ' + REVIEW_CLOSING,
    capabilities: [],
    gate: 'always',
    maxIterations: 1,
    maxTokens: 1536
  }
]

export const AGENTS_BY_ID: Record<string, AgentDefinition> = Object.fromEntries(
  AGENTS.map((a) => [a.id, a])
)

/** The tool name Nila uses to delegate to an agent, e.g. "research_agent". */
export function delegationToolName(agentId: string): string {
  return `${agentId}_agent`
}

/** Map a delegation tool name back to its agent id, or null if it isn't one. */
export function agentIdFromTool(toolName: string): string | null {
  const match = toolName.match(/^([a-z]+)_agent$/)
  if (!match) return null
  return AGENTS_BY_ID[match[1]] ? match[1] : null
}
