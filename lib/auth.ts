import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

export const ROLE_HOME: Record<UserRole, string> = {
  ADMIN: '/admin',
  MANAGER: '/manager/team',
  EMPLOYEE: '/employee/onboarding',
  RESEARCHER: '/researcher/console',
}

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        })
        if (!user || !user.passwordHash || !user.isActive) return null

        const valid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!valid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          organizationId: user.organizationId,
          role: user.role,
          siteId: user.siteId,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id
        token.orgId = user.organizationId
        token.role = user.role
        token.siteId = user.siteId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId
        session.user.organizationId = token.orgId
        session.user.role = token.role
        session.user.siteId = token.siteId
      }
      return session
    },
  },
}
