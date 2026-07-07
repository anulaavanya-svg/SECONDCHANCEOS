import { NextRequest, NextResponse } from 'next/server'
import { requireResearcher, authErrorStatus } from '@/lib/rbac'
import { getResearchAnalytics } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

// Anonymized aggregates only — no names, no individual rows, no PII.
export async function GET(request: NextRequest) {
  try {
    const session = await requireResearcher()
    const data = await getResearchAnalytics(session.user.organizationId)

    if (request.nextUrl.searchParams.get('format') === 'csv') {
      const lines: string[] = ['metric,segment,value']
      lines.push(`cohort_size,all,${data.cohortSize}`)
      lines.push(`sites_active,all,${data.sitesActive}`)
      for (const r of data.retention) {
        lines.push(`retention_program,${r.label},${r.program ?? ''}`)
        lines.push(`retention_baseline,${r.label},${r.baseline}`)
      }
      for (const e of data.engagementTrend) lines.push(`engagement_avg,${e.wave},${e.avg ?? ''}`)
      for (const p of data.psychSafetyTrend) lines.push(`psych_safety_avg,${p.wave},${p.avg ?? ''}`)
      lines.push(`manager_self_efficacy,pre,${data.managerSelfEfficacy.pre}`)
      lines.push(`manager_self_efficacy,post,${data.managerSelfEfficacy.post}`)
      lines.push(`manager_training_completion_pct,all,${data.managerSelfEfficacy.trainingCompletionRate}`)

      return new NextResponse(lines.join('\n'), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="secondchanceos-research-export.csv"',
        },
      })
    }

    return NextResponse.json(data)
  } catch (error) {
    const status = authErrorStatus(error)
    if (status) return NextResponse.json({ error: 'Unauthorized' }, { status })
    console.error('GET /api/analytics/research failed:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
