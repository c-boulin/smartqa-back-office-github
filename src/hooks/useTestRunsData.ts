import { useState, useEffect, useCallback, useRef } from 'react';
import { testRunsApiService } from '../services/testRunsApi';
import { testCasesApiService } from '../services/testCasesApi';
import { TEST_RESULTS, TestCase } from '../types';
import { AutomationFilter } from '../pages/Dashboard';

type TestResultId = keyof typeof TEST_RESULTS;

export interface TestRunsData {
  activeTestRunsChart: {
    actualPassed: number;
    actualFailed: number;
    actualBlocked: number;
    actualRetest: number;
    actualSkipped: number;
    actualUntested: number;
    actualInProgress: number;
    actualUnknown: number;
    totalTestCasesInActiveRuns: number;
  };
  closedTestRunsChart: Array<{
    month: string;
    value: number;
  }>;
  closedTestRunsRawData: Array<Record<string, unknown>>;
}

export const useTestRunsData = (projectId: string | undefined, automationFilter: AutomationFilter = 'all') => {
  const [data, setData] = useState<TestRunsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    if (isFetchingRef.current) {
      return;
    }

    try {
      isFetchingRef.current = true;
      setLoading(true);
      setError(null);

      const testRunsResponse = await testRunsApiService.getTestRuns(projectId, 1, 1000);

      // Always fetch test cases to know automation status
      const itemsPerPage = 500;
      const firstPageResponse = await testCasesApiService.getTestCases(1, itemsPerPage, projectId);
      const totalTestCasesFromAPI = firstPageResponse.meta.totalItems;
      const totalPages = Math.ceil(totalTestCasesFromAPI / itemsPerPage);

      let allTestCasesData = [...firstPageResponse.data];

      if (totalPages > 1) {
        const pagePromises = [];
        for (let page = 2; page <= totalPages; page++) {
          pagePromises.push(testCasesApiService.getTestCases(page, itemsPerPage, projectId));
        }

        const pageResponses = await Promise.all(pagePromises);
        pageResponses.forEach(response => {
          allTestCasesData = [...allTestCasesData, ...response.data];
        });
      }

      const testCases = allTestCasesData.map(apiTestCase =>
        testCasesApiService.transformApiTestCase(apiTestCase, firstPageResponse.included)
      );

      const testCasesMap = new Map(testCases.map(tc => [tc.id, tc]));

      let actualPassed = 0;
      let actualFailed = 0;
      let actualBlocked = 0;
      let actualRetest = 0;
      let actualSkipped = 0;
      let actualUntested = 0;
      let actualInProgress = 0;
      let actualUnknown = 0;

      const globalLastExecutionPerTestCaseConfigRun = new Map<string, Record<string, unknown>>();
      const closedTestRuns: Array<Record<string, unknown>> = [];

      const matchesAutomationFilter = (testCaseId: string): boolean => {
        if (automationFilter === 'all') return true;

        const testCase = testCasesMap.get(testCaseId);
        if (!testCase) return false;

        if (automationFilter === 'automated') {
          return testCase.automationStatus === 2 || testCase.automationStatus === "2";
        } else if (automationFilter === 'not-automated') {
          return testCase.automationStatus === 1 || testCase.automationStatus === "1" ||
                 testCase.automationStatus === 3 || testCase.automationStatus === "3" ||
                 testCase.automationStatus === 4 || testCase.automationStatus === "4" ||
                 testCase.automationStatus === 5 || testCase.automationStatus === "5" ||
                 testCase.automationStatus === 6 || testCase.automationStatus === "6";
        }

        return true;
      };

      // Helper to check if test case + configuration combination is valid
      const isValidCombination = (testCaseId: string, configId: string, configurationsMap: Map<string, { projectId?: string | null }>): boolean => {
        const testCase = testCasesMap.get(testCaseId);
        if (!testCase) return false;

        const isAutomatedTestCase = testCase.automationStatus === 2 || testCase.automationStatus === "2";

        if (configId === 'no-config') {
          // No config means manual execution
          return true;
        }

        const config = configurationsMap.get(configId);
        if (!config) return false;

        const isAutomatedConfig = !!config.projectId;

        // Manual test cases can only use manual configurations
        if (!isAutomatedTestCase && isAutomatedConfig) {
          return false;
        }

        // Automated test cases can use both manual and automated configurations
        return true;
      };

      // Build configuration map from included data
      const configurationsMap = new Map<string, { projectId?: string | null }>();
      if (testRunsResponse.included) {
        testRunsResponse.included.forEach((item: Record<string, unknown>) => {
          if (item.type === 'Configuration') {
            const configId = item.id.toString().split('/').pop();
            if (configId) {
              configurationsMap.set(configId, {
                projectId: item.relationships?.project?.data?.id || null
              });
            }
          }
        });
      }

      // First, check if there are ANY executions across all active test runs
      const hasAnyExecutions = testRunsResponse.data.some(apiTestRun => {
        const state = apiTestRun.attributes.state;
        const isClosed = state === "6" || state === 6;
        const isActiveTestRun = !isClosed;
        return isActiveTestRun &&
               apiTestRun.attributes.executions &&
               Array.isArray(apiTestRun.attributes.executions) &&
               apiTestRun.attributes.executions.length > 0;
      });

      testRunsResponse.data.forEach(apiTestRun => {
        const state = apiTestRun.attributes.state;
        const isClosed = state === "6" || state === 6;
        const isActiveTestRun = !isClosed;

        if (isActiveTestRun) {
          const testRunId = apiTestRun.attributes.id.toString();

          if (hasAnyExecutions) {
            // If ANY executions exist, only count actual executions
            if (apiTestRun.attributes.executions && Array.isArray(apiTestRun.attributes.executions) && apiTestRun.attributes.executions.length > 0) {
              apiTestRun.attributes.executions.forEach((execution: Record<string, unknown>) => {
                const testCaseId = execution.test_case_id.toString();

                if (!matchesAutomationFilter(testCaseId)) {
                  return;
                }

                const configId = execution.configuration_id ? execution.configuration_id.toString() : 'no-config';
                const testRunId = execution.test_run_id.toString();
                const key = `${testCaseId}-${configId}-${testRunId}`;
                const executionDate = new Date(execution.created_at);

                const existing = globalLastExecutionPerTestCaseConfigRun.get(key);
                if (!existing || new Date(existing.created_at) < executionDate) {
                  globalLastExecutionPerTestCaseConfigRun.set(key, execution);
                }
              });
            }
          } else {
            // No executions exist anywhere - show all valid combinations as untested
            const configIds = apiTestRun.relationships.configurations?.data?.map(c => c.id.split('/').pop()) || ['no-config'];

            if (apiTestRun.relationships.testCases?.data) {
              apiTestRun.relationships.testCases.data.forEach(tc => {
                const testCaseId = tc.id.split('/').pop();

                if (!matchesAutomationFilter(testCaseId)) {
                  return;
                }

                configIds.forEach(configId => {
                  // Only create combination if it's valid (respects automation rules)
                  if (!isValidCombination(testCaseId, configId, configurationsMap)) {
                    return;
                  }

                  const key = `${testCaseId}-${configId}-${testRunId}`;

                  if (!globalLastExecutionPerTestCaseConfigRun.has(key)) {
                    globalLastExecutionPerTestCaseConfigRun.set(key, {
                      test_case_id: testCaseId,
                      configuration_id: configId === 'no-config' ? null : configId,
                      test_run_id: testRunId,
                      result: 6, // Untested
                      created_at: '1970-01-01T00:00:00.000Z',
                      updated_at: '1970-01-01T00:00:00.000Z'
                    });
                  }
                });
              });
            }
          }
        } else {
          closedTestRuns.push(apiTestRun);
        }
      });

      const totalTestCasesInActiveRuns = globalLastExecutionPerTestCaseConfigRun.size;

      Array.from(globalLastExecutionPerTestCaseConfigRun.values()).forEach((execution: Record<string, unknown>) => {
        const rawResult = execution.result;
        let resultLabel: string;

        if (typeof rawResult === 'number') {
          resultLabel = TEST_RESULTS[rawResult as TestResultId]?.toLowerCase() || 'unknown';
        } else if (typeof rawResult === 'string') {
          const numericResult = parseInt(rawResult);
          if (!isNaN(numericResult) && TEST_RESULTS[numericResult as TestResultId]) {
            resultLabel = TEST_RESULTS[numericResult as TestResultId]?.toLowerCase() || 'unknown';
          } else {
            resultLabel = rawResult.toLowerCase();
          }
        } else {
          resultLabel = 'unknown';
        }

        switch (resultLabel) {
          case 'passed':
            actualPassed++;
            break;
          case 'failed':
            actualFailed++;
            break;
          case 'blocked':
            actualBlocked++;
            break;
          case 'retest':
            actualRetest++;
            break;
          case 'skipped':
            actualSkipped++;
            break;
          case 'untested':
            actualUntested++;
            break;
          case 'in progress':
            actualInProgress++;
            break;
          case 'unknown':
            actualUnknown++;
            break;
          default:
            actualUnknown++;
        }
      });

      const closedTestRunsLineData = generateClosedTestRunsLineData(closedTestRuns.map(apiTestRun => ({
        id: apiTestRun.attributes.id,
        name: apiTestRun.attributes.name,
        closedAt: apiTestRun.attributes.closedAt ? new Date(apiTestRun.attributes.closedAt) : null
      })));

      const testRunsData = {
        activeTestRunsChart: {
          actualPassed,
          actualFailed,
          actualBlocked,
          actualRetest,
          actualSkipped,
          actualUntested,
          actualInProgress,
          actualUnknown,
          totalTestCasesInActiveRuns
        },
        closedTestRunsChart: closedTestRunsLineData,
        closedTestRunsRawData: closedTestRuns
      };

      setData(testRunsData);

    } catch (err) {
      console.error('Failed to fetch test runs data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [projectId, automationFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error };
};

function generateClosedTestRunsLineData(closedTestRuns: Array<Record<string, unknown>>): Array<{
  month: string;
  value: number;
}> {
  const dateCounts = new Map<string, number>();

  closedTestRuns.forEach(testRun => {
    const closedDate = testRun.closedAt || testRun.closedDate;

    if (closedDate) {
      const month = String(closedDate.getMonth() + 1).padStart(2, '0');
      const day = String(closedDate.getDate()).padStart(2, '0');
      const dateKey = `${month}-${day}`;

      const currentCount = dateCounts.get(dateKey) || 0;
      dateCounts.set(dateKey, currentCount + 1);
    }
  });

  const sortedDates = Array.from(dateCounts.entries())
    .sort(([a], [b]) => {
      const [monthA, dayA] = a.split('-').map(n => parseInt(n));
      const [monthB, dayB] = b.split('-').map(n => parseInt(n));

      if (monthA !== monthB) {
        return monthA - monthB;
      }
      return dayA - dayB;
    })
    .map(([dateKey, count]) => ({
      month: dateKey,
      value: count
    }));

  return sortedDates;
}
