/**
 * Pure helpers for conversation search. Kept side-effect-free so they can be
 * unit-tested without a database.
 */

/**
 * Build a short snippet of `text` centered on the first occurrence of `query`,
 * with ellipses when the text is clipped. Whitespace is collapsed so snippets
 * render cleanly on one line. Returns a leading slice when there is no match.
 */
export function makeSnippet(text: string, query: string, radius = 40): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  const q = query.trim()
  if (!q) return clip(clean, radius * 2)

  const idx = clean.toLowerCase().indexOf(q.toLowerCase())
  if (idx === -1) return clip(clean, radius * 2)

  const start = Math.max(0, idx - radius)
  const end = Math.min(clean.length, idx + q.length + radius)
  const prefix = start > 0 ? '… ' : ''
  const suffix = end < clean.length ? ' …' : ''
  return `${prefix}${clean.slice(start, end).trim()}${suffix}`
}

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max).trim()} …` : text
}

/** Escape a user query for safe use inside a SQL LIKE pattern. */
export function likePattern(query: string): string {
  return `%${query.replace(/[%_\\]/g, '')}%`
}
