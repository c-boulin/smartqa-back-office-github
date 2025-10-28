
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

// Mapping constants to match API expectations
const REPORT_TEMPLATE_MAP: Record<string, number> = {
  'Test Run Summary': 1,
  'Test Run Detailed Report': 2,
};

const TEST_RUN_CREATION_DATE_MAP: Record<string, number> = {
  'Last 24 hours': 1,
  'Last 48 hours': 1, // Map to last_24_hours
  'Last 7 days': 2,
  'Last 30 days': 3,
};

const FREQUENCY_MAP: Record<string, number> = {
  'daily': 1,
  'weekly': 2,
};

const DAY_OF_WEEK_MAP: Record<string, number> = {
  'monday': 1,
  'tuesday': 2,
  'wednesday': 3,
  'thursday': 4,
  'friday': 5,
  'saturday': 6,
  'sunday': 7,
};

const REPORT_FORMAT_MAP: Record<string, number> = {
  'pdf': 1,
  'csv': 2,
};

interface FormData {
  project: string;
  reportType: string;
  title: string;
  description?: string;
  testRunSelection: 'creation_time' | 'specific_test_run';
  includeTestRuns: string;
  specificTestRunIds?: string[];
  scheduleReports: boolean;
  frequency: 'daily' | 'weekly';
  dayOfWeek?: string;
  time: string;
  timezone: string;
  format?: 'pdf' | 'csv';
  recipients: string[];
  filters: {
    statusOfTestCase: string[];
    testCaseType: string[];
    testCasePriority: string[];
    testCaseAssignee: string[];
    testCaseTags: string[];
    automationStatus: string[];
    createdDateRange: string;
    lastUpdatedDateRange: string;
  };
}

interface User {
  id: number;
  name: string;
  email: string;
}

export const buildScheduledReportPayload = (formData: FormData, users: User[], currentUserId: number) => {
  // Build test case filters
  const testCaseFilters: Record<string, string[]> = {};

  if (formData.filters.statusOfTestCase.length > 0) {
    testCaseFilters.execution_result = formData.filters.statusOfTestCase.map(id => parseInt(id));
  }

  if (formData.filters.testCaseType.length > 0) {
    testCaseFilters.type = formData.filters.testCaseType.map(id => parseInt(id));
  }

  if (formData.filters.testCasePriority.length > 0) {
    testCaseFilters.priority = formData.filters.testCasePriority.map(id => parseInt(id));
  }

  if (formData.filters.testCaseAssignee.length > 0) {
    testCaseFilters.user = formData.filters.testCaseAssignee.map(id => parseInt(id));
  }

  if (formData.filters.testCaseTags.length > 0) {
    testCaseFilters.tags = formData.filters.testCaseTags.map(id => parseInt(id));
  }

  if (formData.filters.automationStatus.length > 0) {
    testCaseFilters.automation = formData.filters.automationStatus.map(id => parseInt(id));
  }

  // Convert recipient IDs to emails
  const recipientEmails = formData.recipients
    .map(recipientId => {
      const user = users.find(u => u.id.toString() === recipientId);
      return user?.email;
    })
    .filter(email => email !== undefined) as string[];

  // Build the payload
  const payload: Record<string, unknown> = {
    data: {
      type: 'ScheduledReport',
      attributes: {
        title: formData.title,
        description: formData.description || '',
        reportTemplate: REPORT_TEMPLATE_MAP[formData.reportType] || 1,
        scheduleFrequency: FREQUENCY_MAP[formData.frequency] || 1,
        scheduleTime: convertTimeToUTC(formData.time, formData.timezone),
        reportFormat: REPORT_FORMAT_MAP[formData.format || 'pdf'] || 1,
        recipients: recipientEmails,
        isActive: true,
      },
      relationships: {
        project: {
          data: {
            type: 'Project',
            id: `/api/projects/${formData.project}`,
          },
        },
        creator: {
          data: {
            type: 'User',
            id: `/api/users/${currentUserId}`,
          },
        },
      },
    },
  };

  // Add day to send if weekly
  if (formData.frequency === 'weekly' && formData.dayOfWeek) {
    payload.data.attributes.dayToSend = DAY_OF_WEEK_MAP[formData.dayOfWeek] || 1;
    console.log('📅 Adding dayToSend:', {
      frequency: formData.frequency,
      dayOfWeek: formData.dayOfWeek,
      dayToSend: payload.data.attributes.dayToSend
    });
  } else {
    console.log('⚠️ Not adding dayToSend:', {
      frequency: formData.frequency,
      dayOfWeek: formData.dayOfWeek,
      condition: formData.frequency === 'weekly' && formData.dayOfWeek
    });
  }

  // Add test run selection
  if (formData.testRunSelection === 'creation_time') {
    payload.data.attributes.test_run_creation_date = TEST_RUN_CREATION_DATE_MAP[formData.includeTestRuns] || 1;
  } else if (formData.testRunSelection === 'specific_test_run' && formData.specificTestRunIds) {
    payload.data.attributes.specificTestRunIds = formData.specificTestRunIds;
  }

  // Always add test case filters, even if empty
  payload.data.attributes.testCaseFilters = testCaseFilters;

  // Build date filters separately
  const dateFilters: Record<string, { start_date: string; end_date: string }> = {};

  const createdDateRange = calculateDateRange(formData.filters.createdDateRange);
  if (createdDateRange) {
    dateFilters.created_at = createdDateRange;
  }

  const updatedDateRange = calculateDateRange(formData.filters.lastUpdatedDateRange);
  if (updatedDateRange) {
    dateFilters.updated_at = updatedDateRange;
  }

  // Always add date filters, even if empty
  payload.data.attributes.dateFilters = dateFilters;

  return payload;
};
