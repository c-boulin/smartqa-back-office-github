import { apiService } from './api';

/**
 * Service for fetching report data using test cases API
 */

interface JsonApiResource {
  id: string;
  type: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<string, unknown>;
}

export interface ReportFilters {
  statusOfTestCase: string[];
  testCaseType: string[];
  testCasePriority: string[];
  testCaseAssignee: string[];
  testCaseTags: string[];
  automationStatus: string[];
  createdDateRange: string;
  lastUpdatedDateRange: string;
  testRunCreationDate?: string;
}

/**
 * Calculate start date from a time period selection
 */
function calculateDateFromPeriod(period: string): string {
  const now = new Date();
  const startDate = new Date();

  switch (period) {
    case 'last_24_hours':
      startDate.setHours(now.getHours() - 24);
      break;
    case 'last_7_days':
      startDate.setDate(now.getDate() - 7);
      break;
    case 'last_30_days':
      startDate.setDate(now.getDate() - 30);
      break;
    case 'last_90_days':
      startDate.setDate(now.getDate() - 90);
      break;
    default:
      return '';
  }

  // Format as ISO string for API (YYYY-MM-DD)
  return startDate.toISOString().split('T')[0];
}

/**
 * Normalize creation date filter from scheduled report format (last_24_hours, last_week, last_month)
 * to the display/API format expected by calculateTestRunCreationDate.
 */
function normalizeCreationDateFilter(period: string | undefined): string {
  if (!period) return '';
  const m: Record<string, string> = {
    last_24_hours: 'Last 24 hours',
    last_week: 'Last 7 days',
    last_month: 'Last 30 days',
  };
  return m[period] || period;
}

/**
 * Calculate start date from test run creation time period.
 * Accepts both UI format ('Last 24 hours', 'Last 7 days') and scheduled report format ('last_24_hours', 'last_week', 'last_month').
 */
function calculateTestRunCreationDate(period: string): string {
  const normalized = normalizeCreationDateFilter(period) || period;
  const now = new Date();
  const startDate = new Date();

  switch (normalized) {
    case 'Last 24 hours':
      startDate.setHours(now.getHours() - 24);
      break;
    case 'Last 48 hours':
      startDate.setHours(now.getHours() - 48);
      break;
    case 'Last 7 days':
      startDate.setDate(now.getDate() - 7);
      break;
    case 'Last 30 days':
      startDate.setDate(now.getDate() - 30);
      break;
    default:
      return '';
  }

  // Format as ISO string for API (YYYY-MM-DD)
  return startDate.toISOString().split('T')[0];
}

export interface ReportFetchOptions {
  /** Test run creation date filter (e.g. 'Last 30 days' or scheduled report format 'last_month') */
  creationDateFilter?: string;
  /** When set, restrict results to test cases from these test run IDs (if API supports test_run_ids) */
  testRunIds?: string[];
}

/**
 * Build query parameters for test cases report API call.
 * Uses scheduled report options (creationDateFilter, testRunIds) so "View" shows the same scope as the report.
 */
function buildReportQueryParams(
  projectId: string,
  filters?: ReportFilters | null,
  options?: ReportFetchOptions
): string {
  const params = new URLSearchParams();

  // Base parameters
  params.set('project', projectId);
  params.set('include', 'testRuns,user,configurations');

  // Apply test run scope from scheduled report so the request matches the report config
  const creationDateFilter = options?.creationDateFilter ?? filters?.testRunCreationDate;
  if (creationDateFilter && creationDateFilter !== '') {
    const testRunStartDate = calculateTestRunCreationDate(creationDateFilter);
    if (testRunStartDate) {
      params.set('test_run_created_at', `>=${testRunStartDate}`);
    }
  }
  if (options?.testRunIds && options.testRunIds.length > 0) {
    params.set('test_run_ids', options.testRunIds.join(','));
  }

  if (!filters) {
    return params.toString();
  }

  // Execution result filter (statusOfTestCase)
  // IMPORTANT: The API's execution_result filter returns test cases where the
  // ABSOLUTE latest execution (across ALL test runs) matches the filter.
  // Consumers of this data MUST filter execution results PER test run on the client side
  // for accurate per-test-run reporting.
  if (filters.statusOfTestCase && filters.statusOfTestCase.length > 0) {
    params.set('execution_result', filters.statusOfTestCase.join(','));
  }

  // Test case type filter (MultiValueFilter)
  if (filters.testCaseType && filters.testCaseType.length > 0) {
    params.set('type', filters.testCaseType.join(','));
  }

  // Test case priority filter (MultiValueFilter)
  if (filters.testCasePriority && filters.testCasePriority.length > 0) {
    params.set('priority', filters.testCasePriority.join(','));
  }

  // Test case assignee filter (user filter - MultiValueFilter)
  if (filters.testCaseAssignee && filters.testCaseAssignee.length > 0) {
    params.set('user', filters.testCaseAssignee.join(','));
  }

  // Tags filter (TagFilter)
  if (filters.testCaseTags && filters.testCaseTags.length > 0) {
    params.set('tags', filters.testCaseTags.join(','));
  }

  // Automation status filter (MultiValueFilter)
  if (filters.automationStatus && filters.automationStatus.length > 0) {
    params.set('automation', filters.automationStatus.join(','));
  }

  // Created date range filter (DateRangeFilter)
  if (filters.createdDateRange && filters.createdDateRange !== '') {
    const createdStartDate = calculateDateFromPeriod(filters.createdDateRange);
    if (createdStartDate) {
      params.set('created_at', `>=${createdStartDate}`);
    }
  }

  // Updated date range filter (DateRangeFilter)
  if (filters.lastUpdatedDateRange && filters.lastUpdatedDateRange !== '') {
    const updatedStartDate = calculateDateFromPeriod(filters.lastUpdatedDateRange);
    if (updatedStartDate) {
      params.set('updated_at', `>=${updatedStartDate}`);
    }
  }

  return params.toString();
}

