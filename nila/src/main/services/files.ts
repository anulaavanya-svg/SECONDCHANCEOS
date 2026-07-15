/**
 * Sandboxed file access.
 *
 * All model-driven file operations are confined to the configured workspace
 * directory. User-initiated operations that come from a native open/save dialog
 * are trusted (the user explicitly chose the path) and bypass the confinement
 * check via the `trusted` flag.
 */
import { constants as FS } from 'node:fs'
import { access, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { isAbsolute, join, normalize, relative, resolve } from 'node:path'
import type { FileEntry, FileReadResult, FileStatResult } from '@shared/types'
import type { Config } from './config'
import { createLogger } from './logger'

const log = createLogger('files')

/** Files larger than this are truncated when read as text. */
const MAX_READ_BYTES = 512 * 1024

export class FileService {
  constructor(private readonly config: Config) {}

  /**
   * Resolve a possibly-relative path against the workspace, and — unless the
   * caller marks it trusted — verify it stays inside the workspace.
   */
  resolvePath(inputPath: string, trusted = false): string {
    const workspace = resolve(this.config.getWorkspaceDir())
    const abs = isAbsolute(inputPath)
      ? normalize(inputPath)
      : normalize(join(workspace, inputPath))

    if (trusted) return abs

    const rel = relative(workspace, abs)
    const escapes = rel.startsWith('..') || isAbsolute(rel)
    if (escapes) {
      throw new Error(
        `Path "${inputPath}" is outside the Nila workspace (${workspace}). ` +
          `For safety, file tools can only touch the workspace.`
      )
    }
    return abs
  }

  async read(inputPath: string, trusted = false): Promise<FileReadResult> {
    const path = this.resolvePath(inputPath, trusted)
    const info = await stat(path)
    if (info.isDirectory()) {
      throw new Error(`"${inputPath}" is a directory, not a file.`)
    }
    const truncated = info.size > MAX_READ_BYTES
    const buf = await readFile(path)
    const content = buf.subarray(0, MAX_READ_BYTES).toString('utf8')
    log.debug('read', path, `${info.size}b`, truncated ? '(truncated)' : '')
    return { path, content, size: info.size, truncated }
  }

  async write(inputPath: string, content: string, trusted = false): Promise<void> {
    const path = this.resolvePath(inputPath, trusted)
    await mkdir(resolve(path, '..'), { recursive: true })
    await writeFile(path, content, 'utf8')
    log.info('wrote', path, `${Buffer.byteLength(content)}b`)
  }

  async list(inputPath: string, trusted = false): Promise<FileEntry[]> {
    const dir = this.resolvePath(inputPath || '.', trusted)
    const names = await readdir(dir)
    const entries = await Promise.all(
      names.map(async (name): Promise<FileEntry | null> => {
        const full = join(dir, name)
        try {
          const info = await stat(full)
          return {
            name,
            path: full,
            isDirectory: info.isDirectory(),
            size: info.size,
            modifiedAt: info.mtime.toISOString()
          }
        } catch {
          return null
        }
      })
    )
    return entries
      .filter((e): e is FileEntry => e !== null)
      .sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
        return a.name.localeCompare(b.name)
      })
  }

  async statPath(inputPath: string, trusted = false): Promise<FileStatResult> {
    const path = this.resolvePath(inputPath, trusted)
    try {
      await access(path, FS.F_OK)
    } catch {
      return { path, exists: false, isDirectory: false, size: 0, modifiedAt: '' }
    }
    const info = await stat(path)
    return {
      path,
      exists: true,
      isDirectory: info.isDirectory(),
      size: info.size,
      modifiedAt: info.mtime.toISOString()
    }
  }
}
