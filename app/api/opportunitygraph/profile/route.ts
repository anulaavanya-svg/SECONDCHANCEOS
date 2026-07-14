import { NextResponse } from 'next/server'
import { requireAuth, authErrorStatus } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET — the signed-in user's Human Potential profile (or null if not yet taken).
export async function GET() {
  try {
    const session = await requireAuth()
    const profile = await prisma.potentialProfile.findUnique({
      where: { userId: session.user.id },
    })
    return NextResponse.json({ profile })
  } catch (error) {
    const status = authErrorStatus(error)
    if (status) return NextResponse.json({ error: 'Unauthorized' }, { status })
    console.error('GET /api/opportunitygraph/profile failed:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
