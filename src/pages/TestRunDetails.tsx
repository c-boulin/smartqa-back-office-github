import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Calendar, User, Play, CheckCircle, XCircle, Clock, AlertTriangle, Loader } from 'lucide-react';
import { format } from 'date-fns';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import TestCaseDetailsSidebar from '../components/TestCase/TestCaseDetailsSidebar';
import TestRunDetailsFilters from '../components/TestRun/TestRunDetailsFilters';
import TestRunDetailsFiltersSidebar from '../components/TestRun/TestRunDetailsFiltersSidebar';
import AddExecutionCommentModal from '../components/TestRun/AddExecutionCommentModal';
import ConfigurationTabs, { ConfigTab } from '../components/TestRun/ConfigurationTabs';
import TestRunDetailsTable, { TestCaseWithExecution } from '../components/TestRun/TestRunDetailsTable';
import { apiService } from '../services/api';
import { testRunsApiService, TestRun, type TestRunDetailsExecutionPayload } from '../services/testRunsApi';
import { testCaseExecutionsApiService } from '../services/testCaseExecutionsApi';
import { testRunExecutionsApiService } from '../services/testRunExecutionsApi';
import { useTestRunDetailsFilters } from '../hooks/useTestRunDetailsFilters';
import { useTestRunExecutionPolling } from '../hooks/useTestRunExecutionPolling';
import { useApp } from '../context/AppContext';
import { TestCase, TEST_RESULTS, TestResultId, Tag } from '../types';
import { usePermissions } from '../hooks/usePermissions';
import { PERMISSIONS } from '../utils/permissions';
import toast from 'react-hot-toast';

