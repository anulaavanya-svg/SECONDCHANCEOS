import { NextResponse } from 'next/server'
import { requireAuth, authErrorStatus } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await requireAuth()
    const notifications = await prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    return NextResponse.json(notifications)
  } catch (error) {
    const status = authErrorStatus(error)
    if (status) return NextResponse.json({ error: 'Unauthorized' }, { status })
    console.error('GET /api/notifications failed:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// Mark all of the current user's notifications as read
export async function PATCH() {
  try {
    const session = await requireAuth()
    await prisma.notification.updateMany({
      where: { userId: session.user.id, isRead: false },
      data: { isRead: true },
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    const status = authErrorStatus(error)
    if (status) return NextResponse.json({ error: 'Unauthorized' }, { status })
    console.error('PATCH /api/notifications failed:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
