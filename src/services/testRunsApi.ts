import { apiService } from './api';

import { Configuration } from './configurationsApi';
import { Tag } from './tagsApi';
// import { tagsApiService } from './tagsApi';
import { TEST_RESULTS, TestResultId, TestCase } from '../types';

export interface ApiTestRun {
  id: string;
  type: string;
  attributes: {
    id: number;
    name: string;
    description?: string;
    status: 'open' | 'closed';
    state: number;
    startDate: string;
    endDate?: string;
    closedDate?: string;
    createdAt: string;
    updatedAt: string;
    test_plan_id?: string;
    caseResults?: Array<{
      test_case_id: string;
      result: number | string;
    }>;
    executions?: Array<{
      id: number;
      test_case_id: number;
      test_run_id: number;
      configuration_id?: number;
      result: number;
      created_at: string;
      updated_at: string;
    }>;
  };
  relationships: {
    project: {
      data: { type: string; id: string };
    };
    user: {
      data: { type: string; id: string };
    };
    testCases?: {
      data: Array<{ type: string; id: string }>;
    };
    testExecutions?: {
      data: Array<{ type: string; id: string }>;
    };
    configurations?: {
      data: Array<{ type: string; id: string }>;
    };
    testPlan?: {
      data: { type: string; id: string } | Array<{ type: string; id: string }>;
    };
  };
}

export interface ApiCreator {
  id: string;
  type: string;
  attributes: {
    id: number;
    name: string;
    login: string;
    email: string;
  };
}

export interface TestRunsApiResponse {
  links: {
    self: string;
    first: string;
    last: string;
    next?: string;
    prev?: string;
  };
  meta: {
    totalItems: number;
    itemsPerPage: number;
    currentPage: number;
  };
  data: ApiTestRun[];
  included?: ApiCreator[];
}

export interface CreateTestRunRequest {
  data: {
    type: "TestRun";
    attributes: {
      name: string;
      description: string;
      state: number;
      test_plan_id?: string;
      test_plan_id?: string;
    };
    relationships: {
      project: {
        data: { type: string; id: string };
      };
      user: {
        data: { type: string; id: string };
      };
      testCases?: {
        data: Array<{ type: string; id: string }>;
      };
      configurations?: {
        data: Array<{ type: string; id: string }>;
      };
      tags?: {
        data: Array<{ type: string; id: string }>;
      };
      test_plan?: {
        data: { type: string; id: string } | null;
      };
    };
  };
}

export interface CreateTestRunResponse {
  data: ApiTestRun;
  included?: ApiCreator[];
}

/** Payload from GET /test_runs/{id}/details */
export interface TestRunDetailsPayload {
  id: string;
  name: string;
  description?: string;
  status?: string;
  state: number | string;
  projectId: string;
  testCaseIds?: string[];
  configurations?: Configuration[];
  testCasesCount?: number;
  executionsCount?: number;
  passedCount?: number;
  failedCount?: number;
  blockedCount?: number;
  progress?: number;
  passRate?: number;
  startDate?: string;
  endDate?: string | null;
  closedDate?: string | null;
  testPlanId?: string | null;
  assignedTo?: { id: string; name: string; email: string };
  createdAt?: string;
  updatedAt?: string;
}

/** One row from testCases array in test run details response */
export interface TestRunDetailsTestCaseRowPayload {
  id: string;
  title: string;
  priority: string;
  type: string;
  executionStatus: number;
  executionResult?: string;
  fullTestCase: TestRunDetailsTestCasePayload | null;
  configurationId?: string | null;
  configurationLabel?: string | null;
}

