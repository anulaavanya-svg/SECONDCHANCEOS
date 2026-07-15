/**
 * Executes an approved desktop-automation task.
 *
 * Every action type is intentionally narrow and auditable. Shell commands run
 * with a timeout; file mutations are confined to the workspace via FileService;
 * paths/URLs are opened with the OS default handler. Nothing here runs without
 * a prior, explicit user approval (enforced by AutomationManager).
 */
import { exec } from 'node:child_process'
import { rename, rm } from 'node:fs/promises'
import { promisify } from 'node:util'
import { shell } from 'electron'
import type { AutomationAction } from '@shared/types'
import type { FileService } from '../services/files'
import { createLogger } from '../services/logger'

const execAsync = promisify(exec)
const log = createLogger('automation:executor')

const SHELL_TIMEOUT_MS = 30_000
const MAX_OUTPUT_CHARS = 8_000

export class AutomationExecutor {
  constructor(private readonly files: FileService) {}

  /** Run all actions in order, returning a human-readable transcript. */
  async run(actions: AutomationAction[]): Promise<string> {
    const lines: string[] = []
    for (const [i, action] of actions.entries()) {
      const label = `Step ${i + 1}/${actions.length} — ${action.type}`
      log.info('executing', action.type, action.description)
      try {
        const output = await this.runOne(action)
        lines.push(`✔ ${label}: ${action.description}\n${indent(output)}`.trimEnd())
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        lines.push(`✘ ${label}: ${action.description}\n${indent(message)}`)
        throw new AutomationError(lines.join('\n\n'), message)
      }
    }
    return lines.join('\n\n')
  }

  private async runOne(action: AutomationAction): Promise<string> {
    switch (action.type) {
      case 'run-shell':
        return this.runShell(action.params.command ?? '')
      case 'open-path':
        return this.openPath(action.params.path ?? '')
      case 'open-url':
        return this.openUrl(action.params.url ?? '')
      case 'write-file':
        return this.writeFile(action.params.path ?? '', action.params.content ?? '')
      case 'move-file':
        return this.moveFile(action.params.from ?? '', action.params.to ?? '')
      case 'delete-file':
        return this.deleteFile(action.params.path ?? '')
      default:
        throw new Error(`Unknown action type: ${(action as AutomationAction).type}`)
    }
  }

  private async runShell(command: string): Promise<string> {
    if (!command.trim()) throw new Error('Empty command.')
    const { stdout, stderr } = await execAsync(command, {
      timeout: SHELL_TIMEOUT_MS,
      cwd: this.files.resolvePath('.', true),
      maxBuffer: 4 * 1024 * 1024
    })
    const out = [stdout, stderr].filter(Boolean).join('\n').trim()
    return clip(out || '(no output)')
  }

  private async openPath(path: string): Promise<string> {
    const resolved = this.files.resolvePath(path, true)
    const err = await shell.openPath(resolved)
    if (err) throw new Error(err)
    return `Opened ${resolved}`
  }

  private async openUrl(url: string): Promise<string> {
    if (!/^https?:\/\//i.test(url)) throw new Error('Only http(s) URLs may be opened.')
    await shell.openExternal(url)
    return `Opened ${url}`
  }

  private async writeFile(path: string, content: string): Promise<string> {
    await this.files.write(path, content)
    return `Wrote ${Buffer.byteLength(content)} bytes to ${path}`
  }

  private async moveFile(from: string, to: string): Promise<string> {
    const src = this.files.resolvePath(from)
    const dst = this.files.resolvePath(to)
    await rename(src, dst)
    return `Moved ${src} → ${dst}`
  }

  private async deleteFile(path: string): Promise<string> {
    const target = this.files.resolvePath(path)
    await rm(target, { recursive: true, force: true })
    return `Deleted ${target}`
  }
}

export class AutomationError extends Error {
  constructor(
    public readonly transcript: string,
    reason: string
  ) {
    super(reason)
    this.name = 'AutomationError'
  }
}

function indent(text: string): string {
  return text
    .split('\n')
    .map((l) => `    ${l}`)
    .join('\n')
}

function clip(text: string): string {
  return text.length > MAX_OUTPUT_CHARS
    ? text.slice(0, MAX_OUTPUT_CHARS) + `\n… (${text.length - MAX_OUTPUT_CHARS} more chars)`
    : text
}
