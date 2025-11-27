import React, { useState, useEffect } from 'react';
import { X, Loader, ChevronDown, ChevronUp } from 'lucide-react';
import Modal from '../UI/Modal';
import Button from '../UI/Button';
import MultiSelectDropdown from '../UI/MultiSelectDropdown';
import { ScheduledReport } from '../../services/scheduledReportsApi';
import { useApp } from '../../context/AppContext';
import { useUsers } from '../../context/UsersContext';
import { testRunsApiService } from '../../services/testRunsApi';
import { PRIORITIES, TEST_CASE_TYPES, AUTOMATION_STATUS } from '../../constants/testCaseConstants';
import { TEST_RESULTS } from '../../types';

interface UpdateScheduledReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (id: string, data: Partial<ScheduledReport>) => Promise<void>;
  report: ScheduledReport | null;
  isSubmitting?: boolean;
}

interface TestRun {
  id: string;
  name: string;
  state: number;
  status: 'open' | 'closed';
}

const UpdateScheduledReportModal: React.FC<UpdateScheduledReportModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  report,
  isSubmitting = false,
}) => {
  const { state } = useApp();
  const { users } = useUsers();

  const [formData, setFormData] = useState({
    reportTemplate: 'test_run_summary' as 'test_run_summary' | 'test_run_detailed',
    title: '',
    description: '',
    testRunSelection: 'creation_time' as 'creation_time' | 'specific_test_run',
    testRunCreationDate: 'last_24_hours' as 'last_24_hours' | 'last_week' | 'last_month',
    specificTestRunIds: [] as string[],
    frequency: 'daily' as 'daily' | 'weekly',
    scheduleTime: '05:00',
    timezone: 'UTC',
    reportFormat: 'pdf' as 'pdf' | 'csv',
    dayToSend: 'monday' as 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday',
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
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [loadingTestRuns, setLoadingTestRuns] = useState(false);

  // Load form data when report changes
  useEffect(() => {
    if (report && isOpen) {
      // Convert recipient emails back to user IDs
      const recipientIds = report.recipients
        .map(email => {
          const user = users.find(u => u.email === email);
          return user?.id;
        })
        .filter(id => id !== undefined) as string[];

      setFormData({
        reportTemplate: report.reportTemplate,
        title: report.title,
        description: report.description || '',
        testRunSelection: report.testRunSelection || 'creation_time',
        testRunCreationDate: report.testRunCreationDate || 'last_24_hours',
        specificTestRunIds: report.specificTestRunIds || [],
        frequency: report.frequency,
        scheduleTime: '05:00',
        timezone: 'UTC',
        reportFormat: report.reportFormat,
        dayToSend: report.dayToSend || 'monday',
        recipients: recipientIds,
        filters: {
          statusOfTestCase: report.testCaseFilters?.statusOfTestCase || [],
          testCaseType: report.testCaseFilters?.testCaseType || [],
          testCasePriority: report.testCaseFilters?.testCasePriority || [],
          testCaseAssignee: report.testCaseFilters?.testCaseAssignee || [],
          testCaseTags: report.testCaseFilters?.testCaseTags || [],
          automationStatus: report.testCaseFilters?.automationStatus || [],
          createdDateRange: report.testCaseFilters?.createdDateRange || '',
          lastUpdatedDateRange: report.testCaseFilters?.lastUpdatedDateRange || ''
        }
      });
      setShowDescription(!!report.description);
      setShowAdvancedFilters(
        !!report.testCaseFilters && (
          (report.testCaseFilters.statusOfTestCase?.length || 0) > 0 ||
          (report.testCaseFilters.testCaseType?.length || 0) > 0 ||
          (report.testCaseFilters.testCasePriority?.length || 0) > 0 ||
          (report.testCaseFilters.testCaseAssignee?.length || 0) > 0 ||
          (report.testCaseFilters.testCaseTags?.length || 0) > 0 ||
          (report.testCaseFilters.automationStatus?.length || 0) > 0 ||
          !!report.testCaseFilters.createdDateRange ||
          !!report.testCaseFilters.lastUpdatedDateRange
        )
      );
    }
  }, [report, isOpen, users]);

  // Fetch test runs when specific test run is selected
  useEffect(() => {
    const fetchTestRuns = async () => {
      if (!report?.projectId || formData.testRunSelection !== 'specific_test_run') {
        setTestRuns([]);
        return;
      }

      setLoadingTestRuns(true);
      try {
        const response = await testRunsApiService.getTestRuns(report.projectId, 1, 1000);

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
  }, [report?.projectId, formData.testRunSelection]);

  const handleInputChange = (field: string, value: string | number | Date | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!report) return;

    if (formData.recipients.length === 0) {
      alert('Please add at least one recipient');
      return;
    }

    if (formData.testRunSelection === 'specific_test_run' && formData.specificTestRunIds.length === 0) {
      alert('Please select at least one test run');
      return;
    }

    // Convert recipient IDs to emails for API
    const recipientEmails = formData.recipients
      .map(recipientId => {
        const user = users.find(u => u.id === recipientId);
        return user?.email;
      })
      .filter(email => email !== undefined) as string[];

    try {
      await onSubmit(report.id, {
        title: formData.title,
        description: formData.description,
        reportTemplate: formData.reportTemplate,
        testRunSelection: formData.testRunSelection,
        testRunCreationDate: formData.testRunSelection === 'creation_time' ? formData.testRunCreationDate : undefined,
        specificTestRunIds: formData.testRunSelection === 'specific_test_run' ? formData.specificTestRunIds : undefined,
        frequency: formData.frequency,
        scheduleTime: formData.scheduleTime,
        reportFormat: formData.reportFormat,
        dayToSend: formData.frequency === 'daily' ? undefined : formData.dayToSend,
        recipients: recipientEmails,
        testCaseFilters: formData.filters,
      });
    } catch (error) {
      console.error('Failed to update scheduled report:', error);
    }
  };

  const reportTypes = [
    { value: 'test_run_summary', label: 'Test Run Summary' },
    { value: 'test_run_detailed', label: 'Test Run Detailed Report' },
  ];

  const timeOptions = [
    { value: 'last_24_hours', label: 'Last 24 hours' },
    { value: 'last_week', label: 'Last 7 days' },
    { value: 'last_month', label: 'Last 30 days' },
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
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Update Scheduled Report</h2>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Type of Report */}
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
                Type of Report
              </label>
              <select
                value={formData.reportTemplate}
                onChange={(e) => handleInputChange('reportTemplate', e.target.value)}
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                disabled={isSubmitting}
              >
                {reportTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
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
                    value={formData.testRunCreationDate}
                    onChange={(e) => handleInputChange('testRunCreationDate', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    disabled={isSubmitting}
                  >
                    {timeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
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
                  ].length} selected)
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
                    Status of Test Case
                  </label>
                  <MultiSelectDropdown
                    label=""
                    options={Object.entries(TEST_RESULTS).map(([key, value]) => ({
                      id: key,
                      label: value
                    }))}
                    selectedIds={formData.filters.statusOfTestCase}
                    onChange={(selectedIds) => handleInputChange('filters', {
                      ...formData.filters,
                      statusOfTestCase: selectedIds
                    })}
                    placeholder="Select status"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
                    Test Case Type
                  </label>
                  <MultiSelectDropdown
                    label=""
                    options={Object.entries(TEST_CASE_TYPES).map(([key, value]) => ({
                      id: key,
                      label: value
                    }))}
                    selectedIds={formData.filters.testCaseType}
                    onChange={(selectedIds) => handleInputChange('filters', {
                      ...formData.filters,
                      testCaseType: selectedIds
                    })}
                    placeholder="Select type"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
                    Test Case Priority
                  </label>
                  <MultiSelectDropdown
                    label=""
                    options={Object.entries(PRIORITIES).map(([key, value]) => ({
                      id: key,
                      label: value.label
                    }))}
                    selectedIds={formData.filters.testCasePriority}
                    onChange={(selectedIds) => handleInputChange('filters', {
                      ...formData.filters,
                      testCasePriority: selectedIds
                    })}
                    placeholder="Select priority"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
                    Test Case Assignee
                  </label>
                  <MultiSelectDropdown
                    label=""
                    options={users
                      .filter(user => user && user.id && user.name)
                      .map(user => ({
                        id: user.id.toString(),
                        label: user.name
                      }))}
                    selectedIds={formData.filters.testCaseAssignee}
                    onChange={(selectedIds) => handleInputChange('filters', {
                      ...formData.filters,
                      testCaseAssignee: selectedIds
                    })}
                    placeholder="Select assignee"
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
                    Test Case Tags
                  </label>
                  <MultiSelectDropdown
                    label=""
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
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
                    Automation Status
                  </label>
                  <MultiSelectDropdown
                    label=""
                    options={Object.entries(AUTOMATION_STATUS).map(([key, value]) => ({
                      id: key,
                      label: value
                    }))}
                    selectedIds={formData.filters.automationStatus}
                    onChange={(selectedIds) => handleInputChange('filters', {
                      ...formData.filters,
                      automationStatus: selectedIds
                    })}
                    placeholder="Select automation status"
                    disabled={isSubmitting}
                  />
                </div>

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

            {/* Frequency */}
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
                Frequency
              </label>
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
            </div>

            {/* Day of Week (for weekly) */}
            {formData.frequency === 'weekly' && (
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
                  Day of the week
                </label>
                <select
                  value={formData.dayToSend}
                  onChange={(e) => handleInputChange('dayToSend', e.target.value)}
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

            {/* Report Format */}
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
                Report format
              </label>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => handleInputChange('reportFormat', 'pdf')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    formData.reportFormat === 'pdf'
                      ? 'bg-blue-600 text-slate-900 dark:text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-gray-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                  }`}
                  disabled={isSubmitting}
                >
                  PDF
                </button>
                <button
                  type="button"
                  onClick={() => handleInputChange('reportFormat', 'csv')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    formData.reportFormat === 'csv'
                      ? 'bg-blue-600 text-slate-900 dark:text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-gray-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                  }`}
                  disabled={isSubmitting}
                >
                  CSV
                </button>
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
              {formData.recipients.length === 0 && (
                <p className="text-xs text-red-400 mt-1">
                  Please add at least one recipient
                </p>
              )}
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
                formData.recipients.length === 0 ||
                (formData.testRunSelection === 'specific_test_run' && formData.specificTestRunIds.length === 0)
              }
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? 'Updating...' : 'Update'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default UpdateScheduledReportModal;
