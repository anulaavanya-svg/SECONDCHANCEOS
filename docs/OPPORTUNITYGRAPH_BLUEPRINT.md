# OpportunityGraph AI — Full Blueprint

*An AI social-mobility platform that discovers hidden human potential, maps it to real opportunities, and generates personalized roadmaps that close the gap.*

Built as a module inside **SecondChanceOS**. SecondChanceOS proved the thesis on the hardest population — people re-entering the workforce after incarceration, where every traditional signal (résumé gaps, records, references) is broken. OpportunityGraph AI generalizes that same "measure potential, not pedigree" engine to any underserved learner or worker.

> This document is the strategy, science, and research design (Parts 1–7 and 9). The working software that implements it lives in `prisma/schema.prisma`, `lib/opportunitygraph/`, `app/api/opportunitygraph/`, and `app/(dashboard)/**/opportunity/` (Part 8).

---

## Table of contents

1. [Product vision](#part-1--product-vision)
2. [Core features](#part-2--core-features)
3. [Machine-learning system](#part-3--machine-learning-system)
4. [MVP build plan](#part-4--mvp-build-plan)
5. [Research project design](#part-5--research-project-design)
6. [Common App impact strategy](#part-6--common-app-impact-strategy)
7. [Competitor analysis](#part-7--competitor-analysis)
8. [Future expansion (10-year)](#part-9--future-expansion)

---

## PART 1 — PRODUCT VISION

### The exact problem

Opportunity in America is allocated by **proxies for potential, not potential itself.** GPA, degree pedigree, résumé keywords, and — most decisively — social networks. Economists call the last one the biggest hidden variable: Raj Chetty's *Opportunity Insights* work (2022, *Nature*) showed that a low-income child's odds of upward mobility are predicted more by the *economic connectedness* of their community than by school quality or family structure. Talent is roughly evenly distributed; **access to the map of opportunity is not.**

The result is measurable waste. The "lost Einsteins" research (Bell, Chetty, et al., 2019) estimates that if children from low-income families, women, and minorities invented at the rate of high-income white men, the innovation rate would **quadruple**. These are not people who lack ability. They lack three things:

1. **A credible signal of their own potential** that isn't destroyed by a weak résumé.
2. **A map** connecting who they are to careers, education, funding, and people.
3. **A next step** — a concrete, affordable, reachable action this month.

### Why current solutions fail

| Category | Example | Why it fails the underserved |
|---|---|---|
| Job boards | LinkedIn, Indeed, Handshake | Match *keywords to postings*. Assume you already know the target and have the résumé. Reward existing advantage. |
| Assessments | CliftonStrengths, 16Personalities, Pymetrics | Produce a label, then stop. No bridge from "you are an Investigator" to "here is the scholarship, the course, the person." |
| Career advice | O*NET, guidance counselors | 1 counselor per ~400 students (ASCA). Static databases. No personalization, no follow-through. |
| Ed-tech | Coursera, Khan Academy | Deliver *content*, but assume the learner already knows what to learn and why. Motivation and navigation are the actual bottleneck. |
| AI wrappers | "ChatGPT for careers" | Fluent text, no grounded data, no memory of the person, no measurement, no accountability, hallucinated scholarships. |

Every one of them optimizes a slice. **None owns the full loop** from *latent potential → opportunity → action → outcome.*

### Why this solution is different

OpportunityGraph is built on three commitments competitors structurally can't copy:

1. **Potential-first measurement.** We score the human on cognitive, behavioral, and motivational dimensions — a **Human Potential Index (HPI)** — *before* any résumé exists, using context-adjusted, bias-audited psychometrics. This is the SecondChanceOS insight: when you refuse to look at the broken signal (a record, a GPA, a gap), you're forced to measure what actually predicts success.

2. **A knowledge graph, not a list.** People → Skills → Careers → Education → Opportunities → People is a *graph*. Matching, gap analysis, and roadmap generation are graph operations (shortest affordable path to a target career), which is why explanations are always concrete ("this internship closes your two largest skill gaps for Data Analyst and is need-blind").

3. **Closed loop with outcomes.** Every recommendation is an experiment. Did the student apply? Get in? Advance? Those outcomes retrain the ranking models. Over time the graph learns *which paths actually move people up*, which is a defensible, compounding data asset.

### Long-term vision

**A universal, portable measure of human potential** that any person owns and any institution can trust — replacing the résumé as the atomic unit of opportunity. A world where a 16-year-old in a rural county and a prep-school senior get the *same quality of navigation*, and where "who you know" is replaced by "what the graph knows about paths like yours."

### Competitive advantage (the moat)

- **Outcome data flywheel:** recommendations → applications → admissions/hires → outcomes → better recommendations. This data does not exist anywhere in one place and cannot be scraped.
- **Trust & credibility:** psychometric validity + published research + bias audits make institutions willing to *accept* an HPI, the way they accept an SAT. That trust is a years-long asset.
- **Graph completeness:** the value of the graph is superlinear in its edges (Metcalfe-like). Early density in a vertical (e.g., reentry, community college, first-gen) is very hard to overtake.
- **Distribution through institutions:** schools, workforce boards, and reentry programs adopt it as infrastructure, giving low-CAC access to exactly the underserved users others can't reach.

### Why this could be a billion-dollar company

Three stacked markets, each large on its own:

- **B2B2C SaaS** to schools, community colleges, workforce-development boards, and reentry employers (SecondChanceOS is the beachhead). US workforce development is a >$20B public+private spend; ed guidance software alone is multi-billion.
- **Assessment / credential** revenue: if the HPI becomes a recognized signal, it monetizes like a testing company (College Board's scale) without the equity baggage of a single high-stakes exam.
- **Workforce-intelligence** data products for employers and policymakers: anonymized, aggregate labor-mobility intelligence ("where is latent talent for advanced manufacturing in the Southeast, and what closes the gap?").

A company that owns the *measurement standard for human potential* plus the *graph of how people actually move up* is infrastructure, not a feature — and infrastructure at population scale is a billion-dollar outcome.

---

## PART 2 — CORE FEATURES

### A) Human Potential Assessment Engine → the Human Potential Index (HPI)

**Principle:** measure durable, developable dimensions that predict success across many paths, using instruments with published validity, and *adjust for context* so we measure the person, not their circumstances.

**Nine dimensions** (each 0–100), grouped:

*Cognitive*
- **Fluid problem-solving** — reasoning on novel problems (not crystallized knowledge, which tracks schooling/SES).
- **Verbal & quantitative reasoning** — reported separately so a spike in one isn't masked.

*Behavioral / dispositional* (Big Five-derived, the most replicated framework in psychology)
- **Conscientiousness / reliability** — the single best non-cognitive predictor of job and training performance (Barrick & Mount meta-analyses).
- **Openness / curiosity** — predicts learning and adaptability.
- **Adaptability & resilience** — response to setbacks; drawn from grit (Duckworth) and psychological-capital research.

*Motivational / self-regulatory*
- **Growth mindset** (Dweck) — belief that ability is developable; moderates whether feedback is used.
- **Self-efficacy & agency** (Bandura) — belief one can affect outcomes; strongly predicts persistence.
- **Intrinsic motivation & drive** (Self-Determination Theory — also the backbone of SecondChanceOS onboarding).

*Fit signal*
- **Interest profile (RIASEC / Holland codes)** — six vocational-interest dimensions used for career fit, not a "score" but a shape.

**What data is collected**
- **Situational Judgment Tests (SJTs):** short realistic dilemmas → choices. SJTs predict performance and show *smaller* subgroup differences than cognitive tests — an equity property, not a nice-to-have.
- **Validated self-report scales:** short-form Big Five (BFI-2-S), grit-S, growth-mindset, general self-efficacy, RIASEC interest items.
- **Light-touch performance tasks:** one adaptive reasoning mini-task (pattern/logic), time-boxed.
- **Behavioral trace (opt-in, later versions):** learning patterns from platform activity (persistence after a wrong answer, revisiting, exploration breadth) — never keystroke/biometric surveillance.
- **Self-declared context & constraints:** first-gen status, financial constraints, location, time availability, current skills, goals. Used to *contextualize* scores and *filter* opportunities — never as a penalty.

**How it's collected ethically**
- **Informed consent, plain-language**, with a data-use summary a 9th grader understands.
- **No protected attributes as model features.** Race, gender, disability, record status are *never* inputs to any score. (This is the exact `ComplianceRecord` isolation pattern already enforced in SecondChanceOS: sensitive data lives in an isolated store, never joined to scoring.)
- **Context-adjustment, not lowered bars:** we adjust for *opportunity* (e.g., no access to AP courses) so equal potential reads as equal, following the "adversity/context" logic used in validity-preserving ways.
- **User owns and can export/delete** their data (GDPR/FERPA-aligned).

**How AI analyzes it**
- Item responses → **latent-trait scoring via Item Response Theory (IRT)** per dimension (this is how the SAT/GRE score; it separates item difficulty from person ability and enables *adaptive* testing — fewer questions, more precision).
- SJT scoring against an empirically keyed rubric (expert + outcome-weighted).
- **Confidence interval** on every dimension (few items → wide interval → we *say so* and ask for more, rather than faking precision).

**How scores are generated → the HPI**
- Each dimension is IRT-scored to a 0–100 scale with a confidence band.
- The **HPI composite** is a transparent weighted blend, but the product-critical output is not a single number — it's the **profile shape + trajectory** (which dimensions are already strong, which are high-leverage to develop). A single ranking number would recreate the GPA problem we're solving.
- Output object (see `lib/opportunitygraph/potential.ts`): `{ dimensions: {...9 scores + CIs}, hpi, confidence, strengths[], growthLevers[], riasec }`.

### B) AI Opportunity Mapping Engine

**Inputs:** HPI profile, RIASEC interests, declared skills, financial constraints (need-blind flag, max cost), location + remote-OK, time budget, and stated goals.

**Outputs:** ranked **career matches**, and for a chosen career: **education pathways, internships, skill-development plan, scholarships, networking targets,** and a **step-by-step roadmap**.

**The algorithm (career matching), implemented in `lib/opportunitygraph/matching.ts`:**

For each career *c*, compute a match score as a weighted, explainable blend:

```
match(user, c) =
    w_interest  · interestFit(user.riasec, c.riasec)      // cosine similarity of Holland vectors
  + w_aptitude  · aptitudeFit(user.dimensions, c.demands) // do strengths meet cognitive/behavioral demands
  + w_readiness · skillReadiness(user.skills, c.skills)    // fraction of required skills already held, importance-weighted
  + w_growth    · growthPotential(user, c)                 // upward mobility: c.medianWage & outlook vs user's start
  + w_values    · valuesFit(user.constraints, c)           // education time/cost reachable given constraints
  − p_barrier   · accessBarrier(user.constraints, c)       // penalize paths the user realistically can't access
```

Each term is normalized 0–1; weights default to interpretable values (interest .25, aptitude .20, readiness .20, growth .20, values .15) and are later personalized. Every match ships with **the term breakdown**, so the UI can always answer "why this?" — non-negotiable for trust and for avoiding a black box that steers vulnerable users.

**Skill-development plan & opportunity ranking** (see graph engine): the target career's required skills minus the user's current skills = **skill gaps**, importance-weighted. For each gap we query opportunities that *build* that skill and rank them by:

```
oppScore = gapClosingValue · accessibility · quality
  where accessibility = f(cost vs budget, need-blind, location/remote, time fit, deadline feasibility)
```

Need-blind and free opportunities are up-weighted; unaffordable or already-passed-deadline ones are filtered or flagged. This is where equity is enforced *in the ranking*, not just the marketing.

### C) Opportunity Knowledge Graph

**Nodes:** `Person` (User/PotentialProfile) · `Skill` · `Career` · `Education/Program` · `Opportunity` (scholarship, internship, course, apprenticeship, mentorship) · `Organization`.

**Edges (typed, weighted):**
- Person —*has/developing*→ Skill (weight = proficiency)
- Career —*requires*→ Skill (weight = importance) → `CareerSkill`
- Opportunity —*builds*→ Skill (weight = how much) → `OpportunitySkill`
- Opportunity —*offered by*→ Organization; Career —*employed at*→ Organization
- Person —*targets*→ Career (a chosen goal)
- Person ↔ Person (mentor / peer / "people on similar paths")

**Database structure:** modeled relationally in Postgres via Prisma (join tables *are* weighted edges — `CareerSkill.importance`, `OpportunitySkill.buildsWeight`). This keeps one operational database, ACID guarantees, and Prisma's type safety, while supporting the graph queries the product needs. At larger scale, edges can be mirrored into a native graph store (Neo4j) or a vector index for semantic skill matching — but you don't need that to ship.

**How relationships are created:**
- **Seeded from authoritative data:** O*NET (careers ↔ skills ↔ work styles ↔ RIASEC), BLS OES (wages, outlook), IPEDS/College Scorecard (programs, outcomes), curated scholarship/internship feeds.
- **NLP extraction:** an LLM+embedding pipeline reads free-text (job postings, course syllabi, scholarship descriptions) and proposes typed edges (this program *builds* these skills), which are validated before promotion.
- **Learned from outcomes:** when users who took Opportunity X later succeeded in Career Y, the X→(skills)→Y path is strengthened.

**How AI uses the graph:**
- **Matching** = weighted similarity over Person↔Career neighborhoods.
- **Gap analysis** = set difference on required vs held skills, importance-weighted.
- **Roadmap generation** = an ordered, affordability-constrained path from the Person's current skill set to the target Career's required set, sequenced into phases (`lib/opportunitygraph/graph.ts`).
- **Serendipity / "lost Einstein" detection** = find Persons whose HPI strongly fits a high-mobility Career they've never considered (high match, zero `targets` edge) and surface it.

---

## PART 3 — MACHINE-LEARNING SYSTEM

*(Written as a senior ML engineer would scope it, distinguishing what ships in the MVP from what the mature system needs.)*

### Models needed

| Layer | MVP (deterministic, defensible) | Mature system |
|---|---|---|
| **Scoring** | IRT-lite / classical scoring of validated scales; keyed SJT rubric | Full 2PL/GRM IRT with adaptive item selection; DIF (differential item functioning) monitoring for bias |
| **Career matching** | Transparent weighted feature blend (Part 2B) | Learning-to-rank (LambdaMART / gradient-boosted trees) trained on outcome labels; two-tower retrieval for scale |
| **Skill/text understanding** | Embedding similarity (sentence-transformers) for skill dedup & posting→skill tagging | Fine-tuned skill-extraction model; taxonomy alignment to O*NET/ESCO |
| **Roadmap sequencing** | Rule + graph shortest-affordable-path | Constrained RL / planning that optimizes predicted outcome per dollar & week |
| **Assistant** | Retrieval-augmented LLM grounded *only* in the user's profile + graph (SecondChanceOS already proxies Anthropic server-side) | Same, with tool-use over the graph and guardrails |

**Design rule:** start deterministic and explainable. You *cannot* train a learning-to-rank model before you have outcome data, and shipping an unexplainable black box to vulnerable users is both an ethics and a trust failure. The weighted model *is* the MVP model, and it doubles as the baseline the ML system must beat.

### Training-data sources
- **O*NET** (public): occupations, skills, abilities, work styles, RIASEC, job zones.
- **BLS OES / Employment Projections:** wages, growth outlook.
- **College Scorecard / IPEDS:** programs, cost, completion, earnings outcomes.
- **Curated opportunity feeds:** scholarships, internships, apprenticeships (partner + scraped-with-permission).
- **First-party outcome labels:** application → admit/hire → advancement events (the proprietary asset).
- **Psychometric norming samples:** for IRT calibration and DIF (partner schools/programs, consented).

### Recommendation & ranking
- **Retrieval → rank → re-rank for equity/diversity.** Retrieve candidate careers/opportunities from the graph neighborhood; rank by the model; re-rank to (a) guarantee at least some *reach* and some *affordable/safe* options and (b) avoid collapsing everyone onto the same 3 "hot" careers (popularity bias).
- **Cold start:** the HPI assessment *is* the cold-start solution — we have a rich profile before any behavior. Fallback to content-based (interest/skill) matching.
- **Exploration:** ε-greedy / contextual-bandit exposure so the system keeps learning which non-obvious paths pay off (directly powers "lost Einstein" discovery).

### Evaluation metrics
- **Ranking quality:** NDCG@k, MAP, MRR against held-out outcome labels.
- **Calibration:** does a "72 readiness" actually correspond to ~72% skill coverage / success rate? (reliability diagrams, Brier score).
- **Psychometrics:** Cronbach's α / McDonald's ω (reliability), test–retest, convergent/discriminant validity, and **predictive validity** (does HPI predict program completion / advancement?).
- **Equity:** subgroup NDCG parity, exposure parity across protected groups (measured for *auditing*, using attributes stored *outside* the model), DIF flags on items.
- **North-star product metric:** *actioned recommendations that led to a positive outcome per user* — the loop, not clicks.

### Bias prevention (concrete, not slogans)
1. **No protected attributes as features** — enforced at the schema layer (isolated store, never joined), the SecondChanceOS pattern.
2. **SJT-forward instrument design** — chosen partly because SJTs show smaller subgroup gaps than pure cognitive tests.
3. **DIF screening** — drop/repair items that function differently across groups at equal ability.
4. **Context adjustment** — measure opportunity-adjusted potential so we don't launder SES into "merit."
5. **Fairness re-ranking** with audited exposure parity.
6. **Human-in-the-loop** for high-stakes surfacing; the product *recommends and explains*, it never gate-keeps.
7. **Published bias audits** — third-party review, the trust asset.

### Privacy protections
- **Data minimization & purpose limitation;** explicit consent; **FERPA** (students) and **GDPR/CCPA** alignment; user export & delete.
- **Isolation of sensitive data** (records, disability, financial detail) from all scoring — architecturally, not by policy alone.
- **Encryption** at rest and in transit; **RBAC** on every route (already enforced via `lib/rbac.ts`); **row-level org scoping**.
- **Aggregate-only research surface:** the researcher console exposes k-anonymized cohort aggregates, never individuals (the existing SecondChanceOS research console is exactly this pattern).

---

## PART 4 — MVP BUILD PLAN

*Realistic for a high-school builder because it reuses the running SecondChanceOS stack — no new infrastructure.*

**Tech stack (already in place):** Next.js 14 (App Router) · TypeScript · Tailwind · Prisma ORM · PostgreSQL (Neon) · NextAuth (role-based JWT) · Recharts · Anthropic API (server-side proxy). Deploy: Vercel, zero-config.

### Version 1 — first 30 days ("it measures and maps")
- Prisma models for the graph (Skill, Career, CareerSkill, Opportunity, OpportunitySkill, PotentialProfile, PotentialAssessment, Roadmap, RoadmapStep) — **done in this repo.**
- The **assessment instrument** (~25 items) + **HPI scoring engine** (deterministic, IRT-lite) — **done.**
- **Career-matching engine** + explainable "why" — **done.**
- Seed graph: ~10 skills → careers → opportunities from O*NET-style data — **done.**
- Employee-facing pages: take assessment → see HPI radar → see ranked career matches — **done.**
- **Deliverable:** a real user can take an assessment and get a scored, explained set of career matches. Demo-able.

### Version 2 — 90 days ("it guides and closes the loop")
- **Roadmap generation** (graph shortest-affordable-path → phased steps) — **done in this repo as the V1.5 core.**
- **Opportunity ranking** with affordability/need-blind logic — **done.**
- **Outcome tracking:** users mark steps started/done, applications submitted/accepted (schema-ready via RoadmapStep status; add events table next).
- **Assistant** grounded in the user's profile + graph (reuse SecondChanceOS Anthropic proxy).
- **Admin/researcher insights:** anonymized potential-distribution and mobility-gap analytics — **done (insights route).**
- Expand graph to ~50 careers, 100+ opportunities via O*NET/BLS import script.
- Basic **embedding-based** skill dedup and posting→skill tagging.

### Version 3 — 6–12 months ("it learns")
- **Learning-to-rank** career/opportunity model trained on collected outcome labels; A/B vs the weighted baseline.
- **Adaptive assessment** (real IRT item bank + DIF monitoring); psychometric validation study (Part 5).
- **Institution dashboards** (schools/workforce boards) and cohort management.
- **Graph enrichment pipeline** (NLP edge extraction + validation queue).
- Mobile-friendly PWA; notifications for deadlines; mentor matching.
- SOC2-track security hardening; formal bias-audit publication.

**AI tools:** Anthropic API (assistant + NLP extraction), `sentence-transformers`/hosted embeddings (skill similarity), scikit-learn/`xgboost` or LightGBM (ranking, later), `pyirt`/`girth` or R `mirt` (IRT calibration, later).

---

## PART 5 — RESEARCH PROJECT DESIGN

**Research question:** *Can AI-powered, personalized opportunity recommendations improve career decision-making quality and early economic-mobility outcomes for underserved students, relative to standard career guidance?*

**Hypotheses**
- **H1 (primary):** Students using OpportunityGraph show greater gains in **career decision self-efficacy** (CDSE-SF, a validated scale) than a control group.
- **H2:** Treatment students take **more concrete mobility actions** (applications to programs/scholarships/internships) over the study window.
- **H3:** Treatment students report **higher-quality decisions** (aspiration–plan alignment; consideration of higher-mobility paths they hadn't previously named).
- **H0:** No difference between groups.

**Design:** randomized controlled trial (RCT), pre/post, with waitlist control (control gets the tool after the study — ethical, and improves recruitment/retention).

- **Participants:** a realistic HS-researcher scope is **n ≈ 60–120** recruited through a partner (a school, a community org, or the SecondChanceOS reentry program). Power note: n≈64/group gives ~80% power to detect a medium effect (d≈0.5, α=.05); report this honestly and treat small samples as a pilot.
- **Treatment group:** completes the HPI assessment and receives personalized matches + roadmap + opportunity recommendations for ~6–8 weeks.
- **Control group:** business-as-usual guidance (existing counselor resources / a generic careers website), then crossed over to the tool.
- **Random assignment:** by individual (or cluster-randomized by classroom if contamination is a risk).

**Data collection**
- **Pre & post:** CDSE-SF (career decision self-efficacy), a growth-mindset scale, and a short "decision quality" instrument (can you name a target path, a first step, and a funding source?).
- **Behavioral (from the platform):** assessments completed, recommendations viewed, steps started/completed, applications logged.
- **Qualitative:** short structured interviews with a subset (mechanism, trust, usability).

**Statistical analysis**
- Primary: **ANCOVA** on post-scores with pre-score as covariate (more powerful than raw change scores), or a mixed-effects model (time × condition) for repeated measures.
- Report **effect sizes** (Cohen's d, η²) with **95% CIs**, not just p-values.
- Correct for multiple comparisons (Holm/Benjamini-Hochberg).
- Pre-register the hypotheses and analysis plan (OSF) — this alone elevates it above typical HS projects.

**Expected findings (honest):** a plausible, publishable result is a **small-to-moderate positive effect on decision self-efficacy and action-taking**, strongest for first-gen/low-info students, with a null or noisy effect on longer-horizon economic outcomes (too slow to observe in 8 weeks — name this as a limitation and propose a longitudinal follow-up). A well-run *null* result is still publishable and still an outstanding research artifact.

**Ethics:** parental consent + youth assent for minors, IRB/equivalent review (many science-fair and university-mentor tracks provide this), data anonymization, and a waitlist design so no one is denied a beneficial tool.

---

## PART 6 — COMMON APP IMPACT STRATEGY

*Positioned as an admissions reader at a top program would want to see it: initiative + intellectual seriousness + measurable impact + humility.*

**Activity description (Common App, 150 characters):**
> Founded OpportunityGraph AI: platform using psychometrics + ML to map underserved students' hidden potential to careers, scholarships & roadmaps.

*(139 characters.)*

**Expanded description (150-char activity + longer honors/portfolio version):**
> Built and deployed a full-stack AI platform that measures human potential beyond GPA (an IRT-based Human Potential Index), then uses a knowledge graph to generate personalized, affordability-aware career roadmaps. Ran a pre-registered RCT with a partner reentry/education program (n≈80) measuring career decision self-efficacy. Recruited users, wrote the code, designed the study, and published results.

**Essay angle — pick the *specific person*, not the platform.** The strongest version isn't "I built an app." It's: *"A counselor for 400 students. My cousin/mentee with obvious ability and no map. I became obsessed with a single question — why do we measure people by the signal that's most broken for the people who need help most? — and I refused to let it stay a question."* The platform is the *evidence* you act on obsessions; the essay is about the intellectual and moral engine behind it: measuring what's real, distrusting proxies, and building for people the system overlooks.

**Leadership narrative:** initiative (identified the problem and shipped, not assigned) → **recruited and coordinated** (partner org, study participants, a mentor) → **rigor** (pre-registered study, bias audits — you held yourself to a scientific standard) → **transfer** (made it usable by people unlike you). That arc reads as founder + scientist, which is exactly the rare combination.

**Impact metrics to pursue (make them real and modest):**
- # students who completed an assessment and received a roadmap.
- # concrete actions taken (applications to scholarships/programs) attributable to a recommendation.
- Pre/post change in career decision self-efficacy (effect size + CI).
- Partner adoption (a school/org that kept using it).
- Research output: a pre-registration, a poster/paper, a science-fair placement, or a preprint.

**Reader's-eye positioning:** credibility over hype. One honest, well-run study with a d=0.4 and named limitations beats "helped 10,000 students" with no evidence. Lead with the science; let the ambition show through the rigor.

---

## PART 7 — COMPETITOR ANALYSIS

| Player | What they do | Weakness we exploit |
|---|---|---|
| **LinkedIn / Handshake** | Network + job/internship matching | Reward existing advantage; keyword matching; assume résumé & target already exist; weak for no-network, no-résumé users |
| **O*NET / CareerOneStop** | Free gov. occupation data | Authoritative but static, impersonal, no measurement, no follow-through |
| **CliftonStrengths / 16Personalities / Pymetrics** | Trait/strengths assessment | Produce a *label* and stop; no bridge to opportunities, education, or action; Pymetrics (hiring-side) doesn't serve the individual's roadmap |
| **Coursera / Khan / Guild** | Content & upskilling; Guild does employer-sponsored | Assume the learner knows *what* and *why*; navigation & motivation unsolved; Guild is employer-gated |
| **SchooLinks / Naviance / Scoir** | K-12 college & career readiness software | Institution-centric, form-heavy, static inventories; light on real potential measurement and on ML-driven, affordability-aware roadmaps |
| **"AI career coach" apps** | LLM chat over careers | Ungrounded, hallucinate scholarships, no measurement, no memory, no outcomes, no moat |

**Our differentiation (one line):** *the only system that measures potential first (bias-audited HPI), maps it through an outcome-learning knowledge graph, and closes the loop to a concrete, affordable next step — built for the users everyone else's signals fail.*

**Untapped opportunities:**
- **The no-signal population** (reentry, first-gen, rural, adult career-changers) — where potential-first measurement is not a nicety but the only thing that works. SecondChanceOS is the proof-of-concept beachhead.
- **The counselor-shortage gap** (1:400) — institutions will pay for scalable navigation.
- **Affordability-aware matching** — almost no one ranks opportunities by *what the student can actually access.*
- **A trusted alternative signal** — the long game: an HPI institutions accept, the way the résumé is accepted today.

---

## PART 9 — FUTURE EXPANSION (10-year)

1. **Global education platform.** The HPI is language- and curriculum-agnostic by design (potential, not pedigree), so it ports to regions where formal credentials are scarcest and the mobility upside is largest. Partner with NGOs and ministries; localize the graph per labor market.
2. **Workforce-intelligence company.** Aggregate, anonymized graph data becomes the map of *latent* talent and *what closes skill gaps* — sold to employers designing pipelines and to regions planning training investment. This is the highest-margin, most defensible business.
3. **Government / public-policy tool.** Feed opportunity-mobility analytics to workforce boards and departments of labor/education: "where is untapped potential, which interventions actually move people up, and what's the ROI?" — Opportunity Insights, but operational and forward-looking.
4. **Résumé replacement.** A portable, user-owned potential passport + verified skill/outcome graph that a person carries across schools and jobs — the atomic unit of opportunity shifts from *what you've done* to *what you can do and are proven to develop.*
5. **A new standard for measuring human potential.** The endgame: HPI becomes to opportunity what credit scores became to lending — a widely trusted, regulated, contestable, portable signal — but designed from day one around fairness, context, and the people the old signals failed. Owning that standard, with the outcome data that validates it, is the defensible, mission-aligned, billion-dollar position.

---

### How the science maps to the code (Part 8 index)

| Concept | Where it lives |
|---|---|
| Nine-dimension HPI, IRT-lite scoring, confidence bands | `lib/opportunitygraph/potential.ts` |
| Assessment instrument (SJT + validated scales) | `lib/opportunitygraph/instrument.ts` |
| Explainable career-matching algorithm | `lib/opportunitygraph/matching.ts` |
| Knowledge-graph traversal, skill-gap, roadmap generation | `lib/opportunitygraph/graph.ts` |
| Graph data model (weighted edges) | `prisma/schema.prisma` (Skill/Career/CareerSkill/Opportunity/OpportunitySkill/Roadmap…) |
| REST surface (RBAC-guarded) | `app/api/opportunitygraph/**` |
| Seeded O*NET-style graph | `prisma/seed-opportunitygraph.ts` |
| Learner experience (assessment → HPI → matches → roadmap) | `app/(dashboard)/employee/opportunity/**` |
| Anonymized mobility analytics | `app/api/opportunitygraph/insights` + admin page |

*Bias, privacy, and sensitive-data isolation follow the constraints already enforced in SecondChanceOS: sensitive attributes live in isolated stores and are never inputs to scoring or joined into analytics.*
