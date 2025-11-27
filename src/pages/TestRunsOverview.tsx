import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Clock, AlertTriangle, Loader, Search, Filter, X, MessageSquare } from 'lucide-react';
// import { format } from 'date-fns';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import StatusBadge from '../components/UI/StatusBadge';
import TestCaseDetailsSidebar from '../components/TestCase/TestCaseDetailsSidebar';
import AddExecutionCommentModal from '../components/TestRun/AddExecutionCommentModal';
import { testRunsApiService, TestRun } from '../services/testRunsApi';
import { testCasesApiService } from '../services/testCasesApi';
import { testCaseExecutionsApiService } from '../services/testCaseExecutionsApi';
import { configurationsApiService } from '../services/configurationsApi';
import { useApp } from '../context/AppContext';
import { useRestoreLastProject } from '../hooks/useRestoreLastProject';
import { TestCase, TEST_RESULTS, TestResultId } from '../types';
import { getDeviceIcon, getDeviceColor } from '../utils/deviceIcons';
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
  testRunId: string;
  testRunName: string;
  fullTestCase: TestCase | null;
  configurationId?: string;
  configurationLabel?: string;
}

const TestRunsOverview: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { getSelectedProject } = useApp();
  const selectedProject = getSelectedProject();

  useRestoreLastProject();

  // Get filter from URL params
  const resultFilter = searchParams.get('result'); // 'passed', 'failed', 'blocked', or null for all
  
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [allTestCasesWithExecution, setAllTestCasesWithExecution] = useState<TestCaseWithExecution[]>([]);
  const [filteredTestCases, setFilteredTestCases] = useState<TestCaseWithExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentSearchTerm, setCurrentSearchTerm] = useState('');
  const [selectedResultFilter, setSelectedResultFilter] = useState<string>(resultFilter || 'all');
  const [updatingResults, setUpdatingResults] = useState<Set<string>>(new Set());
  const [isDetailsSidebarOpen, setIsDetailsSidebarOpen] = useState(false);
  const [selectedTestCaseForDetails, setSelectedTestCaseForDetails] = useState<TestCase | null>(null);
  const [selectedConfigurationId, setSelectedConfigurationId] = useState<string | undefined>(undefined);
  const [selectedConfigurationLabel, setSelectedConfigurationLabel] = useState<string | undefined>(undefined);
  const [selectedTestRunId, setSelectedTestRunId] = useState<string | undefined>(undefined);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [selectedTestCaseForComment, setSelectedTestCaseForComment] = useState<TestCaseWithExecution | null>(null);

  useEffect(() => {
    if (selectedProject) {
      fetchTestRunsOverview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchTestRunsOverview is stable
  }, [selectedProject]);

  const fetchTestRunsOverview = async () => {
    if (!selectedProject) return;

    try {
      setLoading(true);
      setError(null);

      // STEP 1: Fetch all test runs
      const testRunsResponse = await testRunsApiService.getTestRuns(selectedProject.id, 1, 1000);

      // STEP 2: Filter for active test runs only (all states except closed state 6)
      const activeApiTestRuns = testRunsResponse.data.filter(apiTestRun => {
        const state = apiTestRun.attributes.state;
        return state !== 6 && state !== "6";
      });

      // Transform active test runs
      const activeTestRuns = activeApiTestRuns.map(apiTestRun =>
        testRunsApiService.transformApiTestRun(apiTestRun, testRunsResponse.included)
      );

      setTestRuns(activeTestRuns);

      // STEP 3: Collect all unique test case IDs from executions
      const testCaseIdsSet = new Set<string>();
      for (const apiTestRun of activeApiTestRuns) {
        if (apiTestRun.attributes.executions && Array.isArray(apiTestRun.attributes.executions)) {
          apiTestRun.attributes.executions.forEach((execution: { test_case_id?: number; [key: string]: unknown }) => {
            if (execution.test_case_id) {
              testCaseIdsSet.add(execution.test_case_id.toString());
            }
          });
        }
      }

      // STEP 4: Fetch all test cases for this project
      const testCasesMap = new Map<string, TestCase>();
      if (testCaseIdsSet.size > 0) {
        const itemsPerPage = 100;
        const testCasesResponse = await testCasesApiService.getTestCases(1, itemsPerPage, selectedProject.id);
        const totalPages = Math.ceil(testCasesResponse.meta.totalItems / itemsPerPage);

        let allTestCasesData = [...testCasesResponse.data];

        if (totalPages > 1) {
          const pagePromises = [];
          for (let page = 2; page <= totalPages; page++) {
            pagePromises.push(testCasesApiService.getTestCases(page, itemsPerPage, selectedProject.id));
          }
          const pageResponses = await Promise.all(pagePromises);
          pageResponses.forEach(response => {
            allTestCasesData = [...allTestCasesData, ...response.data];
          });
        }

        allTestCasesData.forEach(apiTestCase => {
          try {
            const testCase = testCasesApiService.transformApiTestCase(apiTestCase, testCasesResponse.included);
            testCasesMap.set(testCase.id, testCase);
          } catch (error) {
            console.error(`Failed to transform test case ${apiTestCase.attributes.id}:`, error);
          }
        });
      }

      // STEP 5: Fetch all configurations
      const configurationsMap = new Map<string, string>();
      try {
        const configurationsResponse = await configurationsApiService.getConfigurations();
        configurationsResponse.data.forEach(apiConfig => {
          const config = configurationsApiService.transformApiConfiguration(apiConfig);
          configurationsMap.set(config.id, config.label);
        });
      } catch (error) {
        console.error('Failed to fetch configurations:', error);
      }

      // STEP 6: Process executions from all active test runs
      const allTestCasesWithExecution: TestCaseWithExecution[] = [];

      for (const apiTestRun of activeApiTestRuns) {
        const testRunId = apiTestRun.attributes.id.toString();
        const testRunName = apiTestRun.attributes.name;

        // Get default config ID if there's only one configuration
        const testRunConfigs = new Set<string>();
        if (apiTestRun.relationships.configurations?.data) {
          apiTestRun.relationships.configurations.data.forEach(configRef => {
            const configId = configRef.id.split('/').pop();
            if (configId) testRunConfigs.add(configId);
          });
        }
        const defaultConfigId = testRunConfigs.size === 1 ? Array.from(testRunConfigs)[0] : undefined;

        // Process executions for this test run
        if (apiTestRun.attributes.executions && Array.isArray(apiTestRun.attributes.executions)) {
          // Group by test case + configuration and keep only the latest execution per combination
          const latestExecutionPerCombo = new Map<string, { test_case_id?: number; result?: number; configuration_id?: number; created_at: string; [key: string]: unknown }>();

          apiTestRun.attributes.executions.forEach((execution: { test_case_id?: number; result?: number; configuration_id?: number; created_at: string; [key: string]: unknown }) => {
            const testCaseId = execution.test_case_id ? execution.test_case_id.toString() : null;
            const configId = execution.configuration_id ? execution.configuration_id.toString() : 'no-config';
            const comboKey = `${testCaseId}-${configId}`;
            const executionDate = new Date(execution.created_at);

            const existing = latestExecutionPerCombo.get(comboKey);
            if (!existing || new Date(existing.created_at) < executionDate) {
              latestExecutionPerCombo.set(comboKey, execution);
            }
          });

          // Create test case instances from latest executions
          Array.from(latestExecutionPerCombo.values()).forEach((execution: { test_case_id?: number; result?: number; configuration_id?: number; created_at: string; [key: string]: unknown }) => {
            const testCaseId = execution.test_case_id ? execution.test_case_id.toString() : null;
            if (!testCaseId) return;

            // Resolve configuration ID - check both configuration_id and configurationId
            let configId = execution.configuration_id ? execution.configuration_id.toString() :
                          (execution as Record<string, unknown>).configurationId ? ((execution as Record<string, unknown>).configurationId as string | number).toString() : undefined;
            if (!configId && defaultConfigId) {
              configId = defaultConfigId;
            }

            const configLabel = configId && configId !== 'no-config' ? configurationsMap.get(configId) : undefined;
            const rawResult = execution.result;

            // Convert result to TestResultId
            let resultId: TestResultId;
            if (typeof rawResult === 'number') {
              resultId = rawResult as TestResultId;
            } else if (typeof rawResult === 'string') {
              const parsedInt = parseInt(rawResult);
              if (!isNaN(parsedInt) && TEST_RESULTS[parsedInt as TestResultId]) {
                resultId = parsedInt as TestResultId;
              } else {
                const foundEntry = Object.entries(TEST_RESULTS).find(([_id, label]) =>
                  label.toLowerCase() === rawResult.toLowerCase()
                );
                resultId = foundEntry ? parseInt(foundEntry[0]) as TestResultId : 6;
              }
            } else {
              resultId = 6;
            }

            // Get test case from map or create fallback
            const testCase = testCasesMap.get(testCaseId);

            allTestCasesWithExecution.push({
              id: testCaseId,
              title: testCase?.title || `Test Case ${testCaseId}`,
              priority: testCase?.priority || 'medium',
              type: testCase?.type || 'functional',
              executionStatus: resultId,
              executionResult: TEST_RESULTS[resultId],
              testRunId: testRunId,
              testRunName: testRunName,
              fullTestCase: testCase || null,
              configurationId: configId,
              configurationLabel: configLabel
            });
          });
        }
      }

      setAllTestCasesWithExecution(allTestCasesWithExecution);
      setFilteredTestCases(allTestCasesWithExecution);

      // Apply initial filter if provided in URL
      if (resultFilter && resultFilter !== 'all') {
        applyResultFilter(resultFilter, allTestCasesWithExecution);
      }

    } catch (err) {
      console.error('Failed to fetch test runs overview:', err);
      setError(err instanceof Error ? err.message : 'Failed to load test runs overview');
    } finally {
      setLoading(false);
    }
  };

  const applyResultFilter = (filter: string, data: TestCaseWithExecution[] = allTestCasesWithExecution) => {
    let filtered = [...data];

    // Apply search filter
    if (currentSearchTerm.trim()) {
      filtered = filtered.filter(testCase =>
        testCase.title.toLowerCase().includes(currentSearchTerm.toLowerCase()) ||
        testCase.id.toLowerCase().includes(currentSearchTerm.toLowerCase()) ||
        testCase.testRunName.toLowerCase().includes(currentSearchTerm.toLowerCase())
      );
    }

    // Apply result filter
    if (filter !== 'all') {
      // Convert filter string to result ID for comparison
      const filterResultId = Object.entries(TEST_RESULTS).find(([_id, label]) => 
        label.toLowerCase() === filter.toLowerCase()
      )?.[0];
      
      if (filterResultId) {
        filtered = filtered.filter(testCase => testCase.executionStatus === parseInt(filterResultId));
      }
    }

    setFilteredTestCases(filtered);
  };

  const handleSearch = (term: string) => {
    setCurrentSearchTerm(term);
    applyAllFilters(selectedResultFilter, term);
  };

  const handleTestCaseTitleClick = (testCaseWithExecution: TestCaseWithExecution) => {
    if (testCaseWithExecution.fullTestCase) {
      setSelectedTestCaseForDetails(testCaseWithExecution.fullTestCase);
      setSelectedConfigurationId(testCaseWithExecution.configurationId);
      setSelectedConfigurationLabel(testCaseWithExecution.configurationLabel);
      setSelectedTestRunId(testCaseWithExecution.testRunId);
      setIsDetailsSidebarOpen(true);
    }
  };

  const closeDetailsSidebar = () => {
    setIsDetailsSidebarOpen(false);
    setSelectedTestCaseForDetails(null);
    setSelectedConfigurationId(undefined);
    setSelectedConfigurationLabel(undefined);
    setSelectedTestRunId(undefined);
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch(searchTerm);
    }
  };

  const handleResultFilterChange = (filter: string) => {
    setSelectedResultFilter(filter);
    applyAllFilters(filter, currentSearchTerm);
  };

  const applyAllFilters = (resultFilter: string = selectedResultFilter, searchTerm: string = currentSearchTerm) => {
    let filtered = [...allTestCasesWithExecution];

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(testCase =>
        testCase.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        testCase.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        testCase.testRunName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply result filter
    if (resultFilter !== 'all') {
      // Convert filter string to result ID for comparison
      const filterResultId = Object.entries(TEST_RESULTS).find(([_id, label]) => 
        label.toLowerCase() === resultFilter.toLowerCase()
      )?.[0];
      
      if (filterResultId) {
        filtered = filtered.filter(testCase => testCase.executionStatus === parseInt(filterResultId));
      }
    }

    setFilteredTestCases(filtered);
  };

  const clearSearchFilter = () => {
    setSearchTerm('');
    setCurrentSearchTerm('');
    applyAllFilters(selectedResultFilter, '');
  };

  const clearResultFilter = () => {
    setSelectedResultFilter('all');
    applyAllFilters('all', currentSearchTerm);
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setCurrentSearchTerm('');
    setSelectedResultFilter('all');
    setFilteredTestCases(allTestCasesWithExecution);
  };

  const handleExecutionResultChange = async (testCaseId: string, testRunId: string, newResultId: TestResultId, comment?: string, configurationId?: string) => {
    // Find the test run to check if it's closed
    const testRun = testRuns.find(tr => tr.id === testRunId);
    if (testRun?.state === 6) {
      toast.error('Cannot update execution results for closed test runs');
      return;
    }

    const newResultLabel = TEST_RESULTS[newResultId];
    const updateKey = `${testCaseId}-${configurationId || 'default'}-${testRunId}`;

    try {
      // Add to updating set to show loading state
      setUpdatingResults(prev => new Set([...prev, updateKey]));

      // Check if this is the first execution being created for this test run
      const testRunTestCases = allTestCasesWithExecution.filter(tc => tc.testRunId === testRunId);
      const isFirstExecution = testRunTestCases.every(tc =>
        tc.id !== testCaseId || tc.configurationId !== configurationId || tc.executionStatus === 6
      );

      // Use new POST endpoint for test case executions
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- API response needed for error handling
      const response = await testCaseExecutionsApiService.createTestCaseExecution({
        testCaseId,
        testRunId: testRunId,
        result: newResultId,
        comment: comment || undefined,
        configurationId: configurationId
      });

      // Update local state to reflect the change immediately
      const updatedAllTestCases = allTestCasesWithExecution.map(tc =>
        tc.id === testCaseId && tc.testRunId === testRunId && tc.configurationId === configurationId
          ? { ...tc, executionStatus: newResultId, executionResult: newResultLabel }
          : tc
      );

      setAllTestCasesWithExecution(updatedAllTestCases);

      setFilteredTestCases(prevFiltered =>
        prevFiltered.map(tc =>
          tc.id === testCaseId && tc.testRunId === testRunId && tc.configurationId === configurationId
            ? { ...tc, executionStatus: newResultId, executionResult: newResultLabel }
            : tc
        )
      );

      // Check if we need to update test run state
      if (testRun) {
        if (isFirstExecution && testRun.state === 1) {
          // First execution created, move test run to "In Progress" (state 2)

          try {
            await testRunsApiService.updateTestRunState(testRunId, 2, testRun.testPlanId);
            setTestRuns(prevRuns => prevRuns.map(tr => tr.id === testRunId ? { ...tr, state: 2 } : tr));
            toast.success(`Execution result updated to ${newResultLabel}`);
          } catch (error) {
            console.error('❌ Failed to update test run state:', error);
            toast.success(`Execution result updated to ${newResultLabel}`);
          }
        } else {
          // Check if all test cases for this test run now have results (not Untested - state 6)
          const updatedTestRunTestCases = updatedAllTestCases.filter(tc => tc.testRunId === testRunId);
          const allTestCasesHaveResults = updatedTestRunTestCases.every(tc => tc.executionStatus !== 6);

          if (allTestCasesHaveResults && testRun.state !== 5 && testRun.state !== 6) {
            // All test cases have results, move test run to "Done" (state 5)

            try {
              await testRunsApiService.updateTestRunState(testRunId, 5, testRun.testPlanId);
              setTestRuns(prevRuns => prevRuns.map(tr => tr.id === testRunId ? { ...tr, state: 5 } : tr));
              toast.success(`Execution result updated to ${newResultLabel}`);
            } catch (error) {
              console.error('❌ Failed to update test run state:', error);
              toast.success(`Execution result updated to ${newResultLabel}`);
            }
          } else {
            toast.success(`Execution result updated to ${newResultLabel}`);
          }
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

  // Calculate summary statistics
  const totalTestCases = allTestCasesWithExecution.length;
  const passedCount = allTestCasesWithExecution.filter(tc => tc.executionStatus === 1).length; // Passed
  const failedCount = allTestCasesWithExecution.filter(tc => tc.executionStatus === 2).length; // Failed
  const blockedCount = allTestCasesWithExecution.filter(tc => tc.executionStatus === 3).length; // Blocked
  const retestCount = allTestCasesWithExecution.filter(tc => tc.executionStatus === 4).length; // Retest
  const skippedCount = allTestCasesWithExecution.filter(tc => tc.executionStatus === 5).length; // Skipped
  const untestedCount = allTestCasesWithExecution.filter(tc => tc.executionStatus === 6).length; // Untested
  const inProgressCount = allTestCasesWithExecution.filter(tc => tc.executionStatus === 7).length; // In Progress
  const unknownCount = allTestCasesWithExecution.filter(tc => tc.executionStatus === 8).length; // Unknown

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-gray-400">Loading test runs overview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Card className="p-8 text-center">
          <div className="text-red-400 mb-4">
            <p className="text-lg font-medium">Failed to load test runs overview</p>
            <p className="text-sm text-slate-600 dark:text-gray-400 mt-2">{error}</p>
          </div>
          <Button onClick={() => navigate('/dashboard')}>
            Back to Dashboard
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
            onClick={() => navigate('/dashboard')}
          >
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Test Cases in Active Test Runs</h1>
            <p className="text-slate-600 dark:text-gray-400">
              {selectedProject?.name} - {totalTestCases} test cases across {testRuns.length} active test runs
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-8 gap-4">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-green-400 mb-1">{passedCount}</div>
          <div className="text-sm text-slate-600 dark:text-gray-400">Passed</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-red-400 mb-1">{failedCount}</div>
          <div className="text-sm text-slate-600 dark:text-gray-400">Failed</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-orange-400 mb-1">{blockedCount}</div>
          <div className="text-sm text-slate-600 dark:text-gray-400">Blocked</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400 mb-1">{retestCount}</div>
          <div className="text-sm text-slate-600 dark:text-gray-400">Retest</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-purple-400 mb-1">{skippedCount}</div>
          <div className="text-sm text-slate-600 dark:text-gray-400">Skipped</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-slate-600 dark:text-gray-400 mb-1">{untestedCount}</div>
          <div className="text-sm text-slate-600 dark:text-gray-400">Untested</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-400 mb-1">{inProgressCount}</div>
          <div className="text-sm text-slate-600 dark:text-gray-400">In Progress</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-slate-500 dark:text-gray-500 mb-1">{unknownCount}</div>
          <div className="text-sm text-slate-600 dark:text-gray-400">Unknown</div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-600 dark:text-gray-400 w-4 h-4 z-10" />
              <input
                type="text"
                placeholder="Search test cases or test runs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-slate-600 dark:text-gray-400" />
              <select
                value={selectedResultFilter}
                onChange={(e) => handleResultFilterChange(e.target.value)}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                <option value="all">All Results</option>
                <option value="Passed">Passed</option>
                <option value="Failed">Failed</option>
                <option value="Blocked">Blocked</option>
                <option value="Retest">Retest</option>
                <option value="Skipped">Skipped</option>
                <option value="Untested">Untested</option>
                <option value="In Progress">In Progress</option>
                <option value="Unknown">Unknown</option>
              </select>
            </div>
          </div>
        </div>

        {/* Active filters display */}
        {(currentSearchTerm || selectedResultFilter !== 'all') && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-600 dark:text-gray-400">Active filters:</span>
            {currentSearchTerm && (
              <span className="inline-flex items-center px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded-full text-sm text-cyan-700 dark:text-cyan-400 group">
                Search: "{currentSearchTerm}"
                <button
                  onClick={clearSearchFilter}
                  className="ml-2 text-cyan-400 hover:text-cyan-300 transition-colors opacity-70 group-hover:opacity-100"
                  title="Clear search filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedResultFilter !== 'all' && (
              <span className="inline-flex items-center px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-sm text-purple-400 group">
                Result: {selectedResultFilter}
                <button
                  onClick={clearResultFilter}
                  className="ml-2 text-purple-400 hover:text-purple-300 transition-colors opacity-70 group-hover:opacity-100"
                  title="Clear result filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              onClick={clearAllFilters}
              className="text-sm text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white underline"
            >
              Clear all filters
            </button>
          </div>
        )}
      </Card>

      {/* Test Cases Table */}
      <Card className="overflow-visible">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Test Cases ({filteredTestCases.length}{filteredTestCases.length !== allTestCasesWithExecution.length ? ` of ${allTestCasesWithExecution.length}` : ''})
          </h3>
          <p className="text-sm text-slate-600 dark:text-gray-400">
            Test cases from all active test runs in {selectedProject?.name}
          </p>
        </div>

        <div className="overflow-x-auto" style={{ overflow: 'visible' }}>
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-600 dark:text-gray-400">Test Case ID</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-600 dark:text-gray-400">Title</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-600 dark:text-gray-400">Test Run</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-600 dark:text-gray-400">Configuration</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-600 dark:text-gray-400">Priority</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-600 dark:text-gray-400">Type</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-slate-600 dark:text-gray-400">Execution Result</th>
              </tr>
            </thead>
            <tbody>
              {filteredTestCases.map((testCase) => (
                <tr key={`${testCase.testRunId}-${testCase.id}-${testCase.configurationId || 'no-config'}`} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:bg-slate-800/30 transition-colors">
                  <td className="py-4 px-6 text-sm text-slate-700 dark:text-gray-300 font-mono">
                    TC{testCase.id}
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
                    <button
                      onClick={() => navigate(`/test-runs/${testCase.testRunId}`)}
                      className="text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                    >
                      {testCase.testRunName}
                    </button>
                  </td>
                  <td className="py-4 px-6">
                    {testCase.configurationLabel ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-gray-200 border border-slate-300 dark:border-slate-600">
                        <span className={getDeviceColor(testCase.configurationLabel)}>
                          {getDeviceIcon(testCase.configurationLabel)}
                        </span>
                        {testCase.configurationLabel}
                      </span>
                    ) : (
                      <span className="text-sm text-slate-600 dark:text-gray-400">N/A</span>
                    )}
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
                    <TestResultDropdown
                      value={testCase.executionStatus}
                      onChange={(newResultId, comment) => handleExecutionResultChange(testCase.id, testCase.testRunId, newResultId, comment, testCase.configurationId)}
                      disabled={testRuns.find(tr => tr.id === testCase.testRunId)?.state === 6 || updatingResults.has(`${testCase.id}-${testCase.configurationId || 'default'}-${testCase.testRunId}`)}
                      isUpdating={updatingResults.has(`${testCase.id}-${testCase.configurationId || 'default'}-${testCase.testRunId}`)}
                      testCaseTitle={testCase.title}
                      onOpenCommentModal={(selectedResultId) => {
                        setSelectedTestCaseForComment({ ...testCase, executionStatus: selectedResultId });
                        setIsCommentModalOpen(true);
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Test Case Details Sidebar */}
      <TestCaseDetailsSidebar
        isOpen={isDetailsSidebarOpen}
        onClose={closeDetailsSidebar}
        testCase={selectedTestCaseForDetails}
        context="test-runs-overview"
        testRunId={selectedTestRunId}
        isTestRunClosed={selectedTestCaseForDetails && selectedTestRunId ?
          testRuns.find(tr => tr.id === selectedTestRunId)?.state === 6 : false
        }
        configurationId={selectedConfigurationId}
        configurationLabel={selectedConfigurationLabel}
        currentExecutionResult={selectedTestCaseForDetails && selectedTestRunId ?
          allTestCasesWithExecution.find(tc =>
            tc.id === selectedTestCaseForDetails.id &&
            tc.testRunId === selectedTestRunId &&
            tc.configurationId === selectedConfigurationId
          )?.executionStatus : undefined
        }
        onExecutionResultChange={(testCaseId, testRunId, newResultId) => {
          handleExecutionResultChange(testCaseId, testRunId, newResultId, undefined, selectedConfigurationId);
        }}
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
                selectedTestCaseForComment.testRunId,
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

export default TestRunsOverview;