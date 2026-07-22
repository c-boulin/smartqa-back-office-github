import type { NavigateFunction } from 'react-router-dom';

export interface TestsDeepLinkFilters {
  projectIds?: number[];
  startFrom?: string;
  startTo?: string;
  sort?: string;
  direction?: 'asc' | 'desc';
  status?: 'passed' | 'failed';
  /** `overview_defect_types.slug` (e.g. `no-defect`, `network`) or a legacy group alias
   *  (`product_bug`, `auto_bug`, `system_issue`, `to_investigate`). */
  defectTag?: string;
  hasIssues?: boolean;
}

/**
 * Navigates from the Overview Widgets tab to the individual Tests view with filters applied.
 * Always forces executed_by=cron because widgets only ever aggregate cron-triggered
 * executions — the linked tests list must match exactly what contributed to the number
 * the user clicked on.
 */
export function navigateToFilteredTests(
  navigate: NavigateFunction,
  filters: TestsDeepLinkFilters,
): void {
  const params = new URLSearchParams();
  params.set('tab', 'tests');
  params.set('executed_by', 'cron');
  params.set('from_widget', '1');
  if (filters.projectIds && filters.projectIds.length > 0) {
    params.set('project_ids', filters.projectIds.join(','));
  }
  if (filters.startFrom) params.set('start_from', filters.startFrom);
  if (filters.startTo) params.set('start_to', filters.startTo);
  if (filters.sort) params.set('sort', filters.sort);
  if (filters.direction) params.set('direction', filters.direction);
  if (filters.status) params.set('status', filters.status);
  if (filters.defectTag) params.set('defect_tag', filters.defectTag);
  if (filters.hasIssues) params.set('has_issues', '1');
  navigate({ pathname: '/overview/tests', search: `?${params.toString()}` });
}
