import { PrismaClient } from '@prisma/client'

// Resolve the connection string from whichever env var the hosting
// platform's database integration provides (Vercel storage integrations
// use different names depending on the provider).
const URL_CANDIDATES = [
  'DATABASE_URL',
  'POSTGRES_PRISMA_URL',
  'POSTGRES_URL_NON_POOLING',
  'DATABASE_URL_UNPOOLED',
  'POSTGRES_URL',
]

function resolveDatabaseUrl(): string | undefined {
  for (const name of URL_CANDIDATES) {
    const value = process.env[name]
    if (value && /^postgres(ql)?:\/\//.test(value)) return value
  }
  return undefined
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: resolveDatabaseUrl(),
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
