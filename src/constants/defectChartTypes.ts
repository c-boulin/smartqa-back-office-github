/**
 * Stacked defect keys and colors aligned with Robot Framework tag mapping (API + DefectsChart).
 * Colors match overview “Defect Breakdown by Service” legend (Product Bug … Login).
 */
export const DEFECT_CHART_TYPES = [
  { key: 'productBug', label: 'Product Bug', color: '#EF4444' },
  { key: 'productMaintenance', label: 'Product Maintenance', color: '#92400E' },
  { key: 'internalComponentsBug', label: 'Internal Components Bug', color: '#7C3AED' },
  { key: 'automationBug', label: 'Automation Bug', color: '#CA8A04' },
  { key: 'updateForNewFeature', label: 'Update for new feature', color: '#F9A8D4' },
  { key: 'missingSpecifications', label: 'Missing specifications', color: '#DB2777' },
  { key: 'systemIssue', label: 'System Issue', color: '#1D4ED8' },
  { key: 'network', label: 'Network', color: '#7DD3FC' },
  { key: 'gitlabIssue', label: 'GitLab Issue', color: '#06B6D4' },
  { key: 'noDefect', label: 'No Defect', color: '#4B5563' },
  { key: 'toInvestigate', label: 'To Investigate', color: '#FBBF24' },
  { key: 'login', label: 'Login', color: '#EA580C' },
  { key: 'other', label: 'Other', color: '#94A3B8' },
] as const;

export type DefectChartKey = (typeof DEFECT_CHART_TYPES)[number]['key'];

/** Keys rendered in stacked defect breakdown charts (excludes aggregate “Other”). */
export const DEFECT_BREAKDOWN_STACK_TYPES = DEFECT_CHART_TYPES.filter(d => d.key !== 'other');
