import React, { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';
import { testRunExecutionsApiService, TestRunExecution } from '../services/testRunExecutionsApi';
import { testCaseExecutionsApiService } from '../services/testCaseExecutionsApi';
import { useNotifications } from './NotificationsContext';
import toast from 'react-hot-toast';

export interface PollingExecution {
  id: number;
  testCaseId: number;
  testCaseCode: string;
  testCaseTitle: string;
  testRunId: number;
  configurationId?: number;
  state: number;
  stateLabel: string;
  startedAt: Date;
  /** When polling returns Done (state 2), create test case executions for these with random Passed/Failed */
  linkedTestCaseIds?: string[];
  /** Test run id string for API (from modal), so payload is correct when creating test case executions */
  testRunIdForPayload?: string;
  /** Configuration id string for API (from modal, can be raw id or IRI) */
  configurationIdForPayload?: string;
}

interface TestRunExecutionPollingContextType {
  activeExecutions: PollingExecution[];
  activeExecutionsCount: number;
  startPolling: (
    execution: PollingExecution,
    onComplete?: (execution: TestRunExecution) => void
  ) => Promise<void>;
  cancelPolling: (executionId: number) => void;
  cancelAllPolling: () => void;
  isExecutionActive: (executionId: number) => boolean;
}

const TestRunExecutionPollingContext = createContext<TestRunExecutionPollingContextType | undefined>(
  undefined
);

export const TestRunExecutionPollingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { setUnread: setNotificationUnread } = useNotifications();
  const [activeExecutions, setActiveExecutions] = useState<Map<number, PollingExecution>>(
    new Map()
  );
  const abortControllersRef = useRef<Map<number, AbortController>>(new Map());
  const pollingPromisesRef = useRef<Map<number, Promise<void>>>(new Map());

  // Start polling for a test run execution
  const startPolling = useCallback(
    async (
      execution: PollingExecution,
      onComplete?: (execution: TestRunExecution) => void
    ) => {
      // If already polling this execution, don't start again
      if (pollingPromisesRef.current.has(execution.id)) {
        console.log(`Already polling execution ${execution.id}`);
        return;
      }

      // Add to active executions
      setActiveExecutions((prev) => new Map(prev).set(execution.id, execution));

      // Create abort controller for this polling
      const abortController = new AbortController();
      abortControllersRef.current.set(execution.id, abortController);

      const pollingPromise = (async () => {
        try {
          // Start polling in the background
          const finalResult = await testRunExecutionsApiService.pollUntilDone(
            execution.id,
            execution.state,
            (updatedExecution) => {
              setNotificationUnread();
              // Update the execution state in our map
              setActiveExecutions((prev) => {
                const updated = new Map(prev);
                const current = updated.get(execution.id);
                if (current) {
                  updated.set(execution.id, {
                    ...current,
                    state: updatedExecution.state,
                    stateLabel: updatedExecution.state_label,
                  });
                }
                return updated;
              });
            }
          );

          setNotificationUnread();
          // Polling complete
          setActiveExecutions((prev) => {
            const updated = new Map(prev);
            updated.delete(execution.id);
            return updated;
          });

          abortControllersRef.current.delete(execution.id);
          pollingPromisesRef.current.delete(execution.id);

          // When Done: create test case executions for linked test cases with random Passed (1) or Failed (2)
          if (finalResult.state === 2 && execution.linkedTestCaseIds?.length && execution.linkedTestCaseIds.length > 0) {
            const testRunIdStr = execution.testRunIdForPayload ?? String(execution.testRunId);
            const configurationIdStr = execution.configurationIdForPayload ?? (execution.configurationId != null ? String(execution.configurationId) : undefined);
            if (!testRunIdStr || testRunIdStr === '0') {
              console.error('Cannot create test case executions: missing or invalid test run id', execution);
              toast.error('Execution completed but could not save results (missing test run id)');
            } else {
              try {
                const executionResults: number[] = [];

                await Promise.all(
                  execution.linkedTestCaseIds.map(async (testCaseId) => {
                    const result = Math.random() < 0.5 ? 1 : 2;
                    executionResults.push(result);

                    return testCaseExecutionsApiService.createTestCaseExecution({
                      testCaseId,
                      testRunId: testRunIdStr,
                      result,
                      configurationId: configurationIdStr,
                      testRunExecutionId: finalResult.id,
                    });
                  })
                );

                // Update test run state based on execution results
                try {
                  const { testRunsApiService } = await import('../services/testRunsApi');
                  const testRunResponse = await testRunsApiService.getTestRun(testRunIdStr);

                  if (testRunResponse?.data) {
                    const testRunState = testRunResponse.data.attributes.state;

                    // If test run is not closed
                    if (testRunState !== 6) {
                      // Check if any execution failed
                      const anyFailed = executionResults.some(result => result === 2);

                      if (anyFailed) {
                        // Any test case failed, move test run to "Rejected" (state 4)
                        await testRunsApiService.updateTestRunState(testRunIdStr, 4);
                      } else {
                        // All test cases passed, check if ALL test cases in the run are done
                        // Get all test case IDs from the test run
                        const testCaseIds = testRunResponse.data.relationships.testCases?.data?.map(tc =>
                          tc.id.split('/').pop() || ''
                        ) || [];

                        // Check if we've executed all test cases
                        const allTestCasesExecuted = testCaseIds.length === execution.linkedTestCaseIds.length;

                        if (allTestCasesExecuted) {
                          // All test cases passed, move test run to "Done" (state 5)
                          await testRunsApiService.updateTestRunState(testRunIdStr, 5);
                        } else {
                          // Not all test cases executed yet, move to "In Progress" if needed
                          if (testRunState === 1) {
                            await testRunsApiService.updateTestRunState(testRunIdStr, 2);
                          }
                        }
                      }
                    }
                  }
                } catch (stateUpdateErr) {
                  console.error('Failed to update test run state after automated execution:', stateUpdateErr);
                }
              } catch (err) {
                console.error('Failed to create test case executions after run completed:', err);
                toast.error('Execution completed but failed to save some results');
              }
            }
          }

          // Show success notification
          toast.success(
            `Test execution complete: ${execution.testCaseCode} - ${execution.testCaseTitle}`,
            { duration: 5000 }
          );

          // Call completion callback
          if (onComplete) {
            onComplete(finalResult);
          }
        } catch (error) {
          setNotificationUnread();
          // Remove from active executions on error
          setActiveExecutions((prev) => {
            const updated = new Map(prev);
            updated.delete(execution.id);
            return updated;
          });

          abortControllersRef.current.delete(execution.id);
          pollingPromisesRef.current.delete(execution.id);

          // Show error notification
          toast.error(
            `Test execution failed: ${execution.testCaseCode} - ${error instanceof Error ? error.message : 'Unknown error'}`,
            { duration: 5000 }
          );

          throw error;
        }
      })();

      pollingPromisesRef.current.set(execution.id, pollingPromise);
    },
    []
  );

  // Cancel polling for a specific execution
  const cancelPolling = useCallback((executionId: number) => {
    const abortController = abortControllersRef.current.get(executionId);
    if (abortController) {
      abortController.abort();
      abortControllersRef.current.delete(executionId);
    }

    pollingPromisesRef.current.delete(executionId);

    setActiveExecutions((prev) => {
      const updated = new Map(prev);
      updated.delete(executionId);
      return updated;
    });

    toast.info(`Test execution cancelled`, { duration: 3000 });
  }, []);

  // Cancel all active polling
  const cancelAllPolling = useCallback(() => {
    abortControllersRef.current.forEach((controller) => controller.abort());
    abortControllersRef.current.clear();
    pollingPromisesRef.current.clear();
    setActiveExecutions(new Map());
  }, []);

  // Get all active executions as an array
  const activeExecutionsList = Array.from(activeExecutions.values());

  // Check if a specific execution is active
  const isExecutionActive = useCallback(
    (executionId: number) => {
      return activeExecutions.has(executionId);
    },
    [activeExecutions]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cancel all polling when the component unmounts
      abortControllersRef.current.forEach((controller) => controller.abort());
      abortControllersRef.current.clear();
      pollingPromisesRef.current.clear();
    };
  }, []);

  return (
    <TestRunExecutionPollingContext.Provider
      value={{
        activeExecutions: activeExecutionsList,
        activeExecutionsCount: activeExecutions.size,
        startPolling,
        cancelPolling,
        cancelAllPolling,
        isExecutionActive,
      }}
    >
      {children}
    </TestRunExecutionPollingContext.Provider>
  );
};

// Hook to access the polling context
// Note: This is also re-exported from hooks/useTestRunExecutionPolling.ts for convenience
export function useTestRunExecutionPolling(): TestRunExecutionPollingContextType {
  const context = useContext(TestRunExecutionPollingContext);
  if (context === undefined) {
    throw new Error(
      'useTestRunExecutionPolling must be used within a TestRunExecutionPollingProvider'
    );
  }
  return context;
}
