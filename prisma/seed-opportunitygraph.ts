// OpportunityGraph AI — knowledge-graph seed data.
//
// A compact but realistic slice of an O*NET/BLS-style graph: skills, careers
// (with weighted required-skill edges + RIASEC + cognitive demands), and real
// opportunities (with weighted skill-building edges). Deterministic and
// idempotent so it is safe to run inside the main seed on every deploy.

import { PrismaClient, OpportunityType } from '@prisma/client'

const DAY = 86_400_000
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY)

interface SkillDef {
  slug: string
  name: string
  category: string
}

const SKILLS: SkillDef[] = [
  { slug: 'data-analysis', name: 'Data analysis', category: 'technical' },
  { slug: 'sql', name: 'SQL & databases', category: 'technical' },
  { slug: 'spreadsheets', name: 'Spreadsheets & modeling', category: 'foundational' },
  { slug: 'python', name: 'Python programming', category: 'technical' },
  { slug: 'coding-web', name: 'Web development', category: 'technical' },
  { slug: 'design-basics', name: 'Design fundamentals', category: 'creative' },
  { slug: 'research-methods', name: 'Research methods', category: 'cognitive' },
  { slug: 'writing', name: 'Writing & documentation', category: 'creative' },
  { slug: 'communication', name: 'Communication', category: 'interpersonal' },
  { slug: 'teamwork', name: 'Teamwork', category: 'interpersonal' },
  { slug: 'customer-service', name: 'Customer service', category: 'interpersonal' },
  { slug: 'project-mgmt', name: 'Project management', category: 'interpersonal' },
  { slug: 'problem-solving', name: 'Applied problem-solving', category: 'cognitive' },
  { slug: 'math-fundamentals', name: 'Math fundamentals', category: 'foundational' },
  { slug: 'electrical', name: 'Electrical systems', category: 'technical' },
  { slug: 'safety-osha', name: 'Workplace safety (OSHA)', category: 'foundational' },
]

interface CareerDef {
  slug: string
  title: string
  cluster: string
  description: string
  medianWageUsd: number
  growthOutlook: string
  typicalEducation: string
  entryBarrier: number
  riasec: Record<string, number>
  demands: Record<string, number>
  skills: [string, number][] // [skillSlug, importance]
}

