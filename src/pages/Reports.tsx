import React, { useState, useCallback, useEffect } from 'react';
import { Plus, FileText, MoreHorizontal, BarChart, TrendingUp, Search, X, Code, FileCheck } from 'lucide-react';
import { format } from 'date-fns';
import { useLocation } from 'react-router-dom';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import ConfirmDialog from '../components/UI/ConfirmDialog';
import CreateReportModal from '../components/Reports/CreateReportModal';
import TestRunSummaryReport from '../components/Reports/TestRunSummaryReport';
import TestRunDetailedReport from '../components/Reports/TestRunDetailedReport';
import ReportsHeader from '../components/Reports/ReportsHeader';
import TestRunPerformanceChart from '../components/Reports/TestRunPerformanceChart';
import TestRunSummaryCards from '../components/Reports/TestRunSummaryCards';
import TestCasesReportTable from '../components/Reports/TestCasesReportTable';
import { useApp } from '../context/AppContext';
import toast from 'react-hot-toast';

interface Report {
  id: string;
  name: string;
  type: 'execution' | 'project' | 'dashboard' | 'trend';
  projectId?: string;
  dateRange: {
    start: Date;
    end: Date;
  };
  data: any;
  createdAt: Date;
  createdBy: string;
}

interface ScheduledReport {
  id: string;
  title: string;
  createdBy: string;
  createdAt: Date;
  frequency: 'Daily' | 'Weekly';
  type: 'Test Run Summary' | 'Test Run Detailed Report';
}

