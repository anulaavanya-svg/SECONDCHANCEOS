import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

// Public route: creates a new organization with its first ADMIN user.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const orgName = String(body.orgName ?? '').trim()
    const fullName = String(body.fullName ?? '').trim()
    const email = String(body.email ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')
    const industry = body.industry ? String(body.industry).trim() : null

    if (!orgName || !fullName || !email || password.length < 8) {
      return NextResponse.json(
        { error: 'Company name, your name, email, and a password of 8+ characters are required.' },
        { status: 400 }
      )
    }

    const [existingOrg, existingUser] = await Promise.all([
      prisma.organization.findUnique({ where: { name: orgName } }),
      prisma.user.findUnique({ where: { email } }),
    ])
    if (existingOrg) {
      return NextResponse.json({ error: 'A company with that name already exists.' }, { status: 400 })
    }
    if (existingUser) {
      return NextResponse.json({ error: 'An account with that email already exists.' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const org = await prisma.organization.create({
      data: {
        name: orgName,
        industry,
        users: {
          create: { email, passwordHash, fullName, role: 'ADMIN' },
        },
      },
    })

    return NextResponse.json({ organizationId: org.id }, { status: 201 })
  } catch (error) {
    console.error('POST /api/signup failed:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