const CAREERS: CareerDef[] = [
  {
    slug: 'data-analyst',
    title: 'Data Analyst',
    cluster: 'Information Technology',
    description: 'Turns raw data into insights that guide decisions — reachable through certificates, not only degrees.',
    medianWageUsd: 78_000,
    growthOutlook: 'high-growth',
    typicalEducation: 'certificate',
    entryBarrier: 0.45,
    riasec: { R: 40, I: 88, A: 35, S: 40, E: 45, C: 78 },
    demands: { quantReasoning: 70, fluidReasoning: 65, conscientiousness: 60 },
    skills: [
      ['data-analysis', 0.9],
      ['sql', 0.8],
      ['spreadsheets', 0.6],
      ['python', 0.55],
      ['communication', 0.5],
      ['problem-solving', 0.7],
    ],
  },
  {
    slug: 'web-developer',
    title: 'Web Developer',
    cluster: 'Information Technology',
    description: 'Builds and maintains websites and web apps; strong portfolio matters more than pedigree.',
    medianWageUsd: 82_000,
    growthOutlook: 'high-growth',
    typicalEducation: 'associate',
    entryBarrier: 0.4,
    riasec: { R: 55, I: 78, A: 55, S: 35, E: 45, C: 55 },
    demands: { fluidReasoning: 70, openness: 60, conscientiousness: 55 },
    skills: [
      ['coding-web', 0.9],
      ['problem-solving', 0.75],
      ['design-basics', 0.5],
      ['communication', 0.45],
    ],
  },
  {
    slug: 'ux-designer',
    title: 'UX Designer',
    cluster: 'Arts & Communication',
    description: 'Designs how products feel to use, balancing user research with visual craft.',
    medianWageUsd: 85_000,
    growthOutlook: 'growing',
    typicalEducation: 'bachelor',
    entryBarrier: 0.5,
    riasec: { R: 30, I: 65, A: 85, S: 55, E: 45, C: 40 },
    demands: { openness: 72, adaptability: 62, fluidReasoning: 60 },
    skills: [
      ['design-basics', 0.9],
      ['research-methods', 0.6],
      ['communication', 0.7],
      ['writing', 0.5],
    ],
  },
  {
    slug: 'industrial-tech',
    title: 'Industrial / Electrical Technician',
    cluster: 'Manufacturing',
    description: 'Installs and repairs equipment; a debt-free path via paid apprenticeships.',
    medianWageUsd: 62_000,
    growthOutlook: 'growing',
    typicalEducation: 'certificate',
    entryBarrier: 0.3,
    riasec: { R: 88, I: 60, A: 25, S: 35, E: 35, C: 55 },
    demands: { fluidReasoning: 60, conscientiousness: 70, adaptability: 55 },
    skills: [
      ['electrical', 0.9],
      ['safety-osha', 0.8],
      ['problem-solving', 0.6],
      ['math-fundamentals', 0.6],
      ['teamwork', 0.5],
    ],
  },
  {
    slug: 'project-coordinator',
    title: 'Project Coordinator',
    cluster: 'Business',
    description: 'Keeps teams and timelines on track; a strong on-ramp into management.',
    medianWageUsd: 65_000,
    growthOutlook: 'growing',
    typicalEducation: 'associate',
    entryBarrier: 0.35,
    riasec: { R: 35, I: 45, A: 40, S: 60, E: 75, C: 70 },
    demands: { conscientiousness: 72, selfEfficacy: 62, adaptability: 60 },
    skills: [
      ['project-mgmt', 0.9],
      ['communication', 0.8],
      ['spreadsheets', 0.6],
      ['teamwork', 0.6],
    ],
  },
  {
    slug: 'financial-analyst',
    title: 'Financial Analyst',
    cluster: 'Business',
    description: 'Analyzes financial data to guide investment and budgeting decisions.',
    medianWageUsd: 90_000,
    growthOutlook: 'growing',
    typicalEducation: 'bachelor',
    entryBarrier: 0.6,
    riasec: { R: 30, I: 70, A: 25, S: 35, E: 65, C: 82 },
    demands: { quantReasoning: 75, conscientiousness: 68, fluidReasoning: 62 },
    skills: [
      ['spreadsheets', 0.85],
      ['data-analysis', 0.7],
      ['math-fundamentals', 0.7],
      ['communication', 0.6],
      ['problem-solving', 0.7],
    ],
  },
  {
    slug: 'health-support',
    title: 'Health Support Specialist',
    cluster: 'Health Science',
    description: 'Frontline patient care and coordination; a fast, in-demand entry into healthcare.',
    medianWageUsd: 58_000,
    growthOutlook: 'high-growth',
    typicalEducation: 'certificate',
    entryBarrier: 0.35,
    riasec: { R: 45, I: 55, A: 30, S: 85, E: 40, C: 55 },
    demands: { conscientiousness: 75, adaptability: 70, selfEfficacy: 60 },
    skills: [
      ['customer-service', 0.7],
      ['communication', 0.8],
      ['teamwork', 0.7],
      ['safety-osha', 0.5],
      ['problem-solving', 0.5],
    ],
  },
  {
    slug: 'it-support',
    title: 'IT Support / QA Specialist',
    cluster: 'Information Technology',
    description: 'Keeps systems running and software correct; a common first tech job with low entry cost.',
    medianWageUsd: 57_000,
    growthOutlook: 'growing',
    typicalEducation: 'certificate',
    entryBarrier: 0.3,
    riasec: { R: 60, I: 60, A: 30, S: 45, E: 40, C: 65 },
    demands: { conscientiousness: 65, fluidReasoning: 60 },
    skills: [
      ['problem-solving', 0.75],
      ['customer-service', 0.55],
      ['communication', 0.55],
      ['sql', 0.35],
      ['coding-web', 0.35],
    ],
  },
  {
    slug: 'skilled-trades',
    title: 'Skilled Trades (Welding / Machining)',
    cluster: 'Manufacturing',
    description: 'Hands-on precision work with strong pay and short, affordable training.',
    medianWageUsd: 60_000,
    growthOutlook: 'growing',
    typicalEducation: 'certificate',
    entryBarrier: 0.25,
    riasec: { R: 90, I: 45, A: 30, S: 30, E: 35, C: 60 },
    demands: { fluidReasoning: 55, conscientiousness: 72 },
    skills: [
      ['safety-osha', 0.8],
      ['math-fundamentals', 0.55],
      ['problem-solving', 0.55],
      ['teamwork', 0.5],
      ['electrical', 0.3],
    ],
  },
]

