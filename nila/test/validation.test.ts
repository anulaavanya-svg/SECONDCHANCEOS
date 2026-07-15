import { describe, expect, it } from 'vitest'
import {
  assertNoNullBytes,
  clampNumber,
  oneOf,
  optionalString,
  requireString,
  ValidationError
} from '../src/main/services/validation'

describe('requireString', () => {
  it('accepts a valid string', () => {
    expect(requireString('hello', 'x')).toBe('hello')
  })

  it('rejects non-strings', () => {
    expect(() => requireString(42, 'x')).toThrow(ValidationError)
    expect(() => requireString(undefined, 'x')).toThrow(/must be a string/)
  })

  it('enforces the max length', () => {
    expect(() => requireString('abcdef', 'x', 3)).toThrow(/too long/)
  })
})

describe('optionalString', () => {
  it('coerces null/undefined to empty string', () => {
    expect(optionalString(undefined, 'x')).toBe('')
    expect(optionalString(null, 'x')).toBe('')
  })

  it('still validates provided values', () => {
    expect(() => optionalString(5, 'x')).toThrow(ValidationError)
  })
})

describe('clampNumber', () => {
  it('clamps into range', () => {
    expect(clampNumber(5, 0, 1, 0.5)).toBe(1)
    expect(clampNumber(-3, 0, 1, 0.5)).toBe(0)
    expect(clampNumber(0.7, 0, 1, 0.5)).toBe(0.7)
  })

  it('uses the fallback for non-finite input', () => {
    expect(clampNumber(NaN, 0, 1, 0.5)).toBe(0.5)
    expect(clampNumber('nope', 0, 1, 0.25)).toBe(0.25)
    // Infinity is not finite, so the fallback is used (then clamped).
    expect(clampNumber(Infinity, 0, 1, 0.5)).toBe(0.5)
  })
})

describe('oneOf', () => {
  const allowed = ['a', 'b', 'c'] as const

  it('accepts allowed values', () => {
    expect(oneOf('b', allowed, 'x')).toBe('b')
  })

  it('rejects disallowed values', () => {
    expect(() => oneOf('z', allowed, 'x')).toThrow(/must be one of/)
    expect(() => oneOf(1, allowed, 'x')).toThrow(ValidationError)
  })
})

describe('assertNoNullBytes', () => {
  it('passes clean strings through', () => {
    expect(assertNoNullBytes('clean', 'x')).toBe('clean')
  })

  it('rejects NUL bytes', () => {
    expect(() => assertNoNullBytes('bad\0value', 'x')).toThrow(/NUL byte/)
  })
})
