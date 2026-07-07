// Chart colors validated for lightness, chroma, CVD separation, and contrast
// against the app's light surface (see design-system palette validation).
export const CHART = {
  program: '#3568B8', // blue — program cohort
  baseline: '#C0503C', // red — standard-onboarding baseline
  positive: '#1E9E76', // emerald
  caution: '#C2703D', // amber
  neutral: '#8A93A8', // gray — used only with direct labels + legend
  grid: '#E1E4EA',
  axis: '#6B7280',
}

export const TOOLTIP_STYLE = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E1E4EA',
  borderRadius: 10,
  fontSize: 12,
  color: '#12172B',
  boxShadow: '0 4px 12px rgba(18,23,43,0.08)',
} as const