interface OppDef {
  slug: string
  title: string
  type: OpportunityType
  provider: string
  description: string
  url?: string
  costUsd: number
  needBlind: boolean
  remoteOk: boolean
  locationState?: string
  weeklyHours?: number
  estWeeks?: number
  deadlineInDays?: number
  targetsUnderserved: boolean
  builds: [string, number][] // [skillSlug, buildsWeight]
}

const OPPORTUNITIES: OppDef[] = [
  {
    slug: 'google-data-analytics',
    title: 'Google Data Analytics Certificate',
    type: OpportunityType.COURSE,
    provider: 'Coursera (financial aid available)',
    description: 'Industry-recognized certificate covering the full data-analysis workflow.',
    costUsd: 240,
    needBlind: true,
    remoteOk: true,
    weeklyHours: 10,
    estWeeks: 24,
    targetsUnderserved: false,
    builds: [['data-analysis', 0.7], ['spreadsheets', 0.6], ['sql', 0.5]],
  },
  {
    slug: 'sql-for-everybody',
    title: 'SQL for Everybody',
    type: OpportunityType.COURSE,
    provider: 'freeCodeCamp',
    description: 'Free, hands-on introduction to querying databases.',
    costUsd: 0,
    needBlind: true,
    remoteOk: true,
    weeklyHours: 5,
    estWeeks: 10,
    targetsUnderserved: false,
    builds: [['sql', 0.8], ['data-analysis', 0.3]],
  },
  {
    slug: 'freecodecamp-web',
    title: 'Responsive Web Design Certification',
    type: OpportunityType.COURSE,
    provider: 'freeCodeCamp',
    description: 'Free project-based path to your first web-development portfolio.',
    costUsd: 0,
    needBlind: true,
    remoteOk: true,
    weeklyHours: 8,
    estWeeks: 20,
    targetsUnderserved: false,
    builds: [['coding-web', 0.8], ['design-basics', 0.3]],
  },
  {
    slug: 'year-up',
    title: 'Year Up Career Program',
    type: OpportunityType.PROGRAM,
    provider: 'Year Up',
    description: 'One year of training + a paid corporate internship for young adults, with a stipend.',
    costUsd: 0,
    needBlind: true,
    remoteOk: false,
    locationState: 'TX',
    weeklyHours: 40,
    estWeeks: 52,
    targetsUnderserved: true,
    builds: [['communication', 0.6], ['project-mgmt', 0.5], ['customer-service', 0.5], ['data-analysis', 0.3]],
  },
  {
    slug: 'aws-restart',
    title: 'AWS re/Start Cloud Program',
    type: OpportunityType.PROGRAM,
    provider: 'Amazon Web Services',
    description: 'Free cohort-based program preparing people for entry-level cloud/IT roles.',
    costUsd: 0,
    needBlind: true,
    remoteOk: true,
    weeklyHours: 20,
    estWeeks: 12,
    targetsUnderserved: true,
    builds: [['sql', 0.5], ['problem-solving', 0.5], ['coding-web', 0.4]],
  },
  {
    slug: 'electrical-apprenticeship',
    title: 'Registered Electrical Apprenticeship',
    type: OpportunityType.APPRENTICESHIP,
    provider: 'State Registered Apprenticeship (IBEW)',
    description: 'Earn a paycheck while you train — no tuition debt, nationally portable credential.',
    costUsd: 0,
    needBlind: true,
    remoteOk: false,
    locationState: 'TX',
    weeklyHours: 40,
    estWeeks: 104,
    targetsUnderserved: true,
    builds: [['electrical', 0.9], ['safety-osha', 0.8], ['math-fundamentals', 0.5], ['teamwork', 0.5]],
  },
  {
    slug: 'osha-10',
    title: 'OSHA-10 Safety Certification',
    type: OpportunityType.COURSE,
    provider: 'OSHA Outreach',
    description: 'Short certification that unlocks many manufacturing and trades roles.',
    costUsd: 25,
    needBlind: false,
    remoteOk: true,
    weeklyHours: 4,
    estWeeks: 2,
    targetsUnderserved: false,
    builds: [['safety-osha', 0.9]],
  },
  {
    slug: 'machining-cert',
    title: 'CNC Machining Certificate',
    type: OpportunityType.PROGRAM,
    provider: 'Community College',
    description: 'Short, affordable certificate leading directly into skilled-trades jobs.',
    costUsd: 3000,
    needBlind: false,
    remoteOk: false,
    locationState: 'TX',
    weeklyHours: 15,
    estWeeks: 32,
    targetsUnderserved: true,
    builds: [['safety-osha', 0.6], ['math-fundamentals', 0.5], ['problem-solving', 0.4]],
  },
  {
    slug: 'khan-math',
    title: 'Khan Academy Math Foundations',
    type: OpportunityType.COURSE,
    provider: 'Khan Academy',
    description: 'Free, self-paced path to rebuild math fundamentals at any level.',
    costUsd: 0,
    needBlind: true,
    remoteOk: true,
    weeklyHours: 5,
    estWeeks: 12,
    targetsUnderserved: false,
    builds: [['math-fundamentals', 0.8]],
  },
  {
    slug: 'data-intern',
    title: 'Data Analytics Internship',
    type: OpportunityType.INTERNSHIP,
    provider: 'Regional employer partner',
    description: 'Paid remote internship applying analysis skills to real business questions.',
    costUsd: 0,
    needBlind: true,
    remoteOk: true,
    weeklyHours: 20,
    estWeeks: 12,
    deadlineInDays: 45,
    targetsUnderserved: false,
    builds: [['data-analysis', 0.5], ['sql', 0.4], ['communication', 0.4]],
  },
  {
    slug: 'ux-bootcamp-scholarship',
    title: 'UX Design Bootcamp (Full Scholarship)',
    type: OpportunityType.SCHOLARSHIP,
    provider: 'Design Access Fund',
    description: 'Fully funded bootcamp with mentorship for underrepresented designers.',
    costUsd: 0,
    needBlind: true,
    remoteOk: true,
    weeklyHours: 15,
    estWeeks: 16,
    deadlineInDays: 60,
    targetsUnderserved: true,
    builds: [['design-basics', 0.7], ['research-methods', 0.5], ['communication', 0.4]],
  },
  {
    slug: 'pm-essentials',
    title: 'Project Management Essentials',
    type: OpportunityType.COURSE,
    provider: 'Coursera (financial aid available)',
    description: 'Foundational project-management skills and vocabulary.',
    costUsd: 200,
    needBlind: true,
    remoteOk: true,
    weeklyHours: 6,
    estWeeks: 8,
    targetsUnderserved: false,
    builds: [['project-mgmt', 0.7], ['communication', 0.3]],
  },
  {
    slug: 'mentor-match',
    title: 'Industry Mentor Match',
    type: OpportunityType.MENTORSHIP,
    provider: 'iMentor',
    description: 'A one-on-one mentor in your target field to open networks and answer questions.',
    costUsd: 0,
    needBlind: true,
    remoteOk: true,
    weeklyHours: 2,
    estWeeks: 24,
    targetsUnderserved: true,
    builds: [['communication', 0.4], ['project-mgmt', 0.3]],
  },
  {
    slug: 'excel-modeling',
    title: 'Financial Modeling in Excel',
    type: OpportunityType.COURSE,
    provider: 'Online provider',
    description: 'Build the spreadsheet-modeling fluency finance roles expect.',
    costUsd: 200,
    needBlind: false,
    remoteOk: true,
    weeklyHours: 6,
    estWeeks: 10,
    targetsUnderserved: false,
    builds: [['spreadsheets', 0.8], ['data-analysis', 0.4], ['math-fundamentals', 0.3]],
  },
  {
    slug: 'cna-training',
    title: 'Certified Nursing Assistant (CNA) Training',
    type: OpportunityType.PROGRAM,
    provider: 'Community College',
    description: 'Short, affordable program that opens the door to healthcare careers.',
    costUsd: 1200,
    needBlind: false,
    remoteOk: false,
    locationState: 'TX',
    weeklyHours: 20,
    estWeeks: 8,
    targetsUnderserved: true,
    builds: [['customer-service', 0.5], ['teamwork', 0.5], ['communication', 0.5], ['safety-osha', 0.4]],
  },
]

