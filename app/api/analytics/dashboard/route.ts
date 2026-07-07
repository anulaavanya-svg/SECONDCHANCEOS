import { NextResponse } from 'next/server'
import { requireAdmin, authErrorStatus } from '@/lib/rbac'
import { getDashboardAnalytics } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await requireAdmin()
    const data = await getDashboardAnalytics(session.user.organizationId)
    return NextResponse.json(data)
  } catch (error) {
    const status = authErrorStatus(error)
    if (status) return NextResponse.json({ error: 'Unauthorized' }, { status })
    console.error('GET /api/analytics/dashboard failed:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
