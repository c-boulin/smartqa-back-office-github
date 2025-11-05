import React, { useState, useEffect } from 'react';
import { Info } from 'lucide-react';
import Modal from '../UI/Modal';
import Button from '../UI/Button';
import { TestRun, testRunsApiService } from '../../services/testRunsApi';
import { TEST_RESULTS, TestResultId } from '../../types';

interface CloneTestRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    includeAllTestCases: boolean;
    includeByResults: boolean;
    selectedResults: string[];
    copyTestCaseAssignee: boolean;
    copyTags: boolean;
    copyLinkedIssues: boolean;
    selectedTestCaseConfigPairs: Array<{ testCaseId: string; configurationId: string | null }>;
  }) => Promise<void>;
  testRun: TestRun | null;
  isSubmitting: boolean;
}

const CloneTestRunModal: React.FC<CloneTestRunModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  testRun,
  isSubmitting
}) => {
  const [formData, setFormData] = useState({
    name: '',
    includeAllTestCases: true,
    includeByResults: false,
    selectedResults: [] as string[],
    copyTestCaseAssignee: true,
    copyTags: true,
    copyLinkedIssues: false
  });

  const [testCaseResults, setTestCaseResults] = useState<Array<{
    id: string;
    label: string;
    count: number;
    color: string;
    testCaseConfigPairs: Array<{ testCaseId: string; configurationId: string | null }>;
  }>>([]);
  const [isLoadingResults, setIsLoadingResults] = useState(false);

  // Reset form when modal opens/closes or testRun changes
  useEffect(() => {
    if (isOpen && testRun) {
      const today = new Date();
      const dateStr = today.toLocaleDateString('en-CA'); // YYYY-MM-DD format
      
      setFormData({
        name: `${testRun.name} - ${dateStr} - Copy`,
        includeAllTestCases: true,
        includeByResults: false,
        selectedResults: [],
        copyTestCaseAssignee: true,
        copyTags: true,
        copyLinkedIssues: false
      });
      
      // Load real execution results when modal opens
      if (testRun) {
        loadTestCaseResults(testRun.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadTestCaseResults is stable
  }, [isOpen, testRun]);

  const loadTestCaseResults = async (testRunId: string) => {
    try {
      setIsLoadingResults(true);
      console.log('🔄 Loading real execution results for test run:', testRunId);

      // Get detailed test run data with executions
      const testRunResponse = await testRunsApiService.getTestRun(testRunId);

      // Initialize result counts and test case-config mappings
      const resultCounts: Record<string, { count: number; testCaseConfigPairs: Array<{ testCaseId: string; configurationId: string | null }> }> = {};

      // Initialize all possible results
      Object.entries(TEST_RESULTS).forEach(([resultId]) => {
        resultCounts[resultId] = { count: 0, testCaseConfigPairs: [] };
      });

      // Process executions to count results and map test case-config pairs
      if (testRunResponse.data.attributes.executions && Array.isArray(testRunResponse.data.attributes.executions)) {
        console.log('🔄 Processing', testRunResponse.data.attributes.executions.length, 'executions');

        // Group executions by test case ID + configuration ID and get the latest execution per pair
        const lastExecutionPerPair = new Map<string, {
          test_case_id: number;
          configuration_id: number | null;
          result: number;
          created_at: string;
          [key: string]: unknown
        }>();

        testRunResponse.data.attributes.executions.forEach((execution: {
          test_case_id: number;
          configuration_id?: number | null;
          result: number;
          created_at: string;
          [key: string]: unknown
        }) => {
          const testCaseId = execution.test_case_id.toString();
          const configurationId = execution.configuration_id?.toString() || null;
          const pairKey = `${testCaseId}-${configurationId || 'null'}`;
          const executionDate = new Date(execution.created_at);

          // Keep only the latest execution for each test case-config pair
          const existing = lastExecutionPerPair.get(pairKey);
          if (!existing || new Date(existing.created_at) < executionDate) {
            lastExecutionPerPair.set(pairKey, {
              test_case_id: execution.test_case_id,
              configuration_id: execution.configuration_id || null,
              result: execution.result,
              created_at: execution.created_at
            });
          }
        });

        console.log('🔄 Found', lastExecutionPerPair.size, 'unique test case-configuration pairs with executions');

        // Count each result type and collect test case-config pairs
        Array.from(lastExecutionPerPair.values()).forEach((execution) => {
          const testCaseId = execution.test_case_id.toString();
          const configurationId = execution.configuration_id?.toString() || null;
          const rawResult = execution.result;

          let resultId: string;

          if (typeof rawResult === 'number') {
            resultId = rawResult.toString();
          } else if (typeof rawResult === 'string') {
            const numericResult = parseInt(rawResult);
            if (!isNaN(numericResult) && TEST_RESULTS[numericResult as TestResultId]) {
              resultId = numericResult.toString();
            } else {
              // String label - find matching result ID
              const foundEntry = Object.entries(TEST_RESULTS).find(([_id, label]) =>
                label.toLowerCase() === rawResult.toLowerCase()
              );
              resultId = foundEntry ? foundEntry[0] : '6'; // Default to Untested
            }
          } else {
            resultId = '6'; // Default to Untested
          }

          if (resultCounts[resultId]) {
            resultCounts[resultId].count++;
            resultCounts[resultId].testCaseConfigPairs.push({ testCaseId, configurationId });
          }
        });

        // Note: We're not counting "untested" pairs here because we don't know which
        // test case-config combinations exist but haven't been executed yet.
        // The "All test cases" option will handle including everything.
      }

      // Transform to display format
      const displayResults = Object.entries(TEST_RESULTS).map(([resultId, label]) => {
        const data = resultCounts[resultId];
        return {
          id: resultId,
          label,
          count: data.count,
          testCaseConfigPairs: data.testCaseConfigPairs,
          color: getResultColor(parseInt(resultId) as TestResultId)
        };
      }).filter(result => result.count > 0); // Only show results that have test cases

      setTestCaseResults(displayResults);
      console.log('✅ Loaded real execution results:', displayResults);

    } catch (error) {
      console.error('❌ Failed to load test case results:', error);
      setTestCaseResults([]);
    } finally {
      setIsLoadingResults(false);
    }
  };

  const getResultColor = (resultId: TestResultId): string => {
    switch (resultId) {
      case 1: return 'text-green-400';
      case 2: return 'text-red-400';
      case 3: return 'text-yellow-400';
      case 4: return 'text-orange-400';
      case 5: return 'text-purple-400';
      case 6: return 'text-gray-400';
      case 7: return 'text-blue-400';
      case 8: return 'text-gray-500';
      default: return 'text-gray-400';
    }
  };

  const handleInputChange = (field: string, value: string | number | Date | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTestCaseSelectionChange = (type: 'all' | 'results') => {
    if (type === 'all') {
      setFormData(prev => ({
        ...prev,
        includeAllTestCases: true,
        includeByResults: false,
        selectedResults: []
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        includeAllTestCases: false,
        includeByResults: true
      }));
    }
  };

  const handleResultToggle = (resultId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedResults: prev.selectedResults.includes(resultId)
        ? prev.selectedResults.filter(id => id !== resultId)
        : [...prev.selectedResults, resultId]
    }));
  };

  const getSelectedTestCaseConfigPairs = (): Array<{ testCaseId: string; configurationId: string | null }> => {
    if (formData.includeAllTestCases) {
      // Return all test case IDs with null configuration (meaning all configurations)
      return (testRun?.testCaseIds || []).map(testCaseId => ({ testCaseId, configurationId: null }));
    } else if (formData.includeByResults && formData.selectedResults.length > 0) {
      // Collect test case-config pairs from selected results
      const selectedPairs: Array<{ testCaseId: string; configurationId: string | null }> = [];

      formData.selectedResults.forEach(resultId => {
        const resultData = testCaseResults.find(r => r.id === resultId);
        if (resultData) {
          selectedPairs.push(...resultData.testCaseConfigPairs);
        }
      });

      return selectedPairs;
    }

    return [];
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Get the actual test case-config pairs based on selection
    const selectedTestCaseConfigPairs = getSelectedTestCaseConfigPairs();

    const submitData = {
      ...formData,
      selectedTestCaseConfigPairs // Add the actual test case-config pairs to clone
    };

    await onSubmit(submitData);
  };

  if (!testRun) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Clone Test Run"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Test Run Name */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Test Run Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
            required
            disabled={isSubmitting}
            placeholder="Enter test run name"
          />
        </div>

        {/* Select Test Cases */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Select Test Cases:
          </label>
          
          <div className="space-y-3">
            {/* All test cases option */}
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="testCaseSelection"
                checked={formData.includeAllTestCases}
                onChange={() => handleTestCaseSelectionChange('all')}
                className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 focus:ring-blue-500 focus:ring-2"
                disabled={isSubmitting}
              />
              <span className="ml-3 text-white">All test cases</span>
            </label>

            {/* By test case results option */}
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="testCaseSelection"
                checked={formData.includeByResults}
                onChange={() => handleTestCaseSelectionChange('results')}
                className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 focus:ring-blue-500 focus:ring-2"
                disabled={isSubmitting}
              />
              <span className="ml-3 text-white">By test case results</span>
            </label>
          </div>

          {/* Info message for all test cases */}
          {formData.includeAllTestCases && (
            <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="flex items-start">
                <Info className="w-4 h-4 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-300">
                  All {testRun.testCasesCount} test cases from previous test run will be added in this test run
                </p>
              </div>
            </div>
          )}

          {/* Test case results selection */}
          {formData.includeByResults && (
            <div className="mt-4 p-4 bg-slate-800 border border-slate-600 rounded-lg">
              <h4 className="text-sm font-medium text-gray-300 mb-3">
                Select by results:
                {isLoadingResults && (
                  <span className="ml-2 text-xs text-cyan-400">Loading real data...</span>
                )}
              </h4>
              
              {isLoadingResults ? (
                <div className="flex items-center justify-center py-4">
                  <div className="text-center text-gray-400">
                    <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-sm">Loading execution results...</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {testCaseResults.map((result) => (
                    <label key={result.id} className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.selectedResults.includes(result.id)}
                        onChange={() => handleResultToggle(result.id)}
                        className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 focus:ring-blue-500 focus:ring-2 rounded"
                        disabled={isSubmitting}
                      />
                      <div className="ml-3 flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${
                          result.id === '1' ? 'bg-green-400' :
                          result.id === '2' ? 'bg-red-400' :
                          result.id === '3' ? 'bg-yellow-400' :
                          result.id === '4' ? 'bg-orange-400' :
                          result.id === '5' ? 'bg-purple-400' :
                          result.id === '6' ? 'bg-gray-400' :
                          result.id === '7' ? 'bg-blue-400' :
                          result.id === '8' ? 'bg-gray-500' :
                          'bg-gray-600'
                        }`}></div>
                        <span className={`text-sm ${result.color}`}>
                          {result.label} ({result.count})
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              
              {!isLoadingResults && testCaseResults.length === 0 && (
                <div className="text-center py-4 text-gray-400 text-sm">
                  No execution results found for this test run
                </div>
              )}
              
              {formData.selectedResults.length > 0 && (
                <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <div className="flex items-start">
                    <Info className="w-4 h-4 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-blue-300">
                      {(() => {
                        const selectedPairs = getSelectedTestCaseConfigPairs();
                        const uniqueTestCases = new Set(selectedPairs.map(p => p.testCaseId)).size;
                        return `${selectedPairs.length} test case-configuration combination${selectedPairs.length !== 1 ? 's' : ''} (${uniqueTestCases} unique test case${uniqueTestCases !== 1 ? 's' : ''}) will be cloned based on selected results`;
                      })()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Copy options */}
        <div className="space-y-3">
          {/* Copy Test Case Assignee */}
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.copyTestCaseAssignee}
              onChange={(e) => handleInputChange('copyTestCaseAssignee', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 focus:ring-blue-500 focus:ring-2 rounded"
              disabled={isSubmitting}
            />
            <span className="ml-3 text-white">Copy Test Case Assignee to new test run</span>
          </label>

          {/* Copy Tags */}
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.copyTags}
              onChange={(e) => handleInputChange('copyTags', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 focus:ring-blue-500 focus:ring-2 rounded"
              disabled={isSubmitting}
            />
            <span className="ml-3 text-white">Copy Tags to new test run</span>
          </label>

          {/* Copy Linked Issues */}
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.copyLinkedIssues}
              onChange={(e) => handleInputChange('copyLinkedIssues', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 focus:ring-blue-500 focus:ring-2 rounded"
              disabled={isSubmitting}
            />
            <span className="ml-3 text-white">Copy Linked Issues to new test run</span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-slate-700">
          <Button 
            variant="secondary" 
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting}
          >
            Clone
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CloneTestRunModal;