import { apiService } from './api';

export interface TestCaseExecutionUpdate {
  id: number;
  test_case_id: string;
  test_run_id: string;
  configuration_id?: string;
  result: number;
  result_label: string;
  comment?: string;
  updated_at: string;
}

export interface TestRunExecution {
  id: number;
  test_run_id: number;
  test_case_id: number;
  configuration_id?: number;
  pipeline_id?: string;
  state: number;
  state_label: string;
  updated_at?: string;
  test_case_executions?: TestCaseExecutionUpdate[];
}

export interface CreateTestRunExecutionRequest {
  data: {
    type: "TestRunExecution";
    attributes?: {
      pipeline_id?: string;
      state?: number;
    };
    relationships: {
      test_run: {
        data: {
          type: "TestRun";
          id: string;
        };
      };
    };
  };
}

export interface PollResponse extends TestRunExecution {
  changed: boolean;
  timeout?: boolean;
  test_case_executions?: TestCaseExecutionUpdate[];
}

class TestRunExecutionsApiService {
  /**
   * Create a new test run execution
   */
  async createTestRunExecution(data: {
    test_run_id: number;
    pipeline_id?: string;
    state?: number;
  }): Promise<TestRunExecution> {
    const requestBody: CreateTestRunExecutionRequest = {
      data: {
        type: "TestRunExecution",
        attributes: {
          ...(data.pipeline_id ? { pipeline_id: data.pipeline_id } : {}),
          ...(data.state ? { state: data.state } : {}),
        },
        relationships: {
          test_run: {
            data: {
              type: "TestRun",
              id: `/api/test_runs/${data.test_run_id}`
            }
          }
        }
      }
    };

    const response = await apiService.authenticatedRequest('/test_run_executions', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    if (!response) {
      throw new Error('No response received from server');
    }

    return this.normalizeTestRunExecutionResponse(response);
  }

  private static readonly STATE_LABELS: Record<number, string> = {
    1: 'In Progress',
    2: 'Passed',
    3: 'Failed',
  };

  /** Extract numeric id from value: number, string "123", or IRI "/api/test_run_executions/123" */
  private static parseId(value: unknown): number | null {
    if (value == null) return null;
    if (typeof value === 'number' && !Number.isNaN(value)) return value;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      const lastSegment = trimmed.split('/').filter(Boolean).pop();
      const num = lastSegment ? parseInt(lastSegment, 10) : NaN;
      return Number.isNaN(num) ? null : num;
    }
    return null;
  }

  /**
   * Normalize JSON:API or JSON-LD response to TestRunExecution
   */
  private normalizeTestRunExecutionResponse(response: unknown): TestRunExecution {
    const r = response as Record<string, unknown>;

    // JSON:API: { data: { id, type, attributes } } or { data: [ { id, ... } ] }
    if (r.data && typeof r.data === 'object') {
      const data = Array.isArray(r.data) ? (r.data[0] as Record<string, unknown>) : (r.data as Record<string, unknown>);
      if (!data) {
        throw new Error('Invalid test run execution response: empty data. Response: ' + JSON.stringify(response).slice(0, 300));
      }
      const attrs = (data.attributes as Record<string, unknown>) || {};
      const id =
        TestRunExecutionsApiService.parseId(data.id ?? data['@id']) ??
        TestRunExecutionsApiService.parseId(attrs.id) ??
        TestRunExecutionsApiService.parseId(r.id);
      if (id == null || id <= 0) {
        throw new Error(
          'Invalid test run execution response: missing or invalid id. Response: ' +
            JSON.stringify(response).slice(0, 500)
        );
      }
      const state = Number(attrs.state ?? data.state ?? 1);
      const getNum = (v: unknown) => (v != null ? Number(v) : 0);
      return {
        id,
        test_run_id: getNum(attrs.test_run_id ?? data.test_run_id),
        test_case_id: getNum(attrs.test_case_id ?? data.test_case_id),
        configuration_id: attrs.configuration_id != null || data.configuration_id != null
          ? Number(attrs.configuration_id ?? data.configuration_id)
          : undefined,
        pipeline_id: typeof (attrs.pipeline_id ?? data.pipeline_id) === 'string' ? (attrs.pipeline_id ?? data.pipeline_id) as string : undefined,
        state,
        state_label: TestRunExecutionsApiService.STATE_LABELS[state] ?? 'In Progress',
        updated_at: typeof (attrs.updated_at ?? data.updated_at) === 'string' ? (attrs.updated_at ?? data.updated_at) as string : undefined,
      };
    }

    // Flat or JSON-LD: { id, state, ... } or { @id, state, ... }
    const flatId = TestRunExecutionsApiService.parseId(r.id ?? r['@id']);
    if (flatId != null && flatId > 0) {
      const state = Number(r.state ?? 1);
      return {
        id: flatId,
        test_run_id: Number(r.test_run_id ?? 0),
        test_case_id: Number(r.test_case_id ?? 0),
        configuration_id: r.configuration_id != null ? Number(r.configuration_id) : undefined,
        pipeline_id: typeof r.pipeline_id === 'string' ? r.pipeline_id : undefined,
        state,
        state_label: TestRunExecutionsApiService.STATE_LABELS[state] ?? 'In Progress',
        updated_at: typeof r.updated_at === 'string' ? r.updated_at : undefined,
      };
    }

    throw new Error(
      'Invalid test run execution response: missing or invalid id. Response: ' +
        JSON.stringify(response).slice(0, 500)
    );
  }