export async function seedOpportunityGraph(prisma: PrismaClient, demoUserId?: string) {
  // Idempotent wipe in dependency order.
  await prisma.roadmapStep.deleteMany()
  await prisma.roadmap.deleteMany()
  await prisma.potentialAssessment.deleteMany()
  await prisma.potentialProfile.deleteMany()
  await prisma.careerSkill.deleteMany()
  await prisma.opportunitySkill.deleteMany()
  await prisma.career.deleteMany()
  await prisma.opportunity.deleteMany()
  await prisma.skill.deleteMany()

  // Skills → slug→id map.
  const skillId = new Map<string, string>()
  for (const s of SKILLS) {
    const created = await prisma.skill.create({ data: s })
    skillId.set(s.slug, created.id)
  }

  // Careers with weighted required-skill edges.
  for (const c of CAREERS) {
    await prisma.career.create({
      data: {
        slug: c.slug,
        title: c.title,
        cluster: c.cluster,
        description: c.description,
        medianWageUsd: c.medianWageUsd,
        growthOutlook: c.growthOutlook,
        typicalEducation: c.typicalEducation,
        entryBarrier: c.entryBarrier,
        riasec: c.riasec,
        demands: c.demands,
        skills: {
          create: c.skills
            .filter(([slug]) => skillId.has(slug))
            .map(([slug, importance]) => ({ skillId: skillId.get(slug)!, importance })),
        },
      },
    })
  }

  // Opportunities with weighted skill-building edges.
  for (const o of OPPORTUNITIES) {
    await prisma.opportunity.create({
      data: {
        slug: o.slug,
        title: o.title,
        type: o.type,
        provider: o.provider,
        description: o.description,
        url: o.url,
        costUsd: o.costUsd,
        needBlind: o.needBlind,
        remoteOk: o.remoteOk,
        locationState: o.locationState,
        weeklyHours: o.weeklyHours,
        estWeeks: o.estWeeks,
        deadline: o.deadlineInDays ? daysFromNow(o.deadlineInDays) : null,
        targetsUnderserved: o.targetsUnderserved,
        skills: {
          create: o.builds
            .filter(([slug]) => skillId.has(slug))
            .map(([slug, buildsWeight]) => ({ skillId: skillId.get(slug)!, buildsWeight })),
        },
      },
    })
  }

  // Seed a demo Human Potential profile so the dashboard is populated on first
  // login (an analytical/investigative profile that fits Data Analyst well).
  if (demoUserId) {
    await prisma.potentialProfile.create({
      data: {
        userId: demoUserId,
        fluidReasoning: 78,
        verbalReasoning: 70,
        quantReasoning: 80,
        conscientiousness: 82,
        openness: 74,
        adaptability: 68,
        growthMindset: 85,
        selfEfficacy: 72,
        intrinsicMotivation: 76,
        hpi: 76.4,
        confidence: 0.82,
        riasec: { R: 52, I: 86, A: 45, S: 48, E: 50, C: 72 },
        strengths: ['growthMindset', 'conscientiousness', 'quantReasoning'],
        growthLevers: ['adaptability', 'selfEfficacy', 'verbalReasoning'],
        constraints: { maxCostUsd: 1000, needBlindOnly: false, locationState: 'TX', weeklyHours: 12, firstGen: true },
        declaredSkills: [
          { skillId: skillId.get('spreadsheets')!, proficiency: 0.6 },
          { skillId: skillId.get('communication')!, proficiency: 0.5 },
          { skillId: skillId.get('math-fundamentals')!, proficiency: 0.5 },
        ],
      },
    })
  }

  console.log(
    `OpportunityGraph seeded: ${SKILLS.length} skills, ${CAREERS.length} careers, ${OPPORTUNITIES.length} opportunities.`
  )
}
