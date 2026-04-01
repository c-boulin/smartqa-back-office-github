import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Clock, AlertTriangle, Loader, Search, Filter, X, MessageSquare } from 'lucide-react';
// import { format } from 'date-fns';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import StatusBadge from '../components/UI/StatusBadge';
import TestCaseDetailsSidebar from '../components/TestCase/TestCaseDetailsSidebar';
import AddExecutionCommentModal from '../components/TestRun/AddExecutionCommentModal';
import {
  testRunsApiService,
  OverviewTestRunInfo,
  OverviewTestCaseWithExecution,
} from '../services/testRunsApi';
import { testCaseExecutionsApiService } from '../services/testCaseExecutionsApi';
import { useApp } from '../context/AppContext';
import { useRestoreLastProject } from '../hooks/useRestoreLastProject';
import { usePermissions } from '../hooks/usePermissions';
import { PERMISSIONS } from '../utils/permissions';
import { TestCase, TEST_RESULTS, TestResultId, isTerminalTestExecutionResult } from '../types';
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
      case 8: // System Issue
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
      case 'System Issue':
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
  const { hasPermission } = usePermissions();

  useRestoreLastProject();

  // Get filter from URL params
  const resultFilter = searchParams.get('result'); // 'passed', 'failed', 'blocked', or null for all
  
  const [testRuns, setTestRuns] = useState<OverviewTestRunInfo[]>([]);
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

  const hasAutomatedConfiguration = (testRunId: string, configurationId?: string): boolean =>
    Boolean(
      configurationId &&
      testRuns.find(tr => tr.id === testRunId)?.configurations?.some(
        config => config.id === configurationId && config.projectId
      )
    );

  const isExecutionResultManuallyLocked = (testCase: TestCaseWithExecution): boolean =>
    testCase.fullTestCase?.automationStatus === 2 &&
    hasAutomatedConfiguration(testCase.testRunId, testCase.configurationId);

  useEffect(() => {
    if (selectedProject) {
      fetchTestRunsOverview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchTestRunsOverview is stable
  }, [selectedProject]);

  const normalizeOverviewItem = (item: OverviewTestCaseWithExecution): TestCaseWithExecution => {
    const parseDate = (s: string | undefined | null): Date => {
      if (!s) return new Date();
      const d = new Date(s);
      return Number.isNaN(d.getTime()) ? new Date() : d;
    };

    const fc = item.fullTestCase;

    return {
      id: item.id,
      title: item.title,
      priority: item.priority,
      type: item.type,
      executionStatus: item.executionStatus as TestResultId,
      executionResult: item.executionResult,
      testRunId: item.testRunId,
      testRunName: item.testRunName,
      configurationId: item.configurationId ?? undefined,
      configurationLabel: item.configurationLabel ?? undefined,
      fullTestCase: fc
        ? {
            id: fc.id,
            projectId: fc.projectId,
            projectRelativeId: fc.projectRelativeId ?? undefined,
            folderId: fc.folderId ?? undefined,
            ownerId: fc.ownerId ?? undefined,
            title: fc.title,
            description: fc.description,
            preconditions: fc.preconditions,
            priority: fc.priority as TestCase['priority'],
            type: fc.type as TestCase['type'],
            typeId: fc.typeId,
            status: fc.status as TestCase['status'],
            automationStatus: fc.automationStatus as 1 | 2 | 3 | 4 | 5,
            steps: [],
            stepResults: fc.stepResults,
            sharedSteps: fc.sharedSteps,
            tags: fc.tags,
            createdAt: parseDate(fc.createdAt),
            updatedAt: parseDate(fc.updatedAt),
            estimatedDuration: fc.estimatedDuration,
          }
        : null,
    };
  };

  const fetchTestRunsOverview = async () => {
    if (!selectedProject) return;

    try {
      setLoading(true);
      setError(null);

      const response = await testRunsApiService.getTestRunsOverview(selectedProject.id);

      setTestRuns(response.testRuns);

      const items = response.testCasesWithExecution.map(normalizeOverviewItem);

      setAllTestCasesWithExecution(items);
      setFilteredTestCases(items);

      if (resultFilter && resultFilter !== 'all') {
        applyResultFilter(resultFilter, items);
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
        (testCase.fullTestCase?.projectRelativeId?.toString() || '').includes(currentSearchTerm.toLowerCase()) ||
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
        (testCase.fullTestCase?.projectRelativeId?.toString() || '').includes(searchTerm.toLowerCase()) ||
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
    const currentTestCase = allTestCasesWithExecution.find(tc =>
      tc.id === testCaseId &&
      tc.testRunId === testRunId &&
      tc.configurationId === configurationId
    );

    if (currentTestCase && isExecutionResultManuallyLocked(currentTestCase)) {
      toast.error('Execution results for automated test cases with automated configurations cannot be manually edited');
      return;
    }

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

      // Align test run state with execution rows (terminal = not Untested nor In Progress)
      if (testRun && testRun.state !== 6) {
        const updatedTestRunTestCases = updatedAllTestCases.filter(tc => tc.testRunId === testRunId);
        const allTerminal =
          updatedTestRunTestCases.length > 0 &&
          updatedTestRunTestCases.every(tc => isTerminalTestExecutionResult(tc.executionStatus));
        const anyNonUntested = updatedTestRunTestCases.some(tc => tc.executionStatus !== 6);

        try {
          if (allTerminal && testRun.state !== 5) {
            await testRunsApiService.updateTestRunState(testRunId, 5, testRun.testPlanId ?? undefined);
            setTestRuns(prevRuns => prevRuns.map(tr => tr.id === testRunId ? { ...tr, state: 5 } : tr));
          } else if (!allTerminal && testRun.state === 5) {
            await testRunsApiService.updateTestRunState(testRunId, 2, testRun.testPlanId ?? undefined);
            setTestRuns(prevRuns => prevRuns.map(tr => tr.id === testRunId ? { ...tr, state: 2 } : tr));
          } else if (testRun.state === 1 && anyNonUntested && !allTerminal) {
            await testRunsApiService.updateTestRunState(testRunId, 2, testRun.testPlanId ?? undefined);
            setTestRuns(prevRuns => prevRuns.map(tr => tr.id === testRunId ? { ...tr, state: 2 } : tr));
          }
        } catch (error) {
          console.error('❌ Failed to update test run state:', error);
        }
        toast.success(`Execution result updated to ${newResultLabel}`);
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
      case 'System Issue':
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
      case 'System Issue':
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
  const unknownCount = allTestCasesWithExecution.filter(tc => tc.executionStatus === 8).length; // System Issue

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
          <span title="Retry the run" className="block">
            <div className="text-2xl font-bold text-slate-500 dark:text-gray-500 mb-1">{unknownCount}</div>
            <div className="text-sm text-slate-600 dark:text-gray-400">System Issue</div>
          </span>
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
                <option value="System Issue">System Issue</option>
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
                    TC{testCase.fullTestCase?.projectRelativeId || testCase.id}
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
                      disabled={
                        !hasPermission(PERMISSIONS.TEST_CASE_EXECUTION.CREATE) ||
                        !hasPermission(PERMISSIONS.TEST_CASE_EXECUTION.UPDATE) ||
                        testRuns.find(tr => tr.id === testCase.testRunId)?.state === 6 ||
                        isExecutionResultManuallyLocked(testCase) ||
                        updatingResults.has(`${testCase.id}-${testCase.configurationId || 'default'}-${testCase.testRunId}`)
                      }
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
        isConfigurationAutomated={Boolean(
          selectedTestRunId && selectedConfigurationId &&
          testRuns.find(tr => tr.id === selectedTestRunId)?.configurations?.some(
            c => c.id === selectedConfigurationId && c.projectId
          )
        )}
        configurationLabel={selectedConfigurationLabel}
        currentExecutionResult={selectedTestCaseForDetails && selectedTestRunId ?
          allTestCasesWithExecution.find(tc =>
            tc.id === selectedTestCaseForDetails.id &&
            tc.testRunId === selectedTestRunId &&
            tc.configurationId === selectedConfigurationId
          )?.executionStatus : undefined
        }
        onExecutionResultChange={(testCaseId, testRunId, newResultId, comment) => {
          handleExecutionResultChange(testCaseId, testRunId, newResultId, comment, selectedConfigurationId);
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