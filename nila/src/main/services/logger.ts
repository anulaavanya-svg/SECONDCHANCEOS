/**
 * Tiny leveled logger. Writes to stdout and, once configured, appends to a
 * rolling log file in the app-data directory. Kept dependency-free so it can be
 * imported from anywhere in the main process without circular imports.
 */
import { appendFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

type Level = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 }

let minLevel: Level = resolveDefaultLevel()
let logFile: string | null = null

function resolveDefaultLevel(): Level {
  // Stay silent under the test runner to keep output clean.
  if (process.env.VITEST || process.env.NODE_ENV === 'test') return 'error'
  return process.env.NODE_ENV === 'development' ? 'debug' : 'info'
}

function write(level: Level, scope: string, args: unknown[]): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel]) return
  const ts = new Date().toISOString()
  const line = `[${ts}] [${level.toUpperCase()}] [${scope}] ${args
    .map((a) => (typeof a === 'string' ? a : safeStringify(a)))
    .join(' ')}`

  const target = level === 'error' || level === 'warn' ? console.error : console.log
  target(line)

  if (logFile) {
    try {
      appendFileSync(logFile, line + '\n', 'utf8')
    } catch {
      /* best-effort file logging */
    }
  }
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export function configureLogger(opts: { file?: string; level?: Level }): void {
  if (opts.level) minLevel = opts.level
  if (opts.file) {
    try {
      mkdirSync(dirname(opts.file), { recursive: true })
      logFile = opts.file
    } catch {
      logFile = null
    }
  }
}

export function createLogger(scope: string) {
  return {
    debug: (...args: unknown[]) => write('debug', scope, args),
    info: (...args: unknown[]) => write('info', scope, args),
    warn: (...args: unknown[]) => write('warn', scope, args),
    error: (...args: unknown[]) => write('error', scope, args)
  }
}

export type Logger = ReturnType<typeof createLogger>
