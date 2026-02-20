import React, { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';
import { testRunExecutionsApiService, TestRunExecution, TestCaseExecutionUpdate } from '../services/testRunExecutionsApi';
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
}

interface TestRunExecutionPollingContextType {
  activeExecutions: PollingExecution[];
  activeExecutionsCount: number;
  startPolling: (
    execution: PollingExecution,
    onComplete?: (execution: TestRunExecution) => void,
    onTestCaseExecutionUpdate?: (updates: TestCaseExecutionUpdate[]) => void
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
      onComplete?: (execution: TestRunExecution) => void,
      onTestCaseExecutionUpdate?: (updates: TestCaseExecutionUpdate[]) => void
    ) => {
      // If already polling this execution, don't start again
      if (pollingPromisesRef.current.has(execution.id)) {
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
            async (updatedExecution) => {
              setNotificationUnread();

              // Broadcast test case execution updates to subscribers
              if (updatedExecution.test_case_executions && updatedExecution.test_case_executions.length > 0) {
                console.log('📡 Broadcasting test case execution updates:', updatedExecution.test_case_executions);
                if (onTestCaseExecutionUpdate) {
                  onTestCaseExecutionUpdate(updatedExecution.test_case_executions);
                }
              }

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

          // Broadcast final test case execution updates to subscribers
          if (finalResult.test_case_executions && finalResult.test_case_executions.length > 0) {
            console.log('📡 Broadcasting final test case execution updates:', finalResult.test_case_executions);
            if (onTestCaseExecutionUpdate) {
              onTestCaseExecutionUpdate(finalResult.test_case_executions);
            }
          }

          // Polling complete
          setActiveExecutions((prev) => {
            const updated = new Map(prev);
            updated.delete(execution.id);
            return updated;
          });

          abortControllersRef.current.delete(execution.id);
          pollingPromisesRef.current.delete(execution.id);

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
