import { describe, expect, it } from 'vitest'
import {
  isTypingCommand,
  matchSlashCommands,
  parseSlash,
  resolveSlash
} from '../src/renderer/src/lib/slash'

describe('parseSlash', () => {
  it('returns null for non-command text', () => {
    expect(parseSlash('hello world')).toBeNull()
    expect(parseSlash('')).toBeNull()
  })

  it('parses a bare command', () => {
    expect(parseSlash('/new')).toEqual({ name: 'new', arg: '' })
  })

  it('parses a command with an argument', () => {
    expect(parseSlash('/research best laptops 2026')).toEqual({
      name: 'research',
      arg: 'best laptops 2026'
    })
  })

  it('lowercases the command name and trims the argument', () => {
    expect(parseSlash('/Research   spaced  ')).toEqual({ name: 'research', arg: 'spaced' })
  })

  it('ignores a slash that is not a command token', () => {
    expect(parseSlash('/123')).toBeNull()
  })
})

describe('isTypingCommand', () => {
  it('is true while typing the command token', () => {
    expect(isTypingCommand('/')).toBe(true)
    expect(isTypingCommand('/rese')).toBe(true)
  })

  it('is false once a space (argument) is present', () => {
    expect(isTypingCommand('/research ')).toBe(false)
    expect(isTypingCommand('hello')).toBe(false)
  })
})

describe('matchSlashCommands', () => {
  it('returns all commands for a bare slash', () => {
    expect(matchSlashCommands('/').length).toBeGreaterThan(5)
  })

  it('filters by prefix', () => {
    const names = matchSlashCommands('/re').map((c) => c.name)
    expect(names).toContain('research')
    expect(names).toContain('remember')
    expect(names).not.toContain('new')
  })

  it('returns nothing once an argument is being typed', () => {
    expect(matchSlashCommands('/research cats')).toEqual([])
  })
})

describe('resolveSlash', () => {
  it('resolves a modifier command with its flags and argument', () => {
    const resolved = resolveSlash('/research cats')
    expect(resolved?.command.kind).toBe('modifier')
    expect(resolved?.command.flags?.research).toBe(true)
    expect(resolved?.arg).toBe('cats')
  })

  it('resolves an action command', () => {
    const resolved = resolveSlash('/new')
    expect(resolved?.command.kind).toBe('action')
    expect(resolved?.command.action).toBe('new')
  })

  it('applies the wrap function metadata for /remember', () => {
    const resolved = resolveSlash('/remember I use vim')
    expect(resolved?.command.wrap?.(resolved.arg)).toContain('I use vim')
  })

  it('returns null for an unknown command', () => {
    expect(resolveSlash('/bogus stuff')).toBeNull()
  })
})
