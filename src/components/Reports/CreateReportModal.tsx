import React, { useState, useEffect } from 'react';
import { X, Loader, ChevronDown, ChevronUp } from 'lucide-react';
import Modal from '../UI/Modal';
import Button from '../UI/Button';
import MultiSelectDropdown from '../UI/MultiSelectDropdown';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useUsers } from '../../context/UsersContext';
import { testRunsApiService } from '../../services/testRunsApi';
import { fetchTestCasesForReport } from '../../services/reportsDataService';
import { buildScheduledReportPayload } from '../../services/scheduledReportPayloadBuilder';
import { PRIORITIES, TEST_CASE_TYPES, AUTOMATION_STATUS } from '../../constants/testCaseConstants';
import { TEST_RESULTS } from '../../types';
import toast from 'react-hot-toast';

interface CreateReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    project: string;
    reportType: string;
    title: string;
    description?: string;
    testRunSelection: 'creation_time' | 'specific_test_run';
    includeTestRuns: string;
    specificTestRunIds?: string[];
    frequency: 'daily' | 'weekly';
    dayOfWeek?: string;
    time: string;
    timezone: string;
    format?: 'pdf' | 'csv';
    recipients: string[];
  }) => Promise<void>;
  isSubmitting: boolean;
}

interface TestRun {
  id: string;
  name: string;
  state: number;
  status: 'open' | 'closed';
}

