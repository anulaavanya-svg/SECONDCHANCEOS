import { DefaultSession } from 'next-auth'
import { UserRole } from '@prisma/client'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      organizationId: string
      role: UserRole
      siteId: string | null
      email: string
      name: string
    } & DefaultSession['user']
  }

  interface User {
    id: string
    organizationId: string
    role: UserRole
    siteId: string | null
    email: string
    name: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string
    orgId: string
    role: UserRole
    siteId: string | null
  }
}
