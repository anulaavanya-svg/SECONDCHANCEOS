/**
 * Input validation for the IPC boundary.
 *
 * Everything the renderer sends is treated as untrusted. These helpers throw a
 * clear error (surfaced to the renderer as a rejected invoke) when input is the
 * wrong shape, and clamp/coerce numeric ranges so bad values can't corrupt
 * persisted state.
 */

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

/** Require a non-empty string within an optional maximum length. */
export function requireString(value: unknown, name: string, maxLen = 100_000): string {
  if (typeof value !== 'string') {
    throw new ValidationError(`${name} must be a string.`)
  }
  if (value.length > maxLen) {
    throw new ValidationError(`${name} is too long (max ${maxLen} characters).`)
  }
  return value
}

/** A string that may be empty but must still be a string within a length cap. */
export function optionalString(value: unknown, name: string, maxLen = 100_000): string {
  if (value === undefined || value === null) return ''
  return requireString(value, name, maxLen)
}

/** Clamp a number into [min, max], falling back when it isn't a finite number. */
export function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : fallback
  return Math.min(max, Math.max(min, n))
}

/** Ensure a value is one of the allowed literals. */
export function oneOf<T extends string>(value: unknown, allowed: readonly T[], name: string): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new ValidationError(`${name} must be one of: ${allowed.join(', ')}.`)
  }
  return value as T
}

/** Reject NUL bytes, which have no place in text we persist or pass to the OS. */
export function assertNoNullBytes(value: string, name: string): string {
  if (value.includes('\0')) {
    throw new ValidationError(`${name} contains an invalid NUL byte.`)
  }
  return value
}
