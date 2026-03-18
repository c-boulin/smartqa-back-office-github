import React, { useState, useEffect } from 'react';
import { Loader, Save, X, Search, Plus, Cpu } from 'lucide-react';
import Modal from '../UI/Modal';
import Button from '../UI/Button';
import ConfigurationSelector from '../UI/ConfigurationSelector';
import Tooltip from '../UI/Tooltip';
import TestPlanSelector from '../UI/TestPlanSelector';
import { useUsers } from '../../context/UsersContext';
import { useTestCases } from '../../hooks/useTestCases';
import { useApp } from '../../context/AppContext';
import { Configuration } from '../../services/configurationsApi';
import { TestRun } from '../../services/testRunsApi';
import { testRunsApiService } from '../../services/testRunsApi';
import { Settings } from 'lucide-react';
import toast from 'react-hot-toast';

interface EditTestRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    description: string;
    testCaseIds: string[];
    configurations: string[];
    testPlan: string;
    assignedTo: string;
    state: number;
  }) => Promise<void>;
  isSubmitting: boolean;
  testRun: TestRun | null;
}

const EditTestRunModal: React.FC<EditTestRunModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  testRun
}) => {
  // const { state: authState } = useAuth();
  const { users, loading: usersLoading } = useUsers();
  const { getSelectedProject, createConfiguration, state: appState } = useApp();
  const selectedProject = getSelectedProject();
  const tags = appState.tags;

  // Fetch all test cases for the project
  const {
    allTestCases,
    loading: testCasesLoading,
    fetchAllTestCasesForProject
  } = useTestCases(selectedProject?.id, null, undefined, true, tags);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    testCaseIds: [] as string[],
    manualConfigurations: [] as Configuration[],
    automatedConfigurations: [] as Configuration[],
    testPlanId: '',
    assignedTo: '',
    state: 1
  });

  const [testCaseSearch, setTestCaseSearch] = useState('');
  const [showTestCaseSelector, setShowTestCaseSelector] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [existingManualConfigurations, setExistingManualConfigurations] = useState<Configuration[]>([]);
  const [existingAutomatedConfigurations, setExistingAutomatedConfigurations] = useState<Configuration[]>([]);
  const [isLoadingConfigurations, setIsLoadingConfigurations] = useState(false);
  const [_originalTestPlanId, setOriginalTestPlanId] = useState<string>('');
  

  const stateOptions = [
    { value: 1, label: 'New' },
    { value: 2, label: 'In progress' },
    { value: 3, label: 'Under review' },
    { value: 4, label: 'Rejected' },
    { value: 5, label: 'Done' }
  ];

  // Load test cases when modal opens
  useEffect(() => {
    if (isOpen && selectedProject) {
      fetchAllTestCasesForProject(selectedProject.id);
    }
  }, [isOpen, selectedProject, fetchAllTestCasesForProject]);

  // Populate form when testRun changes
  useEffect(() => {
    if (isOpen && testRun) {
      setValidationError('');

      setFormData({
        name: testRun.name,
        description: testRun.description || '',
        testCaseIds: testRun.testCaseIds || [],
        manualConfigurations: [],
        automatedConfigurations: [],
        testPlanId: '',
        assignedTo: testRun.assignedTo?.id || '',
        state: testRun.state
      });


      // Load existing configurations by calling the API
      loadExistingConfigurations(testRun.id);
      loadExistingTestPlan(testRun.id);
      loadExistingTestPlan(testRun.id);

    } else if (isOpen && !testRun) {
      setValidationError('');
      setExistingManualConfigurations([]);
      setExistingAutomatedConfigurations([]);
      setOriginalTestPlanId('');

      const today = new Date();
      const dateStr = today.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      setFormData({
        name: `Test Run-${dateStr}`,
        description: '',
        testCaseIds: [],
        manualConfigurations: [],
        automatedConfigurations: [],
        testPlanId: '',
        assignedTo: '',
        state: 1
      });
    }
  }, [isOpen, testRun, users]);

  const loadExistingConfigurations = async (testRunId: string) => {
    try {
      setIsLoadingConfigurations(true);

      const response = await testRunsApiService.getTestRun(testRunId);
      const configurationRelationships = response.data.relationships?.configurations?.data || [];

      if (configurationRelationships.length > 0) {
        const manual: Configuration[] = [];
        const automated: Configuration[] = [];

        for (const configRef of configurationRelationships) {
          const configId = configRef.id.split('/').pop();
          let foundConfig: Configuration | undefined;

          if (response.included) {
            const includedConfig = response.included.find(item =>
              item.type === 'Configuration' && (item.attributes as Record<string, unknown>).id?.toString() === configId
            );

            if (includedConfig) {
              const attrs = includedConfig.attributes as Record<string, unknown>;
              const rel = includedConfig.relationships as Record<string, unknown> | undefined;
              const projectData = rel?.project != null ? (rel.project as Record<string, unknown>)?.data : undefined;
              let projectId: string | null = null;

              if (projectData != null && !Array.isArray(projectData) && typeof (projectData as { id?: string }).id === 'string') {
                const match = /\/api\/projects\/(\d+)$/.exec((projectData as { id: string }).id);
                projectId = match ? match[1] : null;
              }
              if (!projectId && attrs.project_id) {
                projectId = attrs.project_id.toString();
              }

              foundConfig = {
                id: (attrs.id as number).toString(),
                label: (attrs.label as string) || 'Unknown Configuration',
                projectId: projectId ?? undefined
              };
            }
          }

          if (!foundConfig) {
            foundConfig = {
              id: configId || '',
              label: `Configuration ${configId}`
            };
          }

          if (foundConfig.projectId) {
            automated.push(foundConfig);
          } else {
            manual.push(foundConfig);
          }
        }

        setExistingManualConfigurations(manual);
        setExistingAutomatedConfigurations(automated);
      } else {
        setExistingManualConfigurations([]);
        setExistingAutomatedConfigurations([]);
      }
    } catch (error) {
      console.error('Failed to load existing configurations:', error);
      setExistingManualConfigurations([]);
      setExistingAutomatedConfigurations([]);
    } finally {
      setIsLoadingConfigurations(false);
    }
  };

  // Function to load assigned user for the test run
  // const loadAssignedUser = async (testRunId: string) => {
  //   try {
  //     
  //     
  //     // Get test run details to extract assigned user from relationships.user
  //     const response = await testRunsApiService.getTestRun(testRunId);
  //     
  //     
  //     // Extract user ID from relationships.user
  //     const userRelationship = response.data.relationships?.user?.data;
  //     
  //     
  //     if (userRelationship) {
  //       const assignedUserId = userRelationship.id.split('/').pop();
  //       
  //       
  //       // Set the assigned user in form data
  //       setFormData(prev => ({
  //         ...prev,
  //         assignedTo: assignedUserId || ''
  //       }));
  //       
  //       
  //     } else {
  //       
  //       setFormData(prev => ({
  //         ...prev,
  //         assignedTo: ''
  //       }));
  //     }
  //     
  //   } catch (error) {
  //     console.error('❌ Failed to load assigned user:', error);
  //     setFormData(prev => ({
  //       ...prev,
  //       assignedTo: ''
  //     }));
  //   }
  // };

  // Function to load existing test plan for the test run
  const loadExistingTestPlan = async (testRunId: string) => {
    try {

      // Get test run details with test plan included
      const response = await testRunsApiService.getTestRun(testRunId);

      // Extract test plan ID from relationships (try both camelCase and snake_case)
      const testPlanRelationship = response.data.relationships?.testPlan?.data || response.data.relationships?.test_plan?.data;

      if (testPlanRelationship) {
        const testPlanId = testPlanRelationship.id?.split('/').pop();

        if (testPlanId && testPlanId !== 'undefined' && testPlanId !== 'null') {
          // Set the test plan ID in form data
          setFormData(prev => ({
            ...prev,
            testPlanId: testPlanId
          }));
          
          // Set original test plan ID for change tracking
          setOriginalTestPlanId(testPlanId);

        } else {

          setFormData(prev => ({
            ...prev,
            testPlanId: ''
          }));
          setOriginalTestPlanId('');
        }
      } else {

        setFormData(prev => ({
          ...prev,
          testPlanId: ''
        }));
        setOriginalTestPlanId('');
      }
      
    } catch (error) {
      console.error('❌ Failed to load existing test plan:', error);
      setFormData(prev => ({
        ...prev,
        testPlanId: ''
      }));
      setOriginalTestPlanId('');
    }
  };

  const removeExistingManualConfig = (configToRemove: Configuration) => {
    setExistingManualConfigurations(prev => prev.filter(config => config.id !== configToRemove.id));
  };

  const removeExistingAutomatedConfig = (configToRemove: Configuration) => {
    setExistingAutomatedConfigurations(prev => prev.filter(config => config.id !== configToRemove.id));
  };

  // Helper function to convert status to state number
  // const getStateFromStatus = (status: string): number => {
  //   const statusMap = {
  //     'open': 1, // New
  //     'closed': 6 // Closed
  //   };
  //   return statusMap[status as keyof typeof statusMap] || 1;
  // };

  const handleInputChange = (field: string, value: string | number | Date | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTestCaseToggle = (testCaseId: string) => {
    setFormData(prev => ({
      ...prev,
      testCaseIds: prev.testCaseIds.includes(testCaseId)
        ? prev.testCaseIds.filter(id => id !== testCaseId)
        : [...prev.testCaseIds, testCaseId]
    }));
  };

  const removeTestCase = (testCaseId: string) => {
    setFormData(prev => ({
      ...prev,
      testCaseIds: prev.testCaseIds.filter(id => id !== testCaseId)
    }));
  };

  // Filter test cases based on search
  const filteredTestCases = allTestCases.filter(testCase =>
    testCase.title.toLowerCase().includes(testCaseSearch.toLowerCase()) ||
    testCase.id.toLowerCase().includes(testCaseSearch.toLowerCase())
  ).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const selectedTestCases = allTestCases.filter(testCase => 
    formData.testCaseIds.includes(testCase.id)
  ).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());


  // const handleConfigurationToggle = (config: string) => {
  //   setFormData(prev => ({
  //     ...prev,
  //     configurations: prev.configurations.includes(config)
  //       ? prev.configurations.filter(c => c !== config)
  //       : [...prev.configurations, config]
  //   }));
  // };

  // const removeConfiguration = (config: string) => {
  //   setFormData(prev => ({
  //     ...prev,
  //     configurations: prev.configurations.filter(c => c.id !== config)
  //   }));
  // };

  const handleCreateConfiguration = async (label: string): Promise<Configuration> => {
    try {

      const newConfiguration = await createConfiguration(label);

      return newConfiguration;
    } catch (error) {
      console.error('⚙️ ❌ Failed to create configuration:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    const hasNonAutomatedTestCases = selectedTestCases.some(tc => tc.automationStatus !== 2);
    const hasManualConfigs = existingManualConfigurations.length > 0 || formData.manualConfigurations.length > 0;

    if (hasNonAutomatedTestCases && !hasManualConfigs) {
      setValidationError('You have selected non-automated test cases but no manual configuration. Please add at least one manual configuration.');
      return;
    }

    const newConfigs = [...(formData.manualConfigurations || []), ...(formData.automatedConfigurations || [])];
    const processedConfigurations = [];
    for (const config of newConfigs) {
      if (config && config.id && typeof config.id === 'string' && config.id.startsWith('temp-')) {
        try {
          const newConfig = await handleCreateConfiguration(config.label);
          processedConfigurations.push(newConfig);
        } catch (error) {
          console.error('Failed to create configuration:', error);
          toast.error(`Failed to create configuration: ${config.label}`);
          return;
        }
      } else if (config && config.id && config.label) {
        processedConfigurations.push(config);
      }
    }

    const allConfigurations = [
      ...existingManualConfigurations,
      ...existingAutomatedConfigurations,
      ...processedConfigurations
    ];

    const finalTestPlanId = formData.testPlanId;

    const submitData = {
      name: formData.name,
      description: formData.description,
      state: formData.state,
      testCaseIds: formData.testCaseIds,
      configurations: allConfigurations,
      assignedTo: formData.assignedTo,
      testPlanId: finalTestPlanId
    };

    await onSubmit(submitData);
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Edit Test Run"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Test Run Name */}
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
            Test Run Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
            required
            disabled={isSubmitting}
            placeholder="Enter test run name"
            autoFocus
          />
        </div>

        {/* Test Cases Section */}
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
            Test Cases
          </label>
          <div className="space-y-4">
            {/* Selected Test Cases */}
            {selectedTestCases.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-500 dark:text-gray-400 mb-2">
                  Selected Test Cases ({selectedTestCases.length})
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto" style={{ overflowAnchor: 'none' }}>
                  {selectedTestCases.map((testCase) => (
                    <div key={`selected-${testCase.id}`} className="flex items-center justify-between bg-slate-100 dark:bg-slate-700 border border-slate-600 rounded-lg p-3 min-w-0">
                      <div className="flex-1 min-w-0 pr-3">
                        <span className="text-slate-900 dark:text-white text-sm font-medium">{testCase.title}</span>
                        <p className="text-xs text-slate-500 dark:text-gray-400">TC{testCase.projectRelativeId || testCase.id}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {testCase.automationStatus === 2 && (
                          <Tooltip content="Automated">
                            <span className="inline-flex flex-shrink-0">
                              <Cpu className="w-4 h-4 text-green-400" />
                            </span>
                          </Tooltip>
                        )}
                        <button
                          type="button"
                          onClick={() => removeTestCase(testCase.id)}
                          className="text-slate-500 dark:text-gray-400 hover:text-red-400 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Test Case Selector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-slate-500 dark:text-gray-400">
                  Add Test Cases
                </h4>
                <button
                  type="button"
                  onClick={() => setShowTestCaseSelector(!showTestCaseSelector)}
                  className="text-cyan-400 hover:text-cyan-300 text-sm"
                >
                  {showTestCaseSelector ? 'Hide' : 'Show'} Available Test Cases
                </button>
              </div>
              
              {showTestCaseSelector && (
                <div className="bg-white dark:bg-slate-800 border border-slate-600 rounded-lg p-4">
                  {/* Search and Select All - Only show if there are available test cases */}
                  {filteredTestCases.filter(testCase => !formData.testCaseIds.includes(testCase.id)).length > 0 && (
                    <div className="flex gap-2 mb-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 dark:text-gray-400 w-4 h-4" />
                        <input
                          type="text"
                          placeholder="Search test cases..."
                          value={testCaseSearch}
                          onChange={(e) => setTestCaseSearch(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const availableTestCaseIds = filteredTestCases
                            .filter(testCase => !formData.testCaseIds.includes(testCase.id))
                            .map(testCase => testCase.id);
                          setFormData(prev => ({
                            ...prev,
                            testCaseIds: [...prev.testCaseIds, ...availableTestCaseIds]
                          }));
                        }}
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium whitespace-nowrap"
                      >
                        Select All
                      </button>
                    </div>
                  )}

                  {/* Test Cases List */}
                  {testCasesLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
                      <span className="text-slate-500 dark:text-gray-400 text-sm">Loading test cases...</span>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto" style={{ overflowAnchor: 'none' }}>
                      {filteredTestCases
                        .filter(testCase => !formData.testCaseIds.includes(testCase.id))
                        .map((testCase) => (
                          <button
                            key={`available-${testCase.id}`}
                            type="button"
                            onClick={() => handleTestCaseToggle(testCase.id)}
                            className="w-full text-left bg-slate-100 dark:bg-slate-700 border border-slate-600 rounded-lg p-3 text-slate-900 dark:text-white hover:bg-slate-600 transition-colors min-w-0"
                          >
                            <div className="flex items-center justify-between min-w-0">
                              <div className="flex-1 min-w-0 pr-3">
                                <span className="text-sm font-medium block truncate">{testCase.title}</span>
                                <p className="text-xs text-slate-500 dark:text-gray-400">TC{testCase.projectRelativeId || testCase.id}</p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {testCase.automationStatus === 2 && (
                                  <Tooltip content="Automated">
                                    <span className="inline-flex flex-shrink-0">
                                      <Cpu className="w-4 h-4 text-green-400" />
                                    </span>
                                  </Tooltip>
                                )}
                                <Plus className="w-4 h-4 text-cyan-400" />
                              </div>
                            </div>
                          </button>
                        ))}

                      {filteredTestCases.filter(testCase => !formData.testCaseIds.includes(testCase.id)).length === 0 && (
                        <div className="text-center py-4 text-slate-500 dark:text-gray-400 text-sm">
                          {testCaseSearch ? 'No test cases found matching your search' : 'All available test cases are already selected'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Manual Configurations */}
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
                Manual Configurations
              </label>

              {isLoadingConfigurations && (
                <div className="flex items-center text-slate-500 dark:text-gray-400 text-sm mb-3">
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Loading configurations...
                </div>
              )}

              {!isLoadingConfigurations && existingManualConfigurations.length > 0 && (
                <div className="mb-3">
                  <h4 className="text-sm font-medium text-slate-500 dark:text-gray-400 mb-2">
                    Current ({existingManualConfigurations.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {existingManualConfigurations.map((config) => (
                      <span
                        key={config.id}
                        className="inline-flex items-center px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-sm text-blue-400"
                      >
                        <Settings className="w-3 h-3 mr-1" />
                        {config.label}
                        <button
                          type="button"
                          onClick={() => removeExistingManualConfig(config)}
                          className="ml-2 text-blue-400 hover:text-blue-300 transition-colors"
                          disabled={isSubmitting}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <ConfigurationSelector
                selectedConfigurations={formData.manualConfigurations}
                onConfigurationsChange={(configs) =>
                  setFormData(prev => ({ ...prev, manualConfigurations: configs }))
                }
                onCreateConfiguration={handleCreateConfiguration}
                disabled={isSubmitting}
                placeholder="Add manual configurations..."
                preloadConfigurations={isOpen}
                excludeConfigurations={existingManualConfigurations}
                filterMode="manual"
              />
            </div>

            {/* Automated Configurations */}
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
                Automated Configurations
              </label>

              {!isLoadingConfigurations && existingAutomatedConfigurations.length > 0 && (
                <div className="mb-3">
                  <h4 className="text-sm font-medium text-slate-500 dark:text-gray-400 mb-2">
                    Current ({existingAutomatedConfigurations.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {existingAutomatedConfigurations.map((config) => (
                      <span
                        key={config.id}
                        className="inline-flex items-center px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full text-sm text-green-400"
                      >
                        <Settings className="w-3 h-3 mr-1" />
                        {config.label}
                        <button
                          type="button"
                          onClick={() => removeExistingAutomatedConfig(config)}
                          className="ml-2 text-green-400 hover:text-green-300 transition-colors"
                          disabled={isSubmitting}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <ConfigurationSelector
                selectedConfigurations={formData.automatedConfigurations}
                onConfigurationsChange={(configs) =>
                  setFormData(prev => ({ ...prev, automatedConfigurations: configs }))
                }
                disabled={isSubmitting}
                placeholder="Add automated configurations..."
                preloadConfigurations={isOpen}
                excludeConfigurations={existingAutomatedConfigurations}
                filterMode="automated"
                projectId={selectedProject?.id}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-none"
                disabled={isSubmitting}
                placeholder="Write in brief about the test run"
              />
            </div>

            {/* Assign Run */}
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
                Assign Run
              </label>
              {usersLoading ? (
                <div className="flex items-center text-slate-500 dark:text-gray-400 text-sm">
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Loading users...
                </div>
              ) : (
                <select
                  value={formData.assignedTo}
                  onChange={(e) => handleInputChange('assignedTo', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  disabled={isSubmitting}
                  required
                >
                  <option value="">Select assignee</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* State */}
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
                State
              </label>
              <select
                value={formData.state}
                onChange={(e) => handleInputChange('state', parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                disabled={isSubmitting}
              >
                {stateOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Test Plan */}
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
                Test Plan
              </label>
              <TestPlanSelector
                selectedTestPlanId={formData.testPlanId}
               onTestPlanChange={(testPlanId) => {

                 handleInputChange('testPlanId', testPlanId);
               }}
                disabled={isSubmitting}
                placeholder="Select test plan..."
                projectId={selectedProject?.id}
              />
            </div>

            {/* Setup your requirement management tool */}
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
                Setup your requirement management tool
              </label>
              <div className="flex space-x-3">
                <button
                  type="button"
                  className="flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-slate-900 dark:text-white rounded-lg transition-colors text-sm font-medium"
                  disabled={isSubmitting}
                >
                  <div className="w-4 h-4 mr-2 bg-white rounded-sm flex items-center justify-center">
                    <span className="text-blue-600 text-xs font-bold">J</span>
                  </div>
                  Jira
                </button>
              </div>
            </div>
          </div>
        </div>

        {validationError && (
          <div className="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-500 dark:text-red-400">
            {validationError}
          </div>
        )}

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
            icon={Save}
          >
            {isSubmitting ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              'Update'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default EditTestRunModal;