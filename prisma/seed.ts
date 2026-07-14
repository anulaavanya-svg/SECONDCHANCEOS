import { PrismaClient, UserRole, CandidateStatus, ComplianceStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { seedOpportunityGraph } from './seed-opportunitygraph'

const prisma = new PrismaClient()

const DAY = 86_400_000
const daysAgo = (n: number) => new Date(Date.now() - n * DAY)

// Mirrors lib/onboarding.ts phase definitions (kept inline so the seed is standalone)
const PHASES = [
  {
    phase: 'day1',
    dueByDay: 1,
    tasks: [
      'Meet your team and site leader',
      'Review role expectations and schedule',
      'Meet your assigned mentor',
      'Complete safety and workplace basics training',
    ],
  },
  {
    phase: 'd1_30',
    dueByDay: 30,
    tasks: [
      'Weekly mentor check-ins',
      'Core skills training modules',
      'Learn where to find support resources',
      'First informal manager 1:1',
    ],
  },
  {
    phase: 'd30_60',
    dueByDay: 60,
    tasks: [
      'Set 2-3 personal goals with your manager',
      'First formal feedback conversation',
      'Team integration activity',
      'Mid-program pulse survey',
    ],
  },
  {
    phase: 'd60_90',
    dueByDay: 90,
    tasks: [
      'Advancement and skill-path conversation',
      'Retention check-in',
      'Transition to standard performance review cycle',
      '90-day reflection survey',
    ],
  },
]

function stageForDay(day: number): string {
  if (day <= 30) return 'stabilization'
  if (day <= 60) return 'growth'
  if (day <= 90) return 'advancement'
  return 'complete'
}

async function seedTasks(employeeId: string, daysIn: number, completionBias = 1) {
  for (const phaseDef of PHASES) {
    for (const [i, title] of phaseDef.tasks.entries()) {
      // Tasks in phases the employee has passed are (mostly) complete
      const phaseStart = phaseDef.phase === 'day1' ? 0 : phaseDef.dueByDay - 30
      const progressThroughPhase = (daysIn - phaseStart) / (phaseDef.dueByDay - phaseStart || 1)
      const isComplete =
        completionBias > 0 &&
        (daysIn >= phaseDef.dueByDay + 3 ||
          (progressThroughPhase > 0 && i / phaseDef.tasks.length < progressThroughPhase * completionBias))
      await prisma.onboardingTask.create({
        data: {
          employeeId,
          phase: phaseDef.phase,
          title,
          dueByDay: phaseDef.dueByDay,
          isComplete,
          completedAt: isComplete
            ? daysAgo(Math.max(0, daysIn - phaseDef.dueByDay + Math.floor(Math.random() * 3)))
            : null,
        },
      })
    }
  }
}

async function main() {
  console.log('Seeding SecondChanceOS demo data...')
  const passwordHash = await bcrypt.hash('password', 10)

  // Database-level documentation of the criminal-history isolation constraint
  await prisma.$executeRawUnsafe(
    `COMMENT ON TABLE "ComplianceRecord" IS 'SENSITIVE: criminal-history adjudication only. Must never be joined to CandidateAssessment, analytics queries, or any route accessible to MANAGER/EMPLOYEE/RESEARCHER roles.'`
  )

  // Wipe in dependency order so the seed is idempotent
  await prisma.roadmapStep.deleteMany()
  await prisma.roadmap.deleteMany()
  await prisma.potentialAssessment.deleteMany()
  await prisma.potentialProfile.deleteMany()
  await prisma.careerSkill.deleteMany()
  await prisma.opportunitySkill.deleteMany()
  await prisma.career.deleteMany()
  await prisma.opportunity.deleteMany()
  await prisma.skill.deleteMany()
  await prisma.trainingCompletion.deleteMany()
  await prisma.trainingModule.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.report.deleteMany()
  await prisma.performanceMetric.deleteMany()
  await prisma.surveyResponse.deleteMany()
  await prisma.survey.deleteMany()
  await prisma.managerAction.deleteMany()
  await prisma.mentorLog.deleteMany()
  await prisma.onboardingTask.deleteMany()
  await prisma.employee.deleteMany()
  await prisma.complianceRecord.deleteMany()
  await prisma.candidateAssessment.deleteMany()
  await prisma.candidate.deleteMany()
  await prisma.user.deleteMany()
  await prisma.site.deleteMany()
  await prisma.organization.deleteMany()

  // ── Organization & sites ────────────────────────────────────────────────
  const org = await prisma.organization.create({
    data: {
      name: 'BuildCo Manufacturing',
      industry: 'manufacturing',
      headcount: 250,
      planTier: 'core',
    },
  })

  const waco = await prisma.site.create({
    data: { organizationId: org.id, name: 'Waco Plant', city: 'Waco', state: 'TX' },
  })
  const denton = await prisma.site.create({
    data: { organizationId: org.id, name: 'Denton Warehouse', city: 'Denton', state: 'TX' },
  })

  // ── Users ───────────────────────────────────────────────────────────────
  const admin = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: 'admin@secondchance.com',
      passwordHash,
      fullName: 'Sarah Martinez',
      role: UserRole.ADMIN,
    },
  })

  const dana = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: 'dana.kowalski@secondchance.com',
      passwordHash,
      fullName: 'Dana Kowalski',
      role: UserRole.MANAGER,
      siteId: waco.id,
    },
  })

  const ray = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: 'ray.ortiz@secondchance.com',
      passwordHash,
      fullName: 'Ray Ortiz',
      role: UserRole.MANAGER,
      siteId: denton.id,
    },
  })

  await prisma.user.create({
    data: {
      organizationId: org.id,
      email: 'researcher@secondchance.com',
      passwordHash,
      fullName: 'Dr. Emma Chen',
      role: UserRole.RESEARCHER,
    },
  })

  // Peer mentors (experienced employees who mentor new hires)
  const mentorMarcus = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: 'marcus.webb@secondchance.com',
      passwordHash,
      fullName: 'Marcus Webb',
      role: UserRole.EMPLOYEE,
      siteId: waco.id,
    },
  })
  const mentorTina = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: 'tina.alvarez@secondchance.com',
      passwordHash,
      fullName: 'Tina Alvarez',
      role: UserRole.EMPLOYEE,
      siteId: denton.id,
    },
  })

  // Demo employee login
  const employeeUser = await prisma.user.create({
    data: {
      organizationId: org.id,
      email: 'employee@secondchance.com',
      passwordHash,
      fullName: 'Jordan Ellis',
      role: UserRole.EMPLOYEE,
      siteId: waco.id,
    },
  })

  // ── Candidates ──────────────────────────────────────────────────────────
  await prisma.candidate.create({
    data: {
      organizationId: org.id,
      fullName: 'Devon Carter',
      email: 'devon.carter@example.com',
      roleApplied: 'Assembly Technician',
      certifications: ['OSHA 10', 'Forklift Operator'],
      source: 'Reentry partner: Goodwill Career Center',
      status: CandidateStatus.APPLIED,
    },
  })

  const assessed = await prisma.candidate.create({
    data: {
      organizationId: org.id,
      fullName: 'Luis Herrera',
      email: 'luis.herrera@example.com',
      roleApplied: 'Warehouse Associate',
      certifications: ['OSHA 10'],
      source: 'Texas Workforce Commission',
      status: CandidateStatus.ASSESSED,
    },
  })
  await prisma.candidateAssessment.create({
    data: {
      candidateId: assessed.id,
      skillsScore: 72,
      reliabilityScore: 85,
      growthScore: 78,
      readinessScore: 70,
      compositeScore: 72 * 0.3 + 85 * 0.3 + 78 * 0.2 + 70 * 0.2, // 76.7
      recommendation: 'recommended',
      notes: 'Strong warehouse fundamentals; consistent references from workforce program.',
      assessedBy: dana.id,
    },
  })
  // Compliance adjudication is a separate, isolated flow
  await prisma.complianceRecord.create({
    data: {
      candidateId: assessed.id,
      status: ComplianceStatus.CLEARED,
      summary: 'Adjudicated under individualized assessment policy.',
      adjudicatedAt: daysAgo(4),
    },
  })

  const interviewed = await prisma.candidate.create({
    data: {
      organizationId: org.id,
      fullName: 'Aisha Thompson',
      email: 'aisha.thompson@example.com',
      roleApplied: 'Quality Control Inspector',
      certifications: ['Six Sigma Yellow Belt', 'OSHA 10'],
      source: 'Employee referral',
      status: CandidateStatus.INTERVIEWED,
    },
  })
  await prisma.candidateAssessment.create({
    data: {
      candidateId: interviewed.id,
      skillsScore: 88,
      reliabilityScore: 82,
      growthScore: 90,
      readinessScore: 84,
      compositeScore: 88 * 0.3 + 82 * 0.3 + 90 * 0.2 + 84 * 0.2, // 85.8
      recommendation: 'recommended',
      notes: 'Excellent attention to detail; QC aptitude test in top decile.',
      assessedBy: dana.id,
    },
  })
  await prisma.complianceRecord.create({
    data: { candidateId: interviewed.id, status: ComplianceStatus.PENDING },
  })

  // ── Employees ───────────────────────────────────────────────────────────
  // Featured 90-day cohort at days 5, 12, 47, 63, 78, plus one completed at 120
  const cohort: {
    name: string
    daysIn: number
    site: string
    manager: string
    mentor: string
    jobTitle: string
    userId?: string
    completionBias?: number
  }[] = [
    { name: 'Andre Boyd', daysIn: 5, site: waco.id, manager: dana.id, mentor: mentorMarcus.id, jobTitle: 'Assembly Technician' },
    { name: 'Jordan Ellis', daysIn: 12, site: waco.id, manager: dana.id, mentor: mentorMarcus.id, jobTitle: 'Machine Operator', userId: employeeUser.id },
    { name: 'Keisha Bennett', daysIn: 47, site: denton.id, manager: ray.id, mentor: mentorTina.id, jobTitle: 'Warehouse Associate' },
    { name: 'Miguel Santos', daysIn: 63, site: waco.id, manager: dana.id, mentor: mentorMarcus.id, jobTitle: 'Assembly Technician', completionBias: 0.7 },
    { name: 'Tasha Green', daysIn: 78, site: denton.id, manager: ray.id, mentor: mentorTina.id, jobTitle: 'Inventory Clerk' },
    { name: 'Robert Nguyen', daysIn: 120, site: waco.id, manager: dana.id, mentor: mentorMarcus.id, jobTitle: 'Quality Control Inspector' },
  ]

  // Every employee gets a linked User record (no login for non-demo users)
  // so names render throughout the app.
  async function employeeUserFor(name: string): Promise<string> {
    const email = `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@buildco-demo.com`
    const user = await prisma.user.create({
      data: {
        organizationId: org.id,
        email,
        fullName: name,
        role: UserRole.EMPLOYEE,
      },
    })
    return user.id
  }

  const employees: { id: string; daysIn: number; mentorId: string; managerId: string }[] = []
  for (const c of cohort) {
    const emp = await prisma.employee.create({
      data: {
        organizationId: org.id,
        userId: c.userId ?? (await employeeUserFor(c.name)),
        siteId: c.site,
        managerId: c.manager,
        mentorId: c.mentor,
        jobTitle: c.jobTitle,
        hireDate: daysAgo(c.daysIn),
        onboardingStage: stageForDay(c.daysIn),
        employmentStatus: 'active',
      },
    })
    employees.push({ id: emp.id, daysIn: c.daysIn, mentorId: c.mentor, managerId: c.manager })
    await seedTasks(emp.id, c.daysIn, c.completionBias ?? 1)
  }

  // Historical cohort (hired 6-14 months ago) so retention curves have real data.
  // 11 hires, 2 terminated → 81.8% retention at 180 days vs the 52% baseline.
  const historical = [
    { daysIn: 200, site: waco.id, manager: dana.id, mentor: mentorMarcus.id, title: 'Assembly Technician' },
    { daysIn: 215, site: denton.id, manager: ray.id, mentor: mentorTina.id, title: 'Warehouse Associate' },
    { daysIn: 240, site: waco.id, manager: dana.id, mentor: mentorMarcus.id, title: 'Machine Operator' },
    { daysIn: 260, site: denton.id, manager: ray.id, mentor: mentorTina.id, title: 'Inventory Clerk' },
    { daysIn: 280, site: waco.id, manager: dana.id, mentor: mentorMarcus.id, title: 'Assembly Technician' },
    { daysIn: 300, site: denton.id, manager: ray.id, mentor: mentorTina.id, title: 'Warehouse Associate' },
    { daysIn: 320, site: waco.id, manager: dana.id, mentor: mentorMarcus.id, title: 'Quality Control Inspector' },
    { daysIn: 350, site: denton.id, manager: ray.id, mentor: mentorTina.id, title: 'Forklift Operator' },
    { daysIn: 380, site: waco.id, manager: dana.id, mentor: mentorMarcus.id, title: 'Machine Operator' },
    { daysIn: 400, site: denton.id, manager: ray.id, mentor: mentorTina.id, title: 'Warehouse Associate', terminatedAtDay: 41 },
    { daysIn: 420, site: waco.id, manager: dana.id, mentor: mentorMarcus.id, title: 'Assembly Technician', terminatedAtDay: 150 },
  ] as { daysIn: number; site: string; manager: string; mentor: string; title: string; terminatedAtDay?: number }[]

  const histNames = [
    'Carla Jimenez', 'Terrence Cole', 'Nina Park', 'Doug Ferris', 'Alicia Monroe',
    'Sam Whitaker', 'Priya Nair', 'Omar Little', 'Beth Cranston', 'Victor Ruiz', 'Hank Delgado',
  ]

  for (const [i, h] of historical.entries()) {
    const terminated = h.terminatedAtDay !== undefined
    const emp = await prisma.employee.create({
      data: {
        organizationId: org.id,
        userId: await employeeUserFor(histNames[i]),
        siteId: h.site,
        managerId: h.manager,
        mentorId: h.mentor,
        jobTitle: h.title,
        hireDate: daysAgo(h.daysIn),
        onboardingStage: 'complete',
        employmentStatus: terminated ? 'terminated' : 'active',
        terminationDate: terminated ? daysAgo(h.daysIn - h.terminatedAtDay!) : null,
        terminationReason: terminated ? 'voluntary_resignation' : null,
      },
    })
    if (!terminated) {
      employees.push({ id: emp.id, daysIn: h.daysIn, mentorId: h.mentor, managerId: h.manager })
    }
    await seedTasks(emp.id, terminated ? h.terminatedAtDay! : 120, terminated ? 0.4 : 1)
  }

  // ── Mentor logs (2 per active employee) ────────────────────────────────
  const channels = ['in_person', 'call', 'message', 'email']
  for (const [i, emp] of employees.entries()) {
    await prisma.mentorLog.create({
      data: {
        employeeId: emp.id,
        mentorId: emp.mentorId,
        contactDate: daysAgo(Math.min(emp.daysIn, 7)),
        channel: channels[i % channels.length],
        notes: 'Weekly check-in. Settling in well; no blockers raised.',
      },
    })
    await prisma.mentorLog.create({
      data: {
        employeeId: emp.id,
        mentorId: emp.mentorId,
        contactDate: daysAgo(Math.min(emp.daysIn, 2)),
        channel: channels[(i + 1) % channels.length],
        notes: 'Quick follow-up. Discussed shift schedule and training progress.',
      },
    })
  }

  // ── Manager action (attendance, resolved) ───────────────────────────────
  const miguel = employees[3]
  await prisma.managerAction.create({
    data: {
      employeeId: miguel.id,
      managerId: dana.id,
      issueType: 'attendance',
      decisionPath: ['start', 'inquire', 'support', 'end'],
      resolutionNote:
        'Missed shift traced to a court-mandated appointment conflict. Adjusted schedule and connected employee to the legal-appointment accommodation policy. No further absences.',
      isResolved: true,
      createdAt: daysAgo(20),
    },
  })

  // ── Surveys with responses ──────────────────────────────────────────────
  const survey30 = await prisma.survey.create({
    data: {
      organizationId: org.id,
      title: '30-Day Pulse Check',
      waveLabel: 'day_30',
      questions: [
        { key: 'engagement', text: 'I feel motivated to do my best work here.', type: 'scale' },
        { key: 'psych_safety', text: 'I can raise a problem or ask a question without worrying it will be held against me.', type: 'scale' },
        { key: 'belonging', text: 'I feel like part of my team.', type: 'scale' },
        { key: 'support_awareness', text: 'I know where to go if I need help with something outside of work.', type: 'scale' },
        { key: 'open_feedback', text: 'What is one thing that would make your first months here better?', type: 'text' },
      ],
    },
  })

  const survey90 = await prisma.survey.create({
    data: {
      organizationId: org.id,
      title: '90-Day Reflection',
      waveLabel: 'day_90',
      questions: [
        { key: 'engagement', text: 'I feel motivated to do my best work here.', type: 'scale' },
        { key: 'psych_safety', text: 'I can raise a problem or ask a question without worrying it will be held against me.', type: 'scale' },
        { key: 'growth', text: 'I can see a future for myself at this company.', type: 'scale' },
        { key: 'manager_support', text: 'My manager sets me up to succeed.', type: 'scale' },
        { key: 'open_feedback', text: 'Looking back at your first 90 days, what stands out?', type: 'text' },
      ],
    },
  })

  const thirtyDayResponses = [
    { engagement: 4, psych_safety: 3, belonging: 4, support_awareness: 4, open_feedback: 'More cross-training earlier would help.' },
    { engagement: 4, psych_safety: 4, belonging: 5, support_awareness: 3, open_feedback: 'My mentor has made a big difference.' },
    { engagement: 3, psych_safety: 4, belonging: 3, support_awareness: 4, open_feedback: 'Clearer bus schedule info for early shifts.' },
    { engagement: 5, psych_safety: 4, belonging: 4, support_awareness: 5, open_feedback: 'Feeling good so far.' },
  ]
  const eligible30 = employees.filter((e) => e.daysIn >= 30)
  for (const [i, r] of thirtyDayResponses.entries()) {
    await prisma.surveyResponse.create({
      data: {
        surveyId: survey30.id,
        employeeId: eligible30[i % eligible30.length]?.id,
        responses: r,
        submittedAt: daysAgo(10 + i),
      },
    })
  }

  const ninetyDayResponses = [
    { engagement: 4, psych_safety: 4, growth: 4, manager_support: 5, open_feedback: 'The 90-day plan kept me on track.' },
    { engagement: 5, psych_safety: 5, growth: 4, manager_support: 4, open_feedback: 'Proud of the skills I picked up.' },
    { engagement: 4, psych_safety: 5, growth: 5, manager_support: 4, open_feedback: 'Want to move toward a lead role.' },
  ]
  const eligible90 = employees.filter((e) => e.daysIn >= 90)
  for (const [i, r] of ninetyDayResponses.entries()) {
    await prisma.surveyResponse.create({
      data: {
        surveyId: survey90.id,
        employeeId: eligible90[i % eligible90.length]?.id,
        responses: r,
        submittedAt: daysAgo(3 + i),
      },
    })
  }

  // ── Training modules & completions ──────────────────────────────────────
  const modules = await Promise.all([
    prisma.trainingModule.create({
      data: {
        title: 'Coaching-First Management',
        audience: UserRole.MANAGER,
        description: 'Non-punitive first-response, psychological safety, and coaching conversation structure.',
      },
    }),
    prisma.trainingModule.create({
      data: {
        title: 'Bias Interruption in Frontline Decisions',
        audience: UserRole.MANAGER,
        description: 'Recognizing and interrupting stigma-driven judgment in attendance, conflict, and performance calls.',
      },
    }),
    prisma.trainingModule.create({
      data: {
        title: 'Using the Decision Toolkit',
        audience: UserRole.MANAGER,
        description: 'Working the structured decision trees and building a fair documentation trail.',
      },
    }),
  ])

  for (const m of modules) {
    await prisma.trainingCompletion.create({
      data: { userId: dana.id, moduleId: m.id, completedAt: daysAgo(60) },
    })
  }
  // Ray has completed 2 of 3
  await prisma.trainingCompletion.create({
    data: { userId: ray.id, moduleId: modules[0].id, completedAt: daysAgo(45) },
  })
  await prisma.trainingCompletion.create({
    data: { userId: ray.id, moduleId: modules[1].id, completedAt: daysAgo(30) },
  })

  // ── Performance metrics for all employees ──────────────────────────────
  const allEmployees = await prisma.employee.findMany({ select: { id: true, employmentStatus: true } })
  for (const [i, emp] of allEmployees.entries()) {
    await prisma.performanceMetric.create({
      data: {
        employeeId: emp.id,
        metricDate: daysAgo(7),
        attendanceRate: emp.employmentStatus === 'active' ? 0.9 + (i % 5) * 0.02 : 0.72,
        engagementScore: emp.employmentStatus === 'active' ? 3.4 + (i % 4) * 0.4 : 2.1,
        promotionFlag: i % 7 === 0,
      },
    })
  }

  // ── Welcome notifications ───────────────────────────────────────────────
  await prisma.notification.create({
    data: {
      userId: admin.id,
      type: 'system',
      title: 'WOTC filings due',
      message: '2 hires reach their 90-day WOTC certification window this month.',
    },
  })
  await prisma.notification.create({
    data: {
      userId: dana.id,
      type: 'team',
      title: 'Retention check-in due',
      message: 'Tasha Green reaches day 80 this week — schedule her retention check-in.',
    },
  })
  await prisma.notification.create({
    data: {
      userId: employeeUser.id,
      type: 'onboarding',
      title: 'Nice momentum!',
      message: 'You have completed your Day 1 checklist. Your stabilization phase tasks are ready.',
    },
  })

  // ── OpportunityGraph AI knowledge graph + demo potential profile ─────────
  await seedOpportunityGraph(prisma, employeeUser.id)

  console.log('Seed complete.')
  console.log('Demo accounts (password: "password"):')
  console.log('  admin@secondchance.com          → ADMIN')
  console.log('  dana.kowalski@secondchance.com  → MANAGER')
  console.log('  employee@secondchance.com       → EMPLOYEE')
  console.log('  researcher@secondchance.com     → RESEARCHER')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
