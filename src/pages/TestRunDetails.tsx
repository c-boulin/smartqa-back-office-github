import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Calendar, User, Play, CheckCircle, XCircle, Clock, AlertTriangle, Loader, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import StatusBadge from '../components/UI/StatusBadge';
import TagsWithTooltip from '../components/UI/TagsWithTooltip';
import TestCaseDetailsSidebar from '../components/TestCase/TestCaseDetailsSidebar';
import TestRunDetailsFilters from '../components/TestRun/TestRunDetailsFilters';
import TestRunDetailsFiltersSidebar from '../components/TestRun/TestRunDetailsFiltersSidebar';
import AddExecutionCommentModal from '../components/TestRun/AddExecutionCommentModal';
import { testRunsApiService, TestRun } from '../services/testRunsApi';
import { testCasesApiService } from '../services/testCasesApi';
import { testCaseExecutionsApiService } from '../services/testCaseExecutionsApi';
import { useTestRunDetailsFilters } from '../hooks/useTestRunDetailsFilters';
import { useApp } from '../context/AppContext';
import { TestCase, TEST_RESULTS, TestResultId, Tag } from '../types';
import { getDeviceIcon, getDeviceColor } from '../utils/deviceIcons';
import { usePermissions } from '../hooks/usePermissions';
import { PERMISSIONS } from '../utils/permissions';
import toast from 'react-hot-toast';

// Test Result Dropdown Component
interface TestResultDropdownProps {
  value: TestResultId;
  onChange: (value: TestResultId, comment?: string) => void;
  disabled?: boolean;
  isUpdating?: boolean;
  testCaseTitle?: string;
  onOpenCommentModal: (selectedResultId: TestResultId) => void;
}