const Reports: React.FC = () => {
  const { getSelectedProject, state } = useApp();
  const selectedProject = getSelectedProject();
  const location = useLocation();

  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'test-run-summary' | 'test-run-detailed' | 'requirement-traceability' | 'detailed'>('list');
  const [selectedProjectForReport, setSelectedProjectForReport] = useState<string>('');
  const [showIntroPanel, setShowIntroPanel] = useState(true);
  const [showIntroductionPanel, setShowIntroductionPanel] = useState(true);
  const [currentReportType, setCurrentReportType] = useState<string>('');
  const [selectedTestRunIds, setSelectedTestRunIds] = useState<string[] | undefined>(undefined);
  const [reportFilters, setReportFilters] = useState<any>(null);
  const [testRunCreationDateFilter, setTestRunCreationDateFilter] = useState<string | undefined>(undefined);
  const [reportData, setReportData] = useState<any>(null);
  const [reportDescription, setReportDescription] = useState<string>('');
  const [reportTitle, setReportTitle] = useState<string>('');

  // Listen for navigation events and reset to list view when the route changes
  useEffect(() => {
    // Reset to list view whenever we navigate to the reports page
    if (location.pathname === '/reports' && location.state?.resetView !== false) {
      setViewMode('list');
      setSelectedProjectForReport('');
      setSelectedTestRunIds(undefined);
      setReportFilters(null);
      setTestRunCreationDateFilter(undefined);
      setReportData(null);
      setReportDescription('');
      setReportTitle('');
    }
  }, [location.key]); // Trigger when navigation key changes

  // Mock scheduled reports data
  const mockScheduledReports: ScheduledReport[] = [
    {
      id: '1',
      title: 'Test Run Detailed Report - WEEKLY FAILED',
      createdBy: 'Michele Pancari',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      frequency: 'Weekly',
      type: 'Test Run Detailed Report'
    },
    {
      id: '2',
      title: 'SEPT 2023 PASSED-FAILED',
      createdBy: 'Michele Pancari',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      frequency: 'Daily',
      type: 'Test Run Summary'
    },
    {
      id: '3',
      title: 'SEPT 2023 UNTESTED/INPROGRESS',
      createdBy: 'Michele Pancari',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      frequency: 'Daily',
      type: 'Test Run Summary'
    }
  ];

  // Mock report data for detailed view
  const mockDetailedReportData = {
    testCases: [
      {
        id: 'TR-19-TC-102',
        testRunId: 'TR-19',
        testRunName: 'Test Run-30/09/2025-10/01/2025',
        testRunDate: '30/09/2025',
        testRunStatus: 'Active',
        testCaseId: 'TC-102',
        testCaseTitle: 'testestsetestest',
        latestStatus: 'Untested',
        priority: 'Medium',
        assignee: 'Camille Boulin'
      }
    ],
    summary: {
      activeTestRuns: { current: 2, total: 4 },
      closedTestRuns: { current: 2, total: 4 },
      totalTestCases: 9,
      totalLinkedIssues: 0
    },
    chartData: [
      { date: 'Sep 25', value: 2 },
      { date: 'Sep 26', value: 3 },
      { date: 'Sep 27', value: 2 },
      { date: 'Sep 28', value: 3 },
      { date: 'Sep 29', value: 2 },
      { date: 'Sep 30', value: 1 },
      { date: 'Oct 1', value: 1 }
    ]
  };

  const handleCreateReport = useCallback(async (data: any) => {
    try {
      setIsSubmitting(true);

      console.log('Creating report with data:', data);

      // Store filters from the report creation form
      setReportFilters(data.filters || null);

      // Store the fetched report data
      if (data.reportData) {
        setReportData(data.reportData);
        console.log('📊 Storing report data from modal:', {
          testCases: data.reportData.testCases?.length || 0,
          testRuns: data.reportData.testRuns?.length || 0
        });
      }

      // Store the report description and title
      if (data.description) {
        setReportDescription(data.description);
        console.log('📊 Storing report description:', data.description);
      } else {
        setReportDescription('');
      }

      if (data.title) {
        setReportTitle(data.title);
        console.log('📊 Storing report title:', data.title);
      } else {
        setReportTitle('');
      }

      // Store selected test run IDs if specific test runs were selected
      if (data.testRunSelection === 'specific_test_run' && data.specificTestRunIds) {
        setSelectedTestRunIds(data.specificTestRunIds);
        setTestRunCreationDateFilter(undefined);
      } else {
        // Store creation date filter if using creation_time mode
        setSelectedTestRunIds(undefined);
        setTestRunCreationDateFilter(data.includeTestRuns);
      }

      // Set the view mode based on the created report type
      if (data.reportType === 'Test Run Summary') {
        setSelectedProjectForReport(data.project);
        setViewMode('test-run-summary');
      } else if (data.reportType === 'Test Run Detailed Report') {
        setSelectedProjectForReport(data.project);
        setViewMode('test-run-detailed');
      } else {
        setViewMode('list');
      }

      setIsCreateModalOpen(false);
      toast.success('Report created successfully');

    } catch (error) {
      console.error('Failed to create report:', error);
      toast.error('Failed to create report');
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const handleViewReport = useCallback((report: Report) => {
    console.log('Viewing report:', report.name);
    
    if (report.name.includes('PASSED-FAILED') || report.type === 'execution') {
      setSelectedProjectForReport(report.projectId || selectedProject?.id || '');
      setViewMode('test-run-summary');
    } else if (report.type === 'execution' || report.name.includes('Detailed')) {
      setSelectedProjectForReport(report.projectId || selectedProject?.id || '');
      setViewMode('test-run-detailed');
    } else {
      setViewMode('list');
    }
  }, [selectedProject]);

  const handleDeleteReport = useCallback((report: Report) => {
    setSelectedReport(report);
    setIsDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!selectedReport) return;
    
    try {
      setIsSubmitting(true);
      console.log('Deleting report:', selectedReport.name);
      toast.success('Report deleted successfully');
      setSelectedReport(null);
    } catch (error) {
      console.error('Failed to delete report:', error);
      toast.error('Failed to delete report');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedReport]);

  const handleDownloadReport = useCallback((report: Report) => {
    console.log('Downloading report:', report.name);
    toast.success('Report download started');
  }, []);

  const handleShareReport = useCallback((report: Report) => {
    console.log('Sharing report:', report.name);
    toast.success('Report shared successfully');
  }, []);

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedProjectForReport('');
    setSelectedTestRunIds(undefined);
    setReportFilters(null);
    setTestRunCreationDateFilter(undefined);
    setReportData(null);
    setReportDescription('');
  };

  const handleTemplateClick = (templateType: string) => {
    if (!selectedProject) {
      toast.error('Please select a project first');
      return;
    }

    setSelectedTestRunIds(undefined);
    setReportFilters(null);
    setTestRunCreationDateFilter(undefined);
    setReportData(null);
    setReportDescription('');

    if (templateType === 'Test Run Summary') {
      setSelectedProjectForReport(selectedProject.id);
      setViewMode('test-run-summary');
    } else if (templateType === 'Test Run Detailed Report') {
      setSelectedProjectForReport(selectedProject.id);
      setViewMode('test-run-detailed');
    }
  };

  // Show Test Run Summary report view
  if (viewMode === 'test-run-summary') {
    const projectForReport = state.projects.find(p => p.id === selectedProjectForReport) || selectedProject;
    
    if (!projectForReport) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
          <Card className="p-8 text-center">
            <div className="text-red-400 mb-4">
              <p className="text-lg font-medium">No project selected</p>
              <p className="text-sm text-gray-400 mt-2">Please select a project to generate the report</p>
            </div>
            <Button onClick={handleBackToList}>
              Back to Reports
            </Button>
          </Card>
        </div>
      );
    }
    
    return (
      <TestRunSummaryReport
        projectId={projectForReport.id}
        projectName={projectForReport.name}
        onBack={handleBackToList}
        testRunIds={selectedTestRunIds}
        filters={reportFilters}
        creationDateFilter={testRunCreationDateFilter}
        reportData={reportData}
        description={reportDescription}
        title={reportTitle}
      />
    );
  }

  // Show Test Run Detailed report view
  if (viewMode === 'test-run-detailed') {
    const projectForReport = state.projects.find(p => p.id === selectedProjectForReport) || selectedProject;
    
    if (!projectForReport) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
          <Card className="p-8 text-center">
            <div className="text-red-400 mb-4">
              <p className="text-lg font-medium">No project selected</p>
              <p className="text-sm text-gray-400 mt-2">Please select a project to generate the detailed report</p>
            </div>
            <Button onClick={handleBackToList}>
              Back to Reports
            </Button>
          </Card>
        </div>
      );
    }
    
    return (
      <TestRunDetailedReport
        projectId={projectForReport.id}
        projectName={projectForReport.name}
        onBack={handleBackToList}
        testRunIds={selectedTestRunIds}
        filters={reportFilters}
        creationDateFilter={testRunCreationDateFilter}
        reportData={reportData}
        description={reportDescription}
        title={reportTitle}
      />
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Reports</h1>
            <p className="text-gray-400">Generate and manage test reports</p>
          </div>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-cyan-600 hover:bg-cyan-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Report
          </Button>
        </div>

        {/* Introduction Panel */}
        {showIntroductionPanel && (
          <Card className="relative overflow-hidden border-cyan-500/30">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-blue-500/5" />
            <div className="relative p-6">
              <button
                onClick={() => setShowIntroductionPanel(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="pr-8">
                <h2 className="text-2xl font-bold text-white mb-3">Introducing Reports</h2>
                <p className="text-gray-300 text-base">
                  Effortlessly generate, schedule and share diverse insights with various report types all within a few simple clicks
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search reports..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Report Templates */}
        {showIntroPanel && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Report Templates</h2>
              <button
                onClick={() => setShowIntroPanel(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Test Run Summary */}
              <Card 
                className="p-6 cursor-pointer hover:border-cyan-500/50 transition-all duration-200"
                onClick={() => handleTemplateClick('Test Run Summary')}
              >
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-cyan-500/20 rounded-lg">
                    <BarChart className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Test Run Summary</h3>
                    <p className="text-sm text-gray-400">Provides overview of key metrics for test runs.</p>
                  </div>
                </div>
              </Card>

              {/* Test Run Detailed Report */}
              <Card
                className="p-6 cursor-pointer hover:border-purple-500/50 transition-all duration-200"
                onClick={() => handleTemplateClick('Test Run Detailed Report')}
              >
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-purple-500/20 rounded-lg">
                    <FileText className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">Test Run Detailed Report</h3>
                    <p className="text-sm text-gray-400">Provides comprehensive details for analysis.</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Scheduled Reports Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50 border-b border-slate-700">
                <tr>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-400 uppercase tracking-wider">
                    TITLE
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-400 uppercase tracking-wider">
                    CREATED BY
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-400 uppercase tracking-wider">
                    FREQUENCY
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-400 uppercase tracking-wider">
                    TYPE OF REPORT
                  </th>
                  <th className="text-left py-3 px-6 text-sm font-medium text-gray-400 uppercase tracking-wider">
                    <MoreHorizontal className="w-4 h-4 text-gray-400" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {mockScheduledReports
                  .filter(report => 
                    !searchTerm || 
                    report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    report.createdBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    report.type.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((report) => (
                    <tr key={report.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-6">
                        <button
                          onClick={() => handleViewReport({
                            id: report.id,
                            name: report.title,
                            type: report.type === 'Test Run Summary' ? 'execution' : 'project',
                            dateRange: { start: report.createdAt, end: new Date() },
                            data: {},
                            createdAt: report.createdAt,
                            createdBy: report.createdBy
                          })}
                          className="text-left hover:text-cyan-400 transition-colors"
                        >
                          <div className="text-sm font-medium text-white">{report.title}</div>
                        </button>
                      </td>
                      <td className="py-4 px-6">
                        <div>
                          <div className="text-sm text-white">{report.createdBy}</div>
                          <div className="text-sm text-gray-400">
                            {Math.floor((Date.now() - report.createdAt.getTime()) / (1000 * 60 * 60 * 24))} days ago
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm text-white">{report.frequency}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm text-white">{report.type}</span>
                      </td>
                      <td className="py-4 px-6">
                        <button 
                          className="p-1 text-gray-400 hover:text-cyan-400 transition-colors"
                          onClick={() => handleViewReport({
                            id: report.id,
                            name: report.title,
                            type: report.type === 'Test Run Summary' ? 'execution' : 'project',
                            dateRange: { start: report.createdAt, end: new Date() },
                            data: {},
                            createdAt: report.createdAt,
                            createdBy: report.createdBy
                          })}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            
            {mockScheduledReports.filter(report => 
              !searchTerm || 
              report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
              report.createdBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
              report.type.toLowerCase().includes(searchTerm.toLowerCase())
            ).length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No scheduled reports found</p>
                  <p className="text-sm">
                    {searchTerm 
                      ? `No reports found matching "${searchTerm}".`
                      : 'No scheduled reports have been created yet.'
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      <CreateReportModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateReport}
        isSubmitting={isSubmitting}
      />

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={async () => {
          try {
            setIsSubmitting(true);
            console.log('Deleting report:', selectedReport?.name);
            toast.success('Report deleted successfully');
            setSelectedReport(null);
          } catch (error) {
            console.error('Failed to delete report:', error);
            toast.error('Failed to delete report');
          } finally {
            setIsSubmitting(false);
          }
        }}
        title="Delete Report"
        message={`Are you sure you want to delete the report "${selectedReport?.name}"? This action is irreversible.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};

export default Reports;