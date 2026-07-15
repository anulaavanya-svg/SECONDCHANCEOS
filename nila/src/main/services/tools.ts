/**
 * Capability registry.
 *
 * These are the low-level "capabilities" the assistant can use: memory, files,
 * research, screen capture, and desktop automation. They are selected by name
 * rather than by global flags, because Nila Core and each specialized agent
 * expose a different curated subset (see ../agents). Handlers return either
 * plain text or structured content blocks (used to hand images to the model).
 */
import type Anthropic from '@anthropic-ai/sdk'
import type { AutomationAction, MemoryKind } from '@shared/types'
import type { Database } from './database'
import type { FileService } from './files'
import type { MemoryStore } from './memory-store'
import type { ResearchService } from './research'
import type { ScreenshotService } from './screenshot'
import type { AutomationManager } from '../automation/manager'
import { createLogger } from './logger'

const log = createLogger('tools')

export interface ToolContext {
  conversationId: string
  db: Database
  files: FileService
  memory: MemoryStore
  research: ResearchService
  screenshot: ScreenshotService
  automation: AutomationManager
  flags: {
    files: boolean
    research: boolean
    automation: boolean
  }
}

/** A tool result: plain string, or explicit content blocks (e.g. an image). */
export type ToolResult = string | Anthropic.ToolResultBlockParam['content']

