import React, { useState } from 'react';
import Modal from '../UI/Modal';
import Button from '../UI/Button';
import { Play, Loader, CheckCircle, XCircle } from 'lucide-react';
import { testCaseExecutionsApiService } from '../../services/testCaseExecutionsApi';
import { testRunExecutionsApiService, TestRunExecution } from '../../services/testRunExecutionsApi';
import { testRunsApiService } from '../../services/testRunsApi';
import { useTestRunExecutionPolling } from '../../hooks/useTestRunExecutionPolling';
import toast from 'react-hot-toast';

interface RunTestCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  testRunName: string;
  testRunId?: string;
  selectedTestCase?: {
    id: string;
    code: string;
    title: string;
  };
  availableAutomatedTestCases?: TestCase[];
  availableConfigurations?: Configuration[];
  isLoading?: boolean;
  onExecutionComplete?: (testRunId?: string, executionState?: number) => void;
}

interface Service {
  id: string;
  name: string;
  url: string;
}

interface Configuration {
  id: string;
  label: string;
  userAgent?: string;
}

interface TestCase {
  id: string;
  code: string;
  title: string;
}

const mockServices: Service[] = [
  { id: '1', name: 'Playyod', url: 'https://www.playyod.com' },
  { id: '2', name: 'FR', url: 'https://www.playyod.com' },
  { id: '3', name: 'MA', url: 'https://www.playyod.ma' },
  { id: '4', name: 'Fuzeforge', url: 'https://store.fuzeforge.com' },
  { id: '5', name: 'FR', url: 'https://store.fuzeforge.com' },
  { id: '6', name: 'MA', url: 'https://www.fuzeforge.at' },
  { id: '7', name: 'AT', url: 'https://www.fuzeforge.es/' },
  { id: '8', name: 'CH', url: 'https://www.fuzeforge.ch' },
];

interface TestCaseProgress {
  id: string;
  code: string;
  title: string;
  status: 'pending' | 'running' | 'completed';
  result?: 'passed' | 'failed';
}

