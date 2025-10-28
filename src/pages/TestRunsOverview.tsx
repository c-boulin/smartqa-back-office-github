import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Clock, AlertTriangle, Loader, Search, Filter, X } from 'lucide-react';
// import { format } from 'date-fns';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import StatusBadge from '../components/UI/StatusBadge';
import TestCaseDetailsSidebar from '../components/TestCase/TestCaseDetailsSidebar';
import { testRunsApiService, TestRun } from '../services/testRunsApi';
import { testCasesApiService } from '../services/testCasesApi';
import { testCaseExecutionsApiService } from '../services/testCaseExecutionsApi';
import { useApp } from '../context/AppContext';
import { TestCase, TEST_RESULTS, TestResultId } from '../types';
import toast from 'react-hot-toast';

// Test Result Dropdown Component
interface TestResultDropdownProps {
  value: TestResultId;
  onChange: (value: TestResultId, comment?: string) => void;
  disabled?: boolean;
  isUpdating?: boolean;
}

const TestResultDropdown: React.FC<TestResultDropdownProps> = ({
  value,
  onChange,
  disabled = false,
  isUpdating = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [isCommentExpanded, setIsCommentExpanded] = useState(false);
  const [selectedResult, setSelectedResult] = useState<TestResultId>(value);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const currentResultLabel = TEST_RESULTS[value];

  const handleToggle = () => {
    if (!disabled && !isUpdating) {
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
        return 'text-white bg-slate-700 border-slate-600';
      case 'Failed':
        return 'text-white bg-slate-700 border-slate-600';
      case 'Blocked':
        return 'text-white bg-slate-700 border-slate-600';
      case 'Retest':
        return 'text-white bg-slate-700 border-slate-600';
      case 'Skipped':
        return 'text-white bg-slate-700 border-slate-600';
      case 'Untested':
      case 'In Progress':
      case 'Unknown':
        return 'text-white bg-slate-700 border-slate-600';
      default:
        return 'text-white bg-slate-700 border-slate-600';
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Used for UI interaction in dropdown component
  const handleResultSelect = (newResultId: TestResultId) => {
    setSelectedResult(newResultId);
  };

  const handleResultChange = (newResultId: TestResultId) => {
    setSelectedResult(newResultId);
  };

  const handleValidate = () => {
    onChange(selectedResult, comment.trim() || undefined);
    setIsOpen(false);
    setComment('');
    setIsCommentExpanded(false);
  };

  // Update selectedResult when value prop changes
  React.useEffect(() => {
    setSelectedResult(value);
  }, [value]);

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
          <Loader className="w-3 h-3 animate-spin text-gray-400" />
        ) : (
          <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl z-[101] w-80 max-h-96"
            style={{
              position: 'absolute',
              top: '100%',
              left: 'auto',
              right: '0',
              marginTop: '4px',
              width: '320px',
              maxWidth: '90vw',
              transform: 'translateX(0)',
              zIndex: 101
            }}
          >
            <div className="p-3 border-b border-slate-600">
              <h4 className="text-sm font-medium text-white mb-3">Select Result</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
              {Object.entries(TEST_RESULTS).map(([resultId, label]) => (
                <button
                  key={resultId}
                  type="button"
                  onClick={() => handleResultChange(parseInt(resultId) as TestResultId)}
                  className={`w-full px-4 py-2 text-left hover:bg-slate-700 transition-colors flex items-center text-sm ${
                    selectedResult === parseInt(resultId) 
                      ? 'bg-cyan-600/30 border-l-4 border-cyan-400' 
                      : ''
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full mr-3 flex-shrink-0 ${getResultColor(parseInt(resultId) as TestResultId)}`}></div>
                  <span className={`${selectedResult === parseInt(resultId) ? 'text-cyan-300 font-medium' : 'text-white'}`}>
                    {label}
                  </span>
                  {selectedResult === parseInt(resultId) && (
                    <span className="ml-auto text-cyan-400">✓</span>
                  )}
                </button>
              ))}
            </div>
            
            {/* Comment Section */}
            <div className="border-t border-slate-600 p-3">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-400">
                  Comment (Optional)
                </label>
                <button
                  type="button"
                  onClick={() => setIsCommentExpanded(!isCommentExpanded)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  {isCommentExpanded ? 'Collapse' : 'Expand'}
                </button>
              </div>
              
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment about this execution result..."
                className={`w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-xs placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 resize-none transition-all ${
                  isCommentExpanded ? 'h-24' : 'h-12'
                }`}
                disabled={disabled || isUpdating}
              />
              
              <div className="flex justify-end space-x-2 mt-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleValidate}
                  className="px-3 py-1.5 text-xs bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors"
                >
                  Validate
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
}

const TestRunsOverview: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { getSelectedProject } = useApp();
  const selectedProject = getSelectedProject();
  
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

      console.log('🔄 Fetching test runs overview for project:', selectedProject.name);

      // STEP 1: Fetch all test runs for the project in one request
      const testRunsResponse = await testRunsApiService.getTestRuns(selectedProject.id, 1, 1000);
      
      // STEP 2: Filter for active test runs only (state 1, 2, or 3) and extract caseResults
      const activeTestRuns = testRunsResponse.data
        .map(apiTestRun => testRunsApiService.transformApiTestRun(apiTestRun, testRunsResponse.included))
        .filter(testRun => testRun.state === 1 || testRun.state === 2 || testRun.state === 3);

      setTestRuns(activeTestRuns);

      console.log('✅ Found', activeTestRuns.length, 'active test runs');

      // STEP 3: Collect all unique test case IDs from all active test runs
      const allTestCaseIds = new Set<string>();
      const testCaseToRunMapping = new Map<string, { runId: string; runName: string; result: string }>();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Used for tracking test case instances
      const testCaseRunInstances: TestCaseWithExecution[] = [];

      for (const testRun of activeTestRuns) {
        console.log('🔄 Processing test run:', testRun.name);

        // Get detailed test run data with caseResults (we need this for execution results)
        // Get detailed test run data with executions (we need this for execution results)
        const detailedTestRunResponse = await testRunsApiService.getTestRun(testRun.id);
        
        // Extract execution results from executions
        if (detailedTestRunResponse.data.attributes.executions && Array.isArray(detailedTestRunResponse.data.attributes.executions)) {
          detailedTestRunResponse.data.attributes.executions.forEach((execution: { test_case_id?: number; result?: number; [key: string]: unknown }) => {
            const testCaseId = execution.test_case_id ? execution.test_case_id.toString() : null;
            const rawResult = execution.result;
            
            console.log('🔄 Processing execution:', { testCaseId, rawResult, type: typeof rawResult });
            
            // Convert numeric result to TestResultId
            let resultId: TestResultId;
            if (typeof rawResult === 'number') {
              resultId = rawResult as TestResultId;
            } else if (typeof rawResult === 'string') {
              // Try to parse as integer first
              const parsedInt = parseInt(rawResult);
              if (!isNaN(parsedInt) && TEST_RESULTS[parsedInt as TestResultId]) {
                // String is a valid numeric ID
                resultId = parsedInt as TestResultId;
                console.log(`🔄 Converted string numeric result "${rawResult}" to: ${resultId} (${TEST_RESULTS[resultId]})`);
              } else {
                // String is not numeric, try reverse lookup by label
                const foundEntry = Object.entries(TEST_RESULTS).find(([_id, label]) => 
                  label.toLowerCase() === rawResult.toLowerCase()
                );
                resultId = foundEntry ? parseInt(foundEntry[0]) as TestResultId : 6; // Default to Untested
                console.log(`🔄 Converted string label result "${rawResult}" to: ${resultId} (${TEST_RESULTS[resultId]})`);
              }
            } else {
              resultId = 6; // Default to Untested
              console.log(`🔄 Unknown result type for execution, defaulting to Untested`);
            }
            
            console.log('🔄 Converted result:', { rawResult, resultId, label: TEST_RESULTS[resultId] });
            
            if (testCaseId) {
              allTestCaseIds.add(testCaseId);
              
              // Create a unique key for each test case + test run combination
              const uniqueKey = `${testCaseId}-${testRun.id}`;
              testCaseToRunMapping.set(uniqueKey, {
                runId: testRun.id,
                runName: testRun.name,
                result: resultId
              });
            }
          });
        }
      }

      console.log('📊 Collected', allTestCaseIds.size, 'unique test case IDs from all active test runs');
      
      // STEP 4: Fetch ALL unique test cases in parallel batches (much more efficient)
      const testCaseIds = Array.from(allTestCaseIds);
      const batchSize = 10; // Process 10 test cases at a time
      const testCaseBatches = [];
      
      for (let i = 0; i < testCaseIds.length; i += batchSize) {
        testCaseBatches.push(testCaseIds.slice(i, i + batchSize));
      }
      
      console.log(`🚀 Fetching ${testCaseIds.length} test cases in ${testCaseBatches.length} parallel batches of ${batchSize}`);
      
      // Process all batches in parallel
      const batchPromises = testCaseBatches.map(async (batch, batchIndex) => {
        console.log(`📦 Processing batch ${batchIndex + 1}/${testCaseBatches.length} with ${batch.length} test cases`);
        
        const batchPromises = batch.map(async (testCaseId) => {
          try {
            const testCaseResponse = await testCasesApiService.getTestCase(testCaseId);
            const testCase = testCasesApiService.transformApiTestCase(testCaseResponse.data);
            
            // Create instances for each test run this test case appears in
            const instances: TestCaseWithExecution[] = [];
            
            // Find all test runs that contain this test case
            for (const [uniqueKey, runMapping] of testCaseToRunMapping.entries()) {
              if (uniqueKey.startsWith(`${testCaseId}-`)) {
                instances.push({
                  id: testCase.id,
                  title: testCase.title,
                  priority: testCase.priority,
                  type: testCase.type,
                  executionStatus: runMapping.result as TestResultId,
                  executionResult: TEST_RESULTS[runMapping.result as TestResultId],
                  testRunId: runMapping.runId,
                  testRunName: runMapping.runName,
                  fullTestCase: testCase
                });
              }
            }
            
            return instances;
          } catch (error) {
            console.error(`Failed to fetch test case ${testCaseId}:`, error);
            
            // Create fallback instances for failed fetches
            const fallbackInstances: TestCaseWithExecution[] = [];
            
            for (const [uniqueKey, runMapping] of testCaseToRunMapping.entries()) {
              if (uniqueKey.startsWith(`${testCaseId}-`)) {
                fallbackInstances.push({
                  id: testCaseId,
                  title: `Test Case ${testCaseId}`,
                  priority: 'medium',
                  type: 'functional',
                  executionStatus: runMapping.result as TestResultId,
                  executionResult: TEST_RESULTS[runMapping.result as TestResultId],
                  testRunId: runMapping.runId,
                  testRunName: runMapping.runName,
                  fullTestCase: null
                });
              }
            }
            
            return fallbackInstances;
          }
        });
        
        return Promise.all(batchPromises);
      });
      
      // Wait for all batches to complete
      const batchResults = await Promise.all(batchPromises);
      
      // Flatten results (each batch item now returns an array of instances)
      const allResults = batchResults.flat().flat().filter(Boolean) as TestCaseWithExecution[];
      
      console.log(`✅ Successfully processed ${allResults.length} test cases from ${activeTestRuns.length} active test runs`);
      
      setAllTestCasesWithExecution(allResults);
      setFilteredTestCases(allResults);
      
      // Apply initial filter if provided in URL
      if (resultFilter && resultFilter !== 'all') {
        applyResultFilter(resultFilter, allResults);
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
      setIsDetailsSidebarOpen(true);
    }
  };

  const closeDetailsSidebar = () => {
    setIsDetailsSidebarOpen(false);
    setSelectedTestCaseForDetails(null);
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

  const handleExecutionResultChange = async (testCaseId: string, testRunId: string, newResultId: TestResultId, comment?: string) => {
    // Find the test run to check if it's closed
    const testRun = testRuns.find(tr => tr.id === testRunId);
    if (testRun?.state === 6) {
      toast.error('Cannot update execution results for closed test runs');
      return;
    }

    const newResultLabel = TEST_RESULTS[newResultId];
    const updateKey = `${testCaseId}-${testRunId}`;
    
    try {
      // Add to updating set to show loading state
      setUpdatingResults(prev => new Set([...prev, updateKey]));

      console.log(`🔄 Updating execution result for test case ${testCaseId} in test run ${testRunId} to: ${newResultId} (${newResultLabel})`);


      // Use new POST endpoint for test case executions
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- API response needed for error handling
      const response = await testCaseExecutionsApiService.createTestCaseExecution({
        testCaseId,
        testRunId,
        result: newResultId,
        comment: comment
      });

      // Update local state to reflect the change immediately
      setAllTestCasesWithExecution(prevTestCases => 
        prevTestCases.map(tc => 
          tc.id === testCaseId && tc.testRunId === testRunId
            ? { ...tc, executionStatus: newResultId, executionResult: newResultLabel }
            : tc
        )
      );

      setFilteredTestCases(prevFiltered => 
        prevFiltered.map(tc => 
          tc.id === testCaseId && tc.testRunId === testRunId
            ? { ...tc, executionStatus: newResultId, executionResult: newResultLabel }
            : tc
        )
      );

      toast.success(`Execution result updated to ${newResultLabel}`);

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
        return <Clock className="w-4 h-4 text-gray-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Used in status display rendering
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Passed':
        return 'text-green-400 bg-green-500/20 border-green-500/50';
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
        return 'text-gray-400 bg-gray-500/20 border-gray-500/50';
      default:
        return 'text-gray-400 bg-gray-500/20 border-gray-500/50';
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
  
  console.log('📊 TestRunsOverview calculated counts:', {
    total: totalTestCases,
    passed: passedCount,
    failed: failedCount,
    blocked: blockedCount,
    retest: retestCount,
    skipped: skippedCount,
    untested: untestedCount,
    inProgress: inProgressCount,
    unknown: unknownCount
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading test runs overview...</p>
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
            <p className="text-sm text-gray-400 mt-2">{error}</p>
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
            <h1 className="text-2xl font-bold text-white">Test Cases in Active Test Runs</h1>
            <p className="text-gray-400">
              {selectedProject?.name} - {totalTestCases} test cases across {testRuns.length} active test runs
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-8 gap-4">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-green-400 mb-1">{passedCount}</div>
          <div className="text-sm text-gray-400">Passed</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-red-400 mb-1">{failedCount}</div>
          <div className="text-sm text-gray-400">Failed</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-orange-400 mb-1">{blockedCount}</div>
          <div className="text-sm text-gray-400">Blocked</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400 mb-1">{retestCount}</div>
          <div className="text-sm text-gray-400">Retest</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-purple-400 mb-1">{skippedCount}</div>
          <div className="text-sm text-gray-400">Skipped</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-gray-400 mb-1">{untestedCount}</div>
          <div className="text-sm text-gray-400">Untested</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-400 mb-1">{inProgressCount}</div>
          <div className="text-sm text-gray-400">In Progress</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-gray-500 mb-1">{unknownCount}</div>
          <div className="text-sm text-gray-400">Unknown</div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
              <input
                type="text"
                placeholder="Search test cases or test runs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={selectedResultFilter}
                onChange={(e) => handleResultFilterChange(e.target.value)}
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
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
            <span className="text-sm text-gray-400">Active filters:</span>
            {currentSearchTerm && (
              <span className="inline-flex items-center px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded-full text-sm text-cyan-400 group">
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
              className="text-sm text-gray-400 hover:text-white underline"
            >
              Clear all filters
            </button>
          </div>
        )}
      </Card>

      {/* Test Cases Table */}
      <Card className="overflow-hidden">
        <div className="p-6 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-white">
            Test Cases ({filteredTestCases.length}{filteredTestCases.length !== allTestCasesWithExecution.length ? ` of ${allTestCasesWithExecution.length}` : ''})
          </h3>
          <p className="text-sm text-gray-400">
            Test cases from all active test runs in {selectedProject?.name}
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50 border-b border-slate-700">
              <tr>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Test Case ID</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Title</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Test Run</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Priority</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Type</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Execution Result</th>
              </tr>
            </thead>
            <tbody>
              {filteredTestCases.map((testCase) => (
                <tr key={`${testCase.testRunId}-${testCase.id}`} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                  <td className="py-4 px-6 text-sm text-gray-300 font-mono">
                    TC-{testCase.id}
                  </td>
                  <td className="py-4 px-6">
                    <button
                      onClick={() => handleTestCaseTitleClick(testCase)}
                      className="text-left w-full group"
                      disabled={!testCase.fullTestCase}
                    >
                      <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors cursor-pointer">
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
                      onChange={(newResultId, comment) => handleExecutionResultChange(testCase.id, testCase.testRunId, newResultId, comment)}
                      disabled={testRuns.find(tr => tr.id === testCase.testRunId)?.state === 6 || updatingResults.has(`${testCase.id}-${testCase.testRunId}`)}
                      isUpdating={updatingResults.has(`${testCase.id}-${testCase.testRunId}`)}
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
        testRunId={selectedTestCaseForDetails ? 
          allTestCasesWithExecution.find(tc => tc.id === selectedTestCaseForDetails.id)?.testRunId : undefined
        }
        isTestRunClosed={selectedTestCaseForDetails ? 
          testRuns.find(tr => tr.id === allTestCasesWithExecution.find(tc => tc.id === selectedTestCaseForDetails.id)?.testRunId)?.state === 6 : false
        }
        currentExecutionResult={selectedTestCaseForDetails ? 
          allTestCasesWithExecution.find(tc => tc.id === selectedTestCaseForDetails.id)?.executionStatus : undefined
        }
        onExecutionResultChange={(testCaseId, testRunId, newResultId) => {
          handleExecutionResultChange(testCaseId, testRunId, newResultId);
        }}
      />
    </div>
  );
};

export default TestRunsOverview;