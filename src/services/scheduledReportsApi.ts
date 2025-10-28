import { apiService } from './api';

// Helper function to convert local time to UTC
const convertTimeToUTC = (timeString: string, timezone: string = 'UTC'): string => {
  if (!timeString) return '00:00';

  // If timezone is already UTC, return as is
  if (timezone === 'UTC') return timeString;

  // Parse the time string (format: HH:MM)
  const [hours, minutes] = timeString.split(':').map(Number);

  // Create a date object with current date and the specified time
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  // Get UTC hours and minutes
  const utcHours = date.getUTCHours();
  const utcMinutes = date.getUTCMinutes();

  // Format back to HH:MM
  return `${String(utcHours).padStart(2, '0')}:${String(utcMinutes).padStart(2, '0')}`;
};

// Helper function to calculate date range
const calculateDateRange = (range: string): { from: string; to: string } | null => {
  if (!range) return null;

  const today = new Date();
  const to = today.toISOString().split('T')[0]; // Format: YYYY-MM-DD

  let from: Date;
  switch (range) {
    case 'last_24_hours':
      from = new Date(today);
      from.setDate(today.getDate() - 1);
      break;
    case 'last_7_days':
      from = new Date(today);
      from.setDate(today.getDate() - 7);
      break;
    case 'last_30_days':
      from = new Date(today);
      from.setDate(today.getDate() - 30);
      break;
    case 'last_90_days':
      from = new Date(today);
      from.setDate(today.getDate() - 90);
      break;
    default:
      return null;
  }

  return {
    from: from.toISOString().split('T')[0],
    to
  };
};

// Convert date filter object back to string range
const convertDateFilterToRangeString = (dateFilter?: { from: string; to: string }): string => {
  if (!dateFilter || !dateFilter.from || !dateFilter.to) return '';

  const fromDate = new Date(dateFilter.from);
  const toDate = new Date(dateFilter.to);
  const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Match to closest predefined range
  if (diffDays <= 1) return 'last_24_hours';
  if (diffDays <= 7) return 'last_7_days';
  if (diffDays <= 30) return 'last_30_days';
  if (diffDays <= 90) return 'last_90_days';

  // Return custom format if doesn't match predefined ranges
  return `${dateFilter.from} to ${dateFilter.to}`;
};

export interface ApiScheduledReport {
  id?: number | string;
  type?: string;
  attributes?: {
    id?: number;
    title?: string;
    description?: string;
    reportTemplate?: number;
    report_template?: number;
    testRunCreationDate?: number;
    test_run_creation_date?: number;
    scheduleFrequency?: number;
    frequency?: number;
    reportFormat?: number;
    report_format?: number;
    dayToSend?: number;
    day_to_send?: number;
    scheduleTime?: string;
    recipients?: string[];
    isActive?: boolean;
    createdAt?: string;
    created_at?: string;
    updatedAt?: string;
    updated_at?: string;
    specificTestRunIds?: string[];
    testCaseFilters?: {
      execution_result?: number[];
      type?: number[];
      priority?: number[];
      user?: number[];
      tags?: number[];
      automation?: number[];
      created_date_range?: string;
      last_updated_date_range?: string;
    };
    dateFilters?: {
      created_at?: {
        from: string;
        to: string;
      };
      updated_at?: {
        from: string;
        to: string;
      };
    };
  };
  relationships?: {
    project?: {
      data?: {
        type?: string;
        id?: string;
      };
    };
    creator?: {
      data?: {
        type?: string;
        id?: string;
      };
    };
  };
}

export interface ScheduledReport {
  id: string;
  title: string;
  description?: string;
  reportTemplate: 'test_run_summary' | 'test_run_detailed';
  testRunCreationDate?: 'last_24_hours' | 'last_week' | 'last_month' | 'custom';
  testRunSelection?: 'creation_time' | 'specific_test_run';
  specificTestRunIds?: string[];
  frequency: 'daily' | 'weekly';
  scheduleTime: string;
  timezone?: string;
  reportFormat: 'pdf' | 'csv';
  dayToSend?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  recipients: string[];
  projectId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isActive?: boolean;
  testCaseFilters?: {
    statusOfTestCase?: string[];
    testCaseType?: string[];
    testCasePriority?: string[];
    testCaseAssignee?: string[];
    testCaseTags?: string[];
    automationStatus?: string[];
    createdDateRange?: string;
    lastUpdatedDateRange?: string;
  };
}

