import { getServerSession, Session } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { UserRole } from '@prisma/client'

export class AuthError extends Error {
  status: number
  constructor(message: string, status = 403) {
    super(message)
    this.status = status
  }
}

export async function getCurrentSession(): Promise<Session | null> {
  return getServerSession(authOptions)
}

/** Any authenticated user. */
export async function requireAuth(): Promise<Session> {
  const session = await getCurrentSession()
  if (!session?.user?.id) throw new AuthError('Unauthorized: not signed in', 401)
  return session
}

async function requireRole(roles: UserRole[]): Promise<Session> {
  const session = await requireAuth()
  if (!roles.includes(session.user.role)) {
    throw new AuthError('Unauthorized: insufficient role', 403)
  }
  return session
}

export const requireAdmin = () => requireRole(['ADMIN'])
export const requireManager = () => requireRole(['ADMIN', 'MANAGER'])
export const requireResearcher = () => requireRole(['ADMIN', 'RESEARCHER'])
export const requireEmployee = () => requireRole(['ADMIN', 'MANAGER', 'EMPLOYEE'])

/** Translate an auth error into an HTTP status, or null for other errors. */
export function authErrorStatus(error: unknown): number | null {
  if (error instanceof AuthError) return error.status
  if (error instanceof Error && error.message.includes('Unauthorized')) return 403
  return null
}
