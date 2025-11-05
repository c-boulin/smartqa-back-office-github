import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, Share, MoreHorizontal, Loader } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import Card from '../UI/Card';
import Button from '../UI/Button';
import DownloadModal from './DownloadModal';
import ShareModal from './ShareModal';
import { reportDownloadService } from '../../services/reportDownloadService';
import { reportEmailService, ReportFormat } from '../../services/reportEmailService';
import { fetchTestCasesForReport } from '../../services/reportsDataService';
import { testRunsApiService } from '../../services/testRunsApi';
import { configurationsApiService } from '../../services/configurationsApi';
import { TEST_RESULTS, TestResultId } from '../../types';
import { PRIORITIES } from '../../constants/testCaseConstants';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

interface ReportFilters {
  statusOfTestCase: string[];
  testCaseType: string[];
  testCasePriority: string[];
  testCaseAssignee: string[];
  testCaseTags: string[];
  automationStatus: string[];
  createdDateRange: string;
  lastUpdatedDateRange: string;
}

interface TestRunDetailedReportProps {
  projectId: string;
  projectName: string;
  onBack: () => void;
  testRunIds?: string[];
  filters?: ReportFilters | null;
  creationDateFilter?: string;
  reportData?: {
    testCases: Array<{ attributes: { id: number; [key: string]: unknown } }>;
    testRuns: Array<{ attributes: { id: number; [key: string]: unknown } }>;
    testExecutions?: Array<{ attributes: { test_case_id?: number; result?: number; [key: string]: unknown } }>;
    included?: Array<Record<string, unknown>>;
    totalTestCases: number;
  } | null;
  description?: string;
  title?: string;
}

interface TestCaseWithExecution {
  testRunId: string;
  testRunName: string;
  testRunStatus: string;
  testCaseId: string;
  testCaseTitle: string;
  latestStatus: string;
  priority: string;
  assignee: string;
  typeId?: number | string;
  configurationId?: string;
  configurationName?: string;
}

interface ReportData {
  totalTestRuns: number;
  activeTestRuns: number;
  closedTestRuns: number;
  totalTestCases: number;
  totalLinkedIssues: number;
  testCaseBreakup: {
    passed: number;
    failed: number;
    blocked: number;
    untested: number;
  };
  testRunsBreakup: {
    new: number;
    inProgress: number;
    underReview: number;
    rejected: number;
    done: number;
    closed: number;
  };
  assigneeResults: Array<{
    assignee: string;
    count: number;
  }>;
  testCasesIncluded: TestCaseWithExecution[];
  performanceData: Array<{
    date: string;
    passed: number;
    failed: number;
    other: number;
  }>;
}

