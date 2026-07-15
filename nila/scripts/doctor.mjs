#!/usr/bin/env node
/**
 * Nila doctor — preflight diagnostics.
 *
 * Verifies the local environment is ready to build and run Nila, and prints
 * actionable guidance for anything missing. Exits non-zero on hard failures so
 * it can gate `npm run dev` / CI if desired.
 */
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const GREEN = '\x1b[32m'
const RED = '\x1b[31m'
const YELLOW = '\x1b[33m'
const DIM = '\x1b[2m'
const RESET = '\x1b[0m'

let hardFailures = 0

function ok(msg) {
  console.log(`${GREEN}✓${RESET} ${msg}`)
}
function warn(msg, hint) {
  console.log(`${YELLOW}!${RESET} ${msg}`)
  if (hint) console.log(`  ${DIM}${hint}${RESET}`)
}
function fail(msg, hint) {
  console.log(`${RED}✗${RESET} ${msg}`)
  if (hint) console.log(`  ${DIM}${hint}${RESET}`)
  hardFailures++
}

console.log('\nNila doctor\n───────────')

// 1. Node version
const major = Number(process.versions.node.split('.')[0])
if (major >= 18) {
  ok(`Node.js ${process.versions.node}`)
} else {
  fail(`Node.js ${process.versions.node} is too old`, 'Nila requires Node 18 or newer.')
}

// 2. Dependencies installed
if (existsSync(join(root, 'node_modules'))) {
  ok('Dependencies installed')
} else {
  fail('node_modules is missing', 'Run: npm install')
}

// 3. Electron present
if (existsSync(join(root, 'node_modules', 'electron'))) {
  ok('Electron present')
} else {
  warn('Electron is not installed', 'Run npm install (without --ignore-scripts) to fetch it.')
}

// 4. Native module (better-sqlite3) loads
try {
  require('better-sqlite3')
  ok('better-sqlite3 native binding loads')
} catch (err) {
  warn('better-sqlite3 could not load', 'Try: npm rebuild better-sqlite3  (needs a C++ toolchain).')
  console.log(`  ${DIM}${String(err).split('\n')[0]}${RESET}`)
}

// 5. API key hint (non-fatal — can be set in-app)
if (process.env.ANTHROPIC_API_KEY) {
  ok('ANTHROPIC_API_KEY is set in the environment')
} else {
  warn('No ANTHROPIC_API_KEY in the environment', 'Optional — you can add your key in Settings after launch.')
}

console.log('')
if (hardFailures > 0) {
  console.log(`${RED}${hardFailures} problem(s) must be fixed before running Nila.${RESET}\n`)
  process.exit(1)
} else {
  console.log(`${GREEN}Nila is ready. Run: npm run dev${RESET}\n`)
}
