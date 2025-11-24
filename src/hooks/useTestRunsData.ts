import { useState, useEffect, useCallback, useRef } from 'react';
import { testRunsApiService } from '../services/testRunsApi';
import { TEST_RESULTS } from '../types';

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

export const useTestRunsData = (projectId: string | undefined) => {
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

      testRunsResponse.data.forEach(apiTestRun => {
        const state = apiTestRun.attributes.state;
        const isClosed = state === "6" || state === 6;
        const isActiveTestRun = !isClosed;

        if (isActiveTestRun) {
          if (apiTestRun.attributes.executions && Array.isArray(apiTestRun.attributes.executions)) {
            apiTestRun.attributes.executions.forEach((execution: Record<string, unknown>) => {
              const testCaseId = execution.test_case_id.toString();
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
  }, [projectId]);

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