/** One execution from the executions array in test run details (for sidebar history) */
export interface TestRunDetailsExecutionPayload {
  id: number;
  test_case_id: number;
  test_run_id: number;
  configuration_id: number | null;
  result: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

/** fullTestCase shape in test run details */
export interface TestRunDetailsTestCasePayload {
  id: string;
  projectId: string;
  projectRelativeId?: number;
  folderId?: string | null;
  ownerId?: string | null;
  title: string;
  description?: string;
  preconditions?: string;
  priority: string;
  type: string;
  typeId?: number;
  status?: string;
  automationStatus: number;
  stepResults?: Array<{ id: string; step?: string; result?: string; order?: number }>;
  sharedSteps?: Array<{ id: string; [key: string]: unknown }>;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  estimatedDuration?: number;
}

/** Row type for test run details table (matches TestCaseWithExecution) */
export interface TestRunDetailsTestCaseRow {
  id: string;
  title: string;
  priority: string;
  type: string;
  executionStatus: TestResultId;
  executionResult: string;
  fullTestCase: TestCase | null;
  configurationId?: string;
  configurationLabel?: string;
}

/** Shape of one test-run item from GET /projects/:id/test-runs-list */
export interface TestRunListItem {
  id: string;
  name: string;
  description: string;
  status: 'open' | 'closed';
  state: number;
  projectId: string;
  testCaseIds: string[];
  configurations: Configuration[];
  testCasesCount: number;
  executionsCount: number;
  passedCount: number;
  failedCount: number;
  blockedCount: number;
  retestCount?: number;
  skippedCount?: number;
  untestedCount?: number;
  inProgressCount?: number;
  unknownCount?: number;
  progress: number;
  passRate: number;
  startDate: string;
  endDate?: string | null;
  closedDate?: string | null;
  testPlanId?: string | null;
  assignedTo: { id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export interface TestRunsListResponse {
  data: TestRunListItem[];
  meta: {
    totalItems: number;
    itemsPerPage: number;
    currentPage: number;
  };
}

/** Shape returned by GET /projects/:id/test-runs-overview */
export interface OverviewTestRunInfo {
  id: string;
  name: string;
  state: number;
  testPlanId: string | null;
  configurations: Configuration[];
}

export interface OverviewFullTestCase {
  id: string;
  projectId: string;
  projectRelativeId: number | null;
  folderId: string | null;
  ownerId: string | null;
  title: string;
  description: string;
  preconditions: string;
  priority: string;
  type: string;
  typeId: number;
  status: string;
  automationStatus: number;
  steps: unknown[];
  stepResults: string[];
  sharedSteps: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  estimatedDuration: number;
}

export interface OverviewTestCaseWithExecution {
  id: string;
  title: string;
  priority: string;
  type: string;
  executionStatus: number;
  executionResult: string;
  testRunId: string;
  testRunName: string;
  configurationId: string | null;
  configurationLabel: string | null;
  fullTestCase: OverviewFullTestCase | null;
}

export interface TestRunsOverviewResponse {
  testRuns: OverviewTestRunInfo[];
  testCasesWithExecution: OverviewTestCaseWithExecution[];
}

export interface TestRun {
  id: string;
  name: string;
  status: 'open' | 'closed'; // Keep for API compatibility
  state: number; // Add actual state number
  projectId: string;
  testCaseIds: string[];
  configurations: Configuration[];
  testCasesCount: number;
  executionsCount: number;
  passedCount: number;
  failedCount: number;
  blockedCount: number;
  progress: number;
  passRate: number;
  startDate: Date;
  endDate?: Date;
  closedDate?: Date;
  testPlanId?: string;
  assignedTo: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

class TestRunsApiService {
  private getCurrentUserId(): string {
    const userData = localStorage.getItem('user_data');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        return user.id?.toString() || '';
      } catch (error) {
        console.warn('Failed to parse user data from localStorage:', error);
      }
    }
    return '';
  }

  public getDefaultTestRunsResponse(): TestRunsApiResponse {
    return {
      links: {
        self: '',
        first: '',
        last: ''
      },
      meta: {
        totalItems: 0,
        itemsPerPage: 30,
        currentPage: 1
      },
      data: [],
      included: []
    };
  }

  async getAllTestRuns(page: number = 1, itemsPerPage: number = 10000): Promise<TestRunsApiResponse> {
    const response = await apiService.authenticatedRequest(`/test_runs?include=user,testExecutions&page=${page}&itemsPerPage=${itemsPerPage}&order[createdAt]=desc`);
    return response || this.getDefaultTestRunsResponse();
  }

  async getTestRuns(projectId: string, page: number = 1, itemsPerPage: number = 30): Promise<TestRunsApiResponse> {
    // Fetch ALL test runs (both active and closed) - don't filter by state
    const response = await apiService.authenticatedRequest(`/test_runs?project=${projectId}&include=user,configurations,configurations.project,testCases&page=${page}&itemsPerPage=${itemsPerPage}&order[createdAt]=desc`);

    return response || this.getDefaultTestRunsResponse();
  }

  async searchTestRuns(searchTerm: string, projectId: string, page: number = 1, itemsPerPage: number = 30): Promise<TestRunsApiResponse> {
    const isNumeric = /^\d+$/.test(searchTerm.trim());
    const searchParam = isNumeric ? `id=${encodeURIComponent(searchTerm)}` : `name=${encodeURIComponent(searchTerm)}`;

    const response = await apiService.authenticatedRequest(`/test_runs?project=${projectId}&include=user,configurations,configurations.project,testCases&${searchParam}&page=${page}&itemsPerPage=${itemsPerPage}&order[createdAt]=desc`);
    return response || this.getDefaultTestRunsResponse();
  }

  async filterTestRunsByAssignee(assigneeId: string, projectId: string, page: number = 1, itemsPerPage: number = 30): Promise<TestRunsApiResponse> {
    const response = await apiService.authenticatedRequest(`/test_runs?project=${projectId}&user=${assigneeId}&include=user,configurations,configurations.project,testCases&page=${page}&itemsPerPage=${itemsPerPage}&order[createdAt]=desc`);
    return response || this.getDefaultTestRunsResponse();
  }

  async filterTestRunsByState(state: string, projectId: string, page: number = 1, itemsPerPage: number = 30): Promise<TestRunsApiResponse> {
    const response = await apiService.authenticatedRequest(`/test_runs?project=${projectId}&state=${state}&include=user,configurations,configurations.project,testCases&page=${page}&itemsPerPage=${itemsPerPage}&order[createdAt]=desc`);
    return response || this.getDefaultTestRunsResponse();
  }

  async filterTestRunsWithMultipleFilters(filters: {
    assignee?: string;
    state?: string;
  }, projectId: string, page: number = 1, itemsPerPage: number = 30): Promise<TestRunsApiResponse> {
    const params = new URLSearchParams();
    params.set('project', projectId);
    params.set('include', 'user,configurations,configurations.project,testCases');
    params.set('page', page.toString());
    params.set('itemsPerPage', itemsPerPage.toString());
    params.set('order[createdAt]', 'desc');
    
    if (filters.assignee && filters.assignee !== 'all') {
      params.set('user', filters.assignee);
    }
    
    if (filters.state && filters.state !== 'all') {
      params.set('state', filters.state);
    }
    
    const response = await apiService.authenticatedRequest(`/test_runs?${params.toString()}`);
    return response || this.getDefaultTestRunsResponse();
  }

  async getTestRun(id: string): Promise<{ data: ApiTestRun; included?: Array<Record<string, unknown>> }> {

    const response = await apiService.authenticatedRequest(`/test_runs/${id}?include=user,configurations,configurations.project,testPlans,testCases,testCases.tags`);

    return response;
  }

  /**
   * Optimized paginated list endpoint. Replaces the JSON:API collection call
   * which suffers from N+1 on the appended executions attribute.
   */
  async getTestRunsList(
    projectId: string,
    page: number = 1,
    itemsPerPage: number = 30,
    filters?: { name?: string; id?: string; user?: string; state?: string },
  ): Promise<TestRunsListResponse> {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    params.set('itemsPerPage', itemsPerPage.toString());

    if (filters?.name) params.set('name', filters.name);
    if (filters?.id) params.set('id', filters.id);
    if (filters?.user) params.set('user', filters.user);
    if (filters?.state) params.set('state', filters.state);

    const response = await apiService.authenticatedRequest<TestRunsListResponse>(
      `/projects/${projectId}/test-runs-list?${params.toString()}`
    );

    if (!response?.data || !Array.isArray(response.data)) {
      throw new Error('Invalid test runs list response');
    }

    return response;
  }

  async getTestRunsOverview(projectId: string): Promise<TestRunsOverviewResponse> {
    const response = await apiService.authenticatedRequest(
      `/projects/${projectId}/test-runs-overview`,
    );

    if (!response?.testRuns || !Array.isArray(response.testCasesWithExecution)) {
      throw new Error('Invalid test runs overview response');
    }

    return response as TestRunsOverviewResponse;
  }

  normalizeTestRunListItem(item: TestRunListItem): TestRun {
    const parseDate = (s: string | undefined): Date => {
      if (!s) return new Date();
      const d = new Date(s);
      return Number.isNaN(d.getTime()) ? new Date() : d;
    };
    const parseOptional = (s: string | null | undefined): Date | undefined => {
      if (!s) return undefined;
      const d = new Date(s);
      return Number.isNaN(d.getTime()) ? undefined : d;
    };

    return {
      id: item.id,
      name: item.name,
      description: item.description,
      status: item.status,
      state: item.state,
      projectId: item.projectId,
      testCaseIds: item.testCaseIds,
      configurations: item.configurations,
      testCasesCount: item.testCasesCount,
      executionsCount: item.executionsCount,
      passedCount: item.passedCount,
      failedCount: item.failedCount,
      blockedCount: item.blockedCount,
      retestCount: item.retestCount ?? 0,
      skippedCount: item.skippedCount ?? 0,
      untestedCount: item.untestedCount ?? 0,
      inProgressCount: item.inProgressCount ?? 0,
      unknownCount: item.unknownCount ?? 0,
      progress: item.progress,
      passRate: item.passRate,
      startDate: parseDate(item.startDate),
      endDate: parseOptional(item.endDate),
      closedDate: parseOptional(item.closedDate),
      testPlanId: item.testPlanId ?? undefined,
      assignedTo: item.assignedTo,
      createdAt: parseDate(item.createdAt),
      updatedAt: parseDate(item.updatedAt),
    };
  }

  /**
   * Optimized endpoint: returns test run + test cases + full execution history in one request (frontend-ready shape).
   */
  async getTestRunDetails(id: string): Promise<{
    testRun: TestRun;
    testCases: TestRunDetailsTestCaseRow[];
    executions: TestRunDetailsExecutionPayload[];
  }> {
    const response = await apiService.authenticatedRequest<{
      testRun: TestRunDetailsPayload;
      testCases: TestRunDetailsTestCaseRowPayload[];
      executions?: TestRunDetailsExecutionPayload[];
    }>(`/test_runs/${id}/details`);

    if (!response?.testRun || !Array.isArray(response.testCases)) {
      throw new Error('Invalid test run details response');
    }

    const testRun = this.normalizeTestRunFromDetails(response.testRun);
    const testCases = response.testCases.map(row => this.normalizeTestRunDetailsTestCaseRow(row));
    const executions = Array.isArray(response.executions) ? response.executions : [];

    return { testRun, testCases, executions };
  }

  private parseDate(s: string | undefined): Date {
    if (!s || typeof s !== 'string') return new Date();
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }

  private parseOptionalDate(s: string | null | undefined): Date | undefined {
    if (s == null || s === '') return undefined;
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }

  private normalizeTestRunFromDetails(p: TestRunDetailsPayload): TestRun {
    console.log('normalizeTestRunFromDetails - received state:', p.state, 'type:', typeof p.state);
    const parsedState = typeof p.state === 'string' ? parseInt(p.state, 10) : p.state;
    const state = (typeof parsedState === 'number' && parsedState >= 1 && parsedState <= 6) ? parsedState : 1;
    console.log('normalizeTestRunFromDetails - normalized state:', state);

    return {
      id: p.id,
      name: p.name,
      description: p.description ?? '',
      status: (p.status === 'closed' ? 'closed' : 'open') as 'open' | 'closed',
      state: state,
      projectId: p.projectId,
      testCaseIds: p.testCaseIds ?? [],
      configurations: p.configurations ?? [],
      testCasesCount: p.testCasesCount ?? 0,
      executionsCount: p.executionsCount ?? 0,
      passedCount: p.passedCount ?? 0,
      failedCount: p.failedCount ?? 0,
      blockedCount: p.blockedCount ?? 0,
      progress: p.progress ?? 0,
      passRate: p.passRate ?? 0,
      startDate: this.parseDate(p.startDate),
      endDate: this.parseOptionalDate(p.endDate ?? undefined),
      closedDate: this.parseOptionalDate(p.closedDate ?? undefined),
      testPlanId: p.testPlanId ?? undefined,
      assignedTo: p.assignedTo ?? { id: '', name: 'Unassigned', email: '' },
      createdAt: this.parseDate(p.createdAt),
      updatedAt: this.parseDate(p.updatedAt),
    };
  }

  private normalizeTestRunDetailsTestCaseRow(row: TestRunDetailsTestCaseRowPayload): TestRunDetailsTestCaseRow {
    const fullTestCase = row.fullTestCase
      ? this.normalizeTestCaseFromDetails(row.fullTestCase)
      : null;
    return {
      id: row.id,
      title: row.title,
      priority: row.priority,
      type: row.type,
      executionStatus: row.executionStatus as TestResultId,
      executionResult: row.executionResult ?? 'Untested',
      fullTestCase,
      configurationId: row.configurationId ?? undefined,
      configurationLabel: row.configurationLabel ?? undefined,
    };
  }

  private normalizeTestCaseFromDetails(tc: TestRunDetailsTestCasePayload): TestCase {
    return {
      id: tc.id,
      projectId: tc.projectId,
      projectRelativeId: tc.projectRelativeId ?? undefined,
      folderId: tc.folderId ?? undefined,
      ownerId: tc.ownerId ?? undefined,
      title: tc.title,
      description: tc.description ?? '',
      preconditions: tc.preconditions ?? '',
      priority: tc.priority as 'low' | 'medium' | 'high' | 'critical',
      type: tc.type as TestCase['type'],
      typeId: tc.typeId,
      status: (tc.status as TestCase['status']) ?? 'draft',
      automationStatus: tc.automationStatus as 1 | 2 | 3 | 4 | 5,
      steps: [],
      stepResults: (tc.stepResults ?? []).map((s: { id: string }) => s.id),
      sharedSteps: (tc.sharedSteps ?? []).map((s: { id: string }) => s.id),
      tags: tc.tags ?? [],
      createdAt: this.parseDate(tc.createdAt),
      updatedAt: this.parseDate(tc.updatedAt),
      estimatedDuration: tc.estimatedDuration ?? 5,
    };
  }

  async createTestRun(testRunData: {
    name: string;
    description: string;
    projectId: string;
    testCaseIds?: string[];
    configurations?: Configuration[];
    assignedTo?: string;
    state?: number;
    tags?: Tag[];
    testPlanId?: string;
  }): Promise<CreateTestRunResponse> {
    // Use provided state or default to "New" (1)
    const stateId = testRunData.state || 1;
    
    const requestBody: CreateTestRunRequest = {
      data: {
        type: "TestRun",
        attributes: {
          name: testRunData.name,
          description: testRunData.description,
          state: stateId
        },
        relationships: {
          project: {
            data: { type: "Project", id: `/api/projects/${testRunData.projectId}` }
          },
          user: {
            data: { type: "User", id: `/api/users/${testRunData.assignedTo}` }
          }
        }
      }
    };

    // Add test cases relationship if provided
    if (testRunData.testCaseIds && testRunData.testCaseIds.length > 0) {
      requestBody.data.relationships.test_cases = {
        data: testRunData.testCaseIds.map(id => ({ type: "TestCase", id: `/api/test_cases/${id}` }))
      };
    }

    // Add configurations relationship if provided
    if (testRunData.configurations && testRunData.configurations.length > 0) {

      requestBody.data.relationships.configurations = {
        data: testRunData.configurations.map(config => ({
          type: "Configuration",
          id: `/api/configurations/${config.id}`
        }))
      };

    }

    // Add tags relationship if provided
    if (testRunData.tags && testRunData.tags.length > 0) {
      requestBody.data.relationships.tags = {
        data: testRunData.tags.map(tag => ({ type: "Tag", id: `/api/tags/${tag.id}` }))
      };
    }
    
    // Add test_plan relationship if provided
    if (testRunData.testPlanId && testRunData.testPlanId !== '') {
      requestBody.data.relationships.test_plan = {
        data: {
          type: "TestPlan",
          id: `/api/test_plans/${testRunData.testPlanId}`
        }
      };
    }

    const response = await apiService.authenticatedRequest('/test_runs?include=user,configurations,configurations.project,testCases', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    if (!response) {
      throw new Error('No response received from server');
    }

    return response;
  }

  async updateTestRun(id: string, testRunData: {
    name: string;
    description: string;
    state: number;
    testCaseIds: string[];
    configurations?: Configuration[];
    assignedTo?: string;
    tags?: Tag[];
    testPlanId?: string;
  }): Promise<{ data: ApiTestRun }> {


    const requestBody = {
      data: {
        type: "TestRun",
        attributes: {
          name: testRunData.name,
          description: testRunData.description,
          state: testRunData.state
        },
        relationships: {
          user: {
            data: { type: "User", id: `/api/users/${testRunData.assignedTo}` }
          },
          test_cases: {
            data: testRunData.testCaseIds.map(id => ({ type: "TestCase", id: `/api/test_cases/${id}` }))
          },
          configurations: {
            data: (testRunData.configurations || []).map(config => ({
              type: "Configuration",
              id: `/api/configurations/${config.id}`
            }))
          },
          tags: {
            data: (testRunData.tags || []).map(tag => ({ type: "Tag", id: `/api/tags/${tag.id}` }))
          }
        }
      }
    };

    // CRITICAL: Only add test_plan relationship if a test plan is actually selected
    if (testRunData.testPlanId && testRunData.testPlanId.trim() !== '') {

      requestBody.data.relationships.test_plan = {
        data: {
          type: "TestPlan",
          id: `/api/test_plans/${testRunData.testPlanId}`
        }
      };
    } else {
      // No test plan ID provided
    }

    const response = await apiService.authenticatedRequest(`/test_runs/${id}?include=user,configurations,configurations.project,testCases`, {
      method: 'PATCH',
      body: JSON.stringify(requestBody),
    });

    if (!response) {
      throw new Error('No response received from server');
    }

    if (testRunData.state === 2 && testRunData.testPlanId) {
      await this.updateTestPlanStateToInProgress(testRunData.testPlanId);
    }

    return response;
  }

  async deleteTestRun(id: string): Promise<void> {
    await apiService.authenticatedRequest(`/test_runs/${id}`, {
      method: 'DELETE',
    });
  }

  async closeTestRun(id: string): Promise<{ data: ApiTestRun }> {
    const requestBody = {
      data: {
        type: "TestRun",
        attributes: {
          state: 6 // Closed state
        }
      }
    };

    const response = await apiService.authenticatedRequest(`/test_runs/${id}?include=user,configurations,configurations.project,testCases`, {
      method: 'PATCH',
      body: JSON.stringify(requestBody),
    });

    if (!response) {
      throw new Error('No response received from server');
    }

    const testPlanId = response.data?.relationships?.testPlan?.data?.id?.split('/').pop();
    if (testPlanId) {
      await this.checkAndUpdateTestPlanToDone(testPlanId);
    }

    return response;
  }

  async updateTestRunState(id: string, state: number, testPlanId?: string): Promise<{ data: ApiTestRun }> {

    const requestBody = {
      data: {
        type: "TestRun",
        attributes: {
          state: state
        }
      }
    };

    const response = await apiService.authenticatedRequest(`/test_runs/${id}?include=user,configurations,configurations.project,testCases`, {
      method: 'PATCH',
      body: JSON.stringify(requestBody),
    });

    if (!response) {
      throw new Error('No response received from server');
    }

    if (state === 2 && testPlanId) {
      await this.updateTestPlanStateToInProgress(testPlanId);
    }

    if (state === 5 && testPlanId) {
      await this.updateTestPlanStateToDone(testPlanId);
    }

    return response;
  }

  private async updateTestPlanStateToInProgress(testPlanId: string): Promise<void> {
    try {
      const { testPlansApiService } = await import('./testPlansApi');
      const testPlanResponse = await testPlansApiService.getTestPlanWithTestRuns(testPlanId);
      const testPlan = testPlansApiService.transformApiTestPlan(testPlanResponse.data, testPlanResponse.included);

      if (testPlan.status !== '2') {
        await testPlansApiService.updateTestPlanStatus(testPlanId, '2', testPlan, testPlanResponse.data);
      }
    } catch (error) {
      console.error('Failed to update test plan state to in progress:', error);
    }
  }

  private async updateTestPlanStateToDone(testPlanId: string): Promise<void> {
    try {
      const { testPlansApiService } = await import('./testPlansApi');
      const testPlanResponse = await testPlansApiService.getTestPlanWithTestRuns(testPlanId);
      const testPlan = testPlansApiService.transformApiTestPlan(testPlanResponse.data, testPlanResponse.included);

      if (testPlan.status !== '3') {
        await testPlansApiService.updateTestPlanStatus(testPlanId, '3', testPlan, testPlanResponse.data);
      }
    } catch (error) {
      console.error('Failed to update test plan state to done:', error);
    }
  }

  private async checkAndUpdateTestPlanToDone(testPlanId: string): Promise<void> {
    try {
      const { testPlansApiService } = await import('./testPlansApi');
      const testPlanResponse = await testPlansApiService.getTestPlanWithTestRuns(testPlanId);
      const testPlan = testPlansApiService.transformApiTestPlan(testPlanResponse.data, testPlanResponse.included);

      if (testPlan.status === '3') {
        return;
      }

      const testRunIds = testPlan.testRunIds;
      if (testRunIds.length === 0) {
        return;
      }

      const allTestRunsClosed = await this.checkIfAllTestRunsClosed(testRunIds, testPlanResponse.included || []);
      if (!allTestRunsClosed) {
        return;
      }

      await testPlansApiService.updateTestPlanStatus(testPlanId, '3', testPlan, testPlanResponse.data);
    } catch (error) {
      console.error('Failed to check and update test plan to done:', error);
    }
  }

  private async checkIfAllTestRunsClosed(testRunIds: string[], included: Array<Record<string, unknown>>): Promise<boolean> {
    for (const testRunId of testRunIds) {
      const testRunData = included.find(item =>
        item.type === 'TestRun' && (
          item.attributes?.id?.toString() === testRunId ||
          (item.id as string)?.split('/').pop() === testRunId
        )
      );

      if (!testRunData) {
        return false;
      }

      const state = (testRunData.attributes as Record<string, unknown>)?.state;
      const isClosed = state === 6 || state === "6" || parseInt(state?.toString() || '0') === 6;

      if (!isClosed) {
        return false;
      }
    }
    return true;
  }


  // Helper method to find creator in included data
  private findCreatorInIncluded(creatorId: string, included: ApiCreator[] = []): ApiCreator | null {
    return included.find(item => 
      item.type === 'User' && item.attributes.id.toString() === creatorId
    ) || null;
  }

  // Helper method to transform API test run to our internal format
  transformApiTestRun(apiTestRun: ApiTestRun, included: ApiCreator[] = [], specificUser?: ApiCreator): TestRun {
    // Extract project ID from the relationship URL
    const projectId = apiTestRun.relationships.project.data.id.split('/').pop() || '';
    
    // Extract assigned user ID from the relationship URL (relationships.user, not creator)
    const assignedUserId = apiTestRun.relationships.user?.data?.id?.split('/').pop() || '';
    
    // Find assigned user details - use specific user if provided, otherwise search in included data
    const assignedUser = specificUser || this.findCreatorInIncluded(assignedUserId, included);
    
    // Extract test case IDs from relationships
    const testCaseIds = apiTestRun.relationships.testCases?.data?.map(testCase =>
      testCase.id.split('/').pop() || ''
    ).filter(id => id !== '') || [];

    // Extract configurations from relationships and included data
    const configurations: Configuration[] = [];
    if (apiTestRun.relationships.configurations?.data) {
      for (const configRef of apiTestRun.relationships.configurations.data) {
        const configId = configRef.id.split('/').pop();

        if (configId) {
          const includedConfig = included?.find((item: Record<string, unknown>) =>
            item.type === 'Configuration' && (item.attributes as Record<string, unknown>)?.id?.toString() === configId
          ) as Record<string, unknown> | undefined;

          const attrs = includedConfig?.attributes as Record<string, unknown> | undefined;
          const rel = includedConfig?.relationships as Record<string, unknown> | undefined;
          const projectData = rel?.project != null ? (rel.project as Record<string, unknown>)?.data : undefined;
          let projectId: string | null = null;

          // Try to get project ID from relationships first
          if (projectData != null && !Array.isArray(projectData) && typeof (projectData as { id?: string }).id === 'string') {
            const match = /\/api\/projects\/(\d+)$/.exec((projectData as { id: string }).id);
            projectId = match ? match[1] : null;
          }

          // Fall back to attributes if not found in relationships
          if (!projectId && attrs?.project_id) {
            projectId = attrs.project_id.toString();
          }

          configurations.push({
            id: configId,
            label: attrs?.label as string || 'Unknown Configuration',
            userAgent: attrs?.userAgent as string | undefined,
            projectId: projectId ?? undefined
          });
        }
      }
    }

    // Calculate expected combinations:
    // Automated TCs: rows for ALL configs (manual + automated)
    // Non-automated TCs: rows for manual (global) configs only
    let expectedTotalCombinations = 0;

    const rawIncludedTestCases = included?.filter((item: Record<string, unknown>) => item.type === 'TestCase') || [];
    const automatedConfigsCount = configurations.filter(c => c.projectId).length;
    const globalConfigsCount = configurations.filter(c => !c.projectId).length;
    const totalConfigsCount = globalConfigsCount + automatedConfigsCount;

    testCaseIds.forEach(testCaseId => {
      const rawTestCase = rawIncludedTestCases.find((item: Record<string, unknown>) => {
        const topLevelId = typeof item.id === 'string' ? item.id.split('/').pop() : item.id?.toString();
        const attrs = item.attributes as Record<string, unknown> | undefined;
        const attrId = attrs?.id?.toString();
        return topLevelId === testCaseId || attrId === testCaseId;
      });

      if (rawTestCase) {
        const attrs = rawTestCase.attributes as Record<string, unknown>;
        const automationValue = typeof attrs.automation === 'string' ? parseInt(attrs.automation, 10) : attrs.automation;
        const isAutomated = automationValue === 2;

        if (isAutomated) {
          expectedTotalCombinations += totalConfigsCount > 0 ? totalConfigsCount : 1;
        } else {
          expectedTotalCombinations += globalConfigsCount > 0 ? globalConfigsCount : 1;
        }
      } else {
        expectedTotalCombinations += globalConfigsCount > 0 ? globalConfigsCount : 1;
      }
    });

    // Process caseResults array to get real execution statistics
    // Process executions array to get real execution statistics
    let passedCount = 0;
    let failedCount = 0;
    let blockedCount = 0;
    let retestCount = 0;
    let skippedCount = 0;
    let untestedCount = 0;
    let inProgressCount = 0;
    let unknownCount = 0;
    let executedCount = 0;
    let progress = 0;
    let passRate = 0;

    if (apiTestRun.attributes.executions && Array.isArray(apiTestRun.attributes.executions)) {


      // Group executions by test case ID + configuration ID and get the last execution per combination
      const lastExecutionPerTestCaseConfig = new Map<string, Record<string, unknown>>();

      apiTestRun.attributes.executions.forEach((execution: Record<string, unknown>) => {
        const testCaseId = execution.test_case_id.toString();
        const configId = execution.configuration_id ? execution.configuration_id.toString() : 'no-config';
        const key = `${testCaseId}-${configId}`;
        const executionDate = new Date(execution.created_at);

        // Keep only the latest execution for each test case + configuration combination
        const existing = lastExecutionPerTestCaseConfig.get(key);
        if (!existing || new Date(existing.created_at) < executionDate) {
          lastExecutionPerTestCaseConfig.set(key, execution);
        }
      });

      // Count each result type from the last execution per test case + configuration
      Array.from(lastExecutionPerTestCaseConfig.values()).forEach((execution: Record<string, unknown>, _index: number) => {


        // Handle both numeric and string result values
        const rawResult = execution.result;
        let resultLabel: string;
        
        if (typeof rawResult === 'number') {
          // Convert numeric ID to string label
          resultLabel = TEST_RESULTS[rawResult as TestResultId]?.toLowerCase() || 'unknown';

        } else if (typeof rawResult === 'string') {
          // Handle string results - could be numeric string or label string
          const numericResult = parseInt(rawResult);
          if (!isNaN(numericResult) && TEST_RESULTS[numericResult as TestResultId]) {
            // String is a numeric ID
            resultLabel = TEST_RESULTS[numericResult as TestResultId]?.toLowerCase() || 'unknown';

          } else {
            // String is already a label
            resultLabel = rawResult.toLowerCase();

          }
        } else {
          resultLabel = 'unknown';

        }

        switch (resultLabel) {
          case 'passed':
            passedCount++;
            break;
          case 'failed':
            failedCount++;
            break;
          case 'blocked':
            blockedCount++;
            break;
          case 'retest':
            retestCount++;
            break;
          case 'skipped':
            skippedCount++;
            break;
          case 'untested':
            untestedCount++;
            break;
          case 'in progress':
            inProgressCount++;
            break;
          case 'unknown':
            unknownCount++;
            break;
          default:

            unknownCount++;
        }
      });

      // FIXED CALCULATION: Match Test Run Details page logic
      // Executed = combinations with result 1 (Passed), 2 (Failed), or 4 (Retest)
      executedCount = passedCount + failedCount + retestCount;

      // Progress = executed combinations / expected total combinations
      progress = expectedTotalCombinations > 0 ? Math.round((executedCount / expectedTotalCombinations) * 100) : 0;

      // Pass rate = passed / executed (not total)
      passRate = executedCount > 0 ? Math.round((passedCount / executedCount) * 100) : 0;

    } else {
      // If no executions, all combinations are untested
      untestedCount = expectedTotalCombinations;
    }
    // Helper function to safely parse dates
    const parseDate = (dateString: string): Date => {
      if (!dateString || dateString.trim() === '') {
        return new Date(); // Fallback to current date if empty
      }
      const parsedDate = new Date(dateString);
      if (isNaN(parsedDate.getTime())) {
        return new Date(); // Fallback to current date if invalid
      }
      return parsedDate;
    };

    // Helper function to safely parse optional dates
    const parseOptionalDate = (dateString?: string): Date | undefined => {
      if (!dateString || dateString.trim() === '') {
        return undefined;
      }
      const parsedDate = new Date(dateString);
      if (isNaN(parsedDate.getTime())) {
        return undefined; // Return undefined if invalid
      }
      return parsedDate;
    };
    
    // Extract test plan ID from attributes or relationships
    let testPlanId = apiTestRun.attributes.test_plan_id;
    if (!testPlanId && apiTestRun.relationships.testPlan?.data) {
      // Handle both single object and array formats
      if (Array.isArray(apiTestRun.relationships.testPlan.data) && apiTestRun.relationships.testPlan.data.length > 0) {
        testPlanId = apiTestRun.relationships.testPlan.data[0].id.split('/').pop() || undefined;
      } else if (apiTestRun.relationships.testPlan.data && typeof apiTestRun.relationships.testPlan.data === 'object' && 'id' in apiTestRun.relationships.testPlan.data) {
        testPlanId = (apiTestRun.relationships.testPlan.data as { id: string }).id.split('/').pop() || undefined;
      }
    }

    const rawState = parseInt(apiTestRun.attributes.state?.toString() || '1');
    const state = rawState >= 1 && rawState <= 6 ? rawState : 1;

    return {
      id: apiTestRun.attributes.id.toString(),
      name: apiTestRun.attributes.name,
      description: apiTestRun.attributes.description,
      status: apiTestRun.attributes.status,
      state: state,
      projectId: projectId,
      testCaseIds: testCaseIds,
      configurations: configurations,
      testCasesCount: expectedTotalCombinations,
      executionsCount: executedCount,
      passedCount: passedCount,
      failedCount: failedCount,
      blockedCount: blockedCount,
      retestCount: retestCount,
      skippedCount: skippedCount,
      untestedCount: untestedCount,
      inProgressCount: inProgressCount,
      unknownCount: unknownCount,
      progress: progress,
      passRate: passRate,
      startDate: parseDate(apiTestRun.attributes.startDate),
      endDate: parseOptionalDate(apiTestRun.attributes.endDate),
      closedDate: parseOptionalDate(apiTestRun.attributes.closedDate),
      testPlanId: testPlanId,
      assignedTo: {
        id: assignedUserId,
        name: assignedUser?.attributes.name || 'Unassigned',
        email: assignedUser?.attributes.email || ''
      },
      createdAt: parseDate(apiTestRun.attributes.createdAt),
      updatedAt: parseDate(apiTestRun.attributes.updatedAt)
    };
  }
}

export const testRunsApiService = new TestRunsApiService();


