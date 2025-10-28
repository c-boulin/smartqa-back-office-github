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
 * Calculate start date from test run creation time period
 */
function calculateTestRunCreationDate(period: string): string {
  const now = new Date();
  const startDate = new Date();

  switch (period) {
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

/**
 * Build query parameters for test cases report API call
 */
function buildReportQueryParams(
  projectId: string,
  filters?: ReportFilters | null
): string {
  const params = new URLSearchParams();

  // Base parameters
  params.set('project', projectId);
  params.set('include', 'testRuns,user');

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

  // Test run creation date filter
  if (filters.testRunCreationDate && filters.testRunCreationDate !== '') {
    const testRunStartDate = calculateTestRunCreationDate(filters.testRunCreationDate);
    if (testRunStartDate) {
      params.set('test_run_created_at', `>=${testRunStartDate}`);
    }
  }

  return params.toString();
}

/**
 * Fetch test cases with related test runs for report generation
 */
export async function fetchTestCasesForReport(
  projectId: string,
  filters?: ReportFilters | null
): Promise<{
  testCases: JsonApiResource[];
  testRuns: JsonApiResource[];
  testExecutions: JsonApiResource[];
  included: JsonApiResource[];
  totalTestCases: number;
}> {
  try {
    const queryString = buildReportQueryParams(projectId, filters);
    const url = `/test_cases?${queryString}`;

    console.log('📊 ========================================');
    console.log('📊 REPORTS DATA SERVICE - fetchTestCasesForReport');
    console.log('📊 Full URL:', url);
    console.log('📊 Query params:', queryString);
    console.log('📊 Filters received:', JSON.stringify(filters, null, 2));
    console.log('📊 ========================================');

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

    console.log(`📊 Fetched ${testCases.length} test cases, ${testRuns.length} test runs, and ${testExecutions.length} test executions`);

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
 * Export query builder for testing or external use
 */
export { buildReportQueryParams, calculateDateFromPeriod, calculateTestRunCreationDate };
