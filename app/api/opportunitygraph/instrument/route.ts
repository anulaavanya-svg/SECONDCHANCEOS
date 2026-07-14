import { NextResponse } from 'next/server'
import { requireAuth, authErrorStatus } from '@/lib/rbac'
import { ITEMS, INSTRUMENT_VERSION } from '@/lib/opportunitygraph/instrument'

export const dynamic = 'force-dynamic'

// Client-safe projection of the instrument: correct answers (task answerIndex)
// and SJT scoring credits are NEVER sent to the browser.
export async function GET() {
  try {
    await requireAuth()
    const items = ITEMS.map((it) => {
      const base = { id: it.id, kind: it.kind, prompt: it.prompt }
      switch (it.kind) {
        case 'likert':
          return { ...base, dimension: it.dimension, scale: 'likert5' as const }
        case 'interest':
          return { ...base, riasec: it.riasec, scale: 'likert5' as const }
        case 'sjt':
          return { ...base, dimension: it.dimension, options: it.options.map((o) => o.label) }
        case 'task':
          return { ...base, dimension: it.dimension, options: it.options }
      }
    })
    return NextResponse.json({ version: INSTRUMENT_VERSION, items })
  } catch (error) {
    const status = authErrorStatus(error)
    if (status) return NextResponse.json({ error: 'Unauthorized' }, { status })
    console.error('GET /api/opportunitygraph/instrument failed:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
