import React, { useState, useEffect } from 'react';
import { Loader, Save, X, Search, Plus } from 'lucide-react';
import Modal from '../UI/Modal';
import Button from '../UI/Button';
import ConfigurationSelector from '../UI/ConfigurationSelector';
import TestPlanSelector from '../UI/TestPlanSelector';
import { useUsers } from '../../context/UsersContext';
import { useTestCases } from '../../hooks/useTestCases';
import { useApp } from '../../context/AppContext';
import { Configuration } from '../../services/configurationsApi';
import { TestRun } from '../../services/testRunsApi';
import { testRunsApiService } from '../../services/testRunsApi';
import { Settings } from 'lucide-react';

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
  const { getSelectedProject, state: appState, createConfiguration, loadConfigurations } = useApp();
  const selectedProject = getSelectedProject();
  
  // Fetch all test cases for the project
  const { 
    allTestCases, 
    loading: testCasesLoading,
    fetchAllTestCasesForProject 
  } = useTestCases(selectedProject?.id, null, undefined, true);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    testCaseIds: [] as string[],
    configurations: [] as Configuration[],
    testPlanId: '',
    assignedTo: '',
    state: 1
  });

  const [testCaseSearch, setTestCaseSearch] = useState('');
  const [showTestCaseSelector, setShowTestCaseSelector] = useState(false);
  const [existingConfigurations, setExistingConfigurations] = useState<Configuration[]>([]);
  const [isLoadingConfigurations, setIsLoadingConfigurations] = useState(false);
  const [originalTestPlanId, setOriginalTestPlanId] = useState<string>('');
  
  // Use configurations from app context and load them if needed
  const configurations = appState.configurations;
  
  // Load configurations when modal opens if not already loaded
  useEffect(() => {
    if (isOpen && configurations.length === 0 && !appState.isLoadingConfigurations) {
      console.log('⚙️ Loading configurations for edit modal...');
      loadConfigurations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadConfigurations is stable
  }, [isOpen, configurations.length, appState.isLoadingConfigurations]);
  

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
      console.log('📝 Populating edit form with test run data:', testRun);
      console.log('📋 Test run test case IDs:', testRun.testCaseIds);
      console.log('📋 Available test cases count:', allTestCases.length);
      
      setFormData({
        name: testRun.name,
        description: testRun.description || '',
        testCaseIds: testRun.testCaseIds || [], // Use actual test case IDs from test run
        configurations: [], // Will be populated from new selections only
        testPlanId: '', // Will be loaded from API
        assignedTo: testRun.assignedTo?.id || '', // Use assigned user ID from test run
        state: testRun.state // Use the actual state number from the test run
      });
      
      console.log('📋 Set formData.testCaseIds to:', testRun.testCaseIds);
      console.log('📋 Set formData.testPlanId to: (will be loaded from API)');
      console.log('📋 Set formData.assignedTo to:', testRun.assignedTo?.id || '');

      // Load existing configurations by calling the API
      loadExistingConfigurations(testRun.id);
      loadExistingTestPlan(testRun.id);
      loadExistingTestPlan(testRun.id);
      
      console.log('📋 Setting existing test case IDs:', testRun.testCaseIds);
    } else if (isOpen && !testRun) {
      // Reset form for new test run
      setExistingConfigurations([]);
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
        configurations: [],
        testPlanId: '',
        assignedTo: '',
        state: 1
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- allTestCases.length, loadExistingConfigurations are stable
  }, [isOpen, testRun, users]);

  // Function to load existing configurations for the test run
  const loadExistingConfigurations = async (testRunId: string) => {
    try {
      setIsLoadingConfigurations(true);
      console.log('⚙️ Calling GET /test_runs/' + testRunId + ' to load existing configurations');
      
      // Call GET /test_runs/{id} with configurations included
      const response = await testRunsApiService.getTestRun(testRunId);
      console.log('⚙️ GET /test_runs/' + testRunId + ' response:', response);
      console.log('⚙️ Relationships:', response.data.relationships);
      console.log('⚙️ Included data:', response.included);
      
      // Extract configuration IDs from relationships
      const configurationRelationships = response.data.relationships?.configurations?.data || [];
      console.log('⚙️ Found', configurationRelationships.length, 'configuration relationships:', configurationRelationships);
      
      if (configurationRelationships.length > 0) {
        const existingConfigurationsData: Configuration[] = [];
        
        for (const configRef of configurationRelationships) {
          const configId = configRef.id.split('/').pop();
          console.log('⚙️ Processing configuration ID:', configId);
          
          // Look for configuration in included data first
          let foundConfig: Configuration | undefined;
          
          if (response.included) {
            const includedConfig = response.included.find(item => 
              item.type === 'Configuration' && item.attributes.id.toString() === configId
            );
            
            if (includedConfig) {
              foundConfig = {
                id: includedConfig.attributes.id.toString(),
                label: includedConfig.attributes.label || 'Unknown Configuration'
              };
              console.log('⚙️ Found configuration in included data:', foundConfig);
            } else {
              console.log('⚙️ Configuration not found in included data for ID:', configId);
            }
          } else {
            console.log('⚙️ No included data in response');
          }
          
          // If not found in included data, try to find in available configurations
          if (!foundConfig) {
            foundConfig = configurations.find(config => config.id === configId);
            if (foundConfig) {
              console.log('⚙️ Found configuration in available configurations:', foundConfig);
            }
          }
          
          if (foundConfig) {
            existingConfigurationsData.push(foundConfig);
            console.log('⚙️ ✅ Added existing configuration:', foundConfig);
          } else {
            console.warn('⚙️ ❌ Configuration not found anywhere for ID:', configId);
            // Create a fallback configuration
            existingConfigurationsData.push({
              id: configId || '',
              label: `Configuration ${configId} (not found)`
            });
          }
        }
        
        setExistingConfigurations(existingConfigurationsData);
        console.log('⚙️ ✅ Final existing configurations set:', existingConfigurationsData);
      } else {
        console.log('⚙️ No configuration relationships found in test run');
        setExistingConfigurations([]);
      }
      
    } catch (error) {
      console.error('⚙️ ❌ Failed to load existing configurations:', error);
      setExistingConfigurations([]);
    } finally {
      setIsLoadingConfigurations(false);
    }
  };

  // Function to load assigned user for the test run
  // const loadAssignedUser = async (testRunId: string) => {
  //   try {
  //     console.log('👤 Loading assigned user for test run:', testRunId);
  //     
  //     // Get test run details to extract assigned user from relationships.user
  //     const response = await testRunsApiService.getTestRun(testRunId);
  //     console.log('👤 Test run response for assigned user:', response);
  //     
  //     // Extract user ID from relationships.user
  //     const userRelationship = response.data.relationships?.user?.data;
  //     console.log('👤 User relationship found:', userRelationship);
  //     
  //     if (userRelationship) {
  //       const assignedUserId = userRelationship.id.split('/').pop();
  //       console.log('👤 Extracted assigned user ID:', assignedUserId);
  //       
  //       // Set the assigned user in form data
  //       setFormData(prev => ({
  //         ...prev,
  //         assignedTo: assignedUserId || ''
  //       }));
  //       
  //       console.log('✅ Set assigned user ID in form:', assignedUserId);
  //     } else {
  //       console.log('👤 No user relationship found in test run');
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
      console.log('📅 Loading existing test plan for test run:', testRunId);
      
      // Get test run details with test plan included
      const response = await testRunsApiService.getTestRun(testRunId);
      console.log('📅 Test run response:', response);
      
      // Extract test plan ID from relationships (try both camelCase and snake_case)
      const testPlanRelationship = response.data.relationships?.testPlan?.data || response.data.relationships?.test_plan?.data;
      console.log('📅 Test plan relationship found:', testPlanRelationship);
      
      if (testPlanRelationship) {
        const testPlanId = testPlanRelationship.id?.split('/').pop();
        console.log('📅 Extracted test plan ID:', testPlanId);
        
        if (testPlanId && testPlanId !== 'undefined' && testPlanId !== 'null') {
          // Set the test plan ID in form data
          setFormData(prev => ({
            ...prev,
            testPlanId: testPlanId
          }));
          
          // Set original test plan ID for change tracking
          setOriginalTestPlanId(testPlanId);
          
          console.log('✅ Set test plan ID in form:', testPlanId);
        } else {
          console.log('📅 Invalid test plan ID, clearing form field');
          setFormData(prev => ({
            ...prev,
            testPlanId: ''
          }));
          setOriginalTestPlanId('');
        }
      } else {
        console.log('📅 No test plan relationship found in test run');
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

  // Function to remove an existing configuration
  const removeExistingConfiguration = (configToRemove: Configuration) => {
    setExistingConfigurations(prev => prev.filter(config => config.id !== configToRemove.id));
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
  
  console.log('📋 Current formData.testCaseIds:', formData.testCaseIds);
  console.log('📋 All test cases:', allTestCases.map(tc => ({ id: tc.id, title: tc.title })));
  console.log('📋 Selected test cases:', selectedTestCases.map(tc => ({ id: tc.id, title: tc.title })));
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
      console.log('⚙️ Creating new configuration:', label);
      const newConfiguration = await createConfiguration(label);
      console.log('⚙️ ✅ Created configuration:', newConfiguration);
      return newConfiguration;
    } catch (error) {
      console.error('⚙️ ❌ Failed to create configuration:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Handle new configurations creation first
    const processedConfigurations = [];
    for (const config of formData.configurations || []) {
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

    // Combine existing configurations with new configurations from form
    const allConfigurations = [...existingConfigurations, ...processedConfigurations];
    
    // Determine the final test plan ID to send
    // Use the current form value (which may have changed from the original)
    const finalTestPlanId = formData.testPlanId;
    
    console.log('📅 SUBMIT DEBUG:', {
      originalTestPlanId,
      currentTestPlanId: formData.testPlanId,
      finalTestPlanId,
      hasChanged: originalTestPlanId !== formData.testPlanId,
      formDataTestPlanId: formData.testPlanId,
      formDataTestPlanIdType: typeof formData.testPlanId,
      formDataTestPlanIdLength: formData.testPlanId?.length,
      isEmptyString: formData.testPlanId === '',
      isTruthy: !!formData.testPlanId
    });
    
    const submitData = {
      name: formData.name,
      description: formData.description,
      state: formData.state,
      testCaseIds: formData.testCaseIds,
      configurations: allConfigurations,
      assignedTo: formData.assignedTo,
      testPlanId: finalTestPlanId
    };
    
    console.log('📅 Final submitData.testPlanId:', submitData.testPlanId);
    
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

        {/* Test Cases Section */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Test Cases
          </label>
          <div className="space-y-4">
            {/* Selected Test Cases */}
            {selectedTestCases.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">
                  Selected Test Cases ({selectedTestCases.length})
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto" style={{ overflowAnchor: 'none' }}>
                  {selectedTestCases.map((testCase) => (
                    <div key={`selected-${testCase.id}`} className="flex items-center justify-between bg-slate-700 border border-slate-600 rounded-lg p-3 min-w-0">
                      <div className="flex-1 min-w-0 pr-3">
                        <span className="text-white text-sm font-medium">{testCase.title}</span>
                        <p className="text-xs text-gray-400">TC{testCase.id}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeTestCase(testCase.id)}
                        className="text-gray-400 hover:text-red-400 transition-colors flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Test Case Selector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-400">
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
                <div className="bg-slate-800 border border-slate-600 rounded-lg p-4">
                  {/* Search */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search test cases..."
                      value={testCaseSearch}
                      onChange={(e) => setTestCaseSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm"
                    />
                  </div>
                  
                  {/* Test Cases List */}
                  {testCasesLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
                      <span className="text-gray-400 text-sm">Loading test cases...</span>
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
                            className="w-full text-left bg-slate-700 border border-slate-600 rounded-lg p-3 text-white hover:bg-slate-600 transition-colors min-w-0"
                          >
                            <div className="flex items-center justify-between min-w-0">
                              <div className="flex-1 min-w-0 pr-3">
                                <span className="text-sm font-medium block truncate">{testCase.title}</span>
                                <p className="text-xs text-gray-400">TC{testCase.id}</p>
                              </div>
                              <Plus className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                            </div>
                          </button>
                        ))}
                      
                      {filteredTestCases.filter(testCase => !formData.testCaseIds.includes(testCase.id)).length === 0 && (
                        <div className="text-center py-4 text-gray-400 text-sm">
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
            {/* Configurations */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Configurations
              </label>
              
              {/* Loading existing configurations */}
              {isLoadingConfigurations && (
                <div className="flex items-center text-gray-400 text-sm mb-3">
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Loading existing configurations...
                </div>
              )}
              
              {/* Display existing configurations */}
              {!isLoadingConfigurations && existingConfigurations.length > 0 && (
                <div className="mb-3">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">
                    Current Configurations ({existingConfigurations.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {existingConfigurations.map((config) => (
                      <span
                        key={config.id}
                        className="inline-flex items-center px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-sm text-blue-400"
                      >
                        <Settings className="w-3 h-3 mr-1" />
                        {config.label}
                        <button
                          type="button"
                          onClick={() => removeExistingConfiguration(config)}
                          className="ml-2 text-blue-400 hover:text-blue-300 transition-colors"
                          disabled={isSubmitting}
                          title="Remove configuration"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <ConfigurationSelector
                selectedConfigurations={formData.configurations}
                onConfigurationsChange={(selectedConfigurations) => 
                  setFormData(prev => ({ ...prev, configurations: selectedConfigurations }))
                }
                onCreateConfiguration={handleCreateConfiguration}
                disabled={isSubmitting}
                placeholder="Add new configurations..."
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-none"
                disabled={isSubmitting}
                placeholder="Write in brief about the test run"
              />
            </div>

            {/* Assign Run */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Assign Run
              </label>
              {usersLoading ? (
                <div className="flex items-center text-gray-400 text-sm">
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Loading users...
                </div>
              ) : (
                <select
                  value={formData.assignedTo}
                  onChange={(e) => handleInputChange('assignedTo', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
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
              <label className="block text-sm font-medium text-gray-300 mb-2">
                State
              </label>
              <select
                value={formData.state}
                onChange={(e) => handleInputChange('state', parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
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
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Test Plan
              </label>
              <TestPlanSelector
                selectedTestPlanId={formData.testPlanId}
               onTestPlanChange={(testPlanId) => {
                 console.log('📅 TEST PLAN DROPDOWN CHANGED:', {
                   newTestPlanId: testPlanId,
                   previousTestPlanId: formData.testPlanId,
                   originalTestPlanId,
                   hasChanged: originalTestPlanId !== testPlanId
                 });
                 handleInputChange('testPlanId', testPlanId);
               }}
                disabled={isSubmitting}
                placeholder="Select test plan..."
                projectId={selectedProject?.id}
              />
            </div>

            {/* Setup your requirement management tool */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Setup your requirement management tool
              </label>
              <div className="flex space-x-3">
                <button
                  type="button"
                  className="flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                  disabled={isSubmitting}
                >
                  <div className="w-4 h-4 mr-2 bg-white rounded-sm flex items-center justify-center">
                    <span className="text-blue-600 text-xs font-bold">J</span>
                  </div>
                  Jira
                </button>
                <button
                  type="button"
                  className="flex items-center px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors text-sm font-medium"
                  disabled={isSubmitting}
                >
                  <div className="w-4 h-4 mr-2 bg-white rounded-sm flex items-center justify-center">
                    <span className="text-cyan-600 text-xs font-bold">A</span>
                  </div>
                  Azure
                </button>
                <button
                  type="button"
                  className="flex items-center px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-sm font-medium"
                  disabled={isSubmitting}
                >
                  <div className="w-4 h-4 mr-2 bg-white rounded-sm flex items-center justify-center">
                    <span className="text-red-500 text-xs font-bold">A</span>
                  </div>
                  Asana
                </button>
              </div>
            </div>
          </div>
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