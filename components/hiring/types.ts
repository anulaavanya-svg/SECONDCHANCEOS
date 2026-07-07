export interface Assessment {
  id: string
  skillsScore: number
  reliabilityScore: number
  growthScore: number
  readinessScore: number
  compositeScore: number
  recommendation: string
  notes: string | null
  assessedAt: string
}

export interface Candidate {
  id: string
  fullName: string
  email: string | null
  roleApplied: string
  certifications: string[]
  source: string | null
  status: 'APPLIED' | 'ASSESSED' | 'INTERVIEWED' | 'OFFER' | 'HIRED' | 'REJECTED'
  assessment: Assessment | null
}

export const PIPELINE_COLUMNS: { status: Candidate['status']; label: string }[] = [
  { status: 'APPLIED', label: 'Applied' },
  { status: 'ASSESSED', label: 'Assessed' },
  { status: 'INTERVIEWED', label: 'Interviewed' },
  { status: 'OFFER', label: 'Offer' },
  { status: 'HIRED', label: 'Hired' },
  { status: 'REJECTED', label: 'Rejected' },
]