// Mapping constants
const REPORT_TEMPLATES: Record<number, 'test_run_summary' | 'test_run_detailed'> = {
  1: 'test_run_summary',
  2: 'test_run_detailed',
};

const TEST_RUN_CREATION_DATES: Record<number, 'last_24_hours' | 'last_week' | 'last_month' | 'custom'> = {
  1: 'last_24_hours',
  2: 'last_week',
  3: 'last_month',
  4: 'custom',
};

const FREQUENCIES: Record<number, 'daily' | 'weekly'> = {
  1: 'daily',
  2: 'weekly',
};

const REPORT_FORMATS: Record<number, 'pdf' | 'csv'> = {
  1: 'pdf',
  2: 'csv',
};

const DAYS_TO_SEND: Record<number, 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'> = {
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
  7: 'sunday',
};

// Reverse mappings for sending data to API
const REPORT_TEMPLATES_REVERSE: Record<string, number> = {
  'test_run_summary': 1,
  'test_run_detailed': 2,
};

const FREQUENCIES_REVERSE: Record<string, number> = {
  'daily': 1,
  'weekly': 2,
};

const REPORT_FORMATS_REVERSE: Record<string, number> = {
  'pdf': 1,
  'csv': 2,
};

const DAYS_TO_SEND_REVERSE: Record<string, number> = {
  'monday': 1,
  'tuesday': 2,
  'wednesday': 3,
  'thursday': 4,
  'friday': 5,
  'saturday': 6,
  'sunday': 7,
};

class ScheduledReportsApiService {
  transformApiScheduledReport(apiReport: ApiScheduledReport, included?: Array<{ id: string; type: string; attributes?: Record<string, unknown> }>): ScheduledReport {
    const attrs = apiReport.attributes || apiReport;
    const id = attrs.id?.toString() || apiReport.id?.toString() || '0';

    // Extract creator info
    let creatorName = 'Unknown';
    if (apiReport.relationships?.creator?.data?.id && included) {
      const creatorId = apiReport.relationships.creator.data.id.split('/').pop();
      const creator = included.find(item => {
        const itemId = item.id?.toString().split('/').pop() || item.attributes?.id?.toString();
        return item.type === 'User' && itemId === creatorId;
      });
      if (creator) {
        creatorName = creator.attributes.name || creator.attributes.email || 'Unknown';
      }
    }

    // Extract project ID
    const projectId = apiReport.relationships?.project?.data?.id?.split('/').pop() || '0';

    // Determine test run selection mode
    const hasSpecificTestRuns = attrs.specificTestRunIds && attrs.specificTestRunIds.length > 0;
    const testRunSelection = hasSpecificTestRuns ? 'specific_test_run' : 'creation_time';

    // Parse test case filters from API
    const testCaseFilters = (attrs.testCaseFilters || attrs.dateFilters) ? {
      statusOfTestCase: attrs.testCaseFilters?.execution_result?.map((id: number) => id.toString()) || [],
      testCaseType: attrs.testCaseFilters?.type?.map((id: number) => id.toString()) || [],
      testCasePriority: attrs.testCaseFilters?.priority?.map((id: number) => id.toString()) || [],
      testCaseAssignee: attrs.testCaseFilters?.user?.map((id: number) => id.toString()) || [],
      testCaseTags: attrs.testCaseFilters?.tags?.map((id: number) => id.toString()) || [],
      automationStatus: attrs.testCaseFilters?.automation?.map((id: number) => id.toString()) || [],
      createdDateRange: convertDateFilterToRangeString(attrs.dateFilters?.created_at),
      lastUpdatedDateRange: convertDateFilterToRangeString(attrs.dateFilters?.updated_at),
    } : undefined;

    return {
      id,
      title: attrs.title || '',
      description: attrs.description,
      reportTemplate: REPORT_TEMPLATES[attrs.reportTemplate || attrs.report_template || 1] || 'test_run_summary',
      testRunCreationDate: (attrs.testRunCreationDate || attrs.test_run_creation_date) ? TEST_RUN_CREATION_DATES[attrs.testRunCreationDate || attrs.test_run_creation_date || 1] : undefined,
      testRunSelection,
      specificTestRunIds: attrs.specificTestRunIds || [],
      frequency: FREQUENCIES[attrs.scheduleFrequency || attrs.frequency || 1] || 'daily',
      scheduleTime: (attrs.scheduleTime || attrs.schedule_time || '00:00').substring(0, 5),
      timezone: attrs.timezone || 'UTC',
      reportFormat: REPORT_FORMATS[attrs.reportFormat || attrs.report_format || 1] || 'pdf',
      dayToSend: (attrs.dayToSend || attrs.day_to_send) ? DAYS_TO_SEND[attrs.dayToSend || attrs.day_to_send || 1] : undefined,
      recipients: attrs.recipients || [],
      projectId,
      createdBy: creatorName,
      createdAt: attrs.createdAt ? new Date(attrs.createdAt) : (attrs.created_at ? new Date(attrs.created_at) : new Date()),
      updatedAt: attrs.updatedAt ? new Date(attrs.updatedAt) : (attrs.updated_at ? new Date(attrs.updated_at) : new Date()),
      isActive: attrs.isActive !== undefined ? Boolean(attrs.isActive) : true,
      testCaseFilters,
    };
  }

