'use client'

import { useEffect, useState } from 'react'
import Card, { CardHeader } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import RetentionCurve from '@/components/charts/RetentionCurve'
import OnboardingFunnel from '@/components/charts/OnboardingFunnel'
import WOTCTracker from '@/components/charts/WOTCTracker'

interface DashboardData {
  kpis: {
    activeEmployees: number
    retention180: number | null
    retentionBaseline180: number
    onboardingCompletion: number
    turnoverCostAvoided: number
  }
  retentionCurve: { label: string; program: number | null; baseline: number }[]
  onboardingFunnel: { label: string; completion: number }[]
  wotc: { captured: number; inReview: number; unclaimed: number }
  managerEffectiveness: {
    id: string
    name: string
    site: string
    teamSize: number
    trainingComplete: boolean
    trainingProgress: string
    teamRetention: number | null
  }[]
}

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/analytics/dashboard')
      .then(async (r) => {
        if (!r.ok) throw new Error('Could not load analytics.')
        setData(await r.json())
      })
      .catch((e) => setError(e.message))
  }, [])

  if (error) {
    return (
      <div className="p-6">
        <EmptyState icon="⚠️" title="Dashboard unavailable" message={error} />
      </div>
    )
  }
  if (!data) return <Spinner label="Loading analytics…" />

  const { kpis } = data

  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="font-display text-xl font-bold text-ink">Executive Dashboard</h1>
        <p className="text-sm text-muted">
          Program performance across hiring, onboarding, retention, and tax credits.
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Active employees" value={String(kpis.activeEmployees)} sub="program participants" />
        <KpiCard
          label="180-day retention"
          value={kpis.retention180 !== null ? `${kpis.retention180}%` : '—'}
          sub={`vs ${kpis.retentionBaseline180}% baseline`}
          tone={
            kpis.retention180 !== null && kpis.retention180 > kpis.retentionBaseline180
              ? 'positive'
              : undefined
          }
        />
        <KpiCard label="Onboarding completion" value={`${kpis.onboardingCompletion}%`} sub="90-day cohort tasks" />
        <KpiCard label="Turnover cost avoided" value={money(kpis.turnoverCostAvoided)} sub="vs industry baseline" tone="positive" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Retention curve"
            subtitle="Program cohort vs standard onboarding baseline"
          />
          <RetentionCurve data={data.retentionCurve} />
        </Card>
        <Card>
          <CardHeader title="Onboarding funnel" subtitle="Task completion by phase" />
          <OnboardingFunnel data={data.onboardingFunnel} />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="WOTC tax credit tracker"
            subtitle="$2,400 per qualified hire — captured at the 90-day mark"
          />
          <WOTCTracker data={data.wotc} />
        </Card>

        <Card padded={false} className="overflow-hidden">
          <div className="p-5 pb-0">
            <CardHeader title="Manager effectiveness" subtitle="Sorted by team retention" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-line bg-bg/60 text-left text-xs uppercase tracking-wider text-muted">
                  <th className="px-5 py-2.5 font-medium">Manager</th>
                  <th className="px-4 py-2.5 font-medium">Site</th>
                  <th className="px-4 py-2.5 font-medium">Training</th>
                  <th className="px-4 py-2.5 font-medium">Team</th>
                  <th className="px-5 py-2.5 text-right font-medium">Retention</th>
                </tr>
              </thead>
              <tbody>
                {data.managerEffectiveness.map((m) => (
                  <tr key={m.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-3 font-medium text-ink">{m.name}</td>
                    <td className="px-4 py-3 text-muted">{m.site}</td>
                    <td className="px-4 py-3">
                      {m.trainingComplete ? (
                        <Badge tone="success">Complete</Badge>
                      ) : (
                        <Badge tone="warn">{m.trainingProgress} modules</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted">{m.teamSize}</td>
                    <td className="px-5 py-3 text-right font-mono font-medium text-ink">
                      {m.teamRetention !== null ? `${m.teamRetention}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}

function KpiCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: string
  sub: string
  tone?: 'positive'
}) {
  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className={`mt-2 font-mono text-2xl font-semibold ${tone === 'positive' ? 'text-accent' : 'text-ink'}`}>
        {value}
      </p>
      <p className="mt-1 text-xs text-muted">{sub}</p>
    </Card>
  )
}