const TestRunDetailedReport: React.FC<TestRunDetailedReportProps> = ({
  projectId,
  projectName,
  onBack,
  testRunIds,
  filters,
  creationDateFilter,
  reportData: passedReportData,
  description,
  title
}) => {
  const { state: authState } = useAuth();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper function to calculate date threshold from creation date filter
  const calculateDateThreshold = (filter: string | undefined): Date | null => {
    if (!filter) return null;

    const now = new Date();
    const threshold = new Date();

    switch (filter) {
      case 'Last 24 hours':
        threshold.setHours(now.getHours() - 24);
        break;
      case 'Last 48 hours':
        threshold.setHours(now.getHours() - 48);
        break;
      case 'Last 7 days':
        threshold.setDate(now.getDate() - 7);
        break;
      case 'Last 30 days':
        threshold.setDate(now.getDate() - 30);
        break;
      default:
        return null;
    }

    return threshold;
  };
  const fetchInProgressRef = React.useRef(false);

  // Log description for debugging
  React.useEffect(() => {
    console.log('📊 TestRunDetailedReport received description:', description);
  }, [description]);

  useEffect(() => {
    // Prevent duplicate fetches (React Strict Mode calls effects twice)
    if (fetchInProgressRef.current) {
      return;
    }

    fetchInProgressRef.current = true;
    fetchTestRunsData().finally(() => {
      fetchInProgressRef.current = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchTestRunsData is stable
  }, [projectId, passedReportData]);

  const fetchTestRunsData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('📊 Fetching test cases for detailed report, project:', projectId);

      // Use pre-fetched data if available, otherwise fetch
      let response;
      if (passedReportData !== null && passedReportData !== undefined) {
        console.log('📊 ✅ Using pre-fetched report data from modal - NO API CALLS NEEDED!');
        response = passedReportData;
      } else {
        console.log('📊 Fetching report data using /test_cases endpoint');
        response = await fetchTestCasesForReport(projectId, filters);
      }

      const { testCases, testRuns, testExecutions } = response;

      if (!testCases || testCases.length === 0) {
        console.warn('No test cases received from API');
      }

      console.log(`📊 Received ${testCases.length} test cases, ${testRuns.length} test runs, ${testExecutions?.length || 0} test executions`);

      // STEP 2: Fetch all configurations for the project
      console.log('📊 Fetching all configurations for project');
      const configurationsResponse = await configurationsApiService.getConfigurations();
      const configurationsMap = new Map<string, { id: string; name: string }>();

      if (configurationsResponse.data && Array.isArray(configurationsResponse.data)) {
        configurationsResponse.data.forEach((config) => {
          const configId = config.attributes.id.toString();
          configurationsMap.set(configId, {
            id: configId,
            name: config.attributes.label || `Configuration ${configId}`
          });
        });
      }
      console.log(`📊 Built configurations map with ${configurationsMap.size} configurations from API`);

      // STEP 3: Build users map from included data
      const usersMap = new Map<string, { id: string; name: string; email: string }>();

      if (response.included && Array.isArray(response.included)) {
        response.included.forEach((item: Record<string, unknown>) => {
          if (item.type === 'User' && item.attributes) {
            const userId = item.attributes.id.toString();
            usersMap.set(userId, {
              id: userId,
              name: item.attributes.name || item.attributes.email || `User ${userId}`,
              email: item.attributes.email || ''
            });
          }
        });
      }
      console.log(`📊 Built users map with ${usersMap.size} users`);

      // STEP 4: Build test runs map from included test runs
      // Use the SAME transformation service as Summary report for consistency
      const testRunsMap = new Map<string, Record<string, unknown>>();
      testRuns.forEach((apiTestRun) => {
        // Transform using the standardized service - same as Summary report
        const transformed = testRunsApiService.transformApiTestRun(apiTestRun, response.included || []);

        testRunsMap.set(transformed.id, {
          id: transformed.id,
          name: transformed.name,
          state: transformed.state,
          status: transformed.status,
          createdAt: transformed.createdAt,
          assignedTo: transformed.assignedTo,
          testCaseIds: new Set<string>(),
          testCasesCount: transformed.testCasesCount,
          passedCount: transformed.passedCount,
          failedCount: transformed.failedCount,
          blockedCount: transformed.blockedCount
        });

        console.log(`📊 Test Run ${transformed.id}: state=${transformed.state}, status=${transformed.status}, createdAt=${transformed.createdAt.toISOString()}`);
      });

      // STEP 5: APPLY ALL FILTERS FIRST (Test Run IDs + Creation Date)
      // This is CRITICAL - we must filter test runs BEFORE building the executions map

      console.log('📊 ========== STARTING FILTER APPLICATION ==========');
      console.log('📊 Initial test runs count:', testRunsMap.size);
      console.log('📊 All test run IDs:', Array.from(testRunsMap.keys()));

      // Start with all test run IDs
      let filteredTestRunIds = new Set<string>(testRunsMap.keys());

      // FILTER 1: Apply specific test run IDs filter if provided
      if (testRunIds && testRunIds.length > 0) {
        console.log('📊 FILTER 1: Applying specific test run IDs filter:', testRunIds);
        filteredTestRunIds = new Set(testRunIds.filter(id => testRunsMap.has(id)));
        console.log(`📊 After test run ID filter: ${filteredTestRunIds.size} test runs`);
      }

      // FILTER 2: Apply creation date filter if provided
      const dateThreshold = calculateDateThreshold(creationDateFilter);
      if (dateThreshold) {
        console.log(`📊 FILTER 2: Applying creation date filter: ${creationDateFilter}`);
        console.log(`📊 Date threshold: ${dateThreshold.toISOString()}`);
        console.log(`📊 Current time: ${new Date().toISOString()}`);

        const testRunsBeforeFilter = Array.from(filteredTestRunIds).map(id => testRunsMap.get(id)).filter(Boolean);

        console.log(`📊 Test runs before date filter: ${testRunsBeforeFilter.length}`);
        testRunsBeforeFilter.forEach(tr => {
          const trCreatedAt = new Date(tr.createdAt);
          console.log(`📊 Test Run ${tr.id} (${tr.name}): created ${trCreatedAt.toISOString()}, threshold check: ${trCreatedAt >= dateThreshold}`);
        });

        const testRunsAfterDateFilter = testRunsBeforeFilter.filter(tr => {
          const trCreatedAt = new Date(tr.createdAt);
          const isWithinPeriod = trCreatedAt >= dateThreshold;
          return isWithinPeriod;
        });

        filteredTestRunIds = new Set(testRunsAfterDateFilter.map(tr => tr.id));
        console.log(`📊 After creation date filter: ${filteredTestRunIds.size} test runs`);
        console.log(`📊 Filtered test run IDs:`, Array.from(filteredTestRunIds));
      }

      console.log('📊 ========== FILTERS APPLIED ==========');
      console.log('📊 Final filtered test run IDs:', Array.from(filteredTestRunIds));
      console.log('📊 Final filtered test runs count:', filteredTestRunIds.size);

      // STEP 6: Build test executions map ONLY from filtered test runs
      // IMPORTANT: The API's execution_result filter returns test cases based on their
      // ABSOLUTE latest execution across ALL test runs. We need to filter executions
      // to only include those from the filtered test runs.
      const executionsMap = new Map<string, Map<string, Record<string, unknown>>>();

      // Create a set of filtered test case IDs for quick lookup
      const filteredTestCaseIds = new Set(
        testCases.map((tc) => tc.attributes.id.toString())
      );
      console.log('📊 Filtered test case IDs from API response:', filteredTestCaseIds.size, 'test cases');

      if (testExecutions && Array.isArray(testExecutions)) {
        console.log('📊 Processing', testExecutions.length, 'total test executions');

        testExecutions.forEach((execution) => {
          const testCaseId = execution.attributes.test_case_id?.toString();
          const testRunId = execution.attributes.test_run_id?.toString();
          const configurationId = execution.attributes.configuration_id?.toString() || 'no-config';
          const userId = execution.attributes.user_id?.toString();

          // CRITICAL: Only process executions that belong to:
          // 1. Filtered test runs (by date/ID filters)
          // 2. Filtered test cases (by type/priority/status filters)
          if (testCaseId && testRunId && filteredTestRunIds.has(testRunId) && filteredTestCaseIds.has(testCaseId)) {
            // Create unique key for test case + configuration combination
            const testCaseConfigKey = `${testCaseId}-${configurationId}`;

            if (!executionsMap.has(testCaseConfigKey)) {
              executionsMap.set(testCaseConfigKey, new Map());
            }

            const testRunExecutions = executionsMap.get(testCaseConfigKey)!;

            // Keep only the latest execution per test case + configuration per test run
            const existingExecution = testRunExecutions.get(testRunId);
            const currentDate = new Date(execution.attributes.updated_at || execution.attributes.created_at || 0);

            if (!existingExecution || currentDate > new Date(existingExecution.updated_at || existingExecution.created_at || 0)) {
              testRunExecutions.set(testRunId, {
                ...execution.attributes,
                userId: userId,
                configurationId: configurationId
              });
            }
          }
        });
      }

      console.log(`📊 Built executions map with ${executionsMap.size} test case+configuration combinations after filtering by test runs`);

      // STEP 7: Build test cases included list ONLY from filtered test runs
      const testCasesIncluded: TestCaseWithExecution[] = [];
      const testRunStats = new Map<string, { passed: number; failed: number; blocked: number; untested: number; total: number }>();

      // Build set of allowed status IDs if filter is applied
      const statusFilterApplied = filters?.statusOfTestCase && filters.statusOfTestCase.length > 0;
      const allowedStatusIds = statusFilterApplied ? new Set(filters!.statusOfTestCase.map(s => parseInt(s, 10))) : null;

      console.log('📊 ========== BUILDING TEST CASES LIST ==========');
      console.log('📊 Processing test cases...');
      console.log('📊 Total test cases from API:', testCases.length);
      console.log('📊 Total executions in map:', executionsMap.size);
      console.log('📊 Status filter applied:', statusFilterApplied);
      if (statusFilterApplied) {
        console.log('📊 Allowed status IDs:', Array.from(allowedStatusIds || []));
      }

      // Iterate over all test case + configuration combinations in the executions map
      executionsMap.forEach((testRunExecutions, testCaseConfigKey) => {
        // Extract testCaseId and configurationId from the key
        const [testCaseId, configurationId] = testCaseConfigKey.split('-');

        // Find the test case in the testCases array
        const testCase = testCases.find(tc => tc.attributes.id.toString() === testCaseId);

        if (!testCase) {
          return;
        }

        testRunExecutions.forEach((execution, testRunId: string) => {
          // CRITICAL: Only process executions from filtered test runs
          if (!filteredTestRunIds.has(testRunId)) {
            console.log(`📊 Skipping execution for test run ${testRunId} - not in filtered test runs`);
            return;
          }

          const testRun = testRunsMap.get(testRunId);
          if (!testRun) {
            console.log(`📊 Skipping execution - test run ${testRunId} not found in map`);
            return;
          }

          // Get latest execution result
          const rawResult = execution.result;
          let resultId: TestResultId;

          if (typeof rawResult === 'number') {
            resultId = rawResult as TestResultId;
          } else if (typeof rawResult === 'string') {
            const parsedInt = parseInt(rawResult);
            if (!isNaN(parsedInt) && TEST_RESULTS[parsedInt as TestResultId]) {
              resultId = parsedInt as TestResultId;
            } else {
              const foundEntry = Object.entries(TEST_RESULTS).find(([, label]) =>
                label.toLowerCase() === rawResult.toLowerCase()
              );
              resultId = foundEntry ? parseInt(foundEntry[0]) as TestResultId : 6;
            }
          } else {
            resultId = 6;
          }

          // If status filter is applied, skip executions that don't match
          if (allowedStatusIds && !allowedStatusIds.has(resultId)) {
            console.log(`📊 Skipping execution for TC ${testCaseId} in TR ${testRunId} - status ${resultId} not in allowed statuses`);
            return;
          }

          // Track that this test case belongs to this test run
          testRun.testCaseIds.add(testCaseId);

          const latestStatus = TEST_RESULTS[resultId] || 'Untested';

          // Update test run stats
          if (!testRunStats.has(testRunId)) {
            testRunStats.set(testRunId, { passed: 0, failed: 0, blocked: 0, untested: 0, total: 0 });
          }
          const stats = testRunStats.get(testRunId)!;
          stats.total++;

          switch (latestStatus.toLowerCase()) {
            case 'passed':
              stats.passed++;
              break;
            case 'failed':
              stats.failed++;
              break;
            case 'blocked':
              stats.blocked++;
              break;
            default:
              stats.untested++;
              break;
          }

          // Get priority label from priority number
          const priorityNum = testCase.attributes.priority || 2;
          const priorityLabel = PRIORITIES[priorityNum as keyof typeof PRIORITIES]?.label || 'Medium';

          // Get test case owner from relationships.user
          let testCaseOwner = 'Unassigned';
          if (testCase.relationships?.user?.data?.id) {
            const userIdPath = testCase.relationships.user.data.id.toString();
            const userId = userIdPath.split('/').pop() || userIdPath;
            const user = usersMap.get(userId);
            testCaseOwner = user ? user.name : 'Unassigned';
          }

          // Get configuration name from configurations map
          let configName: string | undefined = undefined;
          if (configurationId && configurationId !== 'no-config') {
            const config = configurationsMap.get(configurationId);
            configName = config ? config.name : `Configuration ${configurationId}`;
          }

          // Add to test cases included list
          testCasesIncluded.push({
            testRunId: testRun.id,
            testRunName: testRun.name,
            testRunStatus: testRun.state === 1 ? 'New' :
                         testRun.state === 2 ? 'In Progress' :
                         testRun.state === 3 ? 'Under Review' :
                         testRun.state === 4 ? 'Rejected' :
                         testRun.state === 5 ? 'Done' :
                         testRun.state === 6 ? 'Closed' : 'Active',
            testCaseId: testCaseId,
            testCaseTitle: testCase.attributes.title || `Test Case ${testCaseId}`,
            latestStatus: latestStatus,
            priority: priorityLabel,
            assignee: testCaseOwner,
            typeId: testCase.attributes.typeId || testCase.attributes.type,
            configurationId: configurationId !== 'no-config' ? configurationId : undefined,
            configurationName: configName
          });
        });
      });

      console.log('📊 Test cases included after filtering:', testCasesIncluded.length);
      console.log('📊 ========== TEST CASES INCLUDED BREAKDOWN ==========');

      // Log breakdown by test run
      const testCasesByTestRun = new Map<string, number>();
      testCasesIncluded.forEach(tc => {
        testCasesByTestRun.set(tc.testRunId, (testCasesByTestRun.get(tc.testRunId) || 0) + 1);
      });
      testCasesByTestRun.forEach((count, testRunId) => {
        const testRun = testRunsMap.get(testRunId);
        console.log(`📊   Test Run ${testRunId} (${testRun?.name}): ${count} test case executions`);
      });

      // STEP 8: Calculate ALL report metrics from filtered test runs
      const filteredTestRuns = Array.from(filteredTestRunIds).map(id => testRunsMap.get(id)!).filter(Boolean);
      const totalTestRuns = filteredTestRuns.length;
      const activeTestRuns = filteredTestRuns.filter(tr => tr.state !== 6).length;
      const closedTestRuns = filteredTestRuns.filter(tr => tr.state === 6).length;

      console.log('📊 ========== CALCULATING METRICS ==========');
      console.log('📊 Filtered test runs:', totalTestRuns);
      console.log('📊 Active test runs:', activeTestRuns);
      console.log('📊 Closed test runs:', closedTestRuns);

      // Calculate aggregate stats directly from testCasesIncluded
      // This ensures stats match the actual filtered data
      const totalTestCases = testCasesIncluded.length;
      let totalPassed = 0;
      let totalFailed = 0;
      let totalBlocked = 0;
      let totalUntested = 0;

      testCasesIncluded.forEach(tc => {
        const status = tc.latestStatus.toLowerCase();
        switch (status) {
          case 'passed':
            totalPassed++;
            break;
          case 'failed':
            totalFailed++;
            break;
          case 'blocked':
            totalBlocked++;
            break;
          default:
            totalUntested++;
            break;
        }
      });

      console.log('📊 Total test executions:', totalTestCases);
      console.log('📊 Passed:', totalPassed);
      console.log('📊 Failed:', totalFailed);
      console.log('📊 Blocked:', totalBlocked);
      console.log('📊 Untested:', totalUntested);
      console.log('📊 Sum of statuses:', totalPassed + totalFailed + totalBlocked + totalUntested);
      console.log('📊 ========== METRICS CALCULATED ==========');

      // Count test runs by state
      const testRunsBreakup = {
        new: filteredTestRuns.filter(tr => tr.state === 1).length,
        inProgress: filteredTestRuns.filter(tr => tr.state === 2).length,
        underReview: filteredTestRuns.filter(tr => tr.state === 3).length,
        rejected: filteredTestRuns.filter(tr => tr.state === 4).length,
        done: filteredTestRuns.filter(tr => tr.state === 5).length,
        closed: filteredTestRuns.filter(tr => tr.state === 6).length
      };

      // Count results by assignee (using testCasesIncluded which is already filtered)
      const assigneeMap = new Map<string, number>();
      testCasesIncluded.forEach(tc => {
        const assigneeName = tc.assignee;
        assigneeMap.set(assigneeName, (assigneeMap.get(assigneeName) || 0) + 1);
      });

      const assigneeResults = Array.from(assigneeMap.entries()).map(([assignee, count]) => ({
        assignee,
        count
      })).sort((a, b) => b.count - a.count);

      // STEP 9: Generate performance data (trend based on creation date filter)
      // Performance chart shows executions over time from FILTERED test runs only
      console.log('📊 ========== GENERATING PERFORMANCE DATA ==========');

      let dataPoints = 7; // default to 7 days
      let timeUnit: 'hours' | 'days' = 'days';

      if (creationDateFilter && !testRunIds) {
        // Only use the creation date filter if not using specific test runs
        switch (creationDateFilter) {
          case 'Last 24 hours':
            dataPoints = 24;
            timeUnit = 'hours';
            break;
          case 'Last 48 hours':
            dataPoints = 48;
            timeUnit = 'hours';
            break;
          case 'Last 7 days':
            dataPoints = 7;
            timeUnit = 'days';
            break;
          case 'Last 30 days':
            dataPoints = 30;
            timeUnit = 'days';
            break;
          default:
            dataPoints = 7;
            timeUnit = 'days';
        }
      }

      const performanceData = [];
      for (let i = dataPoints - 1; i >= 0; i--) {
        const date = new Date();
        if (timeUnit === 'hours') {
          date.setHours(date.getHours() - i);
          date.setMinutes(0, 0, 0);
        } else {
          date.setDate(date.getDate() - i);
          date.setHours(0, 0, 0, 0);
        }

        let passed = 0;
        let failed = 0;
        let other = 0;

        // Count executions by date/hour - ONLY from filtered test runs
        if (testExecutions && Array.isArray(testExecutions)) {
          const dayExecutions = new Map<string, Record<string, number>>();

          testExecutions.forEach((execution) => {
            const executionDate = new Date(execution.attributes.created_at || 0);

            // Normalize execution date based on time unit
            if (timeUnit === 'hours') {
              executionDate.setMinutes(0, 0, 0);
            } else {
              executionDate.setHours(0, 0, 0, 0);
            }

            if (executionDate.getTime() !== date.getTime()) return;

            const testRunId = execution.attributes.test_run_id?.toString();
            const testCaseId = execution.attributes.test_case_id?.toString();
            const configurationId = execution.attributes.configuration_id?.toString() || 'no-config';

            // CRITICAL: Only include executions from filtered test runs AND filtered test cases
            if (!testRunId || !testCaseId || !filteredTestRunIds.has(testRunId) || !filteredTestCaseIds.has(testCaseId)) return;

            // Apply status filter if present
            const rawResult = execution.attributes.result;
            const resultNum = typeof rawResult === 'string' ? parseInt(rawResult, 10) : rawResult;
            if (allowedStatusIds && !allowedStatusIds.has(resultNum)) {
              return;
            }

            // Include configuration in composite key to count each test case × configuration combination
            const compositeKey = `${testRunId}-${testCaseId}-${configurationId}`;
            const existing = dayExecutions.get(compositeKey);
            const currentDate = new Date(execution.attributes.updated_at || execution.attributes.created_at || 0);

            if (!existing || currentDate > new Date(existing.updated_at || existing.created_at || 0)) {
              dayExecutions.set(compositeKey, execution.attributes);
            }
          });

          dayExecutions.forEach((execution) => {
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
                passed++;
                break;
              case 'failed':
                failed++;
                break;
              default:
                other++;
                break;
            }
          });
        }

        // Format date label based on time unit
        let dateLabel: string;
        if (timeUnit === 'hours') {
          dateLabel = date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', hour12: true });
        } else {
          dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }

        performanceData.push({
          date: dateLabel,
          passed,
          failed,
          other
        });
      }

      console.log('📊 ========== FINAL REPORT DATA ==========');
      console.log('📊 Total test runs:', totalTestRuns);
      console.log('📊 Active test runs:', activeTestRuns);
      console.log('📊 Closed test runs:', closedTestRuns);
      console.log('📊 Total test executions:', totalTestCases);
      console.log('📊 Test cases in table:', testCasesIncluded.length);
      console.log('📊 Breakdown: Passed=' + totalPassed + ', Failed=' + totalFailed + ', Blocked=' + totalBlocked + ', Untested=' + totalUntested);
      console.log('📊 Consistency check #1 (totalTestCases === table rows):', totalTestCases === testCasesIncluded.length ? '✅ PASS' : '❌ FAIL');
      console.log('📊 Consistency check #2 (totalTestCases === sum of statuses):', totalTestCases === (totalPassed + totalFailed + totalBlocked + totalUntested) ? '✅ PASS' : '❌ FAIL');

      const reportData: ReportData = {
        totalTestRuns,
        activeTestRuns,
        closedTestRuns,
        totalTestCases,
        totalLinkedIssues: 0,
        testCaseBreakup: {
          passed: totalPassed,
          failed: totalFailed,
          blocked: totalBlocked,
          untested: totalUntested
        },
        testRunsBreakup,
        assigneeResults,
        testCasesIncluded: testCasesIncluded,
        performanceData
      };

      setReportData(reportData);
      console.log('📊 ========== REPORT GENERATION COMPLETE ==========');
      console.log('📊 Report contains', testCasesIncluded.length, 'test executions from', totalTestRuns, 'test runs');

    } catch (err) {
      console.error('❌ Failed to fetch test runs data for detailed report:', err);
      setError(err instanceof Error ? err.message : 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'new':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/50';
      case 'untested':
        return 'bg-gray-500/20 text-gray-400 border border-gray-500/50';
      case 'passed':
        return 'bg-green-500/20 text-green-400 border border-green-500/50';
      case 'failed':
        return 'bg-red-500/20 text-red-400 border border-red-500/50';
      case 'blocked':
        return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50';
      case 'in progress':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/50';
      case 'done':
        return 'bg-green-500/20 text-green-400 border border-green-500/50';
      case 'closed':
        return 'bg-purple-500/20 text-purple-400 border border-purple-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border border-gray-500/50';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical':
        return 'text-red-400';
      case 'high':
        return 'text-orange-400';
      case 'medium':
        return 'text-blue-400';
      case 'low':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  const handleDownloadPDF = async () => {
    console.log('📄 Downloading detailed report as PDF...');

    if (!reportData) {
      toast.error('No report data available');
      return;
    }

    try {
      await reportDownloadService.generateDetailedReportPDF(
        reportData,
        projectName,
        authState.user?.name || 'Unknown User'
      );
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const handleDownloadCSV = () => {
    console.log('📊 Downloading detailed report as CSV...');

    if (!reportData) {
      toast.error('No report data available');
      return;
    }

    try {
      reportDownloadService.generateDetailedReportCSV(
        reportData,
        projectName,
        authState.user?.name || 'Unknown User'
      );
      toast.success('CSV downloaded successfully');
    } catch (error) {
      console.error('Failed to generate CSV:', error);
      toast.error('Failed to generate CSV');
    }
  };

  const handleSendEmail = async (emails: string[], message: string, format: ReportFormat) => {
    console.log('📧 Sending detailed report via email to:', emails);
    console.log('📧 Message:', message);
    console.log('📧 Format:', format);

    if (!reportData) {
      toast.error('No report data available');
      return;
    }

    try {
      setIsSubmitting(true);

      let reportBlob: Blob;
      if (format === 'pdf') {
        reportBlob = await reportDownloadService.generateDetailedReportPDFBlob(
          reportData,
          projectName,
          authState.user?.name || 'Unknown User'
        );
      } else {
        reportBlob = reportDownloadService.generateDetailedReportCSVBlob(
          reportData,
          projectName,
          authState.user?.name || 'Unknown User'
        );
      }

      await reportEmailService.sendReportEmail(
        emails,
        title || 'Test Run Detailed Report',
        'detailed_report',
        projectName,
        message,
        reportBlob,
        format
      );

      const recipientText = emails.length === 1 ? emails[0] : `${emails.length} recipients`;
      toast.success(`Detailed report sent successfully to ${recipientText}`);
    } catch (error) {
      console.error('Failed to send email:', error);
      toast.error('Failed to send email');
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading detailed report data...</p>
        </div>
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Card className="p-8 text-center">
          <div className="text-red-400 mb-4">
            <p className="text-lg font-medium">Failed to load detailed report data</p>
            <p className="text-sm text-gray-400 mt-2">{error}</p>
          </div>
          <Button onClick={onBack}>
            Back to Reports
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 border-b border-purple-500/20 shadow-2xl px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="secondary"
              icon={ArrowLeft}
              onClick={onBack}
              className="text-gray-300 hover:text-white"
            >
              Back to Reports
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">{title || 'Test Run Detailed Report'}</h1>
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-300">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {authState.user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                  </div>
                  <span>{authState.user?.name || 'Unknown User'}</span>
                </div>
                <span>•</span>
                <span>{title || 'Test Run Detailed Report'}</span>
              </div>
              {description && (
                <p className="text-sm text-gray-400 mt-2">{description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="secondary"
              icon={Download}
              onClick={() => setIsDownloadModalOpen(true)}
              className="bg-slate-700 hover:bg-slate-600 text-white border-slate-600"
            >
              Download
            </Button>
            <Button
              icon={Share}
              onClick={() => setIsShareModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Share
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6" data-report-content="true">
        {/* Top Row - Performance Chart and Summary Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Test run performance - Takes 2/3 width */}
          <Card gradient className="lg:col-span-2 p-6">
            <div data-report-section="performance-chart">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Test Results Trends</h3>
                <p className="text-sm text-gray-400">
                  Test case execution results over the {(creationDateFilter && !testRunIds) ? creationDateFilter.toLowerCase() : 'last 7 days'}
                </p>
              </div>
              <MoreHorizontal className="w-5 h-5 text-gray-400" />
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={reportData.performanceData}>
                  <defs>
                    <linearGradient id="colorPassed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.2}/>
                    </linearGradient>
                    <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0.2}/>
                    </linearGradient>
                    <linearGradient id="colorOther" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.2}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="date"
                    stroke="#6B7280"
                    fontSize={12}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#6B7280"
                    fontSize={12}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Legend
                    wrapperStyle={{ color: '#fff' }}
                    iconType="square"
                  />
                  <Area
                    type="monotone"
                    dataKey="passed"
                    name="Passed"
                    stackId="1"
                    stroke="#10B981"
                    fill="url(#colorPassed)"
                  />
                  <Area
                    type="monotone"
                    dataKey="failed"
                    name="Failed"
                    stackId="1"
                    stroke="#EF4444"
                    fill="url(#colorFailed)"
                  />
                  <Area
                    type="monotone"
                    dataKey="other"
                    name="Other Results"
                    stackId="1"
                    stroke="#F59E0B"
                    fill="url(#colorOther)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            </div>
          </Card>

          {/* Summary Cards - Takes 1/3 width */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
            <div data-report-section="summary-cards-grid">
            {/* Active Test Runs */}
            <Card gradient className="p-6 text-center">
              <h3 className="text-lg font-semibold text-white mb-2">Active Test Runs</h3>
              <div className="text-4xl font-bold text-cyan-400">
                {reportData.activeTestRuns} / {reportData.totalTestRuns}
              </div>
            </Card>

            {/* Closed Test Runs */}
            <Card gradient className="p-6 text-center">
              <h3 className="text-lg font-semibold text-white mb-2">Closed Test Runs</h3>
              <div className="text-4xl font-bold text-purple-400">
                {reportData.closedTestRuns} / {reportData.totalTestRuns}
              </div>
            </Card>

            {/* Total Test Cases */}
            <Card gradient className="p-6 text-center">
              <h3 className="text-lg font-semibold text-white mb-2">Total Test Cases</h3>
              <div className="text-4xl font-bold text-green-400">{reportData.totalTestCases}</div>
            </Card>

            {/* Total Linked Issues */}
            <Card gradient className="p-6 text-center">
              <h3 className="text-lg font-semibold text-white mb-2">Total Linked Issues</h3>
              <div className="text-4xl font-bold text-orange-400">{reportData.totalLinkedIssues}</div>
            </Card>
            </div>
          </div>
        </div>

        {/* Test Cases Table */}
        <Card className="overflow-hidden">
          <div data-report-section="test-cases-table">
          <div className="px-6 py-4 border-b border-slate-700">
            <h3 className="text-lg font-semibold text-white">
              {reportData.testCasesIncluded.length} Test cases included in this report
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50 border-b border-slate-700">
                <tr>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-400 uppercase tracking-wider">
                    TEST RUN
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-400 uppercase tracking-wider">
                    TEST CASE
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-400 uppercase tracking-wider">
                    TEST RUN LATEST STATUS
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-400 uppercase tracking-wider">
                    TEST CASE PRIORITY
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-400 uppercase tracking-wider">
                    TEST CASE ASSIGNEE
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-400 uppercase tracking-wider">
                    CONFIGURATION
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-400 uppercase tracking-wider">
                    <MoreHorizontal className="w-4 h-4 text-gray-400" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {reportData.testCasesIncluded.map((testCase) => (
                  <tr key={`${testCase.testRunId}-${testCase.testCaseId}`} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-6">
                      <div>
                        <div className="text-sm font-medium text-white">TR-{testCase.testRunId}</div>
                        <div className="text-sm text-gray-400">{testCase.testRunName}</div>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(testCase.testRunStatus)}`}>
                            {testCase.testRunStatus}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div>
                        <div className="text-sm font-medium text-white">TC-{testCase.testCaseId}</div>
                        <div className="text-sm text-gray-400">{testCase.testCaseTitle}</div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(testCase.latestStatus)}`}>
                        {testCase.latestStatus}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`text-sm font-medium ${getPriorityColor(testCase.priority)}`}>
                        — {testCase.priority}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-white">{testCase.assignee}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-gray-400">
                        {testCase.configurationName || 'Default'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <button className="p-1 text-gray-400 hover:text-cyan-400 transition-colors">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {reportData.testCasesIncluded.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <p className="text-lg font-medium">No test cases found</p>
                  <p className="text-sm">No test cases are included in the test runs for this project</p>
                </div>
              </div>
            )}
          </div>
          </div>
        </Card>
      </div>

      {/* Download Modal */}
      <DownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        onDownloadPDF={handleDownloadPDF}
        onDownloadCSV={handleDownloadCSV}
        reportTitle="Test Run Detailed Report"
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        onSendEmail={handleSendEmail}
        reportTitle={title || "Test Run Detailed Report"}
        reportType="detailed_report"
        projectName={projectName}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};

export default TestRunDetailedReport;