const CreateReportModal: React.FC<CreateReportModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting
}) => {
  const { getSelectedProject, state } = useApp();
  const { state: authState } = useAuth();
  const { users } = useUsers();
  const selectedProject = getSelectedProject();

  // Helper function to generate default title
  const generateDefaultTitle = (reportType: string) => {
    const today = new Date();
    const day = today.getDate().toString().padStart(2, '0');
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const year = today.getFullYear().toString().slice(-2);
    const dateStr = `${day}/${month}/${year}`;
    return `${reportType} ${dateStr}`;
  };

  const [formData, setFormData] = useState({
    project: '',
    reportType: 'Test Run Summary',
    title: generateDefaultTitle('Test Run Summary'),
    description: '',
    testRunSelection: 'creation_time' as 'creation_time' | 'specific_test_run',
    includeTestRuns: 'Last 24 hours',
    specificTestRunIds: [] as string[],
    frequency: 'daily' as 'daily' | 'weekly',
    dayOfWeek: 'monday',
    time: '05:00',
    timezone: 'UTC',
    format: 'pdf' as 'pdf' | 'csv',
    recipients: [] as string[],
    filters: {
      statusOfTestCase: [] as string[],
      testCaseType: [] as string[],
      testCasePriority: [] as string[],
      testCaseAssignee: [] as string[],
      testCaseTags: [] as string[],
      automationStatus: [] as string[],
      createdDateRange: '',
      lastUpdatedDateRange: ''
    }
  });

  const [showDescription, setShowDescription] = useState(false);
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [loadingTestRuns, setLoadingTestRuns] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        project: selectedProject?.id || '',
        reportType: 'Test Run Summary',
        title: generateDefaultTitle('Test Run Summary'),
        description: '',
        testRunSelection: 'creation_time',
        includeTestRuns: 'Last 24 hours',
        specificTestRunIds: [],
        frequency: 'daily',
        dayOfWeek: 'monday',
        time: '05:00',
        timezone: 'UTC',
        format: 'pdf',
        recipients: [],
        filters: {
          statusOfTestCase: [],
          testCaseType: [],
          testCasePriority: [],
          testCaseAssignee: [],
          testCaseTags: [],
          automationStatus: [],
          createdDateRange: '',
          lastUpdatedDateRange: ''
        }
      });
      setShowDescription(false);
      setShowAdvancedFilters(false);
    }
  }, [isOpen, selectedProject]);

  // Fetch test runs when project changes or when specific test run is selected
  useEffect(() => {
    const fetchTestRuns = async () => {
      if (!formData.project || formData.testRunSelection !== 'specific_test_run') {
        setTestRuns([]);
        return;
      }

      setLoadingTestRuns(true);
      try {
        const response = await testRunsApiService.getTestRuns(formData.project, 1, 1000);

        if (response && response.data) {
          const transformedTestRuns: TestRun[] = response.data.map(apiTestRun => {
            const transformed = testRunsApiService.transformApiTestRun(apiTestRun, response.included);
            return {
              id: transformed.id,
              name: transformed.name,
              state: transformed.state,
              status: transformed.status
            };
          });

          setTestRuns(transformedTestRuns);
        }
      } catch (error) {
        console.error('Failed to fetch test runs:', error);
        setTestRuns([]);
      } finally {
        setLoadingTestRuns(false);
      }
    };

    fetchTestRuns();
  }, [formData.project, formData.testRunSelection]);

  const handleInputChange = (field: string, value: string | number | Date | string[]) => {
    if (field === 'reportType') {
      // Update both reportType and title when reportType changes
      setFormData(prev => ({
        ...prev,
        reportType: value,
        title: generateDefaultTitle(value)
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate that at least one test run is selected when using specific test run selection
    if (formData.testRunSelection === 'specific_test_run' && formData.specificTestRunIds.length === 0) {
      return;
    }

    // Validate recipients
    if (formData.recipients.length === 0) {
      toast.error('Please add at least one recipient');
      return;
    }

    try {
      // Build the scheduled report API payload
      if (!authState.user) {
        toast.error('User not authenticated');
        return;
      }

      const payload = buildScheduledReportPayload(formData, users, authState.user.id);

      // Fetch report data using the new API endpoint
      // Add test run creation date to filters if using creation_time mode
      const filtersWithTestRunDate = {
        ...formData.filters,
        testRunCreationDate: formData.testRunSelection === 'creation_time'
          ? formData.includeTestRuns
          : undefined
      };

      const reportData = await fetchTestCasesForReport(
        formData.project,
        filtersWithTestRunDate
      );

      // Log test runs extracted from included node

      // Log test executions
      if (reportData.testExecutions && reportData.testExecutions.length > 0) {
        // Test executions available
      }

      // Pass the form data, report data, AND scheduled report payload to parent component
      await onSubmit({
        ...formData,
        reportData,
        scheduledReportPayload: payload
      });

    } catch (error) {
      console.error('Failed to fetch report data:', error);
      toast.error('Failed to fetch report data. Please try again.');
    }
  };

  const reportTypes = [
    'Test Run Summary',
    'Test Run Detailed Report'
  ];

  const timeOptions = [
    'Last 24 hours',
    'Last 48 hours',
    'Last 7 days',
    'Last 30 days'
  ];

  const handleTestRunToggle = (testRunId: string) => {
    setFormData(prev => {
      const isSelected = prev.specificTestRunIds.includes(testRunId);
      return {
        ...prev,
        specificTestRunIds: isSelected
          ? prev.specificTestRunIds.filter(id => id !== testRunId)
          : [...prev.specificTestRunIds, testRunId]
      };
    });
  };

  const handleSelectAllTestRuns = () => {
    setFormData(prev => ({
      ...prev,
      specificTestRunIds: testRuns.map(tr => tr.id)
    }));
  };

  const handleDeselectAllTestRuns = () => {
    setFormData(prev => ({
      ...prev,
      specificTestRunIds: []
    }));
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={null}
      size="lg"
    >
      <div className="relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-0 right-0 p-2 text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-100 dark:bg-slate-700 rounded-lg transition-colors z-10"
          title="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-6 pr-10">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Create Report</h2>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Project */}
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
                Project
              </label>
              <select
                value={formData.project}
                onChange={(e) => handleInputChange('project', e.target.value)}
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                required
                disabled={isSubmitting}
              >
                <option value="">Select project</option>
                {state.projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Type of Report */}
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
                Type of Report
              </label>
              <select
                value={formData.reportType}
                onChange={(e) => handleInputChange('reportType', e.target.value)}
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                disabled={isSubmitting}
              >
                {reportTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Select test runs to include based on */}
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-3">
                Select test runs to include based on:
              </label>
              <div className="space-y-3">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="testRunSelection"
                    value="creation_time"
                    checked={formData.testRunSelection === 'creation_time'}
                    onChange={(e) => handleInputChange('testRunSelection', e.target.value)}
                    className="w-4 h-4 text-blue-600 bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-blue-500 focus:ring-2"
                    disabled={isSubmitting}
                  />
                  <span className="ml-3 text-slate-900 dark:text-white">Creation Time</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="testRunSelection"
                    value="specific_test_run"
                    checked={formData.testRunSelection === 'specific_test_run'}
                    onChange={(e) => handleInputChange('testRunSelection', e.target.value)}
                    className="w-4 h-4 text-blue-600 bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:ring-blue-500 focus:ring-2"
                    disabled={isSubmitting}
                  />
                  <span className="ml-3 text-slate-900 dark:text-white">Specific Test Run</span>
                </label>
              </div>
            </div>

            {/* Include test runs created in OR Select specific test run */}
            <div>
              {formData.testRunSelection === 'creation_time' ? (
                <>
                  <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
                    Include test runs created in
                  </label>
                  <select
                    value={formData.includeTestRuns}
                    onChange={(e) => handleInputChange('includeTestRuns', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    disabled={isSubmitting}
                  >
                    {timeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-slate-600 dark:text-gray-300">
                      Select Test Runs ({formData.specificTestRunIds.length} selected)
                    </label>
                    {testRuns.length > 0 && (
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={handleSelectAllTestRuns}
                          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                          disabled={isSubmitting}
                        >
                          Select All
                        </button>
                        <span className="text-slate-500 dark:text-gray-500">|</span>
                        <button
                          type="button"
                          onClick={handleDeselectAllTestRuns}
                          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                          disabled={isSubmitting}
                        >
                          Deselect All
                        </button>
                      </div>
                    )}
                  </div>
                  {loadingTestRuns ? (
                    <div className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-500 dark:text-gray-400 flex items-center">
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Loading test runs...
                    </div>
                  ) : testRuns.length > 0 ? (
                    <div className="w-full bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg max-h-60 overflow-y-auto">
                      {testRuns.map((testRun) => (
                        <label
                          key={testRun.id}
                          className="flex items-center px-3 py-2 hover:bg-slate-300 dark:hover:bg-slate-600 cursor-pointer transition-colors border-b border-slate-300 dark:border-slate-600 last:border-b-0"
                        >
                          <input
                            type="checkbox"
                            checked={formData.specificTestRunIds.includes(testRun.id)}
                            onChange={() => handleTestRunToggle(testRun.id)}
                            className="w-4 h-4 text-blue-600 bg-slate-100 dark:bg-slate-700 border-slate-500 rounded focus:ring-blue-500 focus:ring-2"
                            disabled={isSubmitting}
                          />
                          <div className="ml-3 flex-1">
                            <div className="text-slate-900 dark:text-white text-sm">
                              TR-{testRun.id} - {testRun.name}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-gray-400">
                              {testRun.status === 'open' ? 'Active' : 'Closed'}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-500 dark:text-gray-400">
                      No test runs available
                    </div>
                  )}
                  {formData.specificTestRunIds.length === 0 && testRuns.length > 0 && (
                    <p className="text-xs text-red-400 mt-1">
                      Please select at least one test run
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Advanced Filters Toggle */}
            <div>
              <button
                type="button"
                className="flex items-center text-blue-400 hover:text-blue-300 text-sm transition-colors"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              >
                <span>Advanced Filters</span>
                {showAdvancedFilters ? (
                  <ChevronUp className="w-4 h-4 ml-1" />
                ) : (
                  <ChevronDown className="w-4 h-4 ml-1" />
                )}
              </button>
            </div>

            {/* Advanced Filters Section */}
            {showAdvancedFilters && (
              <div className="border border-slate-300 dark:border-slate-600 rounded-lg p-4 space-y-4">
                <div className="text-sm font-medium text-slate-600 dark:text-gray-300 mb-4">
                  Test Case Filters ({[
                    ...formData.filters.statusOfTestCase,
                    ...formData.filters.testCaseType,
                    ...formData.filters.testCasePriority,
                    ...formData.filters.testCaseAssignee,
                    ...formData.filters.testCaseTags,
                    ...formData.filters.automationStatus
                  ].length})
                </div>

                <MultiSelectDropdown
                  label="Test Case Execution Status"
                  options={Object.entries(TEST_RESULTS).map(([key, value]) => ({
                    id: key,
                    label: value
                  }))}
                  selectedIds={formData.filters.statusOfTestCase}
                  onChange={(selectedIds) => handleInputChange('filters', {
                    ...formData.filters,
                    statusOfTestCase: selectedIds
                  })}
                  placeholder="Search for options"
                  disabled={isSubmitting}
                />

                <MultiSelectDropdown
                  label="Test Case Type"
                  options={Object.entries(TEST_CASE_TYPES).map(([key, value]) => ({
                    id: key,
                    label: value
                  }))}
                  selectedIds={formData.filters.testCaseType}
                  onChange={(selectedIds) => handleInputChange('filters', {
                    ...formData.filters,
                    testCaseType: selectedIds
                  })}
                  placeholder="Search for options"
                  disabled={isSubmitting}
                />

                <MultiSelectDropdown
                  label="Test Case Priority"
                  options={Object.entries(PRIORITIES).map(([key, value]) => ({
                    id: key,
                    label: value.label
                  }))}
                  selectedIds={formData.filters.testCasePriority}
                  onChange={(selectedIds) => handleInputChange('filters', {
                    ...formData.filters,
                    testCasePriority: selectedIds
                  })}
                  placeholder="Search for options"
                  disabled={isSubmitting}
                />

                <MultiSelectDropdown
                  label="Test Case Assignee"
                  options={users
                    .filter(user => user && user.id && user.name)
                    .map(user => ({
                      id: user.id,
                      label: user.name
                    }))}
                  selectedIds={formData.filters.testCaseAssignee}
                  onChange={(selectedIds) => handleInputChange('filters', {
                    ...formData.filters,
                    testCaseAssignee: selectedIds
                  })}
                  placeholder="Search by name"
                  disabled={isSubmitting}
                />

                <MultiSelectDropdown
                  label="Test Case Tags"
                  options={state.tags
                    .filter(tag => tag && tag.id && tag.label)
                    .map(tag => ({
                      id: tag.id,
                      label: tag.label
                    }))}
                  selectedIds={formData.filters.testCaseTags}
                  onChange={(selectedIds) => handleInputChange('filters', {
                    ...formData.filters,
                    testCaseTags: selectedIds
                  })}
                  placeholder="Search for options"
                  disabled={isSubmitting}
                />

                <MultiSelectDropdown
                  label="Automation Status"
                  options={Object.entries(AUTOMATION_STATUS).map(([key, value]) => ({
                    id: key,
                    label: value
                  }))}
                  selectedIds={formData.filters.automationStatus}
                  onChange={(selectedIds) => handleInputChange('filters', {
                    ...formData.filters,
                    automationStatus: selectedIds
                  })}
                  placeholder="Search for options"
                  disabled={isSubmitting}
                />

                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
                    Created
                  </label>
                  <select
                    value={formData.filters.createdDateRange}
                    onChange={(e) => handleInputChange('filters', {
                      ...formData.filters,
                      createdDateRange: e.target.value
                    })}
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    disabled={isSubmitting}
                  >
                    <option value="">Select an Option</option>
                    <option value="last_24_hours">Last 24 hours</option>
                    <option value="last_7_days">Last 7 days</option>
                    <option value="last_30_days">Last 30 days</option>
                    <option value="last_90_days">Last 90 days</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
                    Last Updated
                  </label>
                  <select
                    value={formData.filters.lastUpdatedDateRange}
                    onChange={(e) => handleInputChange('filters', {
                      ...formData.filters,
                      lastUpdatedDateRange: e.target.value
                    })}
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    disabled={isSubmitting}
                  >
                    <option value="">Select an Option</option>
                    <option value="last_24_hours">Last 24 hours</option>
                    <option value="last_7_days">Last 7 days</option>
                    <option value="last_30_days">Last 30 days</option>
                    <option value="last_90_days">Last 90 days</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                required
                disabled={isSubmitting}
                placeholder="Enter report title"
                autoFocus
              />
            </div>

            {/* Add Description Toggle */}
            <div>
              <button
                type="button"
                onClick={() => setShowDescription(!showDescription)}
                className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
              >
                {showDescription ? '− Hide Description' : '+ Add Description'}
              </button>
            </div>

            {/* Description (conditional) */}
            {showDescription && (
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  disabled={isSubmitting}
                  placeholder="Enter report description"
                />
              </div>
            )}

            {/* Schedule reports */}
            <div className="bg-white dark:bg-slate-800/50 border border-slate-300 dark:border-slate-600 rounded-lg p-4">
              <div className="mb-4">
                <h4 className="text-slate-900 dark:text-white font-medium">Schedule reports</h4>
                <p className="text-sm text-slate-500 dark:text-gray-400">Automate report generation at specific intervals</p>
              </div>

              <div className="space-y-4">
                {/* Frequency */}
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => handleInputChange('frequency', 'daily')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      formData.frequency === 'daily'
                        ? 'bg-blue-600 text-slate-900 dark:text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-gray-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                    }`}
                    disabled={isSubmitting}
                  >
                    Daily
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInputChange('frequency', 'weekly')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      formData.frequency === 'weekly'
                        ? 'bg-blue-600 text-slate-900 dark:text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-gray-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                    }`}
                    disabled={isSubmitting}
                  >
                    Weekly
                  </button>
                </div>

                {/* Format selector */}
                <div>
                  <label className="block text-sm text-slate-500 dark:text-gray-400 mb-2">
                    Report format:
                  </label>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => handleInputChange('format', 'pdf')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        formData.format === 'pdf'
                          ? 'bg-blue-600 text-slate-900 dark:text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-gray-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                      }`}
                      disabled={isSubmitting}
                    >
                      PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInputChange('format', 'csv')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        formData.format === 'csv'
                          ? 'bg-blue-600 text-slate-900 dark:text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-gray-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                      }`}
                      disabled={isSubmitting}
                    >
                      CSV
                    </button>
                  </div>
                </div>

                {/* Day of Week (for weekly) */}
                {formData.frequency === 'weekly' && (
                  <div>
                    <label className="block text-sm text-slate-500 dark:text-gray-400 mb-2">
                      Day of the week:
                    </label>
                    <select
                      value={formData.dayOfWeek}
                      onChange={(e) => handleInputChange('dayOfWeek', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                      disabled={isSubmitting}
                    >
                      <option value="monday">Monday</option>
                      <option value="tuesday">Tuesday</option>
                      <option value="wednesday">Wednesday</option>
                      <option value="thursday">Thursday</option>
                      <option value="friday">Friday</option>
                      <option value="saturday">Saturday</option>
                      <option value="sunday">Sunday</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Recipients */}
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
                Recipients *
              </label>

              <MultiSelectDropdown
                label=""
                options={users
                  .filter(user => user && user.id && user.name)
                  .map(user => ({
                    id: user.id,
                    label: `${user.name} (${user.email})`
                  }))}
                selectedIds={formData.recipients}
                onChange={(selectedIds) => handleInputChange('recipients', selectedIds)}
                placeholder="Add recipient..."
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="lg:col-span-2 flex justify-end space-x-3 pt-6 border-t border-slate-200 dark:border-slate-700">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                (formData.testRunSelection === 'specific_test_run' && formData.specificTestRunIds.length === 0)
              }
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default CreateReportModal;