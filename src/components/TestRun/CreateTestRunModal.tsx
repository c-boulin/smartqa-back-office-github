import React, { useState, useEffect } from 'react';
import { Loader, Play, X, Search, Plus } from 'lucide-react';
import Modal from '../UI/Modal';
import Button from '../UI/Button';
import ConfigurationSelector from '../UI/ConfigurationSelector';
import TestPlanSelector from '../UI/TestPlanSelector';
import { useUsers } from '../../context/UsersContext';
import { useAuth } from '../../context/AuthContext';
import { useTestCases } from '../../hooks/useTestCases';
import { useApp } from '../../context/AppContext';
import { Configuration } from '../../services/configurationsApi';

interface CreateTestRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    description: string;
    testCaseIds: string[];
    configurations: string[];
    testPlan: string;
    assignedTo: string;
    state: string;
  }) => Promise<void>;
  isSubmitting: boolean;
  preselectedTestCaseId?: string | null;
}

const CreateTestRunModal: React.FC<CreateTestRunModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  preselectedTestCaseId = null
}) => {
  const { state: authState } = useAuth();
  const { users, loading: usersLoading } = useUsers();
  const { getSelectedProject, createConfiguration } = useApp();
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
    state: 'new'
  });

  const [testCaseSearch, setTestCaseSearch] = useState('');
  const [showTestCaseSelector, setShowTestCaseSelector] = useState(false);


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

  // Set current user as default assignee when users are loaded
  useEffect(() => {
    if (users.length > 0 && authState.user && !formData.assignedTo) {
      const currentUser = users.find(user => user.email === authState.user?.email);
      if (currentUser) {
        setFormData(prev => ({ ...prev, assignedTo: currentUser.id }));
      }
    }
  }, [users, authState.user, formData.assignedTo]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Generate default test run name with current date
      const today = new Date();
      const dateStr = today.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      setFormData({
        name: `Test Run-${dateStr}`,
        description: '',
        testCaseIds: preselectedTestCaseId ? [preselectedTestCaseId] : [],
        configurations: [] as Configuration[],
        testPlanId: '',
        assignedTo: '',
        state: 1
      });
      setTestCaseSearch('');
      setShowTestCaseSelector(false);
    }
  }, [isOpen, preselectedTestCaseId]);

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
    
    const submitData = {
      name: formData.name,
      description: formData.description,
      testCaseIds: formData.testCaseIds,
      configurations: processedConfigurations,
      testPlanId: formData.testPlanId,
      assignedTo: formData.assignedTo,
      state: formData.state
    };

    await onSubmit(submitData);
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Create New Test Run"
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
                        <p className="text-xs text-slate-500 dark:text-gray-400">TC{testCase.id}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeTestCase(testCase.id)}
                        className="text-slate-500 dark:text-gray-400 hover:text-red-400 transition-colors flex-shrink-0"
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
                  {/* Search */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 dark:text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search test cases..."
                      value={testCaseSearch}
                      onChange={(e) => setTestCaseSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm"
                    />
                  </div>
                  
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
                                <p className="text-xs text-slate-500 dark:text-gray-400">TC{testCase.id}</p>
                              </div>
                              <Plus className="w-4 h-4 text-cyan-400 flex-shrink-0" />
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
            {/* Configurations */}
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
                Configurations
              </label>
              <ConfigurationSelector
                selectedConfigurations={formData.configurations}
                onConfigurationsChange={(selectedConfigurations) =>
                  setFormData(prev => ({ ...prev, configurations: selectedConfigurations }))
                }
                onCreateConfiguration={handleCreateConfiguration}
                disabled={isSubmitting}
                placeholder="Search or select configurations..."
                preloadConfigurations={isOpen}
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
                onTestPlanChange={(testPlanId) => handleInputChange('testPlanId', testPlanId)}
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
                <button
                  type="button"
                  className="flex items-center px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-slate-900 dark:text-white rounded-lg transition-colors text-sm font-medium"
                  disabled={isSubmitting}
                >
                  <div className="w-4 h-4 mr-2 bg-white rounded-sm flex items-center justify-center">
                    <span className="text-cyan-600 text-xs font-bold">A</span>
                  </div>
                  Azure
                </button>
                <button
                  type="button"
                  className="flex items-center px-3 py-2 bg-red-500 hover:bg-red-600 text-slate-900 dark:text-white rounded-lg transition-colors text-sm font-medium"
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
            className="flex items-center"
          >
            {isSubmitting ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Create Test Run
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateTestRunModal;