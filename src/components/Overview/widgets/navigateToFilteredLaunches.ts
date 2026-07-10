import type { NavigateFunction } from 'react-router-dom';

export interface LaunchesDeepLinkFilters {
  projectIds?: number[];
  startFrom?: string;
  startTo?: string;
  sort?: string;
  direction?: 'asc' | 'desc';
  status?: 'passed' | 'failed';
  defectTag?: 'product_bug' | 'auto_bug' | 'system_issue' | 'to_investigate';
  hasIssues?: boolean;
}

/**
 * Navigates from the Overview Widgets tab to the Launches tab with filters applied.
 * Always forces executed_by=cron because widgets only ever aggregate cron-triggered
 * launches (backend excludes source=app) — the linked launches list must match exactly
 * what contributed to the number the user clicked on.
 */
export function navigateToFilteredLaunches(
  navigate: NavigateFunction,
  filters: LaunchesDeepLinkFilters,
): void {
  const params = new URLSearchParams();
  params.set('tab', 'launches');
  params.set('executed_by', 'cron');
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
  navigate({ pathname: '/overview/launches', search: `?${params.toString()}` });
}

/**
 * Returns the date-only portion (YYYY-MM-DD) of an ISO datetime string.
 */
export function toDateOnly(isoDatetime: string): string {
  return isoDatetime.slice(0, 10);
}