/**
 * Fetch test cases with related test runs for report generation.
 * When viewing a scheduled report, pass options.creationDateFilter and options.testRunIds
 * so the API request matches the report's stored config (avoids showing wrong/extra data).
 */
export async function fetchTestCasesForReport(
  projectId: string,
  filters?: ReportFilters | null,
  options?: ReportFetchOptions
): Promise<{
  testCases: JsonApiResource[];
  testRuns: JsonApiResource[];
  testExecutions: JsonApiResource[];
  included: JsonApiResource[];
  totalTestCases: number;
}> {
  try {
    const queryString = buildReportQueryParams(projectId, filters, options);
    const url = `/test_cases?${queryString}`;


    const response = await apiService.authenticatedRequest(url);

    if (!response || !response.data) {
      console.warn('No data received from test cases API');
      return {
        testCases: [],
        testRuns: [],
        testExecutions: [],
        included: [],
        totalTestCases: 0
      };
    }

    // Extract test cases from response
    const testCases = response.data || [];

    // Extract test runs from included node
    const testRuns: JsonApiResource[] = [];
    if (response.included && Array.isArray(response.included)) {
      response.included.forEach((item: JsonApiResource) => {
        if (item.type === 'TestRun') {
          testRuns.push(item);
        }
      });
    }

    // Extract test executions from test case attributes
    // The API returns executions embedded in test case attributes, not in included node
    const testExecutions: JsonApiResource[] = [];
    testCases.forEach((testCase: JsonApiResource) => {
      if (testCase.attributes?.executions && Array.isArray(testCase.attributes.executions)) {
        (testCase.attributes.executions as Array<Record<string, unknown>>).forEach((execution: Record<string, unknown>) => {
          testExecutions.push({
            type: 'TestExecution',
            id: execution.id?.toString() || `${execution.test_case_id}-${execution.test_run_id}`,
            attributes: execution
          });
        });
      }
    });

    return {
      testCases,
      testRuns,
      testExecutions,
      included: response.included || [],
      totalTestCases: response.meta?.totalItems || testCases.length
    };

  } catch (error) {
    console.error('Failed to fetch test cases for report:', error);
    throw error;
  }
}

/**
 * Optimised endpoint: fetches fully-computed report data from the API.
 * The backend does all aggregation, so the front-end can use the response directly.
 *
 * template 1 → summary, template 2 → detailed (adds testCasesIncluded + performanceData)
 */
export async function fetchReportData(
  projectId: string,
  template: 1 | 2,
  filters?: ReportFilters | null,
  options?: ReportFetchOptions
): Promise<Record<string, unknown>> {
  const params = new URLSearchParams();
  params.set('template', String(template));

  const creationDateFilter = options?.creationDateFilter ?? filters?.testRunCreationDate;
  if (creationDateFilter) {
    const normalized = normalizeCreationDateFilter(creationDateFilter) || creationDateFilter;
    params.set('creation_date_filter', normalized);
  }

  if (options?.testRunIds && options.testRunIds.length > 0) {
    params.set('test_run_ids', options.testRunIds.join(','));
  }

  if (filters) {
    if (filters.statusOfTestCase?.length) {
      params.set('execution_result', filters.statusOfTestCase.join(','));
    }
    if (filters.testCaseType?.length) {
      params.set('type', filters.testCaseType.join(','));
    }
    if (filters.testCasePriority?.length) {
      params.set('priority', filters.testCasePriority.join(','));
    }
    if (filters.testCaseAssignee?.length) {
      params.set('user', filters.testCaseAssignee.join(','));
    }
    if (filters.testCaseTags?.length) {
      params.set('tags', filters.testCaseTags.join(','));
    }
    if (filters.automationStatus?.length) {
      params.set('automation', filters.automationStatus.join(','));
    }
    if (filters.createdDateRange) {
      const d = calculateDateFromPeriod(filters.createdDateRange);
      if (d) params.set('created_at', `>=${d}`);
    }
    if (filters.lastUpdatedDateRange) {
      const d = calculateDateFromPeriod(filters.lastUpdatedDateRange);
      if (d) params.set('updated_at', `>=${d}`);
    }
  }

  const url = `/projects/${projectId}/report-data?${params.toString()}`;
  const response = await apiService.authenticatedRequest(url, {
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
  });
  return response;
}

/**
 * Export query builder for testing or external use
 */
export { buildReportQueryParams, calculateDateFromPeriod, calculateTestRunCreationDate, normalizeCreationDateFilter };
