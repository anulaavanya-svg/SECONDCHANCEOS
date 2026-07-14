# SecondChanceOS

A behavioral science-powered HR platform that helps companies hire, onboard, support, and retain formerly incarcerated employees.

## The four layers

1. **Structured assessment** — competency-based candidate scoring (skills, reliability, growth, readiness) instead of record-based screening
2. **90-day psychological onboarding** — phased checklists grounded in Self-Determination Theory, with mentor touchpoints
3. **Manager decision toolkit** — interactive decision trees, coaching scripts, and bias-interruption training that prevent stigma-driven terminations
4. **Real-time analytics** — retention curves, onboarding funnels, WOTC tax-credit tracking, and anonymized research exports

## OpportunityGraph AI (social-mobility module)

An AI module that measures *potential* rather than pedigree and maps it to real opportunities — generalizing the platform's "measure what predicts success" thesis into a career-mobility engine.

- **Human Potential Index (HPI):** a nine-dimension psychometric profile (cognitive, behavioral, motivational) scored with confidence bands from a mixed instrument (situational-judgment tests, validated self-report scales, reasoning tasks). Sensitive attributes are never inputs.
- **Explainable career matching:** a transparent, weighted algorithm (interest · aptitude · readiness · mobility · reachability − access barrier) — every match ships with its breakdown and a plain-language rationale.
- **Opportunity knowledge graph:** People → Skills → Careers → Opportunities with weighted edges; skill-gap analysis and affordability-aware opportunity ranking (need-blind/free options up-weighted).
- **Personalized roadmaps:** an ordered, phased path (foundation → build → launch) with trackable steps.
- **Anonymized mobility insights:** k-anonymized cohort analytics for admins/researchers.

Where it lives: `lib/opportunitygraph/` (engines) · `app/api/opportunitygraph/**` (RBAC-guarded API) · `app/(dashboard)/**/opportunity/**` (UI) · `prisma/seed-opportunitygraph.ts` (O*NET-style seed). Full strategy, ML, and research design: [`docs/OPPORTUNITYGRAPH_BLUEPRINT.md`](docs/OPPORTUNITYGRAPH_BLUEPRINT.md). Try it as `employee@secondchance.com` → **OpportunityGraph** (a demo potential profile is pre-seeded).

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

## Deployment (Vercel)

The repo is fully self-deploying — the only requirement is a Postgres database attached to the project:

1. **Import the repo** at [vercel.com/new](https://vercel.com/new) (framework auto-detects as Next.js).
2. **Add a Postgres database**: project → **Storage → Create Database → Neon**. Any of the standard connection variables works (`DATABASE_URL`, `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, …).
3. **Deploy.** On build, the app creates the schema (`prisma db push`) and seeds demo data automatically when the database is empty. Log in with `admin@secondchance.com` / `password`.

Optional environment variables:

- `NEXTAUTH_SECRET` — recommended for real production use; when unset, a stable secret is derived from the private database connection string so demos work with zero config
- `ANTHROPIC_API_KEY` — powers the AI assistant
- `SEED_DEMO_DATA` = `true` — forces a demo-data reset on the next deploy
- `NEXTAUTH_URL` — auto-detected on Vercel; set explicitly only if login misbehaves
