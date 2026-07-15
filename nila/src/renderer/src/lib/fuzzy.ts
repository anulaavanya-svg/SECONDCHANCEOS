/**
 * Tiny fuzzy matcher for the command palette. Pure and dependency-free so it is
 * trivially unit-testable.
 *
 * `fuzzyScore` returns a numeric score when every character of `query` appears
 * in `text` in order (higher is better), or `null` when there is no match. The
 * scoring rewards consecutive matches, matches at word boundaries, and matches
 * near the start of the string, which produces intuitive rankings.
 */
export function fuzzyScore(query: string, text: string): number | null {
  const q = query.trim().toLowerCase()
  const t = text.toLowerCase()
  if (q === '') return 0
  if (q.length > t.length) return null

  let score = 0
  let qi = 0
  let prevMatchIndex = -1

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] !== q[qi]) continue

    let bonus = 1
    // Consecutive-character bonus.
    if (prevMatchIndex === ti - 1) bonus += 3
    // Word-boundary bonus (start of string or after a separator).
    if (ti === 0 || /[\s\-_/.]/.test(t[ti - 1])) bonus += 2
    // Earlier matches are slightly better.
    bonus += Math.max(0, 2 - ti * 0.05)

    score += bonus
    prevMatchIndex = ti
    qi++
  }

  return qi === q.length ? score : null
}

export interface Ranked<T> {
  item: T
  score: number
}

/** Filter and sort a list by fuzzy relevance to `query`. */
export function fuzzyFilter<T>(query: string, items: T[], keyOf: (item: T) => string): T[] {
  if (query.trim() === '') return items
  const ranked: Ranked<T>[] = []
  for (const item of items) {
    const score = fuzzyScore(query, keyOf(item))
    if (score !== null) ranked.push({ item, score })
  }
  ranked.sort((a, b) => b.score - a.score)
  return ranked.map((r) => r.item)
}
