// Runs the demo seed during `vercel-build` only when SEED_DEMO_DATA=true.
// The seed wipes and recreates all demo data, so leave the flag off (or
// remove it) once you want data to persist across deploys.
import { execSync } from 'node:child_process'

if (process.env.SEED_DEMO_DATA === 'true') {
  console.log('SEED_DEMO_DATA=true — seeding demo data...')
  execSync('npx tsx prisma/seed.ts', { stdio: 'inherit' })
} else {
  console.log('SEED_DEMO_DATA not set to "true" — skipping demo seed.')
}
