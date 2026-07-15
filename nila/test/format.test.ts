import { describe, expect, it } from 'vitest'
import { formatBytes, relativeTime, timeBucket } from '../src/renderer/src/lib/format'

describe('formatBytes', () => {
  it('formats bytes, KB, and MB', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2.0 KB')
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB')
  })
})

describe('relativeTime', () => {
  it('returns "just now" for very recent timestamps', () => {
    expect(relativeTime(new Date().toISOString())).toBe('just now')
  })

  it('returns minutes for a few minutes ago', () => {
    const tenMinAgo = new Date(Date.now() - 10 * 60_000).toISOString()
    expect(relativeTime(tenMinAgo)).toBe('10m')
  })

  it('returns hours for a few hours ago', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 3_600_000).toISOString()
    expect(relativeTime(threeHoursAgo)).toBe('3h')
  })

  it('returns an empty string for invalid input', () => {
    expect(relativeTime('not-a-date')).toBe('')
  })
})

describe('timeBucket', () => {
  it('buckets a fresh timestamp as Today', () => {
    expect(timeBucket(new Date().toISOString())).toBe('Today')
  })

  it('buckets ~2 days ago within the previous 7 days', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000).toISOString()
    expect(timeBucket(twoDaysAgo)).toBe('Previous 7 days')
  })

  it('buckets a month ago as Older', () => {
    const monthAgo = new Date(Date.now() - 30 * 86_400_000).toISOString()
    expect(timeBucket(monthAgo)).toBe('Older')
  })
})
