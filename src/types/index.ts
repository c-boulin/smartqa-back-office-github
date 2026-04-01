export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  testCasesCount: number;
  testsPassedCount: number;
  testsFailedCount: number;
  testRunsCount: number;
  /** Automation: country code */
  country?: string;
  /** Automation: URL */
  url?: string;
  /** Automation: full GitLab project URL (e.g. https://gitlab.dvtech.io/qaautomation/QATEsmartbuilder) */
  gitlab_project_name?: string;
  /** Automation: test suite name (e.g. TplayvodSuite.robot) */
  test_suite_name?: string;
}

export interface TestCase {
  id: string;
  projectId: string;
  projectRelativeId?: number;
  folderId?: string; // Ajout du folderId
  ownerId?: string; // Owner/user ID
  title: string;
  description: string;
  preconditions?: string; // Add preconditions field
  priority: 'low' | 'medium' | 'high' | 'critical';
  type: 'functional' | 'regression' | 'smoke' | 'integration' | 'performance';
  typeId?: number | string; // Type ID from API for filtering (can be string or number)
  status: 'draft' | 'active' | 'deprecated';
  automationStatus: 1 | 2 | 3 | 4 | 5; // Utilise les valeurs numériques de l'API
  steps: TestStep[];
  sharedSteps: string[];
  stepResults?: string[]; // Add stepResults field for API step result IDs
  sharedSteps: string[]; // Add sharedSteps field for API shared step IDs
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  estimatedDuration: number;
}

export interface TestStep {
  id: string;
  action: string;
  expectedResult: string;
  order: number;
}

export interface SharedStep {
  id: string;
  title: string;
  description: string;
  steps: TestStep[];
  tags: string[];
  createdAt: Date;
  usageCount: number;
}

export interface TestExecution {
  id: string;
  projectId: string;
  testCaseId: string;
  planId?: string;
  runId?: string;
  status: 'not_started' | 'in_progress' | 'passed' | 'failed' | 'blocked' | 'skipped';
  executedBy: string;
  executedAt?: Date;
  duration?: number;
  notes?: string;
  screenshots?: string[];
  environment: string;
  browser?: string;
  version?: string;
}

export interface TestRun {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  status: 'open' | 'closed';
  testCases: string[];
  startDate: Date;
  endDate?: Date;
  closedDate?: Date;
  createdBy: string;
  createdAt: Date;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  blockedTests: number;
  progress: number;
  passRate: number;
}

export interface ClosedTestRunsData {
  month: string;
  passed: number;
  failed: number;
  blocked: number;
  total: number;
}

export interface TestPlan {
  id: string;
  projectId: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  testCases: string[];
  startDate: Date;
  endDate?: Date;
  createdBy: string;
  createdAt: Date;
  progress: number;
  passRate: number;
}

export interface Report {
  id: string;
  name: string;
  type: 'execution' | 'project' | 'dashboard' | 'trend';
  projectId?: string;
  dateRange: {
    start: Date;
    end: Date;
  };
  data: unknown; // Changed from 'any' - forces type checking before usage
  createdAt: Date;
}

export interface DashboardMetrics {
  totalProjects: number;
  activeProjects: number;
  totalTestCases: number;
  executionRate: number;
  passRate: number;
  failRate: number;
  trendsData: TrendData[];
  recentExecutions: TestExecution[];
  closedTestRuns: TestRun[];
  closedTestRunsData: ClosedTestRunsData[];
}

export interface TrendData {
  date: string;
  passed: number;
  failed: number;
  blocked: number;
  total: number;
}

// Test Case Types mapping (matches API TYPES constant)
export const TEST_CASE_TYPES = {
  1: 'Other',
  2: 'Acceptance', 
  3: 'Accessibility',
  4: 'Compatibility',
  5: 'Destructive',
  6: 'Functional',
  7: 'Performance',
  8: 'Regression',
  9: 'Security',
  10: 'Smoke & Sanity',
  11: 'Usability'
} as const;

export type TestCaseTypeKey = keyof typeof TEST_CASE_TYPES;
export type TestCaseTypeValue = typeof TEST_CASE_TYPES[TestCaseTypeKey];

// Helper pour convertir les valeurs numériques en labels
export const AUTOMATION_STATUS_LABELS = {
  1: 'Not automated',
  2: 'Automated',
  3: 'Automation not required',
  4: 'Cannot be automated',
  5: 'Obsolete'
} as const;

// Helper pour obtenir le label d'un statut d'automation
export const getAutomationStatusLabel = (status: 1 | 2 | 3 | 4 | 5): string => {
  return AUTOMATION_STATUS_LABELS[status];
};

// Test execution results mapping
export const TEST_RESULTS = {
  1: 'Passed',
  2: 'Failed', 
  3: 'Blocked',
  4: 'Retest',
  5: 'Skipped',
  6: 'Untested',
  7: 'In Progress',
  8: 'System Issue'
} as const;

export type TestResultId = keyof typeof TEST_RESULTS;

/** True when the execution is no longer Untested (6) or In Progress (7). Used to decide if a test run can be marked Done. */
export function isTerminalTestExecutionResult(status: number): boolean {
  return status !== 6 && status !== 7;
}

/** Normalize API values (JSON:API may send result as string). Without this, `result === 4` fails and UI falls back to grey. */
export function coerceTestResultId(result: unknown): TestResultId {
  const n = typeof result === 'number' ? result : Number(result);
  if (!Number.isFinite(n)) {
    return 6;
  }
  const i = Math.trunc(n);
  if (i >= 1 && i <= 8) {
    return i as TestResultId;
  }
  return 6;
}
export type TestResultValue = typeof TEST_RESULTS[TestResultId];