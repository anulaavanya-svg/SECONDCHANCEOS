import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, authErrorStatus } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { CandidateStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

// NOTE: candidate responses intentionally exclude ComplianceRecord.
// Criminal-history adjudication is a separate, isolated flow.
export async function GET(request: NextRequest) {
  try {
    const session = await requireAdmin()
    const statusParam = request.nextUrl.searchParams.get('status')
    const status =
      statusParam && Object.values(CandidateStatus).includes(statusParam as CandidateStatus)
        ? (statusParam as CandidateStatus)
        : undefined

    const candidates = await prisma.candidate.findMany({
      where: { organizationId: session.user.organizationId, ...(status ? { status } : {}) },
      include: { assessment: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(candidates)
  } catch (error) {
    const status = authErrorStatus(error)
    if (status) return NextResponse.json({ error: 'Unauthorized' }, { status })
    console.error('GET /api/candidates failed:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin()
    const body = await request.json()
    const fullName = String(body.fullName ?? '').trim()
    const roleApplied = String(body.roleApplied ?? '').trim()
    if (!fullName || !roleApplied) {
      return NextResponse.json({ error: 'fullName and roleApplied are required' }, { status: 400 })
    }

    const candidate = await prisma.candidate.create({
      data: {
        organizationId: session.user.organizationId,
        fullName,
        roleApplied,
        email: body.email ? String(body.email).trim() : null,
        source: body.source ? String(body.source).trim() : null,
        certifications: Array.isArray(body.certifications)
          ? body.certifications.map(String).filter(Boolean)
          : [],
      },
    })
    return NextResponse.json(candidate, { status: 201 })
  } catch (error) {
    const status = authErrorStatus(error)
    if (status) return NextResponse.json({ error: 'Unauthorized' }, { status })
    console.error('POST /api/candidates failed:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
