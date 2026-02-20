import { apiService } from './api';

export interface CreateTestCaseExecutionRequest {
  data: {
    type: "TestCaseExecution";
    attributes: {
      result: number;
      comment?: string;
      test_run_execution_id?: number;
    };
    relationships: {
      test_run: {
        data: {
          type: "test_runs";
          id: string;
        };
      };
      test_case: {
        data: {
          type: "test_cases";
          id: string;
        };
      };
      test_run_execution?: {
        data: {
          type: "TestRunExecution";
          id: string;
        };
      };
      configuration?: {
        data: {
          type: "Configuration";
          id: string;
        };
      };
    };
  };
}

export interface CreateTestCaseExecutionResponse {
  data: {
    id: string;
    type: string;
    attributes: {
      id: number;
      result: number;
      created_at: string;
      updated_at: string;
    };
    relationships: {
      test_run: {
        data: { type: string; id: string };
      };
      test_case: {
        data: { type: string; id: string };
      };
    };
  };
}

export interface TestCaseExecution {
  id: string;
  testCaseId: string;
  testRunId: string;
  result: number;
  resultLabel: string;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Extract numeric/id part from an IRI or raw id (e.g. "/api/configurations/1" -> "1", "1" -> "1") */
function toResourceId(value: string): string {
  if (value == null || value === '') return value;
  const str = String(value).trim();
  const parts = str.split('/').filter(Boolean);
  const id = parts.length > 0 ? parts[parts.length - 1] : str;
  return id;
}

class TestCaseExecutionsApiService {
  async createTestCaseExecution(data: {
    testCaseId: string;
    testRunId: string;
    result: number;
    comment?: string;
    configurationId?: string;
    testRunExecutionId?: number;
  }): Promise<CreateTestCaseExecutionResponse> {
    const testRunIdNorm = toResourceId(data.testRunId);
    const configurationIdNorm = data.configurationId ? toResourceId(data.configurationId) : '';
    const hasValidConfig = configurationIdNorm !== '' && configurationIdNorm !== 'NaN' && !Number.isNaN(Number(configurationIdNorm));

    if (!testRunIdNorm || testRunIdNorm === '0' || testRunIdNorm === 'NaN') {
      throw new Error(`Invalid testRunId for test case execution: "${data.testRunId}"`);
    }

    const requestBody: CreateTestCaseExecutionRequest = {
      data: {
        type: "TestCaseExecution",
        attributes: {
          result: data.result,
          ...(data.comment && data.comment.trim() ? { comment: data.comment.trim() } : {}),
          ...(data.testRunExecutionId != null ? { test_run_execution_id: data.testRunExecutionId } : {})
        },
        relationships: {
          test_run: {
            data: {
              type: "test_runs",
              id: `/api/test_runs/${testRunIdNorm}`
            }
          },
          test_case: {
            data: {
              type: "test_cases",
              id: `/api/test_cases/${toResourceId(data.testCaseId)}`
            }
          },
          ...(data.testRunExecutionId != null ? {
            test_run_execution: {
              data: {
                type: "TestRunExecution",
                id: `/api/test_run_executions/${data.testRunExecutionId}`
              }
            }
          } : {}),
          ...(hasValidConfig ? {
            configuration: {
              data: {
                type: "Configuration",
                id: `/api/configurations/${configurationIdNorm}`
              }
            }
          } : {})
        }
      }
    };

    const response = await apiService.authenticatedRequest('/test_case_executions', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    if (!response) {
      throw new Error('No response received from server');
    }

    return response;
  }

  // Helper method to transform API execution to our internal format
  transformApiExecution(apiExecution: Record<string, unknown>): TestCaseExecution {
    const testCaseId = apiExecution.relationships?.test_case?.data?.id?.split('/').pop() || '';
    const testRunId = apiExecution.relationships?.test_run?.data?.id?.split('/').pop() || '';
    
    return {
      id: apiExecution.attributes.id.toString(),
      testCaseId,
      testRunId,
      result: apiExecution.attributes.result,
      resultLabel: this.getResultLabel(apiExecution.attributes.result),
      comment: apiExecution.attributes.comment,
      createdAt: new Date(apiExecution.attributes.created_at),
      updatedAt: new Date(apiExecution.attributes.updated_at)
    };
  }

  private getResultLabel(resultId: number): string {
    const TEST_RESULTS = {
      1: 'Passed',
      2: 'Failed',
      3: 'Blocked',
      4: 'Retest',
      5: 'Skipped',
      6: 'Untested',
      7: 'In Progress',
      8: 'Unknown'
    };

    return TEST_RESULTS[resultId as keyof typeof TEST_RESULTS] || 'Unknown';
  }
}

export const testCaseExecutionsApiService = new TestCaseExecutionsApiService();