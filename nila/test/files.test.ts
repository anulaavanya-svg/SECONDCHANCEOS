import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { FileService } from '../src/main/services/files'
import type { Config } from '../src/main/services/config'

const WORKSPACE = '/home/user/Nila'

function makeService(): FileService {
  const config = { getWorkspaceDir: () => WORKSPACE } as unknown as Config
  return new FileService(config)
}

describe('FileService.resolvePath (sandboxing)', () => {
  const files = makeService()

  it('resolves a relative path inside the workspace', () => {
    expect(files.resolvePath('notes.txt')).toBe(join(WORKSPACE, 'notes.txt'))
  })

  it('resolves nested relative paths', () => {
    expect(files.resolvePath('a/b/c.md')).toBe(join(WORKSPACE, 'a/b/c.md'))
  })

  it('collapses harmless .. that stays inside the workspace', () => {
    expect(files.resolvePath('sub/../notes.txt')).toBe(join(WORKSPACE, 'notes.txt'))
  })

  it('rejects traversal that escapes the workspace', () => {
    expect(() => files.resolvePath('../secret')).toThrow(/outside the Nila workspace/)
    expect(() => files.resolvePath('../../etc/passwd')).toThrow(/outside/)
  })

  it('rejects absolute paths outside the workspace when untrusted', () => {
    expect(() => files.resolvePath('/etc/passwd')).toThrow(/outside/)
  })

  it('allows any path when explicitly trusted (user-picked)', () => {
    expect(files.resolvePath('/etc/passwd', true)).toBe('/etc/passwd')
    expect(files.resolvePath('../anywhere', true)).not.toContain('..')
  })

  it('permits absolute paths that are inside the workspace', () => {
    const inside = join(WORKSPACE, 'deep/file.txt')
    expect(files.resolvePath(inside)).toBe(inside)
  })
})
