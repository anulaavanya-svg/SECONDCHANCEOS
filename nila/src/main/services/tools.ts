/**
 * Tool registry for the agentic chat loop.
 *
 * Each tool has an Anthropic JSON-schema definition and a handler. Which tools
 * are offered to the model depends on per-request toggles (files, research,
 * automation) plus the always-on memory tools. Handlers return either plain
 * text or structured content blocks (used to hand images back to the model).
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
type ToolResult = string | Anthropic.ToolResultBlockParam['content']

interface ToolDef {
  spec: Anthropic.Tool
  /** Whether this tool is available for the given context. */
  enabled(ctx: ToolContext): boolean
  handler(input: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult>
}

const TOOLS: ToolDef[] = [
  /* ---------------------- memory (always on) ---------------------- */
  {
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
    enabled: () => true,
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
  {
    spec: {
      name: 'recall',
      description: 'Search your long-term memory about the user for a keyword or phrase.',
      input_schema: {
        type: 'object',
        properties: { query: { type: 'string', description: 'Keyword or phrase to search for.' } },
        required: ['query']
      }
    },
    enabled: () => true,
    async handler(input, ctx) {
      const results = ctx.memory.search(String(input.query))
      if (results.length === 0) return 'No matching memories.'
      return results.map((r) => `[${r.kind}] ${r.key}: ${r.value}`).join('\n')
    }
  },

  /* ---------------------- files ---------------------- */
  {
    spec: {
      name: 'read_file',
      description: 'Read a UTF-8 text file from the Nila workspace. Paths are relative to the workspace.',
      input_schema: {
        type: 'object',
        properties: { path: { type: 'string', description: 'Workspace-relative file path.' } },
        required: ['path']
      }
    },
    enabled: (ctx) => ctx.flags.files,
    async handler(input, ctx) {
      const res = await ctx.files.read(String(input.path))
      return res.truncated ? `${res.content}\n… (truncated)` : res.content
    }
  },
  {
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
    enabled: (ctx) => ctx.flags.files,
    async handler(input, ctx) {
      await ctx.files.write(String(input.path), String(input.content))
      return `Wrote ${Buffer.byteLength(String(input.content))} bytes to ${input.path}.`
    }
  },
  {
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
    enabled: (ctx) => ctx.flags.files,
    async handler(input, ctx) {
      const entries = await ctx.files.list(input.path ? String(input.path) : '.')
      if (entries.length === 0) return '(empty)'
      return entries
        .map((e) => `${e.isDirectory ? 'DIR ' : '    '} ${e.name}${e.isDirectory ? '/' : ` (${e.size}b)`}`)
        .join('\n')
    }
  },

  /* ---------------------- research ---------------------- */
  {
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
    enabled: (ctx) => ctx.flags.research,
    async handler(input, ctx) {
      const result = await ctx.research.run({ query: String(input.query) })
      const sources = result.sources.map((s, i) => `[${i + 1}] ${s.title} — ${s.url}`).join('\n')
      return `${result.answer}\n\nSources:\n${sources || '(none)'}`
    }
  },

  /* ---------------------- screenshot ---------------------- */
  {
    spec: {
      name: 'capture_screen',
      description:
        "Capture the user's primary screen and return the image so you can see what is on it. " +
        'Use when the user asks about something visible on their screen.',
      input_schema: { type: 'object', properties: {} }
    },
    enabled: () => true,
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
  {
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
    enabled: (ctx) => ctx.flags.automation,
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
]

export class ToolRegistry {
  /** Anthropic tool specs enabled for this context. */
  specs(ctx: ToolContext): Anthropic.Tool[] {
    return TOOLS.filter((t) => t.enabled(ctx)).map((t) => t.spec)
  }

  hasAny(ctx: ToolContext): boolean {
    return TOOLS.some((t) => t.enabled(ctx))
  }

  async dispatch(
    name: string,
    input: Record<string, unknown>,
    ctx: ToolContext
  ): Promise<{ content: ToolResult; isError: boolean }> {
    const tool = TOOLS.find((t) => t.spec.name === name)
    if (!tool || !tool.enabled(ctx)) {
      return { content: `Tool "${name}" is not available.`, isError: true }
    }
    try {
      const content = await tool.handler(input, ctx)
      return { content, isError: false }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      log.warn('tool failed', name, message)
      return { content: `Error: ${message}`, isError: true }
    }
  }
}