export interface ToolDef {
  spec: Anthropic.Tool
  handler(input: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult>
}

/** Canonical capability names, referenced by agent definitions. */
export const Capabilities = {
  Remember: 'remember',
  Recall: 'recall',
  ReadFile: 'read_file',
  WriteFile: 'write_file',
  ListFiles: 'list_files',
  WebResearch: 'web_research',
  CaptureScreen: 'capture_screen',
  ProposeAutomation: 'propose_automation'
} as const

export type CapabilityName = (typeof Capabilities)[keyof typeof Capabilities]

const TOOLS: Record<CapabilityName, ToolDef> = {
  /* ---------------------- memory ---------------------- */
  [Capabilities.Remember]: {
    spec: {
      name: 'remember',
      description:
        'Save a durable fact about the user to long-term memory so you recall it in future ' +
        'sessions. Use for stable preferences, ongoing projects, people, and important facts — ' +
        'not for trivia or one-off details.',
      input_schema: {
        type: 'object',
        properties: {
          kind: {
            type: 'string',
            enum: ['fact', 'preference', 'project', 'person', 'note'],
            description: 'Category of the memory.'
          },
          key: { type: 'string', description: 'Short label, e.g. "preferred language".' },
          value: { type: 'string', description: 'The information to remember.' },
          importance: {
            type: 'number',
            description: '0..1 importance; higher stays in context longer. Default 0.6.'
          }
        },
        required: ['kind', 'key', 'value']
      }
    },
    async handler(input, ctx) {
      const entry = ctx.db.upsertMemory({
        kind: input.kind as MemoryKind,
        key: String(input.key),
        value: String(input.value),
        importance: typeof input.importance === 'number' ? input.importance : 0.6,
        source: 'assistant'
      })
      return `Saved to memory: [${entry.kind}] ${entry.key} = ${entry.value}`
    }
  },
  [Capabilities.Recall]: {
    spec: {
      name: 'recall',
      description: 'Search your long-term memory about the user for a keyword or phrase.',
      input_schema: {
        type: 'object',
        properties: { query: { type: 'string', description: 'Keyword or phrase to search for.' } },
        required: ['query']
      }
    },
    async handler(input, ctx) {
      const results = ctx.memory.search(String(input.query))
      if (results.length === 0) return 'No matching memories.'
      return results.map((r) => `[${r.kind}] ${r.key}: ${r.value}`).join('\n')
    }
  },

  /* ---------------------- files ---------------------- */
  [Capabilities.ReadFile]: {
    spec: {
      name: 'read_file',
      description: 'Read a UTF-8 text file from the Nila workspace. Paths are relative to the workspace.',
      input_schema: {
        type: 'object',
        properties: { path: { type: 'string', description: 'Workspace-relative file path.' } },
        required: ['path']
      }
    },
    async handler(input, ctx) {
      const res = await ctx.files.read(String(input.path))
      return res.truncated ? `${res.content}\n… (truncated)` : res.content
    }
  },
  [Capabilities.WriteFile]: {
    spec: {
      name: 'write_file',
      description:
        'Create or overwrite a UTF-8 text file in the Nila workspace. Use for saving notes, ' +
        'code, or generated content the user asked for.',
      input_schema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Workspace-relative file path.' },
          content: { type: 'string', description: 'Full file contents.' }
        },
        required: ['path', 'content']
      }
    },
    async handler(input, ctx) {
      await ctx.files.write(String(input.path), String(input.content))
      return `Wrote ${Buffer.byteLength(String(input.content))} bytes to ${input.path}.`
    }
  },
  [Capabilities.ListFiles]: {
    spec: {
      name: 'list_files',
      description: 'List files and folders in a workspace directory.',
      input_schema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Workspace-relative directory (default: root).' }
        }
      }
    },
    async handler(input, ctx) {
      const entries = await ctx.files.list(input.path ? String(input.path) : '.')
      if (entries.length === 0) return '(empty)'
      return entries
        .map((e) => `${e.isDirectory ? 'DIR ' : '    '} ${e.name}${e.isDirectory ? '/' : ` (${e.size}b)`}`)
        .join('\n')
    }
  },

  /* ---------------------- research ---------------------- */
  [Capabilities.WebResearch]: {
    spec: {
      name: 'web_research',
      description:
        'Research a question on the live web and return a synthesized answer with sources. ' +
        'Use when you need current information or facts you are unsure about.',
      input_schema: {
        type: 'object',
        properties: { query: { type: 'string', description: 'The research question.' } },
        required: ['query']
      }
    },
    async handler(input, ctx) {
      const result = await ctx.research.run({ query: String(input.query) })
      const sources = result.sources.map((s, i) => `[${i + 1}] ${s.title} — ${s.url}`).join('\n')
      return `${result.answer}\n\nSources:\n${sources || '(none)'}`
    }
  },

  /* ---------------------- screenshot ---------------------- */
  [Capabilities.CaptureScreen]: {
    spec: {
      name: 'capture_screen',
      description:
        "Capture the user's primary screen and return the image so you can see what is on it. " +
        'Use when the user asks about something visible on their screen.',
      input_schema: { type: 'object', properties: {} }
    },
    async handler(_input, ctx) {
      const shot = await ctx.screenshot.capture()
      return [
        {
          type: 'image',
          source: { type: 'base64', media_type: shot.mediaType, data: shot.data }
        }
      ]
    }
  },

  /* ---------------------- automation ---------------------- */
  [Capabilities.ProposeAutomation]: {
    spec: {
      name: 'propose_automation',
      description:
        'Propose one or more desktop actions (run a shell command, open a file/URL, write/move/' +
        'delete a workspace file) for the user to approve. The user must approve before anything ' +
        'runs. Always prefer the smallest, safest set of actions and explain each clearly.',
      input_schema: {
        type: 'object',
        properties: {
          actions: {
            type: 'array',
            description: 'Ordered list of actions to perform once approved.',
            items: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['run-shell', 'open-path', 'open-url', 'write-file', 'move-file', 'delete-file']
                },
                description: { type: 'string', description: 'Plain-language explanation for the user.' },
                params: {
                  type: 'object',
                  description:
                    'Action params: run-shell{command}, open-path{path}, open-url{url}, ' +
                    'write-file{path,content}, move-file{from,to}, delete-file{path}.',
                  additionalProperties: { type: 'string' }
                }
              },
              required: ['type', 'description', 'params']
            }
          }
        },
        required: ['actions']
      }
    },
    async handler(input, ctx) {
      const actions = (input.actions as AutomationAction[]) ?? []
      if (!Array.isArray(actions) || actions.length === 0) {
        return 'No actions were provided.'
      }
      const task = await ctx.automation.propose(ctx.conversationId, actions)
      switch (task.status) {
        case 'executed':
          return `The user approved and the actions ran successfully:\n${task.result ?? ''}`
        case 'failed':
          return `The actions were attempted but failed: ${task.error ?? 'unknown error'}\n${task.result ?? ''}`
        case 'rejected':
          return 'The user rejected the proposed actions. Do not attempt them again unless asked.'
        default:
          return `Automation task ended in state: ${task.status}.`
      }
    }
  }
}

/**
 * Selects and dispatches capabilities by name. Callers (Nila Core and each
 * agent) decide which capability names they expose.
 */
export class ToolRegistry {
  /** Anthropic tool specs for the given capability names (unknown names skipped). */
  specsFor(names: readonly string[], _ctx?: ToolContext): Anthropic.Tool[] {
    return names
      .map((name) => TOOLS[name as CapabilityName])
      .filter((t): t is ToolDef => Boolean(t))
      .map((t) => t.spec)
  }

  has(name: string): boolean {
    return name in TOOLS
  }

  async dispatch(
    name: string,
    input: Record<string, unknown>,
    ctx: ToolContext
  ): Promise<{ content: ToolResult; isError: boolean }> {
    const tool = TOOLS[name as CapabilityName]
    if (!tool) {
      return { content: `Capability "${name}" is not available.`, isError: true }
    }
    try {
      const content = await tool.handler(input, ctx)
      return { content, isError: false }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      log.warn('capability failed', name, message)
      return { content: `Error: ${message}`, isError: true }
    }
  }
}
