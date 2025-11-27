import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, Share, MoreHorizontal } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import Card from '../UI/Card';
import Button from '../UI/Button';
import DownloadModal from './DownloadModal';
import ShareModal from './ShareModal';
import { reportDownloadService } from '../../services/reportDownloadService';
import { reportEmailService, ReportFormat } from '../../services/reportEmailService';
import { testRunsApiService } from '../../services/testRunsApi';
import { fetchTestCasesForReport } from '../../services/reportsDataService';
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

interface TestRunSummaryReportProps {
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
    totalTestCases: number;
  } | null;
  description?: string;
  title?: string;
}

interface TestRunData {
  id: string;
  name: string;
  state: number;
  status: 'open' | 'closed';
  testCasesCount: number;
  passedCount: number;
  failedCount: number;
  blockedCount: number;
  retestCount: number;
  skippedCount: number;
  untestedCount: number;
  inProgressCount: number;
  unknownCount: number;
  assignedTo: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: Date;
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
    retest: number;
    skipped: number;
    untested: number;
    inProgress: number;
    unknown: number;
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
  defectsLinkedWithTestResults: number;
  requirementsLinkedWithTestRuns: number;
}

const TestRunSummaryReport: React.FC<TestRunSummaryReportProps> = ({
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

  // Log description for debugging
  React.useEffect(() => {

  }, [description]);

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

  useEffect(() => {
    fetchTestRunsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, testRunIds, creationDateFilter, passedReportData]);

  const fetchTestRunsData = async () => {
    try {
      setLoading(true);
      setError(null);


      // If we have pre-fetched report data from GET /test_cases?include=testRuns,
      // use it directly - no need to fetch anything!
      // Check if passedReportData exists (not null/undefined), even if empty
      if (passedReportData !== null && passedReportData !== undefined) {


        if (passedReportData.testCases && passedReportData.testCases.length > 0) {


          if (passedReportData.testExecutions) {
            // Test executions available
          }
        }

        // Transform test runs from the included data
        let testRuns: TestRunData[] = [];
        if (passedReportData.testRuns && passedReportData.testRuns.length > 0) {
          testRuns = passedReportData.testRuns.map((apiTestRun) => {
            const transformed = testRunsApiService.transformApiTestRun(apiTestRun, []);
            return {
              id: transformed.id,
              name: transformed.name,
              state: transformed.state,
              status: transformed.status,
              testCasesCount: transformed.testCasesCount,
              passedCount: transformed.passedCount,
              failedCount: transformed.failedCount,
              blockedCount: transformed.blockedCount,
              retestCount: 0,
              skippedCount: 0,
              untestedCount: transformed.testCasesCount - transformed.passedCount - transformed.failedCount - transformed.blockedCount,
              inProgressCount: 0,
              unknownCount: 0,
              assignedTo: transformed.assignedTo,
              createdAt: transformed.createdAt
            };
          });
        } else {
          // No test runs in included data
        }

        // Apply filters to test runs if needed
        if (testRunIds && testRunIds.length > 0) {
          testRuns = testRuns.filter(tr => testRunIds.includes(tr.id));

        }

        // Filter by creation date if provided
        const dateThreshold = calculateDateThreshold(creationDateFilter);
        if (dateThreshold) {
          const _beforeCount = testRuns.length;


          testRuns.forEach(tr => {
            const _trCreatedAt = new Date(tr.createdAt);

          });

          testRuns = testRuns.filter(tr => {
            const _trCreatedAt = new Date(tr.createdAt);
            const isWithinPeriod = trCreatedAt >= dateThreshold;

            return isWithinPeriod;
          });

        }

        // Calculate metrics directly from the pre-fetched data
        const totalTestRuns = testRuns.length;
        const activeTestRuns = testRuns.filter(tr => tr.state !== 6).length;
        const closedTestRuns = testRuns.filter(tr => tr.state === 6).length;

        // IMPORTANT: If filters were applied (e.g., type filter), the test cases
        // in passedReportData.testCases are ALREADY FILTERED. We need to count
        // only those filtered test cases, not all test cases in the test runs!

        let totalTestCases = passedReportData.testCases.length;

        // Calculate execution statistics from test executions data
        let totalPassed = 0;
        let totalFailed = 0;
        let totalBlocked = 0;
        let totalUntested = 0;

        // IMPORTANT: Find the latest execution per test case PER test run
        // The API's execution_result filter returns test cases based on their absolute latest execution
        // across ALL test runs, but we need to filter per test run for accurate reporting
        // Declare this outside the block so it can be used later for assignee counting
        const latestExecutionPerTestCasePerRun = new Map<string, { attributes: { result?: number; [key: string]: unknown } }>();

        // Build status filter set for quick lookup - declare outside so it's available for assignee counting
        const statusFilters = filters?.statusOfTestCase && filters.statusOfTestCase.length > 0
          ? new Set(filters.statusOfTestCase.map(s => parseInt(s, 10)))
          : null;

        if (statusFilters) {
          // Status filters applied
        }

        if (passedReportData.testExecutions && passedReportData.testExecutions.length > 0) {

          // Create a set of filtered test case IDs for quick lookup
          const filteredTestCaseIds = new Set(
            passedReportData.testCases.map((tc) => tc.attributes.id.toString())
          );

          // Get the IDs of test runs we're interested in
          const relevantTestRunIds = new Set(testRuns.map(tr => tr.id));

          passedReportData.testExecutions.forEach((execution) => {
            const testCaseId = execution.attributes.test_case_id?.toString();
            const testRunId = execution.attributes.test_run_id?.toString();
            const configurationId = execution.attributes.configuration_id?.toString() || 'no-config';

            // Only process if this execution is for a filtered test case and relevant test run
            if (filteredTestCaseIds.has(testCaseId) && relevantTestRunIds.has(testRunId)) {
              const executionDate = new Date(execution.attributes.updated_at || execution.attributes.created_at);
              // Include configuration in the composite key
              const compositeKey = `${testRunId}-${testCaseId}-${configurationId}`;

              const existing = latestExecutionPerTestCasePerRun.get(compositeKey);
              if (!existing) {
                latestExecutionPerTestCasePerRun.set(compositeKey, execution);
              } else {
                const existingDate = new Date(existing.attributes.updated_at || existing.attributes.created_at);
                if (executionDate > existingDate) {
                  latestExecutionPerTestCasePerRun.set(compositeKey, execution);
                }
              }
            }
          });

          // Count executions for the donut chart and totals
          // Each entry in latestExecutionPerTestCasePerRun represents one (test case, test run) pair
          let filteredExecutionCount = 0;
          latestExecutionPerTestCasePerRun.forEach((execution, _compositeKey: string) => {
            const result = execution.attributes.result;
            const resultNum = typeof result === 'string' ? parseInt(result, 10) : result;

            // If status filters are applied, only count executions matching those filters
            if (statusFilters && !statusFilters.has(resultNum)) {

              return;
            }

            // Count this execution as it passed the filter
            filteredExecutionCount++;

            // Count all executions for the donut chart and totals
            // (Each represents one test case in one test run)

            if (resultNum === 1) totalPassed++;
            else if (resultNum === 2) totalFailed++;
            else if (resultNum === 3) totalBlocked++;
            else if (resultNum === 5) totalUntested++;
            // Any other result (like 4=Retest, 6=Untested) also counts as untested
            else totalUntested++;
          });

          // Update total test cases to be the count of (test case, test run) pairs that passed filters
          // This represents the actual number of test case executions across all test runs
          totalTestCases = filteredExecutionCount;

        } else {
          // Fallback: use test run totals (may be inaccurate with filters)

          totalPassed = testRuns.reduce((sum, tr) => sum + tr.passedCount, 0);
          totalFailed = testRuns.reduce((sum, tr) => sum + tr.failedCount, 0);
          totalBlocked = testRuns.reduce((sum, tr) => sum + tr.blockedCount, 0);
          totalUntested = Math.max(0, totalTestCases - totalPassed - totalFailed - totalBlocked);
        }

        // Calculate test runs breakup by state
        const testRunsBreakup = {
          new: testRuns.filter(tr => tr.state === 1).length,
          inProgress: testRuns.filter(tr => tr.state === 2).length,
          underReview: testRuns.filter(tr => tr.state === 3).length,
          rejected: testRuns.filter(tr => tr.state === 4).length,
          done: testRuns.filter(tr => tr.state === 5).length,
          closed: closedTestRuns
        };

        // Calculate assignee distribution from test case/test run pairs (executions)
        // COUNT should represent the number of (test case, test run) pairs per assignee
        const assigneeMap = new Map<string, number>();

        // Build users map from included data
        const usersMap = new Map<string, { id: string; name: string; email: string }>();
        if (passedReportData.included && Array.isArray(passedReportData.included)) {
          passedReportData.included.forEach((item: Record<string, unknown>) => {
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

        // Count test case/test run pairs per assignee
        // Each execution counted in latestExecutionPerTestCasePerRun represents one (test case, test run) pair
        if (passedReportData.testExecutions && passedReportData.testExecutions.length > 0) {
          // For each (test case, test run) pair that matched our filters, count by assignee
          latestExecutionPerTestCasePerRun.forEach((execution, _compositeKey: string) => {
            const result = execution.attributes.result;
            const resultNum = typeof result === 'string' ? parseInt(result, 10) : result;

            // Apply status filter - only count executions matching the filter
            if (statusFilters && !statusFilters.has(resultNum)) {
              return;
            }

            const [, testCaseId] = compositeKey.split('-');

            // Find the test case to get its assignee
            const testCase = passedReportData.testCases.find((tc) =>
              tc.attributes.id.toString() === testCaseId
            );

            if (testCase) {
              let userName = 'Unassigned';

              if (testCase.relationships?.user?.data?.id) {
                const userIdPath = testCase.relationships.user.data.id.toString();
                const userId = userIdPath.split('/').pop() || userIdPath;
                const user = usersMap.get(userId);
                userName = user ? user.name : 'Unassigned';
              }

              assigneeMap.set(userName, (assigneeMap.get(userName) || 0) + 1);
            }
          });
        }

        // If we have no assignee data, fall back to counting by test runs
        if (assigneeMap.size === 0) {

          testRuns.forEach(tr => {
            const assigneeName = tr.assignedTo?.name || 'Unassigned';
            // Count each test case in the test run
            assigneeMap.set(assigneeName, (assigneeMap.get(assigneeName) || 0) + tr.testCasesCount);
          });
        }

        const assigneeResults = Array.from(assigneeMap.entries())
          .map(([assignee, count]) => ({
            assignee,
            count
          }))
          .sort((a, b) => b.count - a.count); // Sort by count descending

        // Set the report data
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
            retest: 0,
            skipped: 0,
            untested: totalUntested,
            inProgress: 0,
            unknown: 0
          },
          testRunsBreakup,
          assigneeResults,
          defectsLinkedWithTestResults: 0,
          requirementsLinkedWithTestRuns: 0
        };

        setReportData(reportData);
        setLoading(false);
        return;
      }

      // Otherwise, fetch using the new test_cases endpoint with include=testRuns,user

      const fetchedReportData = await fetchTestCasesForReport(projectId, filters);

      if (!fetchedReportData || !fetchedReportData.testCases) {
        throw new Error('No data received from API');
      }

      // Now process this fetched data using the same logic as pre-fetched data
      // Transform test runs from the included data
      let testRuns: TestRunData[] = [];
      if (fetchedReportData.testRuns && fetchedReportData.testRuns.length > 0) {
        testRuns = fetchedReportData.testRuns.map((apiTestRun) => {
          const transformed = testRunsApiService.transformApiTestRun(apiTestRun, []);
          return {
            id: transformed.id,
            name: transformed.name,
            state: transformed.state,
            status: transformed.status,
            testCasesCount: transformed.testCasesCount,
            passedCount: transformed.passedCount,
            failedCount: transformed.failedCount,
            blockedCount: transformed.blockedCount,
            retestCount: 0,
            skippedCount: 0,
            untestedCount: transformed.testCasesCount - transformed.passedCount - transformed.failedCount - transformed.blockedCount,
            inProgressCount: 0,
            unknownCount: 0,
            assignedTo: transformed.assignedTo,
            createdAt: transformed.createdAt
          };
        });
      }

      // Apply test run ID filter if provided
      if (testRunIds && testRunIds.length > 0) {

        testRuns = testRuns.filter(tr => testRunIds.includes(tr.id));

      }

      // Filter by creation date if provided
      const dateThreshold = calculateDateThreshold(creationDateFilter);
      if (dateThreshold) {
        const _beforeCount = testRuns.length;


        testRuns.forEach(tr => {
          const _trCreatedAt = new Date(tr.createdAt);

        });

        testRuns = testRuns.filter(tr => {
          const _trCreatedAt = new Date(tr.createdAt);
          const isWithinPeriod = trCreatedAt >= dateThreshold;

          return isWithinPeriod;
        });

      }

      // Calculate report metrics from execution data (same as pre-fetched path)
      const totalTestRuns = testRuns.length;
      const activeTestRuns = testRuns.filter(tr => tr.state !== 6).length;
      const closedTestRuns = testRuns.filter(tr => tr.state === 6).length;

      let totalTestCases = fetchedReportData.testCases.length;
      let totalPassed = 0;
      let totalFailed = 0;
      let totalBlocked = 0;
      let totalUntested = 0;

      // Calculate from executions data
      const latestExecutionPerTestCasePerRun = new Map<string, { attributes: { result?: number; [key: string]: unknown } }>();

      if (fetchedReportData.testExecutions && fetchedReportData.testExecutions.length > 0) {
        const filteredTestCaseIds = new Set(
          fetchedReportData.testCases.map((tc) => tc.attributes.id.toString())
        );
        const relevantTestRunIds = new Set(testRuns.map(tr => tr.id));

        fetchedReportData.testExecutions.forEach((execution) => {
          const testCaseId = execution.attributes.test_case_id?.toString();
          const testRunId = execution.attributes.test_run_id?.toString();
          const configurationId = execution.attributes.configuration_id?.toString() || 'no-config';

          if (filteredTestCaseIds.has(testCaseId) && relevantTestRunIds.has(testRunId)) {
            const executionDate = new Date(execution.attributes.updated_at || execution.attributes.created_at);
            // Include configuration in the composite key
            const compositeKey = `${testRunId}-${testCaseId}-${configurationId}`;

            const existing = latestExecutionPerTestCasePerRun.get(compositeKey);
            if (!existing) {
              latestExecutionPerTestCasePerRun.set(compositeKey, execution);
            } else {
              const existingDate = new Date(existing.attributes.updated_at || existing.attributes.created_at);
              if (executionDate > existingDate) {
                latestExecutionPerTestCasePerRun.set(compositeKey, execution);
              }
            }
          }
        });

        const statusFilterApplied = filters?.statusOfTestCase && filters.statusOfTestCase.length > 0;
        const allowedStatusIds = statusFilterApplied ? new Set(filters!.statusOfTestCase.map(s => parseInt(s, 10))) : null;

        latestExecutionPerTestCasePerRun.forEach((execution) => {
          const result = execution.attributes.result;
          const resultNum = typeof result === 'string' ? parseInt(result, 10) : result;

          if (allowedStatusIds && !allowedStatusIds.has(resultNum)) {
            return;
          }

          if (resultNum === 1) totalPassed++;
          else if (resultNum === 2) totalFailed++;
          else if (resultNum === 3) totalBlocked++;
          else if (resultNum === 5) totalUntested++;
          else totalUntested++;
        });

        totalTestCases = latestExecutionPerTestCasePerRun.size;
        if (statusFilterApplied) {
          totalTestCases = totalPassed + totalFailed + totalBlocked + totalUntested;
        }
      } else {
        // Fallback: use test run totals
        totalPassed = testRuns.reduce((sum, tr) => sum + tr.passedCount, 0);
        totalFailed = testRuns.reduce((sum, tr) => sum + tr.failedCount, 0);
        totalBlocked = testRuns.reduce((sum, tr) => sum + tr.blockedCount, 0);
        totalUntested = Math.max(0, totalTestCases - totalPassed - totalFailed - totalBlocked);
      }

      // Calculate test runs breakup by state
      const testRunsBreakup = {
        new: testRuns.filter(tr => tr.state === 1).length,
        inProgress: testRuns.filter(tr => tr.state === 2).length,
        underReview: testRuns.filter(tr => tr.state === 3).length,
        rejected: testRuns.filter(tr => tr.state === 4).length,
        done: testRuns.filter(tr => tr.state === 5).length,
        closed: closedTestRuns
      };

      // Calculate assignee distribution from test case/test run pairs (executions)
      const assigneeMap = new Map<string, number>();

      // Build users map from included data
      const usersMap = new Map<string, { id: string; name: string; email: string }>();
      if (fetchedReportData.included && Array.isArray(fetchedReportData.included)) {
        fetchedReportData.included.forEach((item: Record<string, unknown>) => {
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

      // Count test case/test run pairs per assignee
      if (fetchedReportData.testExecutions && fetchedReportData.testExecutions.length > 0) {
        latestExecutionPerTestCasePerRun.forEach((_execution, compositeKey: string) => {
          const [, testCaseId] = compositeKey.split('-');

          const testCase = fetchedReportData.testCases.find((tc) =>
            tc.attributes.id.toString() === testCaseId
          );

          if (testCase) {
            let userName = 'Unassigned';

            if (testCase.relationships?.user?.data?.id) {
              const userIdPath = testCase.relationships.user.data.id.toString();
              const userId = userIdPath.split('/').pop() || userIdPath;
              const user = usersMap.get(userId);
              userName = user ? user.name : 'Unassigned';
            }

            assigneeMap.set(userName, (assigneeMap.get(userName) || 0) + 1);
          }
        });
      }

      // Fallback to test run assignees if no execution data
      if (assigneeMap.size === 0) {
        testRuns.forEach(tr => {
          const assigneeName = tr.assignedTo?.name || 'Unassigned';
          assigneeMap.set(assigneeName, (assigneeMap.get(assigneeName) || 0) + tr.testCasesCount);
        });
      }

      const assigneeResults = Array.from(assigneeMap.entries())
        .map(([assignee, count]) => ({
          assignee,
          count
        }))
        .sort((a, b) => b.count - a.count);

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
          retest: 0,
          skipped: 0,
          untested: totalUntested,
          inProgress: 0,
          unknown: 0
        },
        testRunsBreakup,
        assigneeResults,
        defectsLinkedWithTestResults: 0,
        requirementsLinkedWithTestRuns: 0
      };

      setReportData(reportData);

    } catch (err) {
      console.error('❌ Failed to fetch test runs data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {

    if (!reportData) {
      toast.error('No report data available');
      return;
    }

    try {
      await reportDownloadService.generateEnhancedVisualSummaryReportPDF(
        projectName,
        authState.user?.name || 'Unknown User',
        reportData
      );
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const handleDownloadCSV = () => {

    if (!reportData) {
      toast.error('No report data available');
      return;
    }

    try {
      reportDownloadService.generateSummaryReportCSV(
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


    if (!reportData) {
      toast.error('No report data available');
      return;
    }

    try {
      setIsSubmitting(true);

      let reportBlob: Blob;
      if (format === 'pdf') {
        reportBlob = await reportDownloadService.generateSummaryReportPDFBlob(
          projectName,
          authState.user?.name || 'Unknown User',
          reportData
        );
      } else {
        reportBlob = reportDownloadService.generateSummaryReportCSVBlob(
          reportData,
          projectName,
          authState.user?.name || 'Unknown User'
        );
      }

      await reportEmailService.sendReportEmail(
        emails,
        title || 'Test Run Summary Report',
        'summary_report',
        projectName,
        message,
        reportBlob,
        format
      );

      const recipientText = emails.length === 1 ? emails[0] : `${emails.length} recipients`;
      toast.success(`Report sent successfully to ${recipientText}`);
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-gray-400">Loading report data...</p>
        </div>
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <Card className="p-8 text-center">
          <div className="text-red-400 mb-4">
            <p className="text-lg font-medium">Failed to load report data</p>
            <p className="text-sm text-slate-600 dark:text-gray-400 mt-2">{error}</p>
          </div>
          <Button onClick={onBack}>
            Back to Reports
          </Button>
        </Card>
      </div>
    );
  }

  // Prepare data for charts
  const testCasePieData = [
    { name: 'Passed', value: reportData.testCaseBreakup.passed, color: '#10B981' },
    { name: 'Failed', value: reportData.testCaseBreakup.failed, color: '#EF4444' },
    { name: 'Blocked', value: reportData.testCaseBreakup.blocked, color: '#F59E0B' },
    { name: 'Untested', value: reportData.testCaseBreakup.untested, color: '#6B7280' }
  ].filter(item => item.value > 0);

  const testRunsBarData = [
    { name: 'New', value: reportData.testRunsBreakup.new, color: '#6B7280' },
    { name: 'In Progress', value: reportData.testRunsBreakup.inProgress, color: '#3B82F6' },
    { name: 'Under Review', value: reportData.testRunsBreakup.underReview, color: '#F59E0B' },
    { name: 'Rejected', value: reportData.testRunsBreakup.rejected, color: '#EF4444' },
    { name: 'Done', value: reportData.testRunsBreakup.done, color: '#10B981' },
    { name: 'Closed', value: reportData.testRunsBreakup.closed, color: '#8B5CF6' }
  ];

  const totalTestRunsForPie = reportData.activeTestRuns + reportData.closedTestRuns;
  const testRunsPieData = [
    { name: 'Active Test Runs', value: reportData.activeTestRuns, color: '#06B6D4' },
    { name: 'Closed Test Runs', value: reportData.closedTestRuns, color: '#8B5CF6' }
  ].filter(item => item.value > 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-100 via-purple-100 to-slate-100 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900 border-b border-purple-500/20 shadow-2xl px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="secondary"
              icon={ArrowLeft}
              onClick={onBack}
              className="text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white"
            >
              Back to Reports
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title || 'Test Run Summary Report'}</h1>
              <div className="flex items-center space-x-4 mt-2 text-sm text-slate-700 dark:text-gray-300">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full flex items-center justify-center text-slate-900 dark:text-white text-xs font-bold">
                    {authState.user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                  </div>
                  <span>{authState.user?.name || 'Unknown User'}</span>
                </div>
                <span>•</span>
                <span>Test Run Summary</span>
              </div>
              {description && (
                <p className="text-sm text-slate-600 dark:text-gray-400 mt-2">{description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="secondary"
              icon={Download}
              onClick={() => setIsDownloadModalOpen(true)}
              className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600"
            >
              Download
            </Button>
            <Button
              icon={Share}
              onClick={() => setIsShareModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-slate-900 dark:text-white"
            >
              Share
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6" data-report-content="true">
        {/* Top Row - Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6" data-report-section="summary-cards">
          {/* Total Test Runs */}
          <Card gradient className="p-6 text-center">
            <h3 className="text-sm font-medium text-slate-600 dark:text-gray-400 mb-2">Total Test Runs</h3>
            <div className="text-4xl font-bold text-slate-900 dark:text-white mb-4">{reportData.totalTestRuns}</div>
            
            {/* Mini pie chart for test runs */}
            {totalTestRunsForPie > 0 && (
              <div className="h-24 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={testRunsPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={25}
                      outerRadius={40}
                      dataKey="value"
                      startAngle={90}
                      endAngle={450}
                    >
                      {testRunsPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            
            <div className="text-xs text-slate-600 dark:text-gray-400 space-y-1">
              <div className="flex items-center justify-center">
                <div className="w-2 h-2 bg-cyan-400 rounded-full mr-2"></div>
                <span>Active Test Runs</span>
              </div>
              <div className="flex items-center justify-center">
                <div className="w-2 h-2 bg-purple-400 rounded-full mr-2"></div>
                <span>Closed Test Runs</span>
              </div>
            </div>
          </Card>

          {/* Total Test Cases */}
          <Card gradient className="p-6 text-center">
            <h3 className="text-sm font-medium text-slate-600 dark:text-gray-400 mb-2">Total Test Cases</h3>
            <div className="text-4xl font-bold text-slate-900 dark:text-white">{reportData.totalTestCases}</div>
          </Card>

          {/* Total Linked Issues */}
          <Card gradient className="p-6 text-center">
            <h3 className="text-sm font-medium text-slate-600 dark:text-gray-400 mb-2">Total Linked Issues</h3>
            <div className="text-4xl font-bold text-slate-900 dark:text-white">{reportData.totalLinkedIssues}</div>
          </Card>

          {/* Placeholder for 4th card */}
          <Card gradient className="p-6 text-center">
            <h3 className="text-sm font-medium text-slate-600 dark:text-gray-400 mb-2">Project</h3>
            <div className="text-lg font-bold text-slate-900 dark:text-white">{projectName}</div>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Test Case Break-up (Pie Chart) */}
          <Card gradient className="p-6">
            <div data-report-section="pie-chart">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Test Case Break-up</h3>
              <MoreHorizontal className="w-5 h-5 text-slate-600 dark:text-gray-400" />
            </div>
            
            {testCasePieData.length > 0 ? (
              <div className="h-64 flex items-center">
                <ResponsiveContainer width="60%" height="100%">
                  <PieChart>
                    <Pie
                      data={testCasePieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      dataKey="value"
                      startAngle={90}
                      endAngle={450}
                    >
                      {testCasePieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '8px'
                      }}
                      itemStyle={{
                        color: '#06B6D4'
                      }}
                      labelStyle={{
                        color: '#06B6D4'
                      }}
                    />
                    {/* Center text */}
                    <text 
                      x="50%" 
                      y="45%" 
                      textAnchor="middle" 
                      dominantBaseline="middle" 
                      className="fill-white text-2xl font-bold"
                    >
                      {reportData.totalTestCases}
                    </text>
                    <text 
                      x="50%" 
                      y="55%" 
                      textAnchor="middle" 
                      dominantBaseline="middle" 
                      className="fill-gray-400 text-sm"
                    >
                      Total Test Cases
                    </text>
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Legend */}
                <div className="ml-6 space-y-3 flex-1">
                  {testCasePieData.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: entry.color }}></div>
                        <span className="text-sm text-slate-700 dark:text-gray-300">{entry.name}</span>
                      </div>
                      <span className="text-sm text-slate-700 dark:text-gray-300">
                        {entry.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="text-center text-slate-600 dark:text-gray-400">
                  <p className="text-lg font-medium">No test case data</p>
                  <p className="text-sm">No test cases found in test runs</p>
                </div>
              </div>
            )}
            </div>
          </Card>

          {/* Test Runs Break-up (Bar Chart) */}
          <Card gradient className="p-6">
            <div data-report-section="bar-chart">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Test Runs Break-up</h3>
              <MoreHorizontal className="w-5 h-5 text-slate-600 dark:text-gray-400" />
            </div>
            
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={testRunsBarData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#6B7280" 
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    stroke="#6B7280" 
                    fontSize={12}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                    itemStyle={{
                      color: '#F3F4F6'
                    }}
                    labelStyle={{
                      color: '#F3F4F6'
                    }}
                  />
                  <Bar dataKey="value" fill="#06B6D4" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            </div>
          </Card>
        </div>

        {/* Bottom Row */}
        {/* Test Results across top 5 assignees - Full Width */}
        <Card gradient className="p-6">
          <div data-report-section="assignee-results">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Test Results across top 5 assignees</h3>
            <MoreHorizontal className="w-5 h-5 text-slate-600 dark:text-gray-400" />
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm font-medium text-slate-600 dark:text-gray-400 border-b border-slate-200 dark:border-slate-700 pb-2">
              <div>ASSIGNEE</div>
              <div>COUNT</div>
            </div>

            {reportData.assigneeResults.slice(0, 5).map((result, index) => (
              <div key={index} className="grid grid-cols-2 gap-4 items-center">
                <div className="text-sm text-slate-900 dark:text-white">{index + 1}. {result.assignee}</div>
                <div className="flex items-center">
                  <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-2 mr-3">
                    <div
                      className="bg-gradient-to-r from-purple-400 to-purple-600 h-2 rounded-full"
                      style={{
                        width: `${Math.min(100, (result.count / Math.max(...reportData.assigneeResults.map(r => r.count))) * 100)}%`
                      }}
                    ></div>
                  </div>
                  <span className="text-sm text-slate-900 dark:text-white font-medium">{result.count}</span>
                </div>
              </div>
            ))}

            {reportData.assigneeResults.length === 0 && (
              <div className="text-center py-8 text-slate-600 dark:text-gray-400">
                <p>No assignee data available</p>
              </div>
            )}
          </div>
          </div>
        </Card>

        {/* 4 Cards Below - 2x2 Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Defects Linked with Test Results */}
          <Card gradient className="p-6">
            <div data-report-section="defects-section">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Defects Linked with Test Results</h3>
              <div className="text-4xl font-bold text-slate-900 dark:text-white">{reportData.defectsLinkedWithTestResults}</div>
            </div>
          </Card>

          {/* Requirements Linked with Test Runs */}
          <Card gradient className="p-6">
            <div data-report-section="requirements-section">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Requirements Linked with Test Runs</h3>
              <div className="text-4xl font-bold text-slate-900 dark:text-white">{reportData.requirementsLinkedWithTestRuns}</div>
            </div>
          </Card>

          {/* No Defects by Priority */}
          <Card gradient className="p-6">
            <div data-report-section="defects-priority-section">
              <div className="text-center text-slate-600 dark:text-gray-400 mb-2">
                <span className="text-sm font-medium">No Defects by Priority</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-gray-500 text-center">There are no defects available to show by priority.</p>
            </div>
          </Card>

          {/* No Defects by Status */}
          <Card gradient className="p-6">
            <div data-report-section="defects-status-section">
              <div className="text-center text-slate-600 dark:text-gray-400 mb-2">
                <span className="text-sm font-medium">No Defects by Status</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-gray-500 text-center">There are no defects available to show by status.</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Download Modal */}
      <DownloadModal
        isOpen={isDownloadModalOpen}
        onClose={() => setIsDownloadModalOpen(false)}
        onDownloadPDF={handleDownloadPDF}
        onDownloadCSV={handleDownloadCSV}
        reportTitle="Test Run Summary Report"
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        onSendEmail={handleSendEmail}
        reportTitle={title || "Test Run Summary Report"}
        reportType="summary_report"
        projectName={projectName}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};

export default TestRunSummaryReport;