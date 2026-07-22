/**
 * Stacked defect keys and colors aligned with Robot Framework tag mapping (API + DefectsChart).
 * Colors match overview "Defect Breakdown by Service" legend (Product Bug ... Login).
 * The slug field is the exact API tag value used in defectMix[].tag responses.
 */
export const DEFECT_CHART_TYPES = [
  { key: 'productBug', slug: 'product-bug', label: 'Product Bug', color: '#EF4444' },
  { key: 'productMaintenance', slug: 'product-maintenance', label: 'Product Maintenance', color: '#92400E' },
  { key: 'internalComponentsBug', slug: 'internal-component', label: 'Internal Components Bug', color: '#7C3AED' },
  { key: 'automationBug', slug: 'automation-bug', label: 'Automation Bug', color: '#CA8A04' },
  { key: 'updateForNewFeature', slug: 'update-for-new-feature', label: 'Update for new feature', color: '#F9A8D4' },
  { key: 'missingSpecifications', slug: 'missing-specification', label: 'Missing specifications', color: '#DB2777' },
  { key: 'systemIssue', slug: 'system-issue', label: 'System Issue', color: '#1D4ED8' },
  { key: 'network', slug: 'network', label: 'Network', color: '#7DD3FC' },
  { key: 'gitlabIssue', slug: 'gitlab-issue', label: 'GitLab Issue', color: '#06B6D4' },
  { key: 'noDefect', slug: 'no-defect', label: 'No Defect', color: '#4B5563' },
  { key: 'toInvestigate', slug: 'to-investigate', label: 'To Investigate', color: '#FBBF24' },
  { key: 'login', slug: 'login', label: 'Login', color: '#EA580C' },
  { key: 'other', slug: 'other', label: 'Other', color: '#94A3B8' },
] as const;

export type DefectChartKey = (typeof DEFECT_CHART_TYPES)[number]['key'];

/** Keys rendered in stacked defect breakdown charts (excludes aggregate "Other"). */
export const DEFECT_BREAKDOWN_STACK_TYPES = DEFECT_CHART_TYPES.filter(d => d.key !== 'other');
