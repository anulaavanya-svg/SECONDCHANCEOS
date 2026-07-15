/**
 * Slash-command parsing for the composer. Pure and dependency-free so the
 * matching/parsing logic is unit-testable in isolation.
 *
 * Two kinds of commands:
 *   - `modifier`: transforms the message that gets sent (e.g. `/research foo`
 *     sends "foo" with web research enabled).
 *   - `action`: performs a one-off UI action and does not send a message
 *     (e.g. `/new`, `/settings`).
 */
export type SlashKind = 'modifier' | 'action'

export type SlashActionId =
  | 'new'
  | 'export'
  | 'memory'
  | 'settings'
  | 'screenshot'
  | 'command-palette'

export interface SlashCommand {
  name: string
  description: string
  kind: SlashKind
  /** For modifiers: which per-turn tool flags to enable. */
  flags?: Partial<{ files: boolean; research: boolean; automation: boolean }>
  /** For modifiers: optional wrapper applied to the remaining text. */
  wrap?: (arg: string) => string
  /** For actions: the UI action to run. */
  action?: SlashActionId
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    name: 'research',
    description: 'Research the web, then answer with sources',
    kind: 'modifier',
    flags: { research: true }
  },
  {
    name: 'automate',
    description: 'Propose a desktop action for approval',
    kind: 'modifier',
    flags: { automation: true }
  },
  {
    name: 'files',
    description: 'Allow reading/writing workspace files this turn',
    kind: 'modifier',
    flags: { files: true }
  },
  {
    name: 'remember',
    description: 'Save a fact to long-term memory',
    kind: 'modifier',
    wrap: (arg) => `Please remember this about me: ${arg}`
  },
  { name: 'screenshot', description: 'Capture a screen or window', kind: 'action', action: 'screenshot' },
  { name: 'new', description: 'Start a new chat', kind: 'action', action: 'new' },
  { name: 'export', description: 'Export this conversation', kind: 'action', action: 'export' },
  { name: 'memory', description: 'Open the memory panel', kind: 'action', action: 'memory' },
  { name: 'settings', description: 'Open settings', kind: 'action', action: 'settings' },
  { name: 'commands', description: 'Open the command palette', kind: 'action', action: 'command-palette' }
]

/** Parse a leading slash token and its argument. Null when text isn't a command. */
export function parseSlash(text: string): { name: string; arg: string } | null {
  const match = text.match(/^\/([a-zA-Z]+)(?:\s+([\s\S]*))?$/)
  if (!match) return null
  return { name: match[1].toLowerCase(), arg: (match[2] ?? '').trim() }
}

/**
 * Whether the user is still typing the command token (a leading slash with no
 * whitespace yet) — used to decide when to show the autocomplete dropdown.
 */
export function isTypingCommand(text: string): boolean {
  return /^\/[a-zA-Z]*$/.test(text)
}

/** Commands whose names start with the currently typed token. */
export function matchSlashCommands(text: string): SlashCommand[] {
  if (!isTypingCommand(text)) return []
  const token = text.slice(1).toLowerCase()
  return SLASH_COMMANDS.filter((c) => c.name.startsWith(token))
}

/** Resolve a fully-typed command (e.g. "/research cats") to its definition + argument. */
export function resolveSlash(text: string): { command: SlashCommand; arg: string } | null {
  const parsed = parseSlash(text)
  if (!parsed) return null
  const command = SLASH_COMMANDS.find((c) => c.name === parsed.name)
  return command ? { command, arg: parsed.arg } : null
}
