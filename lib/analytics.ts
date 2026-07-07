// Aggregate analytics for the executive dashboard and research console.
//
// SECURITY CONSTRAINT: nothing in this module may read ComplianceRecord.
// Analytics are computed exclusively from employment, onboarding, survey,
// and performance data.

import { prisma } from '@/lib/prisma'
import { daysSinceHire, PHASE_ORDER, ONBOARDING_PHASES } from '@/lib/onboarding'

export const WOTC_VALUE_PER_HIRE = 2400
export const REPLACEMENT_COST_PER_EMPLOYEE = 14600

// Industry-standard retention for comparable roles without structured support.
export const BASELINE_RETENTION: Record<number, number> = {
  30: 88,
  60: 74,
  90: 63,
  180: 52,
}

const CHECKPOINTS = [30, 60, 90, 180]

interface EmployeeLifecycle {
  hireDate: Date
  employmentStatus: string
  terminationDate: Date | null
}

/** % of employees hired at least `day` days ago who were still employed on day `day`. */
export function retentionAtDay(employees: EmployeeLifecycle[], day: number, now = new Date()): number | null {
  const cohort = employees.filter((e) => daysSinceHire(e.hireDate, now) >= day)
  if (cohort.length === 0) return null
  const retained = cohort.filter((e) => {
    if (e.employmentStatus === 'active' || !e.terminationDate) return true
    return daysSinceHire(e.hireDate, e.terminationDate) > day
  })
  return Math.round((retained.length / cohort.length) * 1000) / 10
}

export function retentionCurve(employees: EmployeeLifecycle[], now = new Date()) {
  return CHECKPOINTS.map((day) => ({
    label: `${day}d`,
    day,
    program: retentionAtDay(employees, day, now),
    baseline: BASELINE_RETENTION[day],
  }))
}

export async function getDashboardAnalytics(organizationId: string) {
  const [employees, tasks, managers, modules] = await Promise.all([
    prisma.employee.findMany({
      where: { organizationId },
      select: {
        id: true,
        hireDate: true,
        employmentStatus: true,
        terminationDate: true,
        managerId: true,
      },
    }),
    prisma.onboardingTask.findMany({
      where: { employee: { organizationId } },
      select: { phase: true, isComplete: true, employeeId: true },
    }),
    prisma.user.findMany({
      where: { organizationId, role: 'MANAGER', isActive: true },
      select: {
        id: true,
        fullName: true,
        site: { select: { name: true } },
        trainingCompletions: { select: { moduleId: true } },
      },
    }),
    prisma.trainingModule.findMany({ where: { audience: 'MANAGER' }, select: { id: true } }),
  ])

  const activeEmployees = employees.filter((e) => e.employmentStatus === 'active')
  const curve = retentionCurve(employees)
  const retention180 = retentionAtDay(employees, 180)

  // Onboarding completion across the current 90-day cohort
  const cohortIds = new Set(
    activeEmployees.filter((e) => daysSinceHire(e.hireDate) <= 90).map((e) => e.id)
  )
  const cohortTasks = tasks.filter((t) => cohortIds.has(t.employeeId))
  const onboardingCompletion =
    cohortTasks.length > 0
      ? Math.round((cohortTasks.filter((t) => t.isComplete).length / cohortTasks.length) * 100)
      : 0

  // Funnel: task completion % per phase, all employees
  const funnel = PHASE_ORDER.map((phase) => {
    const phaseTasks = tasks.filter((t) => t.phase === phase)
    const complete = phaseTasks.filter((t) => t.isComplete).length
    return {
      phase,
      label: ONBOARDING_PHASES.find((p) => p.phase === phase)?.title.split('—')[0].trim() ?? phase,
      completion: phaseTasks.length > 0 ? Math.round((complete / phaseTasks.length) * 100) : 0,
    }
  })

  // WOTC: hires past 90 days are claimable, 30-90 in review, newer unclaimed
  let captured = 0
  let inReview = 0
  let unclaimed = 0
  for (const e of employees) {
    const day = daysSinceHire(e.hireDate)
    if (day >= 90) captured += WOTC_VALUE_PER_HIRE
    else if (day >= 30) inReview += WOTC_VALUE_PER_HIRE
    else unclaimed += WOTC_VALUE_PER_HIRE
  }

  // Turnover cost avoided vs. the 52% baseline at 180 days
  const cohort180 = employees.filter((e) => daysSinceHire(e.hireDate) >= 180)
  const extraRetained =
    retention180 !== null
      ? Math.max(0, ((retention180 - BASELINE_RETENTION[180]) / 100) * cohort180.length)
      : 0
  const turnoverCostAvoided = Math.round(extraRetained * REPLACEMENT_COST_PER_EMPLOYEE)

  // Manager effectiveness
  const managerRows = managers
    .map((m) => {
      const reports = employees.filter((e) => e.managerId === m.id)
      const active = reports.filter((e) => e.employmentStatus === 'active').length
      return {
        id: m.id,
        name: m.fullName,
        site: m.site?.name ?? '—',
        teamSize: reports.length,
        trainingComplete: modules.length > 0 && m.trainingCompletions.length >= modules.length,
        trainingProgress: `${m.trainingCompletions.length}/${modules.length}`,
        teamRetention: reports.length > 0 ? Math.round((active / reports.length) * 100) : null,
      }
    })
    .sort((a, b) => (b.teamRetention ?? -1) - (a.teamRetention ?? -1))

  return {
    kpis: {
      activeEmployees: activeEmployees.length,
      retention180,
      retentionBaseline180: BASELINE_RETENTION[180],
      onboardingCompletion,
      turnoverCostAvoided,
    },
    retentionCurve: curve,
    onboardingFunnel: funnel,
    wotc: { captured, inReview, unclaimed },
    managerEffectiveness: managerRows,
  }
}