  async getScheduledReports(projectId?: string): Promise<ScheduledReport[]> {
    try {
      const endpoint = projectId
        ? `/scheduled_reports?filter[project_id]=${projectId}&include=creator`
        : '/scheduled_reports?include=creator';

      const response = await apiService.authenticatedRequest(endpoint);

      if (!response || !response.data) {
        console.warn('No scheduled reports data received');
        return [];
      }

      const reports = Array.isArray(response.data) ? response.data : [response.data];
      const included = response.included || [];

      console.log('Scheduled reports response:', { reports, included });

      return reports.map(report => this.transformApiScheduledReport(report, included));
    } catch (error) {
      console.error('Failed to fetch scheduled reports:', error);
      throw error;
    }
  }

  async createScheduledReport(payload: Record<string, unknown>): Promise<ScheduledReport> {
    try {
      const response = await apiService.authenticatedRequest('/scheduled_reports?include=creator', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      return this.transformApiScheduledReport(response.data, response.included);
    } catch (error) {
      console.error('Failed to create scheduled report:', error);
      throw error;
    }
  }

  async updateScheduledReport(id: string, data: Partial<ScheduledReport>): Promise<ScheduledReport> {
    try {
      const attributes: Record<string, unknown> = {};

      if (data.title !== undefined) attributes.title = data.title;
      if (data.description !== undefined) attributes.description = data.description;
      if (data.reportTemplate !== undefined) {
        attributes.reportTemplate = REPORT_TEMPLATES_REVERSE[data.reportTemplate];
      }
      if (data.isActive !== undefined) attributes.isActive = data.isActive ? 1 : 0;

      // Handle test run selection
      if (data.testRunSelection === 'creation_time') {
        if (data.testRunCreationDate !== undefined) {
          const TEST_RUN_CREATION_DATES_REVERSE: Record<string, number> = {
            'last_24_hours': 1,
            'last_week': 2,
            'last_month': 3,
            'custom': 4,
          };
          attributes.testRunCreationDate = TEST_RUN_CREATION_DATES_REVERSE[data.testRunCreationDate];
        }
        // Clear specific test runs when using creation time
        attributes.specificTestRunIds = [];
      } else if (data.testRunSelection === 'specific_test_run') {
        if (data.specificTestRunIds !== undefined) {
          attributes.specificTestRunIds = data.specificTestRunIds;
        }
        // Don't include testRunCreationDate when using specific test runs
      }

      if (data.frequency !== undefined) {
        attributes.scheduleFrequency = FREQUENCIES_REVERSE[data.frequency];
      }
      if (data.scheduleTime !== undefined) {
        attributes.scheduleTime = convertTimeToUTC(data.scheduleTime, data.timezone);
      }
      if (data.reportFormat !== undefined) {
        attributes.reportFormat = REPORT_FORMATS_REVERSE[data.reportFormat];
      }
      // Only include dayToSend if frequency is not daily
      if (data.dayToSend !== undefined && data.frequency !== 'daily') {
        attributes.dayToSend = DAYS_TO_SEND_REVERSE[data.dayToSend];
      }
      if (data.recipients !== undefined) {
        attributes.recipients = data.recipients;
      }

      // Handle test case filters (excluding date ranges)
      if (data.testCaseFilters !== undefined) {
        const testCaseFilters: Record<string, string[] | number[]> = {};

        if (data.testCaseFilters.statusOfTestCase && data.testCaseFilters.statusOfTestCase.length > 0) {
          testCaseFilters.execution_result = data.testCaseFilters.statusOfTestCase.map(id => parseInt(id));
        }
        if (data.testCaseFilters.testCaseType && data.testCaseFilters.testCaseType.length > 0) {
          testCaseFilters.type = data.testCaseFilters.testCaseType.map(id => parseInt(id));
        }
        if (data.testCaseFilters.testCasePriority && data.testCaseFilters.testCasePriority.length > 0) {
          testCaseFilters.priority = data.testCaseFilters.testCasePriority.map(id => parseInt(id));
        }
        if (data.testCaseFilters.testCaseAssignee && data.testCaseFilters.testCaseAssignee.length > 0) {
          testCaseFilters.user = data.testCaseFilters.testCaseAssignee.map(id => parseInt(id));
        }
        if (data.testCaseFilters.testCaseTags && data.testCaseFilters.testCaseTags.length > 0) {
          testCaseFilters.tags = data.testCaseFilters.testCaseTags.map(id => parseInt(id));
        }
        if (data.testCaseFilters.automationStatus && data.testCaseFilters.automationStatus.length > 0) {
          testCaseFilters.automation = data.testCaseFilters.automationStatus.map(id => parseInt(id));
        }

        // Always include testCaseFilters, even if empty
        attributes.testCaseFilters = testCaseFilters;

        // Handle date filters separately
        const dateFilters: Record<string, { start_date: string; end_date: string }> = {};

        const createdDateRange = calculateDateRange(data.testCaseFilters.createdDateRange || '');
        if (createdDateRange) {
          dateFilters.created_at = createdDateRange;
        }

        const updatedDateRange = calculateDateRange(data.testCaseFilters.lastUpdatedDateRange || '');
        if (updatedDateRange) {
          dateFilters.updated_at = updatedDateRange;
        }

        // Always include dateFilters, even if empty
        attributes.dateFilters = dateFilters;
      }

      const requestBody = {
        data: {
          type: 'ScheduledReport',
          id: `/api/scheduled_reports/${id}`,
          attributes,
        },
      };

      console.log('Update scheduled report payload:', JSON.stringify(requestBody, null, 2));

      const response = await apiService.authenticatedRequest(`/scheduled_reports/${id}?include=creator,project`, {
        method: 'PATCH',
        body: JSON.stringify(requestBody),
      });

      return this.transformApiScheduledReport(response.data, response.included);
    } catch (error) {
      console.error('Failed to update scheduled report:', error);
      throw error;
    }
  }

  async deleteScheduledReport(id: string): Promise<void> {
    try {
      await apiService.authenticatedRequest(`/scheduled_reports/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Failed to delete scheduled report:', error);
      throw error;
    }
  }

  // Helper function to get display labels
  getReportTemplateLabel(template: string): string {
    const labels: Record<string, string> = {
      'test_run_summary': 'Test Run Summary',
      'test_run_detailed': 'Test Run Detailed Report',
    };
    return labels[template] || template;
  }

  getFrequencyLabel(frequency: string): string {
    return frequency.charAt(0).toUpperCase() + frequency.slice(1);
  }

  getDayLabel(day: string): string {
    return day.charAt(0).toUpperCase() + day.slice(1);
  }
}

export const scheduledReportsApiService = new ScheduledReportsApiService();
