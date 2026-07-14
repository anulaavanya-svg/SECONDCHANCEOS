import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, authErrorStatus } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { matchCareers } from '@/lib/opportunitygraph/matching'
import { loadCareerNodes } from '@/lib/opportunitygraph/data'
import { profileToMatchInput } from '@/lib/opportunitygraph/profile-adapter'

export const dynamic = 'force-dynamic'

// GET — ranked, explainable career matches for the signed-in user.
// Query: ?limit=N (default 6, max 25)
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const profile = await prisma.potentialProfile.findUnique({
      where: { userId: session.user.id },
    })
    if (!profile) {
      return NextResponse.json(
        { error: 'Take the potential assessment first.', matches: [] },
        { status: 409 }
      )
    }

    const limit = Math.min(25, Math.max(1, Number(request.nextUrl.searchParams.get('limit')) || 6))
    const careers = await loadCareerNodes()
    const matches = matchCareers(profileToMatchInput(profile), careers).slice(0, limit)

    return NextResponse.json({ matches })
  } catch (error) {
    const status = authErrorStatus(error)
    if (status) return NextResponse.json({ error: 'Unauthorized' }, { status })
    console.error('GET /api/opportunitygraph/matches failed:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