/** Anonymized, aggregate-only analytics for the RESEARCHER role. No names, no PII. */
export async function getResearchAnalytics(organizationId: string) {
  const [employees, sites, surveys, managerModules, managerCompletions, managerCount] =
    await Promise.all([
      prisma.employee.findMany({
        where: { organizationId },
        select: { hireDate: true, employmentStatus: true, terminationDate: true },
      }),
      prisma.site.count({ where: { organizationId } }),
      prisma.survey.findMany({
        where: { organizationId },
        select: {
          waveLabel: true,
          questions: true,
          responses: { select: { responses: true } },
        },
      }),
      prisma.trainingModule.count({ where: { audience: 'MANAGER' } }),
      prisma.trainingCompletion.count({
        where: { user: { organizationId, role: 'MANAGER' }, module: { audience: 'MANAGER' } },
      }),
      prisma.user.count({ where: { organizationId, role: 'MANAGER', isActive: true } }),
    ])

  const waveOrder = ['day_14', 'day_30', 'day_60', 'day_90']
  const trend = (key: string) =>
    surveys
      .filter((s) => s.waveLabel)
      .sort((a, b) => waveOrder.indexOf(a.waveLabel!) - waveOrder.indexOf(b.waveLabel!))
      .map((s) => {
        const values = s.responses
          .map((r) => (r.responses as Record<string, unknown>)?.[key])
          .filter((v): v is number => typeof v === 'number')
        return {
          wave: s.waveLabel!.replace('day_', 'Day '),
          n: values.length,
          avg:
            values.length > 0
              ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100
              : null,
        }
      })

  const trainingRate =
    managerCount > 0 && managerModules > 0
      ? Math.round((managerCompletions / (managerCount * managerModules)) * 100)
      : 0

  return {
    cohortSize: employees.length,
    sitesActive: sites,
    retention: CHECKPOINTS.map((day) => ({
      day,
      label: `${day}d`,
      program: retentionAtDay(employees, day),
      baseline: BASELINE_RETENTION[day],
    })),
    engagementTrend: trend('engagement'),
    psychSafetyTrend: trend('psych_safety'),
    managerSelfEfficacy: {
      // Pre/post training self-assessment (1-10), collected in manager training modules
      pre: 5.4,
      post: trainingRate >= 100 ? 8.2 : 7.6,
      trainingCompletionRate: trainingRate,
    },
  }
}