const TestRunDetails: React.FC = () => {
  const { id: testRunId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const testPlanIdFromUrl = searchParams.get('testPlanId') || undefined;
  const { state: appState, createTag } = useApp();
  const { hasPermission } = usePermissions();
  const [testRun, setTestRun] = useState<TestRun | null>(null);
  const [testCases, setTestCases] = useState<TestCaseWithExecution[]>([]);
  const [runExecutions, setRunExecutions] = useState<TestRunDetailsExecutionPayload[]>([]);
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
  const [selectedTestCasesForBulkRun, setSelectedTestCasesForBulkRun] = useState<Set<string>>(new Set());
  const [isBulkRunning, setIsBulkRunning] = useState(false);
  const [gitlabLinksByTestCaseId, setGitlabLinksByTestCaseId] = useState<Record<string, string | null>>({});
  const [gitlabLinksFetched, setGitlabLinksFetched] = useState(false);
  const [activeConfigTab, setActiveConfigTab] = useState<ConfigTab>('manual');

  const fetchInProgressRef = useRef(false);

  const { startPolling } = useTestRunExecutionPolling();

  const isTestCaseAutomated = (testCase: TestCaseWithExecution): boolean => {
    return testCase.fullTestCase?.automationStatus === 2;
  };

  const isTestRunClosed = testRun?.state === 6;

  const hasAutomatedConfiguration = useCallback((configurationId: string | undefined) =>
    Boolean(testRun?.configurations?.some(c => c.id === configurationId && c.projectId)),
  [testRun?.configurations]);

  const hasAutomatedConfigs = useMemo(() =>
    Boolean(testRun?.configurations?.some(c => c.projectId)),
  [testRun?.configurations]);

  const manualTestCases = useMemo(() =>
    filteredTestCases.filter(tc => !hasAutomatedConfiguration(tc.configurationId)),
  [filteredTestCases, hasAutomatedConfiguration]);

  const automatedTestCases = useMemo(() =>
    filteredTestCases.filter(tc => hasAutomatedConfiguration(tc.configurationId)),
  [filteredTestCases, hasAutomatedConfiguration]);

  const allManualTestCases = useMemo(() =>
    testCases.filter(tc => !hasAutomatedConfiguration(tc.configurationId)),
  [testCases, hasAutomatedConfiguration]);

  const allAutomatedTestCases = useMemo(() =>
    testCases.filter(tc => hasAutomatedConfiguration(tc.configurationId)),
  [testCases, hasAutomatedConfiguration]);

  const activeTabTestCases = hasAutomatedConfigs
    ? (activeConfigTab === 'manual' ? manualTestCases : automatedTestCases)
    : filteredTestCases;

  const calculateProgressMetrics = useCallback((currentTestCases: TestCaseWithExecution[]) => {
    const totalTests = currentTestCases.length;
    const executedTests = currentTestCases.filter(tc =>
      tc.executionStatus === 1 ||
      tc.executionStatus === 2 ||
      tc.executionStatus === 4
    ).length;
    const passedTests = currentTestCases.filter(tc => tc.executionStatus === 1).length;

    const progress = totalTests > 0 ? Math.round((executedTests / totalTests) * 100) : 0;
    const passRate = executedTests > 0 ? Math.round((passedTests / executedTests) * 100) : 0;

    return { progress, passRate, executedTests, totalTests, passedTests };
  }, []);

  const progressMetrics = calculateProgressMetrics(testCases);

  const {
    filters,
    updateFilter,
    clearAllFilters,
    hasActiveFilters, // eslint-disable-line @typescript-eslint/no-unused-vars
    buildFilterCriteria
  } = useTestRunDetailsFilters();

  const tags = appState.tags;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const tagsLoading = appState.isLoadingTags;

  useEffect(() => {
    let isCancelled = false;

    const loadData = async () => {
      if (testRunId && !isCancelled) {
        await fetchTestRunDetails(testRunId);
      }
    };

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [testRunId]);

  useEffect(() => {
    const projectId = testRun?.projectId;
    if (!projectId) {
      setGitlabLinksFetched(false);
      setGitlabLinksByTestCaseId({});
      return;
    }
    let cancelled = false;
    apiService
      .authenticatedRequest(`/projects/${projectId}/test-case-gitlab-links`)
      .then((response: { data?: { automatedTestCases?: Array<{ id: string; gitlab_test_name?: string | null }> } }) => {
        if (cancelled) return;
        const list = response?.data?.automatedTestCases;
        const map: Record<string, string | null> = {};
        if (Array.isArray(list)) {
          list.forEach((tc) => {
            map[String(tc.id)] = tc.gitlab_test_name ?? null;
          });
        }
        setGitlabLinksByTestCaseId(map);
      })
      .catch(() => {
        if (!cancelled) {
          setGitlabLinksByTestCaseId({});
        }
      })
      .finally(() => {
        if (!cancelled) {
          setGitlabLinksFetched(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [testRun?.projectId]);

  const fetchTestRunDetails = async (testRunId: string) => {
    if (fetchInProgressRef.current) {
      return;
    }

    try {
      fetchInProgressRef.current = true;
      setLoading(true);
      setError(null);

      const { testRun: run, testCases: runTestCases, executions: execs } = await testRunsApiService.getTestRunDetails(testRunId);
      setTestRun(run);
      setTestCases(runTestCases as TestCaseWithExecution[]);
      setFilteredTestCases(runTestCases as TestCaseWithExecution[]);
      setRunExecutions(execs);
    } catch (err) {
      console.error('Failed to fetch test run details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load test run details');
    } finally {
      setLoading(false);
      fetchInProgressRef.current = false;
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    if (!testRun || !testRunId || isTestRunClosed) {
      if (isTestRunClosed) {
        toast.error('Cannot update execution results for closed test runs');
      }
      return;
    }

    const newResultLabel = TEST_RESULTS[newResultId];
    const updateKey = `${testCaseId}-${configurationId || 'default'}-${testRunId}`;

    try {
      setUpdatingResults(prev => new Set([...prev, updateKey]));

      await testCaseExecutionsApiService.createTestCaseExecution({
        testCaseId,
        testRunId: testRunId,
        result: newResultId,
        comment: comment || undefined,
        configurationId: configurationId
      });

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

      const isNonTrivialResult = (status: number) => status !== 6 && status !== 7;
      const hasAnyNonTrivialResult = updatedTestCases.some(tc => isNonTrivialResult(tc.executionStatus));
      const allHaveNonTrivialResult = updatedTestCases.every(tc => isNonTrivialResult(tc.executionStatus));

      if (allHaveNonTrivialResult && testRun.state !== 5 && testRun.state !== 6) {
        try {
          await testRunsApiService.updateTestRunState(testRunId, 5, testRun.testPlanId || testPlanIdFromUrl);
          setTestRun({ ...testRun, state: 5 });
        } catch (error) {
          console.error('Failed to update test run state:', error);
        }
      } else if (hasAnyNonTrivialResult && isNonTrivialResult(newResultId) && testRun.state === 1) {
        try {
          await testRunsApiService.updateTestRunState(testRunId, 2, testRun.testPlanId || testPlanIdFromUrl);
          setTestRun({ ...testRun, state: 2 });
        } catch (error) {
          console.error('Failed to update test run state:', error);
        }
      } else if (!allHaveNonTrivialResult && testRun.state === 5) {
        try {
          await testRunsApiService.updateTestRunState(testRunId, 2, testRun.testPlanId || testPlanIdFromUrl);
          setTestRun({ ...testRun, state: 2 });
        } catch (error) {
          console.error('Failed to update test run state:', error);
        }
      }

      toast.success(`Execution result updated to ${newResultLabel}`);

    } catch (error) {
      console.error('Failed to update execution result:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update execution result';
      toast.error(errorMessage);
    } finally {
      setUpdatingResults(prev => {
        const newSet = new Set(prev);
        newSet.delete(updateKey);
        return newSet;
      });
    }
  };

  const applyFilters = () => {
    let filtered = [...testCases];
    const criteria = buildFilterCriteria();

    if (currentSearchTerm.trim()) {
      filtered = filtered.filter(testCase =>
        testCase.title.toLowerCase().includes(currentSearchTerm.toLowerCase()) ||
        testCase.id.toLowerCase().includes(currentSearchTerm.toLowerCase())
      );
    }

    if (criteria.automationStatus) {
      const automationValue = parseInt(criteria.automationStatus);
      filtered = filtered.filter(testCase => {
        return testCase.fullTestCase?.automationStatus === automationValue;
      });
    }

    if (criteria.priority) {
      filtered = filtered.filter(testCase => {
        return testCase.priority.toLowerCase() === criteria.priority?.toLowerCase();
      });
    }

    if (criteria.type) {
      filtered = filtered.filter(testCase => {
        const typeIdString = testCase.fullTestCase?.typeId?.toString();
        return typeIdString === criteria.type;
      });
    }

    if (criteria.state) {
      const stateValue = parseInt(criteria.state);
      filtered = filtered.filter(testCase => {
        const statusMap = { 1: 'active', 2: 'draft', 3: 'in_review', 4: 'outdated', 5: 'rejected' };
        const expectedStatus = statusMap[stateValue as keyof typeof statusMap];
        return testCase.fullTestCase?.status === expectedStatus;
      });
    }

    if (criteria.result) {
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

  const handleTestCaseCheckboxToggle = (testCaseId: string, configurationId: string | undefined) => {
    const key = `${testCaseId}|${configurationId || 'default'}`;
    setSelectedTestCasesForBulkRun(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const handleSelectAllToggle = () => {
    if (selectedTestCasesForBulkRun.size === automatedTestCasesForBulkRun.length) {
      setSelectedTestCasesForBulkRun(new Set());
    } else {
      setSelectedTestCasesForBulkRun(new Set(automatedTestCasesForBulkRun.map(tc => `${tc.id}|${tc.configurationId || 'default'}`)));
    }
  };

  const automatedTestCasesForBulkRun = useMemo(() => {
    if (!gitlabLinksFetched) return [];
    return filteredTestCases.filter(
      tc =>
        isTestCaseAutomated(tc) &&
        Boolean(gitlabLinksByTestCaseId[String(tc.id)]) &&
        hasAutomatedConfiguration(tc.configurationId)
    );
  }, [filteredTestCases, gitlabLinksFetched, gitlabLinksByTestCaseId, hasAutomatedConfiguration]);

  const showCheckboxColumnForAutomated = automatedTestCases.some(tc => isTestCaseAutomated(tc)) && !isTestRunClosed && hasPermission(PERMISSIONS.TEST_RUN.UPDATE);

  const showConfigurationColumn = Boolean(testRun?.configurations && testRun.configurations.length > 0);

  const handleBulkRun = async () => {
    if (!testRun || !testRunId || selectedTestCasesForBulkRun.size === 0) {
      toast.error('Please select at least one test case to run');
      return;
    }

    if (!testRun.configurations || testRun.configurations.length === 0) {
      toast.error('No configurations available for this test run');
      return;
    }

    setIsBulkRunning(true);

    try {
      let startedAnyExecution = false;
      const selectableKeys = new Set(automatedTestCasesForBulkRun.map(tc => `${tc.id}|${tc.configurationId || 'default'}`));
      const selectedKeys = Array.from(selectedTestCasesForBulkRun).filter(k => selectableKeys.has(k));
      if (selectedKeys.length === 0) {
        toast.error('Please select at least one test case linked to GitLab to run');
        setIsBulkRunning(false);
        return;
      }
      const selectedPairs = selectedKeys.map(key => {
        const [testCaseId, configId] = key.split('|');
        return { testCaseId, configId: configId === 'default' ? undefined : configId };
      });

      const configurationsMap = new Map<string, { config: typeof testRun.configurations[0], testCaseIds: string[] }>();

      selectedPairs.forEach(({ testCaseId, configId }) => {
        const configKey = configId || 'default';

        if (!configurationsMap.has(configKey)) {
          const config = testRun.configurations?.find(c => c.id === configId);
          if (config) {
            configurationsMap.set(configKey, { config, testCaseIds: [testCaseId] });
          }
        } else {
          const existing = configurationsMap.get(configKey)!;
          if (!existing.testCaseIds.includes(testCaseId)) {
            existing.testCaseIds.push(testCaseId);
          }
        }
      });

      let executionCount = 0;
      for (const [_configId, { config, testCaseIds }] of configurationsMap) {
        try {
          const testRunExecution = await testRunExecutionsApiService.createTestRunExecution({
            test_run_id: parseInt(testRunId),
            state: 1,
          });

          await Promise.all(
            testCaseIds.map(testCaseId =>
              testCaseExecutionsApiService.createTestCaseExecution({
                testCaseId,
                testRunId: testRunId,
                result: 7,
                configurationId: config.id,
                testRunExecutionId: testRunExecution.id,
              })
            )
          );

          startedAnyExecution = true;

          setTestCases(prevTestCases => {
            return prevTestCases.map(tc => {
              if (testCaseIds.includes(tc.id) && tc.configurationId === config.id) {
                return {
                  ...tc,
                  executionStatus: 7 as TestResultId,
                  executionResult: TEST_RESULTS[7],
                  execution: {
                    ...tc.execution,
                    result: 7,
                    resultLabel: 'In Progress',
                  }
                };
              }
              return tc;
            });
          });

          try {
            await apiService.authenticatedRequest('/gitlab/trigger-pipeline', {
              method: 'POST',
              body: JSON.stringify({
                test_case_ids: testCaseIds,
                configuration_id: config.id,
                test_run_id: testRunId,
                test_run_execution_id: testRunExecution.id,
              }),
            });
          } catch (err) {
            console.error('Failed to trigger GitLab pipeline:', err);
          }

          const testCasesSummary = testCaseIds
            .map(id => {
              const tc = filteredTestCases.find(t => t.id === id);
              return tc ? `TC-${tc.fullTestCase?.projectRelativeId ?? tc.id}` : id;
            })
            .join(', ');

          startPolling(
            {
              id: testRunExecution.id,
              testCaseId: testRunExecution.test_case_id ?? 0,
              testCaseCode: testCasesSummary,
              testCaseTitle: `${testCaseIds.length} test case(s) on ${config.label}`,
              testRunId: testRunExecution.test_run_id,
              configurationId: parseInt(config.id, 10),
              state: testRunExecution.state ?? 1,
              stateLabel: testRunExecution.state_label ?? 'In Progress',
              startedAt: new Date(),
            },
            async () => {},
            (testCaseExecutionUpdates) => {
              setTestCases(prevTestCases => {
                return prevTestCases.map(tc => {
                  const update = testCaseExecutionUpdates.find(tce => {
                    const testCaseIdFromUpdate = typeof tce.test_case_id === 'string'
                      ? tce.test_case_id.split('/').pop()
                      : String(tce.test_case_id);
                    const configIdFromUpdate = tce.configuration_id
                      ? (typeof tce.configuration_id === 'string'
                          ? tce.configuration_id.split('/').pop()
                          : String(tce.configuration_id))
                      : undefined;

                    return testCaseIdFromUpdate === tc.id && configIdFromUpdate === tc.configurationId;
                  });

                  if (update) {
                    return {
                      ...tc,
                      executionStatus: update.result as TestResultId,
                      executionResult: TEST_RESULTS[update.result as TestResultId] || update.result_label,
                      execution: {
                        ...tc.execution,
                        result: update.result,
                        resultLabel: update.result_label,
                        comment: update.comment,
                      }
                    };
                  }
                  return tc;
                });
              });
            }
          );

          executionCount++;
        } catch (error) {
          console.error(`Failed to start execution for configuration ${config.label}:`, error);
          toast.error(`Failed to start execution for ${config.label}`);
        }
      }

      if (startedAnyExecution && testRun.state === 1) {
        try {
          await testRunsApiService.updateTestRunState(testRunId, 2, testRun.testPlanId || testPlanIdFromUrl);
          setTestRun(prev => (prev ? { ...prev, state: 2 } : prev));
        } catch (error) {
          console.error('Failed to update test run state to in progress:', error);
        }
      }

      toast.success(
        `Started ${executionCount} execution(s) for ${selectedPairs.length} test case(s). You can continue using the app while tests run in the background.`,
        { duration: 5000 }
      );

      setSelectedTestCasesForBulkRun(new Set());
    } catch (error) {
      console.error('Failed to start bulk executions:', error);
      toast.error('Failed to start bulk executions');
    } finally {
      setIsBulkRunning(false);
    }
  };

  const handleOpenCommentModal = (testCase: TestCaseWithExecution, selectedResultId: TestResultId) => {
    setSelectedTestCaseForComment({ ...testCase, executionStatus: selectedResultId });
    setIsCommentModalOpen(true);
  };

  useEffect(() => {
    if (testCases.length > 0) {
      applyFilters();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
                  className="bg-gradient-to-r from-cyan-400 to-blue-500 h-2 rounded-full"
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
              <div className="w-8 h-8 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full flex items-center justify-center mr-3">
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

      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {(() => {
          const resultCounts = {
            1: testCases.filter(tc => tc.executionStatus === 1).length,
            2: testCases.filter(tc => tc.executionStatus === 2).length,
            3: testCases.filter(tc => tc.executionStatus === 3).length,
            4: testCases.filter(tc => tc.executionStatus === 4).length,
            5: testCases.filter(tc => tc.executionStatus === 5).length,
            6: testCases.filter(tc => tc.executionStatus === 6).length,
            7: testCases.filter(tc => tc.executionStatus === 7).length,
            8: testCases.filter(tc => tc.executionStatus === 8).length,
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
                <span title={id === 8 ? 'Retry the run' : undefined} className="block">
                  <div className={`text-2xl font-bold mb-1 ${color}`}>{count}</div>
                  <div className="text-sm text-slate-600 dark:text-gray-400">{label}</div>
                </span>
              </Card>
            );
          });
        })()}
      </div>

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
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Test Cases ({activeTabTestCases.length}{activeTabTestCases.length !== (hasAutomatedConfigs ? (activeConfigTab === 'manual' ? allManualTestCases.length : allAutomatedTestCases.length) : testCases.length) ? ` of ${hasAutomatedConfigs ? (activeConfigTab === 'manual' ? allManualTestCases.length : allAutomatedTestCases.length) : testCases.length}` : ''})
          </h3>
          {activeConfigTab === 'automated' && automatedTestCasesForBulkRun.length > 0 && !isTestRunClosed && hasPermission(PERMISSIONS.TEST_RUN.UPDATE) && (
            <div className="flex items-center space-x-3">
              <button
                onClick={handleSelectAllToggle}
                className="px-3 py-1.5 text-sm text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors"
                disabled={isBulkRunning}
              >
                {selectedTestCasesForBulkRun.size === automatedTestCasesForBulkRun.length ? 'Unselect All' : 'Select All'}
              </button>
              <Button
                onClick={handleBulkRun}
                disabled={selectedTestCasesForBulkRun.size === 0 || isBulkRunning}
                className="flex items-center space-x-2"
                icon={Play}
              >
                {isBulkRunning ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Starting...</span>
                  </>
                ) : (
                  <span>Run Selected ({selectedTestCasesForBulkRun.size})</span>
                )}
              </Button>
            </div>
          )}
        </div>

        <ConfigurationTabs
          activeTab={activeConfigTab}
          onTabChange={(tab) => {
            setActiveConfigTab(tab);
            setSelectedTestCasesForBulkRun(new Set());
          }}
          manualCount={manualTestCases.length}
          automatedCount={automatedTestCases.length}
          hasAutomatedConfigs={hasAutomatedConfigs}
        />

        <TestRunDetailsTable
          testCases={activeTabTestCases}
          configurations={testRun.configurations || []}
          showCheckboxColumn={activeConfigTab === 'automated' && showCheckboxColumnForAutomated}
          showConfigurationColumn={showConfigurationColumn}
          selectedTestCases={selectedTestCasesForBulkRun}
          onTestCaseCheckboxToggle={handleTestCaseCheckboxToggle}
          onSelectAllToggle={handleSelectAllToggle}
          selectableCount={automatedTestCasesForBulkRun.length}
          isTestRunClosed={isTestRunClosed}
          isBulkRunning={isBulkRunning}
          updatingResults={updatingResults}
          testRunId={testRunId}
          gitlabLinksByTestCaseId={gitlabLinksByTestCaseId}
          gitlabLinksFetched={gitlabLinksFetched}
          isTestCaseAutomated={isTestCaseAutomated}
          hasAutomatedConfiguration={hasAutomatedConfiguration}
          hasPermission={hasPermission}
          executionUpdatePermission={PERMISSIONS.TEST_CASE_EXECUTION.UPDATE}
          onTestCaseTitleClick={handleTestCaseTitleClick}
          onExecutionResultChange={handleExecutionResultChange}
          onOpenCommentModal={handleOpenCommentModal}
          activeConfigTab={activeConfigTab}
          hasAutomatedConfigs={hasAutomatedConfigs}
        />
      </div>

      <TestCaseDetailsSidebar
        isOpen={isDetailsSidebarOpen}
        onClose={closeDetailsSidebar}
        testCase={selectedTestCaseForDetails}
        context="test-run-details"
        testRunId={testRun?.id}
        executionsFromRun={runExecutions}
        isTestRunClosed={isTestRunClosed}
        configurationId={selectedConfigurationId}
        isConfigurationAutomated={hasAutomatedConfiguration(selectedConfigurationId)}
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
