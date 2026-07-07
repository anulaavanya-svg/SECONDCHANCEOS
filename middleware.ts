import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import type { UserRole } from '@prisma/client'

const ROLE_HOME: Record<string, string> = {
  ADMIN: '/admin',
  MANAGER: '/manager/team',
  EMPLOYEE: '/employee/onboarding',
  RESEARCHER: '/researcher/console',
}

// Which roles may enter each dashboard section
const SECTION_ACCESS: { prefix: string; roles: UserRole[] }[] = [
  { prefix: '/admin', roles: ['ADMIN'] },
  { prefix: '/manager', roles: ['ADMIN', 'MANAGER'] },
  { prefix: '/employee', roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
  { prefix: '/researcher', roles: ['ADMIN', 'RESEARCHER'] },
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

  const isAuthPage = pathname === '/login' || pathname === '/signup'

  if (!token) {
    if (isAuthPage) return NextResponse.next()
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const role = token.role as UserRole
  const home = ROLE_HOME[role] ?? '/login'

  // Signed-in users hitting auth pages or root go to their dashboard
  if (isAuthPage || pathname === '/') {
    return NextResponse.redirect(new URL(home, request.url))
  }

  const section = SECTION_ACCESS.find((s) => pathname.startsWith(s.prefix))
  if (section && !section.roles.includes(role)) {
    return NextResponse.redirect(new URL(home, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/signup',
    '/admin/:path*',
    '/manager/:path*',
    '/employee/:path*',
    '/researcher/:path*',
  ],
}