const TestResultDropdown: React.FC<TestResultDropdownProps> = ({
  value,
  onChange,
  disabled = false,
  isUpdating = false,
  testCaseTitle: _testCaseTitle = '',
  onOpenCommentModal
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState<TestResultId>(value);
  const [dropdownPosition, setDropdownPosition] = useState<{ vertical: 'bottom' | 'top'; horizontal: 'left' | 'right' }>({ vertical: 'bottom', horizontal: 'left' });
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const currentResultLabel = TEST_RESULTS[value];

  const calculatePosition = () => {
    if (buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const modalHeight = 400;
      const modalWidth = 320;

      const spaceBelow = viewportHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;
      const spaceRight = viewportWidth - buttonRect.left;
      const spaceLeft = buttonRect.right;

      const vertical = (spaceBelow < modalHeight && spaceAbove > modalHeight) ? 'top' : 'bottom';
      const horizontal = (spaceRight < modalWidth && spaceLeft > modalWidth) ? 'right' : 'left';

      setDropdownPosition({ vertical, horizontal });
    }
  };

  const handleToggle = () => {
    if (!disabled && !isUpdating) {
      if (!isOpen) {
        calculatePosition();
      }
      setIsOpen(!isOpen);
    }
  };

  const getResultColor = (resultId: TestResultId): string => {
    switch (resultId) {
      case 1: // Passed
        return 'bg-green-400';
      case 2: // Failed
        return 'bg-red-400';
      case 3: // Blocked
        return 'bg-yellow-400';
      case 4: // Retest
        return 'bg-orange-400';
      case 5: // Skipped
        return 'bg-purple-400';
      case 6: // Untested
        return 'bg-gray-400';
      case 7: // In Progress
        return 'bg-blue-400';
      case 8: // Unknown
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusColor = (resultLabel: string) => {
    switch (resultLabel) {
      case 'Passed':
        return 'text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600';
      case 'Failed':
        return 'text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600';
      case 'Blocked':
        return 'text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600';
      case 'Retest':
        return 'text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600';
      case 'Skipped':
        return 'text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600';
      case 'Untested':
      case 'In Progress':
      case 'Unknown':
        return 'text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600';
      default:
        return 'text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600';
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Used for UI interaction in dropdown component
  const handleResultSelect = (newResultId: TestResultId) => {
    setSelectedResult(newResultId);
  };

  const handleResultChange = (newResultId: TestResultId) => {
    setSelectedResult(newResultId);
  };

  const handleQuickUpdate = () => {
    onChange(selectedResult, undefined);
    setIsOpen(false);
  };

  const handleOpenCommentModal = () => {
    setIsOpen(false);
    onOpenCommentModal(selectedResult);
  };

  // Update selectedResult when value prop changes
  React.useEffect(() => {
    setSelectedResult(value);
  }, [value]);

  React.useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => {
      calculatePosition();
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        disabled={disabled || isUpdating}
        className={`w-full px-3 py-1.5 text-xs font-medium rounded-full border focus:outline-none focus:ring-2 focus:ring-cyan-400 text-left flex items-center justify-between ${getStatusColor(currentResultLabel)} ${
          disabled || isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'
        }`}
      >
        <div className="flex items-center">
          <div className={`w-2 h-2 rounded-full mr-2 ${getResultColor(value)}`}></div>
          <span>{currentResultLabel}</span>
        </div>
        {isUpdating ? (
          <Loader className="w-3 h-3 animate-spin text-slate-600 dark:text-gray-400" />
        ) : (
          <svg className="w-3 h-3 text-slate-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {isOpen && !disabled && !isUpdating && (
        <>
          <div
            className="fixed inset-0 z-[100]"
            onClick={() => setIsOpen(false)}
          />
          <div
            ref={dropdownRef}
            className={`absolute bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-2xl z-[101] w-80 max-h-96 ${
              dropdownPosition.vertical === 'bottom' ? 'top-full mt-1' : 'bottom-full mb-1'
            } ${
              dropdownPosition.horizontal === 'left' ? 'left-0' : 'right-0'
            }`}
          >
            <div className="p-3 border-b border-slate-300 dark:border-slate-600">
              <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-3">Select Result</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
              {Object.entries(TEST_RESULTS).map(([resultId, label]) => (
                <button
                  key={resultId}
                  type="button"
                  onClick={() => handleResultChange(parseInt(resultId) as TestResultId)}
                  className={`w-full px-4 py-2 text-left hover:bg-slate-100 dark:bg-slate-700 transition-colors flex items-center text-sm ${
                    selectedResult === parseInt(resultId) 
                      ? 'bg-cyan-600/30 border-l-4 border-cyan-400' 
                      : ''
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full mr-3 flex-shrink-0 ${getResultColor(parseInt(resultId) as TestResultId)}`}></div>
                  <span className={`${selectedResult === parseInt(resultId) ? 'text-cyan-300 font-medium' : 'text-slate-900 dark:text-white'}`}>
                    {label}
                  </span>
                  {selectedResult === parseInt(resultId) && (
                    <span className="ml-auto text-cyan-400">✓</span>
                  )}
                </button>
              ))}
            </div>
            </div>

            {/* Action Buttons */}
            <div className="border-t border-slate-300 dark:border-slate-600 p-3">
              <div className="flex flex-col space-y-2">
                <button
                  type="button"
                  onClick={handleOpenCommentModal}
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-600 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-sm rounded transition-colors flex items-center justify-center"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Add Comment
                </button>
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleQuickUpdate}
                    className="px-3 py-1.5 text-xs bg-cyan-600 hover:bg-cyan-700 text-slate-900 dark:text-white rounded transition-colors"
                  >
                    Update
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

interface TestCaseWithExecution {
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

const TestRunDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const testPlanIdFromUrl = searchParams.get('testPlanId') || undefined;
  const { state: appState, createTag } = useApp();
  const { hasPermission } = usePermissions();
  const [testRun, setTestRun] = useState<TestRun | null>(null);
  const [testCases, setTestCases] = useState<TestCaseWithExecution[]>([]);
  const [filteredTestCases, setFilteredTestCases] = useState<TestCaseWithExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDetailsSidebarOpen, setIsDetailsSidebarOpen] = useState(false);
  const [selectedTestCaseForDetails, setSelectedTestCaseForDetails] = useState<TestCase | null>(null);
  const [selectedConfigurationId, setSelectedConfigurationId] = useState<string | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentSearchTerm, setCurrentSearchTerm] = useState('');
  const [isFiltersSidebarOpen, setIsFiltersSidebarOpen] = useState(false);
  const [updatingResults, setUpdatingResults] = useState<Set<string>>(new Set());
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [selectedTestCaseForComment, setSelectedTestCaseForComment] = useState<TestCaseWithExecution | null>(null);

  // Ref to track if fetch is in progress to prevent duplicate requests
  const fetchInProgressRef = useRef(false);

  // Check if test run is closed (state 6)
  const isTestRunClosed = testRun?.state === 6;
  // Calculate progress metrics from current test cases
  const calculateProgressMetrics = useCallback((currentTestCases: TestCaseWithExecution[]) => {
    const totalTests = currentTestCases.length;
    const executedTests = currentTestCases.filter(tc => 
      tc.executionStatus === 1 || // Passed
      tc.executionStatus === 2 || // Failed
      tc.executionStatus === 4    // Retest
    ).length;
    const passedTests = currentTestCases.filter(tc => tc.executionStatus === 1).length;
    
    const progress = totalTests > 0 ? Math.round((executedTests / totalTests) * 100) : 0;
    const passRate = executedTests > 0 ? Math.round((passedTests / executedTests) * 100) : 0;
    
    return { progress, passRate, executedTests, totalTests, passedTests };
  }, []);

  // Current progress metrics
  const progressMetrics = calculateProgressMetrics(testCases);

  // Use filters hook
  const {
    filters,
    updateFilter,
    clearAllFilters,
    hasActiveFilters, // eslint-disable-line @typescript-eslint/no-unused-vars -- Used in filter state logic
    buildFilterCriteria
  } = useTestRunDetailsFilters();

  // Use tags from app context
  const tags = appState.tags;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Used in loading state UI
  const tagsLoading = appState.isLoadingTags;

  useEffect(() => {
    let isCancelled = false;

    const loadData = async () => {
      if (id && !isCancelled) {
        await fetchTestRunDetails(id);
      }
    };

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [id]);

  const fetchTestRunDetails = async (testRunId: string) => {
    // Prevent duplicate requests
    if (fetchInProgressRef.current) {

      return;
    }

    try {
      fetchInProgressRef.current = true;
      setLoading(true);
      setError(null);

      // Fetch test run details with included test cases and executions
      const testRunResponse = await testRunsApiService.getTestRun(testRunId);
      const transformedTestRun = testRunsApiService.transformApiTestRun(
        testRunResponse.data,
        testRunResponse.included
      );
      setTestRun(transformedTestRun);

      // Get configurations from test run
      const configurations = transformedTestRun.configurations || [];

      // If no configurations, add a default empty config
      const configsToProcess = configurations.length > 0 ? configurations : [{ id: '', label: '' }];

      // Get test cases from included data (raw, before transformation)
      const rawIncludedTestCases = (testRunResponse.included || [])
        .filter((item: Record<string, unknown>) => item.type === 'TestCase');

      // Process test cases with executions for each configuration
      const testCasesWithExecution = transformedTestRun.testCaseIds.flatMap(testCaseId => {
        // Find the raw test case in included data - need to extract numeric ID from path
        const rawTestCase = rawIncludedTestCases.find((item: Record<string, unknown>) => {
          const itemId = typeof item.id === 'string' ? item.id.split('/').pop() : item.id?.toString();
          return itemId === testCaseId;
        });

        if (!rawTestCase) {
          console.warn(`🏃 ⚠️ Test case ${testCaseId} not found in included data`);
          return configsToProcess.map(config => ({
            id: testCaseId,
            title: `Test Case ${testCaseId}`,
            priority: 'medium',
            type: 'functional',
            executionStatus: 6 as TestResultId,
            executionResult: TEST_RESULTS[6],
            fullTestCase: null,
            configurationId: config.id || undefined,
            configurationLabel: config.label || undefined
          }));
        }

        // Transform the test case
        const testCase = testCasesApiService.transformApiTestCase(rawTestCase, testRunResponse.included);

        // Get executions from the test case attributes
        const rawAttrs = rawTestCase.attributes as Record<string, unknown>;
        const executionsData = rawAttrs.executions as Array<Record<string, unknown>> | undefined;

        // Create entry for each configuration
        return configsToProcess.map(config => {
          let executionResult: TestResultId = 6; // Default to 'Untested'

          if (executionsData && Array.isArray(executionsData) && executionsData.length > 0) {

            // Filter executions for this test run and configuration
            const testRunExecutions = executionsData.filter((execution: Record<string, unknown>) => {
              // Extract and normalize IDs - handle both string and number types
              const executionTestRunId = execution.test_run_id?.toString() || '';
              const executionConfigId = execution.configuration_id?.toString() || '';
              const expectedTestRunId = testRunId?.toString() || '';
              const expectedConfigId = config.id?.toString() || '';

              const matchesTestRun = executionTestRunId === expectedTestRunId;
              const matchesConfig = config.id ?
                executionConfigId === expectedConfigId :
                !execution.configuration_id;

              return matchesTestRun && matchesConfig;
            });

            if (testRunExecutions.length > 0) {
              // Sort by created_at date and get the latest execution
              const latestExecution = testRunExecutions.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
                const aDate = new Date(a.created_at as string).getTime();
                const bDate = new Date(b.created_at as string).getTime();
                return bDate - aDate;
              })[0];

              const rawResult = latestExecution.result;

              if (typeof rawResult === 'number') {
                executionResult = rawResult as TestResultId;
              } else if (typeof rawResult === 'string') {
                const parsedInt = parseInt(rawResult);
                if (!isNaN(parsedInt) && TEST_RESULTS[parsedInt as TestResultId]) {
                  executionResult = parsedInt as TestResultId;
                }
              }

            }
          }

          return {
            id: testCase.id,
            title: testCase.title,
            priority: testCase.priority,
            type: testCase.type,
            executionStatus: executionResult,
            executionResult: TEST_RESULTS[executionResult],
            fullTestCase: testCase,
            configurationId: config.id || undefined,
            configurationLabel: config.label || undefined
          };
        });
      });

      setTestCases(testCasesWithExecution);
      setFilteredTestCases(testCasesWithExecution);

    } catch (err) {
      console.error('Failed to fetch test run details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load test run details');
    } finally {
      setLoading(false);
      fetchInProgressRef.current = false;
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Used in status display rendering
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Passed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'Failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'Blocked':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'Retest':
        return <AlertTriangle className="w-4 h-4 text-orange-400" />;
      case 'Skipped':
        return <Clock className="w-4 h-4 text-purple-400" />;
      case 'Untested':
      case 'In Progress':
      case 'Unknown':
        return <Clock className="w-4 h-4 text-slate-600 dark:text-gray-400" />;
      default:
        return <Clock className="w-4 h-4 text-slate-600 dark:text-gray-400" />;
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Used in status display rendering
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Passed':
        return 'text-green-700 dark:text-green-400 bg-green-500/20 border-green-500/50';
      case 'Failed':
        return 'text-red-400 bg-red-500/20 border-red-500/50';
      case 'Blocked':
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50';
      case 'Retest':
        return 'text-orange-400 bg-orange-500/20 border-orange-500/50';
      case 'Skipped':
        return 'text-purple-400 bg-purple-500/20 border-purple-500/50';
      case 'Untested':
      case 'In Progress':
      case 'Unknown':
        return 'text-slate-600 dark:text-gray-400 bg-gray-500/20 border-gray-500/50';
      default:
        return 'text-slate-600 dark:text-gray-400 bg-gray-500/20 border-gray-500/50';
    }
  };

  const handleTestCaseTitleClick = (testCaseWithExecution: TestCaseWithExecution) => {
    if (testCaseWithExecution.fullTestCase) {
      setSelectedTestCaseForDetails(testCaseWithExecution.fullTestCase);
      setSelectedConfigurationId(testCaseWithExecution.configurationId);
      setIsDetailsSidebarOpen(true);
    }
  };

  const closeDetailsSidebar = () => {
    setIsDetailsSidebarOpen(false);
    setSelectedTestCaseForDetails(null);
    setSelectedConfigurationId(undefined);
  };

  const handleExecutionResultChange = async (testCaseId: string, newResultId: TestResultId, comment?: string, configurationId?: string) => {
    if (!testRun || !id || isTestRunClosed) {
      if (isTestRunClosed) {
        toast.error('Cannot update execution results for closed test runs');
      }
      return;
    }

    const newResultLabel = TEST_RESULTS[newResultId];
    const updateKey = `${testCaseId}-${configurationId || 'default'}-${id}`;

    try {
      // Add to updating set to show loading state
      setUpdatingResults(prev => new Set([...prev, updateKey]));

      // Check if this is the first execution being created for this test run
      // Count how many test cases currently have executions (not Untested - status 6)
      const testCasesWithExecutionsBefore = testCases.filter(tc => tc.executionStatus !== 6).length;
      const isFirstExecution = testCasesWithExecutionsBefore === 0;

      // Use new POST endpoint for test case executions
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- API response needed for error handling
      const response = await testCaseExecutionsApiService.createTestCaseExecution({
        testCaseId,
        testRunId: id,
        result: newResultId,
        comment: comment || undefined,
        configurationId: configurationId
      });

      // Update local state to reflect the change immediately - match by both test case ID and configuration ID
      const updatedTestCases = testCases.map(tc =>
        tc.id === testCaseId && tc.configurationId === configurationId
          ? { ...tc, executionStatus: newResultId, executionResult: newResultLabel }
          : tc
      );

      setTestCases(updatedTestCases);

      setFilteredTestCases(prevFiltered =>
        prevFiltered.map(tc =>
          tc.id === testCaseId && tc.configurationId === configurationId
            ? { ...tc, executionStatus: newResultId, executionResult: newResultLabel }
            : tc
        )
      );

      // Check if we need to update test run state
      // Check if all test cases have final results (not Untested - status 6 or In Progress - status 7)
      const allTestCasesHaveResults = updatedTestCases.every(tc => tc.executionStatus !== 6 && tc.executionStatus !== 7);
      const totalTestCases = updatedTestCases.length;

      if (allTestCasesHaveResults && testRun.state !== 5 && testRun.state !== 6) {
        // All test cases have final results, move test run to "Done" (state 5)
        // This will also update the test plan to "Done" via updateTestRunState
        try {
          await testRunsApiService.updateTestRunState(id, 5, testRun.testPlanId || testPlanIdFromUrl);
          setTestRun({ ...testRun, state: 5 });

          toast.success(`Execution result updated to ${newResultLabel}`);
        } catch (error) {
          console.error('❌ Failed to update test run state:', error);
          toast.success(`Execution result updated to ${newResultLabel}`);
        }
      } else if (!allTestCasesHaveResults && testRun.state === 5) {
        // Test run was "Done" but now some test cases are untested or in progress - move back to "In Progress" (state 2)
        // This will also update the test plan to "In Progress" via updateTestRunState
        try {
          await testRunsApiService.updateTestRunState(id, 2, testRun.testPlanId || testPlanIdFromUrl);
          setTestRun({ ...testRun, state: 2 });
          toast.success(`Execution result updated to ${newResultLabel}`);
        } catch (error) {
          console.error('❌ Failed to update test run state:', error);
          toast.success(`Execution result updated to ${newResultLabel}`);
        }
      } else if (isFirstExecution && testRun.state === 1) {
        // First execution created but not all have results - move to "In Progress" (state 2)
        // This will also update the test plan to "In Progress" via updateTestRunState
        try {
          await testRunsApiService.updateTestRunState(id, 2, testRun.testPlanId || testPlanIdFromUrl);
          setTestRun({ ...testRun, state: 2 });
          toast.success(`Execution result updated to ${newResultLabel}`);
        } catch (error) {
          console.error('❌ Failed to update test run state:', error);
          toast.success(`Execution result updated to ${newResultLabel}`);
        }
      } else {
        toast.success(`Execution result updated to ${newResultLabel}`);
      }

    } catch (error) {
      console.error('❌ Failed to update execution result:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update execution result';
      toast.error(errorMessage);
    } finally {
      // Remove from updating set
      setUpdatingResults(prev => {
        const newSet = new Set(prev);
        newSet.delete(updateKey);
        return newSet;
      });
    }
  };

  // Filter functions
  const applyFilters = () => {
    let filtered = [...testCases];
    const criteria = buildFilterCriteria();

    // Apply search filter
    if (currentSearchTerm.trim()) {
      filtered = filtered.filter(testCase =>
        testCase.title.toLowerCase().includes(currentSearchTerm.toLowerCase()) ||
        testCase.id.toLowerCase().includes(currentSearchTerm.toLowerCase())
      );
    }

    // Apply automation status filter
    if (criteria.automationStatus) {
      const automationValue = parseInt(criteria.automationStatus);
      filtered = filtered.filter(testCase => {
        // We need to get the full test case to check automation status
        return testCase.fullTestCase?.automationStatus === automationValue;
      });
    }

    // Apply priority filter
    if (criteria.priority) {
      filtered = filtered.filter(testCase => {
        return testCase.priority.toLowerCase() === criteria.priority?.toLowerCase();
      });
    }

    // Apply type filter
    if (criteria.type) {
      filtered = filtered.filter(testCase => {
        // criteria.type is a numeric ID string like "1", "6", etc.
        // testCase.fullTestCase?.typeId is the numeric ID
        const typeIdString = testCase.fullTestCase?.typeId?.toString();
        return typeIdString === criteria.type;
      });
    }

    // Apply state filter
    if (criteria.state) {
      const stateValue = parseInt(criteria.state);
      filtered = filtered.filter(testCase => {
        // Map state numbers to status strings for comparison
        const statusMap = { 1: 'active', 2: 'draft', 3: 'in_review', 4: 'outdated', 5: 'rejected' };
        const expectedStatus = statusMap[stateValue as keyof typeof statusMap];
        return testCase.fullTestCase?.status === expectedStatus;
      });
    }

    // Apply result filter
    if (criteria.result) {
      // Map string values from filter to TestResultId numbers
      const resultMap: Record<string, TestResultId> = {
        'passed': 1,
        'failed': 2,
        'blocked': 3,
        'retest': 4,
        'skipped': 5,
        'untested': 6,
        'in_progress': 7,
        'unknown': 8
      };

      const targetResultId = resultMap[criteria.result.toLowerCase()];
      if (targetResultId) {
        filtered = filtered.filter(testCase => {
          return testCase.executionStatus === targetResultId;
        });
      }
    }

    // Apply tags filter
    if (criteria.tags && criteria.tags.length > 0) {
      const selectedTagLabels = criteria.tags.map(tag => tag.label.toLowerCase());
      filtered = filtered.filter(testCase => {
        if (!testCase.fullTestCase?.tags || testCase.fullTestCase.tags.length === 0) {
          return false;
        }
        return testCase.fullTestCase.tags.some(tag => 
          selectedTagLabels.includes(tag.toLowerCase())
        );
      });
    }

    setFilteredTestCases(filtered);
  };

  const handleSearch = (term: string) => {
    setCurrentSearchTerm(term);
    // Apply filters will be called by useEffect
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch(searchTerm);
    }
  };

  const clearIndividualFilter = (filterType: keyof typeof filters, _value?: string) => {
    if (filterType === 'search') {
      setSearchTerm('');
      setCurrentSearchTerm('');
    } else if (filterType === 'tags') {
      updateFilter('tags', []);
    } else {
      updateFilter(filterType, 'all');
    }
  };

  const handleCreateTag = async (label: string): Promise<Tag> => {
    return await createTag(label);
  };

  // Apply filters whenever criteria change
  useEffect(() => {
    if (testCases.length > 0) {
      applyFilters();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- applyFilters would cause infinite loop
  }, [testCases, currentSearchTerm, filters]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-gray-400">Loading test run details...</p>
        </div>
      </div>
    );
  }

  if (error || !testRun) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Card className="p-8 text-center">
          <div className="text-red-400 mb-4">
            <p className="text-lg font-medium">Failed to load test run details</p>
            <p className="text-sm text-slate-600 dark:text-gray-400 mt-2">{error}</p>
          </div>
          <Button onClick={() => navigate('/test-runs')}>
            Back to Test Runs
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="secondary"
            icon={ArrowLeft}
            onClick={() => navigate('/test-runs')}
          >
            Back to Test Runs
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{testRun.name}</h1>
            <p className="text-slate-600 dark:text-gray-400">Test Run TR{testRun.id}</p>
          </div>
        </div>
      </div>

      {/* Test Run Overview */}
      <Card gradient className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <h3 className="text-sm font-medium text-slate-600 dark:text-gray-400 mb-2">Status</h3>
            <div className="flex items-center">
              <Play className="w-4 h-4 text-blue-400 mr-2" />
              <span className="text-slate-900 dark:text-white font-medium">
                {testRun.state === 1 ? 'New' :
                 testRun.state === 2 ? 'In Progress' :
                 testRun.state === 3 ? 'Under Review' :
                 testRun.state === 4 ? 'Rejected' :
                 testRun.state === 5 ? 'Done' :
                 testRun.state === 6 ? 'Closed' : 'Unknown'}
              </span>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-slate-600 dark:text-gray-400 mb-2">Progress</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-900 dark:text-white font-medium">{progressMetrics.progress}%</span>
                <span className="text-sm text-slate-600 dark:text-gray-400">
                  {progressMetrics.executedTests}/{progressMetrics.totalTests} executed
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-cyan-400 to-purple-500 h-2 rounded-full"
                  style={{ width: `${progressMetrics.progress}%` }}
                ></div>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-gray-400">
                <span>Pass Rate: {progressMetrics.passRate}%</span>
                <span>{progressMetrics.passedTests} passed</span>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-slate-600 dark:text-gray-400 mb-2">Assigned To</h3>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full flex items-center justify-center mr-3">
                <User className="w-4 h-4 text-slate-900 dark:text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{testRun.assignedTo.name}</p>
                <p className="text-xs text-slate-600 dark:text-gray-400">{testRun.assignedTo.email}</p>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-slate-600 dark:text-gray-400 mb-2">Timeline</h3>
            <div className="space-y-1 text-sm">
              <div className="flex items-center text-slate-700 dark:text-gray-300">
                <Calendar className="w-3 h-3 mr-2" />
                <span>Started: {format(testRun.startDate, 'MMM dd, yyyy')}</span>
              </div>
              {testRun.endDate && (
                <div className="flex items-center text-slate-700 dark:text-gray-300">
                  <Clock className="w-3 h-3 mr-2" />
                  <span>Ended: {format(testRun.endDate, 'MMM dd, yyyy')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Test Results Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {(() => {
          // Calculate counts for each result type
          const resultCounts = {
            1: testCases.filter(tc => tc.executionStatus === 1).length, // Passed
            2: testCases.filter(tc => tc.executionStatus === 2).length, // Failed
            3: testCases.filter(tc => tc.executionStatus === 3).length, // Blocked
            4: testCases.filter(tc => tc.executionStatus === 4).length, // Retest
            5: testCases.filter(tc => tc.executionStatus === 5).length, // Skipped
            6: testCases.filter(tc => tc.executionStatus === 6).length, // Untested
            7: testCases.filter(tc => tc.executionStatus === 7).length, // In Progress
            8: testCases.filter(tc => tc.executionStatus === 8).length, // Unknown
          };

          const getResultColor = (resultId: TestResultId): string => {
            switch (resultId) {
              case 1: return 'text-green-400';
              case 2: return 'text-red-400';
              case 3: return 'text-yellow-400';
              case 4: return 'text-orange-400';
              case 5: return 'text-purple-400';
              case 6: return 'text-slate-600 dark:text-gray-400';
              case 7: return 'text-blue-400';
              case 8: return 'text-slate-500 dark:text-gray-500';
              default: return 'text-slate-600 dark:text-gray-400';
            }
          };

          return Object.entries(TEST_RESULTS).map(([resultId, label]) => {
            const id = parseInt(resultId) as TestResultId;
            const count = resultCounts[id];
            const color = getResultColor(id);
            
            return (
              <Card key={resultId} className="p-4 text-center">
                <div className={`text-2xl font-bold mb-1 ${color}`}>{count}</div>
                <div className="text-sm text-slate-600 dark:text-gray-400">{label}</div>
              </Card>
            );
          });
        })()}
      </div>
      {/* Test Cases Table */}
      <TestRunDetailsFilters
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        onSearchKeyPress={handleSearchKeyPress}
        currentSearchTerm={currentSearchTerm}
        filters={filters}
        onFilterChange={updateFilter}
        onApplyFilters={applyFilters}
        onClearAllFilters={() => {
          clearAllFilters();
          setSearchTerm('');
          setCurrentSearchTerm('');
        }}
        onOpenFiltersSidebar={() => setIsFiltersSidebarOpen(true)}
        availableTags={tags}
        onCreateTag={handleCreateTag}
        onClearIndividualFilter={clearIndividualFilter}
      />

      <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-lg backdrop-blur-sm transition-all duration-300 overflow-visible">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Test Cases ({filteredTestCases.length}{filteredTestCases.length !== testCases.length ? ` of ${testCases.length}` : ''})
          </h3>
        </div>
        
        <div className="overflow-x-auto" style={{ overflow: 'visible' }}>
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-600 dark:text-gray-400">ID</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-600 dark:text-gray-400">Title</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-600 dark:text-gray-400">Priority</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-600 dark:text-gray-400">Type</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-600 dark:text-gray-400">Tags</th>
                {testRun && testRun.configurations && testRun.configurations.length > 0 && (
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-600 dark:text-gray-400">Configuration</th>
                )}
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-600 dark:text-gray-400">Execution Result</th>
              </tr>
            </thead>
            <tbody style={{ position: 'relative', overflow: 'visible' }}>
              {filteredTestCases.map((testCase, index) => (
                <tr key={`${testCase.id}-${testCase.configurationId || 'default'}-${index}`} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:bg-slate-800/30 transition-colors" style={{ position: 'relative', overflow: 'visible' }}>
                  <td className="py-4 px-6 text-sm text-slate-700 dark:text-gray-300 font-mono">
                    TC-{testCase.fullTestCase?.projectRelativeId ?? testCase.id}
                  </td>
                  <td className="py-4 px-6">
                    <button
                      onClick={() => handleTestCaseTitleClick(testCase)}
                      className="text-left w-full group"
                      disabled={!testCase.fullTestCase}
                    >
                      <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer">
                        {testCase.title}
                      </h3>
                    </button>
                  </td>
                  <td className="py-4 px-6">
                    <StatusBadge status={testCase.priority} type="priority" />
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/50">
                      {testCase.type}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <TagsWithTooltip
                      tags={Array.isArray(testCase.fullTestCase?.tags) ? testCase.fullTestCase.tags : []}
                      maxVisible={2}
                    />
                  </td>
                  {testRun && testRun.configurations && testRun.configurations.length > 0 && (
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-gray-200 border border-slate-300 dark:border-slate-600">
                        <span className={getDeviceColor(testCase.configurationLabel || '')}>
                          {getDeviceIcon(testCase.configurationLabel || '')}
                        </span>
                        {testCase.configurationLabel || 'N/A'}
                      </span>
                    </td>
                  )}
                  <td className="py-4 px-6" style={{ position: 'relative', overflow: 'visible' }}>
                    <div className="space-y-2">
                      <TestResultDropdown
                        value={testCase.executionStatus}
                        onChange={(newResultId, comment) => handleExecutionResultChange(testCase.id, newResultId, comment, testCase.configurationId)}
                        disabled={!hasPermission(PERMISSIONS.TEST_CASE_EXECUTION.UPDATE) || isTestRunClosed || updatingResults.has(`${testCase.id}-${testCase.configurationId || 'default'}-${testRun?.id}`)}
                        isUpdating={updatingResults.has(`${testCase.id}-${testCase.configurationId || 'default'}-${testRun?.id}`)}
                        testCaseTitle={testCase.title}
                        onOpenCommentModal={(selectedResultId) => {
                          setSelectedTestCaseForComment({ ...testCase, executionStatus: selectedResultId });
                          setIsCommentModalOpen(true);
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Test Case Details Sidebar */}
      <TestCaseDetailsSidebar
        isOpen={isDetailsSidebarOpen}
        onClose={closeDetailsSidebar}
        testCase={selectedTestCaseForDetails}
        context="test-run-details"
        testRunId={testRun?.id}
        isTestRunClosed={isTestRunClosed}
        configurationId={selectedConfigurationId}
        configurationLabel={selectedTestCaseForDetails ?
          testCases.find(tc => tc.id === selectedTestCaseForDetails.id && tc.configurationId === selectedConfigurationId)?.configurationLabel : undefined
        }
        currentExecutionResult={selectedTestCaseForDetails ?
          testCases.find(tc => tc.id === selectedTestCaseForDetails.id && tc.configurationId === selectedConfigurationId)?.executionStatus : undefined
        }
        onExecutionResultChange={(testCaseId, testRunId, newResultId) => {
          handleExecutionResultChange(testCaseId, newResultId, undefined, selectedConfigurationId);
        }}
      />

      {/* Test Run Details Filters Sidebar */}
      <TestRunDetailsFiltersSidebar
        isOpen={isFiltersSidebarOpen}
        onClose={() => setIsFiltersSidebarOpen(false)}
        filters={filters}
        onFilterChange={updateFilter}
        onApplyFilters={applyFilters}
        onClearAllFilters={() => {
          clearAllFilters();
          setSearchTerm('');
          setCurrentSearchTerm('');
        }}
        availableTags={tags}
        onCreateTag={handleCreateTag}
      />

      {/* Add Comment Modal */}
      {selectedTestCaseForComment && (
        <AddExecutionCommentModal
          isOpen={isCommentModalOpen}
          onClose={() => {
            setIsCommentModalOpen(false);
            setSelectedTestCaseForComment(null);
          }}
          onSubmit={(resultId, comment) => {
            if (selectedTestCaseForComment) {
              handleExecutionResultChange(
                selectedTestCaseForComment.id,
                resultId,
                comment,
                selectedTestCaseForComment.configurationId
              );
            }
            setIsCommentModalOpen(false);
            setSelectedTestCaseForComment(null);
          }}
          currentResult={selectedTestCaseForComment.executionStatus}
          testCaseTitle={selectedTestCaseForComment.title}
        />
      )}
    </div>
  );
};

export default TestRunDetails;