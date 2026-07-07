// Vercel storage integrations expose the Postgres connection string under
// different names depending on the provider — resolve the first available.
export const DB_URL_CANDIDATES = [
  'DATABASE_URL',
  'POSTGRES_PRISMA_URL',
  'POSTGRES_URL_NON_POOLING',
  'DATABASE_URL_UNPOOLED',
  'POSTGRES_URL',
]

export function resolveDatabaseUrl(): string | undefined {
  for (const name of DB_URL_CANDIDATES) {
    const value = process.env[name]
    if (value && /^postgres(ql)?:\/\//.test(value)) return value
  }
  return undefined
}