  /**
   * Poll for state changes on a test run execution
   * This is a long-polling endpoint that waits up to 60 seconds for a state change
   */
  async pollTestRunExecution(id: number, currentState?: number): Promise<PollResponse> {
    const numericId = Number(id);
    if (Number.isNaN(numericId) || numericId <= 0) {
      throw new Error(`Invalid test run execution id for polling: ${id}`);
    }
    const state = currentState != null && !Number.isNaN(Number(currentState)) ? Number(currentState) : 1;
    const response = await apiService.authenticatedRequest(
      `/test_run_executions/${numericId}/poll?current_state=${state}`,
      {
        method: 'GET',
      }
    );

    if (!response) {
      throw new Error('No response received from server');
    }

    return response as PollResponse;
  }

  /**
   * Get a specific test run execution
   */
  async getTestRunExecution(id: number): Promise<TestRunExecution> {
    const response = await apiService.authenticatedRequest(`/test_run_executions/${id}`, {
      method: 'GET',
    });

    if (!response) {
      throw new Error('No response received from server');
    }

    return response as TestRunExecution;
  }

  /**
   * Get the latest test run execution state for a test run.
   * Returns 1 (In progress), 2 (Done), or undefined if none.
   */
  async getLatestStateByTestRunId(testRunId: string): Promise<number | undefined> {
    const id = testRunId.replace(/^\D+/, '');
    try {
      const response = await apiService.authenticatedRequest(
        `/test_run_executions?test_run=${encodeURIComponent(`/api/test_runs/${id}`)}&order[createdAt]=desc&itemsPerPage=1`
      );
      if (!response || !(response as Record<string, unknown>).data) return undefined;
      const data = (response as { data: unknown[] }).data;
      if (!Array.isArray(data) || data.length === 0) return undefined;
      const first = data[0] as Record<string, unknown>;
      const attrs = (first.attributes as Record<string, unknown>) || {};
      const state = attrs.state ?? first.state;
      return state != null ? Number(state) : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Continuously poll until the execution is done or an error occurs
   * Handles timeouts and retries automatically
   */
  async pollUntilDone(
    id: number,
    initialState?: number,
    onStateChange?: (execution: TestRunExecution) => void | Promise<void>,
    maxRetries: number = 100 // Maximum number of timeout retries (100 * 60s = 100 minutes max)
  ): Promise<TestRunExecution> {
    const initial = initialState != null && !Number.isNaN(Number(initialState)) ? Number(initialState) : 1;
    let currentState = initial;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        const result = await this.pollTestRunExecution(id, currentState);

        // If state changed, notify callback and check if done
        if (result.changed) {
          if (onStateChange) {
            await onStateChange(result);
          }

          // If state is 2 (Passed) or 3 (Failed), we're finished
          if (result.state === 2 || result.state === 3) {
            return result;
          }

          // Update current state and continue polling
          currentState = result.state;
          continue;
        }

        // If timeout occurred, immediately send another polling request
        if (result.timeout) {
          retries++;
          continue;
        }

        // If neither changed nor timeout, continue polling anyway
        // This handles edge cases where the server response might be unexpected
        continue;
      } catch (error) {
        console.error('Polling error:', error);
        throw error;
      }
    }

    throw new Error('Maximum polling retries exceeded');
  }
}

export const testRunExecutionsApiService = new TestRunExecutionsApiService();
