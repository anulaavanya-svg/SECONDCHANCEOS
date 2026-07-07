// Auth secret resolution. Prefer NEXTAUTH_SECRET; otherwise derive a stable
// secret from the (private) database connection string so demo deployments
// work with zero configuration. Set NEXTAUTH_SECRET explicitly in production.
//
// Two implementations produce the identical value: a sync Node one (for
// NextAuth's authOptions) and an async Web Crypto one (for edge middleware).
import { resolveDatabaseUrl } from './db-url'

const DERIVE_PREFIX = 'secondchanceos-auth-v1:'
const DEV_FALLBACK = 'secondchanceos-dev-only-secret'

export function resolveAuthSecretNode(): string {
  if (process.env.NEXTAUTH_SECRET) return process.env.NEXTAUTH_SECRET
  const dbUrl = resolveDatabaseUrl()
  if (!dbUrl) return DEV_FALLBACK
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createHash } = require('crypto') as typeof import('crypto')
  return createHash('sha256').update(DERIVE_PREFIX + dbUrl).digest('base64')
}

export async function resolveAuthSecretEdge(): Promise<string> {
  if (process.env.NEXTAUTH_SECRET) return process.env.NEXTAUTH_SECRET
  const dbUrl = resolveDatabaseUrl()
  if (!dbUrl) return DEV_FALLBACK
  const data = new TextEncoder().encode(DERIVE_PREFIX + dbUrl)
  const digest = await crypto.subtle.digest('SHA-256', data)
  let binary = ''
  for (const byte of new Uint8Array(digest)) binary += String.fromCharCode(byte)
  return btoa(binary)
}
