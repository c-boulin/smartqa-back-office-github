import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, Share, MoreHorizontal } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
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

interface TestRunSummaryReportProps {
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

interface ReportData {
  totalTestRuns: number;
  activeTestRuns: number;
  closedTestRuns: number;
  totalTestCases: number;
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
    const loadReport = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await fetchReportData(projectId, 1, filters, {
          creationDateFilter,
          testRunIds,
        });

        setReportData(data as unknown as ReportData);
      } catch (err) {
        console.error('Failed to fetch summary report data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load report data');
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [projectId, testRunIds, creationDateFilter, filters]);

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
    { name: 'Retest', value: reportData.testCaseBreakup.retest, color: '#F97316' },
    { name: 'Skipped', value: reportData.testCaseBreakup.skipped, color: '#8B5CF6' },
    { name: 'Untested', value: reportData.testCaseBreakup.untested, color: '#6B7280' },
    { name: 'In Progress', value: reportData.testCaseBreakup.inProgress, color: '#3B82F6' },
    { name: 'System Issue', value: reportData.testCaseBreakup.unknown, color: '#4B5563' }
  ];

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
