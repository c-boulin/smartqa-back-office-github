import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, Share, MoreHorizontal, Loader } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import Card from '../UI/Card';
import Button from '../UI/Button';
import DownloadModal from './DownloadModal';
import ShareModal from './ShareModal';
import { reportDownloadService } from '../../services/reportDownloadService';
import { reportEmailService, ReportFormat } from '../../services/reportEmailService';
import { fetchReportData } from '../../services/reportsDataService';
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
  reportData?: unknown;
  description?: string;
  title?: string;
}

interface TestCaseWithExecution {
  testRunId: string;
  testRunName: string;
  testRunStatus: string;
  testCaseId: string;
  testCaseProjectRelativeId?: number;
  testCaseTitle: string;
  latestStatus: string;
  priority: string;
  assignee: string;
  typeId?: number | string;
  configurationId?: string;
  configurationName?: string;
  executorName?: string;
  executorUserId?: string;
}

interface ReportData {
  totalTestRuns: number;
  activeTestRuns: number;
  closedTestRuns: number;
  totalTestCases: number;
  testCaseBreakup: {
    passed: number;
    failed: number;
    blocked: number;
    untested: number;
    retest: number;
    skipped: number;
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

  useEffect(() => {
    let cancelled = false;

    const loadReport = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await fetchReportData(projectId, 2, filters, {
          creationDateFilter,
          testRunIds,
        });

        if (!cancelled) {
          setReportData(data as unknown as ReportData);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to fetch detailed report data:', err);
          setError(err instanceof Error ? err.message : 'Failed to load report data');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadReport();
    return () => { cancelled = true; };
  }, [projectId, testRunIds, creationDateFilter, filters]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'new':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/50';
      case 'untested':
        return 'bg-gray-500/20 text-slate-600 dark:text-gray-400 border border-gray-500/50';
      case 'passed':
        return 'bg-green-500/20 text-green-700 dark:text-green-400 border border-green-500/50';
      case 'failed':
        return 'bg-red-500/20 text-red-400 border border-red-500/50';
      case 'blocked':
        return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50';
      case 'in progress':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/50';
      case 'done':
        return 'bg-green-500/20 text-green-700 dark:text-green-400 border border-green-500/50';
      case 'closed':
        return 'bg-purple-500/20 text-purple-400 border border-purple-500/50';
      default:
        return 'bg-gray-500/20 text-slate-600 dark:text-gray-400 border border-gray-500/50';
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
        return 'text-slate-600 dark:text-gray-400';
    }
  };

  const handleDownloadPDF = async () => {
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-gray-400">Loading detailed report data...</p>
        </div>
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <Card className="p-8 text-center">
          <div className="text-red-400 mb-4">
            <p className="text-lg font-medium">Failed to load detailed report data</p>
            <p className="text-sm text-slate-600 dark:text-gray-400 mt-2">{error}</p>
          </div>
          <Button onClick={onBack}>
            Back to Reports
          </Button>
        </Card>
      </div>
    );
  }

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
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title || 'Test Run Detailed Report'}</h1>
              <div className="flex items-center space-x-4 mt-2 text-sm text-slate-700 dark:text-gray-300">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full flex items-center justify-center text-slate-900 dark:text-white text-xs font-bold">
                    {authState.user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                  </div>
                  <span>{authState.user?.name || 'Unknown User'}</span>
                </div>
                <span>•</span>
                <span>{title || 'Test Run Detailed Report'}</span>
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
        {/* Top Row - Performance Chart and Summary Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Test run performance - Takes 2/3 width */}
          <Card gradient className="lg:col-span-2 p-6">
            <div data-report-section="performance-chart">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Test Results Trends</h3>
                <p className="text-sm text-slate-600 dark:text-gray-400">
                  Test case execution results over the {(creationDateFilter && !testRunIds) ? creationDateFilter.toLowerCase() : 'last 7 days'}
                </p>
              </div>
              <MoreHorizontal className="w-5 h-5 text-slate-600 dark:text-gray-400" />
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
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Active Test Runs</h3>
              <div className="text-4xl font-bold text-cyan-400">
                {reportData.activeTestRuns} / {reportData.totalTestRuns}
              </div>
            </Card>

            {/* Closed Test Runs */}
            <Card gradient className="p-6 text-center">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Closed Test Runs</h3>
              <div className="text-4xl font-bold text-purple-400">
                {reportData.closedTestRuns} / {reportData.totalTestRuns}
              </div>
            </Card>

            {/* Total Test Cases */}
            <Card gradient className="p-6 text-center">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Total Test Cases</h3>
              <div className="text-4xl font-bold text-green-400">{reportData.totalTestCases}</div>
            </Card>
            </div>
          </div>
        </div>

        {/* Test Cases Table */}
        <Card className="overflow-hidden">
          <div data-report-section="test-cases-table">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {reportData.testCasesIncluded.length} Test cases included in this report
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="text-left py-3 px-6 text-sm font-medium text-slate-600 dark:text-gray-400 uppercase tracking-wider">
                    TEST RUN
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-slate-600 dark:text-gray-400 uppercase tracking-wider">
                    TEST CASE
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-slate-600 dark:text-gray-400 uppercase tracking-wider">
                    TEST RUN LATEST STATUS
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-slate-600 dark:text-gray-400 uppercase tracking-wider">
                    TEST CASE PRIORITY
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-slate-600 dark:text-gray-400 uppercase tracking-wider">
                    CONFIGURATION
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-slate-600 dark:text-gray-400 uppercase tracking-wider">
                    EXECUTOR
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {reportData.testCasesIncluded.map((testCase) => (
                  <tr key={`${testCase.testRunId}-${testCase.testCaseId}`} className="hover:bg-slate-50 dark:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-6">
                      <div>
                        <div className="text-sm font-medium text-slate-900 dark:text-white">TR-{testCase.testRunId}</div>
                        <div className="text-sm text-slate-600 dark:text-gray-400">{testCase.testRunName}</div>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(testCase.testRunStatus)}`}>
                            {testCase.testRunStatus}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div>
                        <div className="text-sm font-medium text-slate-900 dark:text-white">TC-{testCase.testCaseProjectRelativeId || testCase.testCaseId}</div>
                        <div className="text-sm text-slate-600 dark:text-gray-400">{testCase.testCaseTitle}</div>
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
                      <span className="text-sm text-slate-600 dark:text-gray-400">
                        {testCase.configurationName || 'Default'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm text-slate-900 dark:text-white">
                        {testCase.executorName || 'Unassigned'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {reportData.testCasesIncluded.length === 0 && (
              <div className="text-center py-12">
                <div className="text-slate-600 dark:text-gray-400 mb-4">
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