const RunTestCaseModal: React.FC<RunTestCaseModalProps> = ({
  isOpen,
  onClose,
  testRunName,
  testRunId,
  selectedTestCase,
  availableAutomatedTestCases = [],
  availableConfigurations = [],
  isLoading = false,
  onExecutionComplete
}) => {
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [selectedTestCases, setSelectedTestCases] = useState<Set<string>>(new Set());
  const [runLabel, setRunLabel] = useState('');
  const [selectAllTestCases, setSelectAllTestCases] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [testCasesProgress, setTestCasesProgress] = useState<TestCaseProgress[]>([]);
  const { startPolling } = useTestRunExecutionPolling();

  // Initialize selected test case if provided and reset on close
  React.useEffect(() => {
    if (isOpen && selectedTestCase) {
      setSelectedTestCases(new Set([selectedTestCase.id]));
      setSelectAllTestCases(false);
    } else if (isOpen && !selectedTestCase) {
      setSelectedTestCases(new Set());
      setSelectAllTestCases(false);
    } else if (!isOpen) {
      setSelectedService('');
      setSelectedDevice('');
      setSelectedTestCases(new Set());
      setRunLabel('');
      setSelectAllTestCases(false);
      setIsExecuting(false);
      setTestCasesProgress([]);
    }
  }, [isOpen, selectedTestCase]);

  // Determine which test cases to display
  const displayTestCases = selectedTestCase
    ? [{ id: selectedTestCase.id, code: selectedTestCase.code, title: selectedTestCase.title }]
    : availableAutomatedTestCases;

  const handleTestCaseToggle = (testCaseId: string) => {
    const newSelected = new Set(selectedTestCases);
    if (newSelected.has(testCaseId)) {
      newSelected.delete(testCaseId);
    } else {
      newSelected.add(testCaseId);
    }
    setSelectedTestCases(newSelected);
    setSelectAllTestCases(newSelected.size === displayTestCases.length);
  };

  const handleSelectAllTestCases = () => {
    if (selectAllTestCases) {
      setSelectedTestCases(new Set());
      setSelectAllTestCases(false);
    } else {
      setSelectedTestCases(new Set(displayTestCases.map(tc => tc.id)));
      setSelectAllTestCases(true);
    }
  };

  const handleRunJob = async () => {
    if (!testRunId) {
      toast.error('Test run ID is required');
      return;
    }

    if (!selectedDevice) {
      toast.error('Please select a device configuration');
      return;
    }

    setIsExecuting(true);

    const testCasesToRun = Array.from(selectedTestCases).map(id => {
      const testCase = displayTestCases.find(tc => tc.id === id);
      return {
        id,
        code: testCase?.code || id,
        title: testCase?.title || 'Unknown',
        status: 'pending' as const,
      };
    });

    setTestCasesProgress(testCasesToRun);

    try {
      // Step 1: Create ONE test_run_execution for all selected test cases
      setTestCasesProgress(prev =>
        prev.map(tc => ({ ...tc, status: 'running' as const }))
      );

      const testRunExecution = await testRunExecutionsApiService.createTestRunExecution({
        test_run_id: parseInt(testRunId),
        pipeline_id: runLabel || undefined,
        state: 1, // "In Progress"
      });

      // Step 2: Create test_case_execution entries for each test case with result "In Progress" (7)
      const testCaseExecutionPromises = testCasesToRun.map(async (testCase) => {
        try {
          await testCaseExecutionsApiService.createTestCaseExecution({
            testCaseId: testCase.id,
            testRunId: testRunId,
            result: 7, // "In Progress"
            configurationId: selectedDevice,
            comment: runLabel || undefined,
            testRunExecutionId: testRunExecution.id,
          });
          return { id: testCase.id, success: true };
        } catch (error) {
          console.error(`Failed to create test case execution for ${testCase.code}:`, error);
          toast.error(`Failed to create execution for ${testCase.code}`);
          return { id: testCase.id, success: false };
        }
      });

      const testCaseExecutionResults = await Promise.all(testCaseExecutionPromises);

      if (testCaseExecutionResults.some(result => result.success)) {
        try {
          await testRunsApiService.updateTestRunState(testRunId, 2);
        } catch (error) {
          console.error('Failed to update test run state to in progress:', error);
        }
      }

      // Step 3: Start polling on the single test_run_execution
      const testCasesSummary = testCasesToRun.map(tc => tc.code).join(', ');
      
      startPolling(
        {
          id: testRunExecution.id,
          testCaseId: testRunExecution.test_case_id ?? 0,
          testCaseCode: testCasesSummary,
          testCaseTitle: `${testCasesToRun.length} test case(s)`,
          testRunId: testRunExecution.test_run_id,
          configurationId: selectedDevice ? parseInt(selectedDevice, 10) : undefined,
          state: testRunExecution.state ?? 1,
          stateLabel: testRunExecution.state_label ?? 'In Progress',
          startedAt: new Date(),
        },
        async (completedExecution: TestRunExecution) => {
          if (onExecutionComplete) {
            onExecutionComplete(testRunId, completedExecution.state);
          }
        }
      );

      toast.success(
        `Started execution for ${testCasesToRun.length} test case(s). You can continue using the app while tests run in the background.`,
        { duration: 5000 }
      );

      // Reset modal state and close
      setTimeout(() => {
        setIsExecuting(false);
        setTestCasesProgress([]);
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Failed to start test executions:', error);
      toast.error('Failed to start test executions');
      setIsExecuting(false);
    }
  };

  const isFormValid = !isLoading && selectedService && selectedDevice && selectedTestCases.size > 0;

  const modalTitle = selectedTestCase
    ? `Run Test Case: ${selectedTestCase.code} - ${testRunName}`
    : `Run Test Cases - ${testRunName}`;

  return (
    <Modal isOpen={isOpen} onClose={isExecuting ? () => {} : onClose} title={modalTitle}>
      {isExecuting ? (
        <div className="space-y-4 py-4">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Starting Test Executions
            </h3>
            <p className="text-sm text-slate-600 dark:text-gray-400">
              Creating test execution entries and starting automated tests...
            </p>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {testCasesProgress.map((testCase) => (
              <div
                key={testCase.id}
                className="border border-slate-300 dark:border-slate-600 rounded-lg p-4 bg-slate-50 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-slate-900 dark:text-white">
                      {testCase.code}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-gray-400">
                      {testCase.title}
                    </div>
                  </div>
                  <div className="ml-4 flex items-center gap-3">
                    {testCase.status === 'running' && (
                      <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400">
                        <Loader className="w-5 h-5 animate-spin" />
                        <span className="font-medium">Running...</span>
                      </div>
                    )}
                    {testCase.status === 'completed' && testCase.result && (
                      <>
                        {testCase.result === 'passed' ? (
                          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                            <CheckCircle className="w-5 h-5" />
                            <span className="font-semibold">Passed</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                            <XCircle className="w-5 h-5" />
                            <span className="font-semibold">Failed</span>
                          </div>
                        )}
                      </>
                    )}
                    {testCase.status === 'pending' && (
                      <div className="text-sm text-slate-500 dark:text-gray-400">
                        Pending...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
            Service <span className="text-cyan-500">*</span>
          </label>
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            disabled={isLoading}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Select the service...</option>
            {mockServices.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} - {service.url}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-cyan-500">(*) indicates that it is required</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
            Device <span className="text-cyan-500">*</span>
          </label>
          <select
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
            disabled={isLoading}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Select the device...</option>
            {availableConfigurations.map((config) => (
              <option key={config.id} value={config.id}>
                {config.userAgent || config.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300">
              Test cases <span className="text-cyan-500">*</span>
            </label>
            {!selectedTestCase && !isLoading && (
              <button
                onClick={handleSelectAllTestCases}
                className="text-sm text-cyan-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
              >
                Select All
              </button>
            )}
          </div>
          <div className="border border-slate-300 dark:border-slate-600 rounded-lg p-4 bg-slate-900 max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="w-6 h-6 text-cyan-500 animate-spin" />
                <span className="ml-2 text-sm text-slate-400">Loading test cases...</span>
              </div>
            ) : displayTestCases.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-slate-400">No automated test cases found in this test run.</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-400 mb-3">
                  {selectedTestCase ? 'Running the selected test case:' : 'Select one or more test cases to run.'}
                </p>
                <div className="space-y-2">
                  {displayTestCases.map((testCase) => (
                    <label
                      key={testCase.id}
                      className="flex items-center space-x-3 cursor-pointer hover:bg-slate-800 p-2 rounded transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTestCases.has(testCase.id)}
                        onChange={() => handleTestCaseToggle(testCase.id)}
                        disabled={!!selectedTestCase}
                        className="w-4 h-4 rounded border-slate-600 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900 disabled:opacity-50"
                      />
                      <span className="text-sm text-slate-300">
                        {testCase.code} {testCase.title}
                      </span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
            Run Label (optional)
          </label>
          <input
            type="text"
            value={runLabel}
            onChange={(e) => setRunLabel(e.target.value)}
            placeholder="Maakta_yod"
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button
            variant="secondary"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleRunJob}
            disabled={!isFormValid}
            className="flex items-center space-x-2"
          >
            <Play className="w-4 h-4" />
            <span>Run Job Now</span>
          </Button>
        </div>
        </div>
      )}
    </Modal>
  );
};

export default RunTestCaseModal;
