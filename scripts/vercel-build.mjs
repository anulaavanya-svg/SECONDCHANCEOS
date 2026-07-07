// Vercel build orchestrator: resolves the database URL from whichever env
// var the attached storage integration provides, then runs schema push,
// optional demo seed, and the Next.js build.
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

// Local fallback: load .env into process.env (Vercel provides real env vars)
try {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/)
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2]
  }
} catch {
  // no .env file — fine on Vercel
}

const CANDIDATES = [
  'DATABASE_URL',
  'POSTGRES_PRISMA_URL',
  'POSTGRES_URL_NON_POOLING',
  'DATABASE_URL_UNPOOLED',
  'POSTGRES_URL',
]

function resolveDatabaseUrl() {
  for (const name of CANDIDATES) {
    const value = process.env[name]
    if (value && /^postgres(ql)?:\/\//.test(value)) {
      console.log(`Using ${name} as the database connection.`)
      return value
    }
  }
  return null
}

const dbUrl = resolveDatabaseUrl()
if (!dbUrl) {
  console.error(
    '\n❌ No PostgreSQL connection string found.\n' +
      'Attach a database to this Vercel project (Storage tab → Create Database → Neon),\n' +
      'or set DATABASE_URL in Settings → Environment Variables, then redeploy.\n' +
      `Checked: ${CANDIDATES.join(', ')}\n`
  )
  process.exit(1)
}

const env = { ...process.env, DATABASE_URL: dbUrl }
const run = (cmd) => execSync(cmd, { stdio: 'inherit', env })

run('prisma db push --skip-generate')

if (process.env.SEED_DEMO_DATA === 'true') {
  console.log('SEED_DEMO_DATA=true — seeding demo data...')
  run('npx tsx prisma/seed.ts')
} else {
  console.log('SEED_DEMO_DATA not set to "true" — skipping demo seed.')
}

run('next build')
