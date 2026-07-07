# SecondChanceOS

A behavioral science-powered HR platform that helps companies hire, onboard, support, and retain formerly incarcerated employees.

## The four layers

1. **Structured assessment** — competency-based candidate scoring (skills, reliability, growth, readiness) instead of record-based screening
2. **90-day psychological onboarding** — phased checklists grounded in Self-Determination Theory, with mentor touchpoints
3. **Manager decision toolkit** — interactive decision trees, coaching scripts, and bias-interruption training that prevent stigma-driven terminations
4. **Real-time analytics** — retention curves, onboarding funnels, WOTC tax-credit tracking, and anonymized research exports

## Tech stack

- **Frontend:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend:** Next.js API routes
- **Database:** PostgreSQL via Prisma ORM
- **Auth:** NextAuth.js (credentials provider, role-based JWT)
- **Charts:** Recharts
- **AI:** Anthropic API (server-side proxy)

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# set DATABASE_URL, NEXTAUTH_SECRET (openssl rand -base64 32), NEXTAUTH_URL,
# and ANTHROPIC_API_KEY (optional — powers the AI assistant)

# 3. Create the schema and seed demo data
npm run db:push
npm run db:seed

# 4. Run
npm run dev
```

### Demo accounts (password: `password`)

| Role | Email | Lands on |
|---|---|---|
| Admin | `admin@secondchance.com` | `/admin` — executive dashboard |
| Manager | `dana.kowalski@secondchance.com` | `/manager/team` |
| Employee | `employee@secondchance.com` | `/employee/onboarding` |
| Researcher | `researcher@secondchance.com` | `/researcher/console` |

## Security model

- **Criminal-history isolation:** compliance adjudication lives only in `ComplianceRecord`, which is never joined to assessments or analytics, and is never returned by any route accessible to MANAGER, EMPLOYEE, or RESEARCHER roles. Candidate scoring accepts only the four competency dimensions.
- **RBAC at the route level:** every API route enforces role via `lib/rbac.ts`. Employees see only their own data; managers see only direct reports; researchers see only anonymized aggregates.
- **Multi-tenant scoping:** every query filters by `organizationId` from the session JWT.

## Deployment

Vercel-ready: set the env vars from `.env.example`, and the `postinstall` hook runs `prisma generate` automatically. Push the schema with `npx prisma db push` against your production database, then `vercel deploy --prod`.
