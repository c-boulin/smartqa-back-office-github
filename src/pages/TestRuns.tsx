import React, { useState, useCallback } from 'react';
import { Plus, SquarePen, Trash2, ChevronLeft, ChevronRight, Loader, Play, Clock, CheckCircle, User, Copy, Activity, Archive } from 'lucide-react';
// import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
// import StatusBadge from '../components/UI/StatusBadge';
// import Modal from '../components/UI/Modal';
import ConfirmDialog from '../components/UI/ConfirmDialog';
import CreateTestRunModal from '../components/TestRun/CreateTestRunModal';
import EditTestRunModal from '../components/TestRun/EditTestRunModal';
import CloneTestRunModal from '../components/TestRun/CloneTestRunModal';
import CloseTestRunModal from '../components/TestRun/CloseTestRunModal';
import TestRunsFilters from '../components/TestRun/TestRunsFilters';
import TestRunsFiltersSidebar from '../components/TestRun/TestRunsFiltersSidebar';
import { useApp } from '../context/AppContext';
import { useTestRuns } from '../hooks/useTestRuns';
import { useTestRunsFilters } from '../hooks/useTestRunsFilters';
import { useUsers } from '../context/UsersContext';
import { TestRun, testRunsApiService } from '../services/testRunsApi';
import toast from 'react-hot-toast';

const TestRuns: React.FC = () => {
  const { getSelectedProject, createTag, state: appState } = useApp();
  // const { state: authState } = useAuth();
  const { users } = useUsers();
  const navigate = useNavigate();
  const selectedProject = getSelectedProject();
  
  // Use tags from AppContext (loaded once)
  const tags = appState.tags;
  const tagsLoading = appState.isLoadingTags;
  
  const { 
    testRuns, 
    loading, 
    error, 
    pagination, 
    fetchTestRuns, 
    searchTestRuns,
    // filterTestRunsByAssignee,
    // filterTestRunsByState,
    filterTestRunsWithMultipleFilters,
    createTestRun, 
    updateTestRun, 
    deleteTestRun,
    closeTestRun
  } = useTestRuns(selectedProject?.id);

  const {
    filters,
    appliedFilters,
    updateFilter,
    applyFilters: applyFiltersHook,
    clearAllFilters: clearFilters,
    hasActiveFilters
  } = useTestRunsFilters();

  const [searchTerm, setSearchTerm] = useState('');
  const [currentSearchTerm, setCurrentSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTestRun, setSelectedTestRun] = useState<TestRun | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [testRunToClone, setTestRunToClone] = useState<TestRun | null>(null);
  const [isFiltersSidebarOpen, setIsFiltersSidebarOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [testRunToClose, setTestRunToClose] = useState<TestRun | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'closed'>('active');

  const handleSearch = useCallback(async (term: string) => {
    setCurrentSearchTerm(term);
    if (term.trim()) {
      await searchTestRuns(term);
    } else {
      if (hasActiveFilters()) {
        applyFilters();
      } else {
        await fetchTestRuns(1);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- applyFilters and hasActiveFilters would cause infinite loop
  }, [searchTestRuns, fetchTestRuns]);

  const applyFilters = useCallback(async () => {
    setCurrentSearchTerm('');
    setSearchTerm('');
    
    // Apply the filters in the hook first
    applyFiltersHook();
    
    // Check if we have multiple filters to apply
    const hasAssigneeFilter = filters.assignee !== 'all';
    const hasStateFilter = filters.state !== 'all';
    
    if (hasAssigneeFilter || hasStateFilter) {
      // Apply multiple filters
      const multipleFilters: Record<string, string> = {};
      if (hasAssigneeFilter) {
        multipleFilters.assignee = filters.assignee;
      }
      if (hasStateFilter) {
        multipleFilters.state = filters.state;
      }
      
      console.log('🔍 Applying multiple filters:', multipleFilters);
      await filterTestRunsWithMultipleFilters(multipleFilters, 1);
    } else {
      // No filters, fetch all
      await fetchTestRuns(1);
    }
  }, [filters, applyFiltersHook, fetchTestRuns, filterTestRunsWithMultipleFilters]);

  const clearAllFilters = useCallback(() => {
    clearFilters();
    setSearchTerm('');
    setCurrentSearchTerm('');
    fetchTestRuns(1);
  }, [clearFilters, fetchTestRuns]);

  // Filter test runs based on active tab
  const getFilteredTestRuns = () => {
    console.log('🔍 Filtering test runs for tab:', activeTab);
    console.log('🔍 All test runs:', testRuns.map(tr => ({ id: tr.id, name: tr.name, state: tr.state, status: tr.status })));
    
    if (activeTab === 'active') {
      const activeRuns = testRuns.filter(testRun => testRun.state !== 6); // Not closed
      console.log('🔍 Active test runs:', activeRuns.map(tr => ({ id: tr.id, name: tr.name, state: tr.state })));
      return activeRuns;
    } else {
      const closedRuns = testRuns.filter(testRun => testRun.state === 6); // Closed
      console.log('🔍 Closed test runs:', closedRuns.map(tr => ({ id: tr.id, name: tr.name, state: tr.state })));
      return closedRuns;
    }
  };

  const filteredTestRuns = getFilteredTestRuns();

  const clearIndividualFilter = useCallback(async (filterType: keyof typeof filters, _value?: string) => {
    if (filterType === 'search') {
      // Clear search term and current search term
      setSearchTerm('');
      setCurrentSearchTerm('');
      
      // If we have other active filters, apply them; otherwise fetch all
      if (hasActiveFilters() && (appliedFilters.assignee !== 'all' || appliedFilters.state !== 'all')) {
        const multipleFilters: Record<string, string> = {};
        if (appliedFilters.assignee !== 'all') {
          multipleFilters.assignee = appliedFilters.assignee;
        }
        if (appliedFilters.state !== 'all') {
          multipleFilters.state = appliedFilters.state;
        }
        await filterTestRunsWithMultipleFilters(multipleFilters, 1);
      } else {
        await fetchTestRuns(1);
      }
    } else {
      // Update the specific filter
      updateFilter(filterType, 'all');
      
      // Also clear it from applied filters immediately
      clearFilters();
      
      // Wait a bit for state to update, then check if we still have active filters
      setTimeout(() => {
        // After clearing, just fetch all test runs
        fetchTestRuns(1);
      }, 50);
    }
  }, [updateFilter, clearFilters, fetchTestRuns, filterTestRunsWithMultipleFilters, hasActiveFilters, appliedFilters]);

  const handleSearchKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch(searchTerm);
    }
  }, [searchTerm, handleSearch]);

  const handleCreateTestRun = useCallback(async (data: Record<string, unknown>) => {
    if (!selectedProject) {
      toast.error('Please select a project first');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Handle new tags creation first
      const processedTags = [];
      for (const tag of data.tags || []) {
        if (tag && tag.id && typeof tag.id === 'string' && tag.id.startsWith('temp-')) {
          try {
            const newTag = await createTag(tag.label);
            processedTags.push(newTag);
          } catch {
            console.error('Failed to create tag:', error);
            toast.error(`Failed to create tag: ${tag.label}`);
            return;
          }
        } else if (tag && tag.id && tag.label) {
          processedTags.push(tag);
        }
      }
      
      await createTestRun({
        name: data.name,
        description: data.description,
        projectId: selectedProject.id,
        testCaseIds: data.testCaseIds,
        configurations: data.configurations, // Pass configurations array
        assignedTo: data.assignedTo,
        state: data.state,
        tags: processedTags,
        testPlanId: data.testPlanId
      });
      
      setIsCreateModalOpen(false);
      
    } catch {
      // Error is already handled in the hook
    } finally {
      setIsSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- createTag and error are stable
  }, [createTestRun, selectedProject]);

  const handleEditTestRun = useCallback(async (data: Record<string, unknown>) => {
    if (!selectedTestRun || !selectedProject) {
      toast.error('No test run selected');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Handle new tags creation first
      const processedTags = [];
      for (const tag of data.tags || []) {
        if (tag && tag.id && typeof tag.id === 'string' && tag.id.startsWith('temp-')) {
          try {
            const newTag = await createTag(tag.label);
            processedTags.push(newTag);
          } catch {
            console.error('Failed to create tag:', error);
            toast.error(`Failed to create tag: ${tag.label}`);
            return;
          }
        } else if (tag && tag.id && tag.label) {
          processedTags.push(tag);
        }
      }
      
      await updateTestRun(selectedTestRun.id, {
        name: data.name,
        description: data.description,
        state: data.state,
        testCaseIds: data.testCaseIds,
        configurations: data.configurations,
        assignedTo: data.assignedTo,
        tags: processedTags,
        testPlanId: data.testPlanId
      });
      setIsEditModalOpen(false);
      setSelectedTestRun(null);
    } catch {
      // Error is already handled in the hook
    } finally {
      setIsSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- createTag and error are stable
  }, [updateTestRun, selectedTestRun, selectedProject]);

  const handleDeleteTestRun = useCallback(async () => {
    if (!selectedTestRun) return;
    
    try {
      setIsSubmitting(true);
      await deleteTestRun(selectedTestRun.id);
      setSelectedTestRun(null);
    } catch {
      // Error is already handled in the hook
    } finally {
      setIsSubmitting(false);
    }
  }, [deleteTestRun, selectedTestRun]);

  const openEditModal = useCallback((testRun: TestRun) => {
    setSelectedTestRun(testRun);
    setIsEditModalOpen(true);
  }, []);

  const openDeleteDialog = useCallback((testRun: TestRun) => {
    setSelectedTestRun(testRun);
    setIsDeleteDialogOpen(true);
  }, []);

  const openCloneModal = useCallback((testRun: TestRun) => {
    setTestRunToClone(testRun);
    setIsCloneModalOpen(true);
  }, []);

  const openCloseModal = useCallback((testRun: TestRun) => {
    setTestRunToClose(testRun);
    setIsCloseModalOpen(true);
  }, []);

  const handleCloseTestRun = useCallback(async () => {
    if (!testRunToClose) return;
    
    try {
      setIsSubmitting(true);
      await closeTestRun(testRunToClose.id);
      setTestRunToClose(null);
      setIsCloseModalOpen(false);
    } catch {
      // Error is already handled in the hook
    } finally {
      setIsSubmitting(false);
    }
  }, [closeTestRun, testRunToClose]);

  const handleCloneTestRun = useCallback(async (cloneData: {
    name: string;
    includeAllTestCases: boolean;
    includeByResults: boolean;
    selectedResults: string[];
    selectedTestCaseIds?: string[];
    copyTestCaseAssignee: boolean;
    copyTags: boolean;
    copyLinkedIssues: boolean;
  }) => {
    if (!selectedProject) {
      toast.error('Please select a project first');
      return;
    }

    if (!testRunToClone) {
      toast.error('No test run selected for cloning');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Determine which test cases to include
      let testCaseIds: string[] = [];
      if (cloneData.includeAllTestCases) {
        testCaseIds = testRunToClone.testCaseIds;
      } else if (cloneData.includeByResults) {
        // Use the actual selected test case IDs from the modal
        testCaseIds = cloneData.selectedTestCaseIds || [];
      }
      
      // Get existing tags if copyTags is enabled
      let existingTags = [];
      if (cloneData.copyTags) {
        try {
          console.log('🏷️ Loading existing tags for cloning test run:', testRunToClone.id);
          const testRunResponse = await testRunsApiService.getTestRun(testRunToClone.id);
          
          // Extract tag IDs from relationships
          const tagRelationships = testRunResponse.data.relationships?.tags?.data || [];
          
          if (tagRelationships.length > 0) {
            for (const tagRef of tagRelationships) {
              const tagId = tagRef.id.split('/').pop();
              
              // Find tag in available tags or included data
              let foundTag = tags.find(tag => tag.id === tagId);
              
              if (!foundTag && testRunResponse.included) {
                const includedTag = testRunResponse.included.find(item => 
                  item.type === 'Tag' && item.attributes.id.toString() === tagId
                );
                
                if (includedTag) {
                  foundTag = {
                    id: includedTag.attributes.id.toString(),
                    label: includedTag.attributes.label
                  };
                }
              }
              
              if (foundTag) {
                existingTags.push(foundTag);
              }
            }
          }
        } catch {
          console.error('Failed to load existing tags for cloning:', error);
          existingTags = [];
        }
      }
      
      // Get existing configurations (always include them)
      const existingConfigurations = testRunToClone.configurations || [];
      
      console.log('🔄 Cloning test run with data:', {
        name: cloneData.name,
        testCaseIds: testCaseIds.length,
        configurations: existingConfigurations.length,
        tags: existingTags.length,
        includeAllTestCases: cloneData.includeAllTestCases,
        copyTags: cloneData.copyTags
      });
      
      // Create the cloned test run
      await createTestRun({
        name: cloneData.name,
        description: testRunToClone.description || '',
        projectId: selectedProject.id,
        testCaseIds: testCaseIds,
        configurations: existingConfigurations,
        assignedTo: cloneData.copyTestCaseAssignee ? testRunToClone.assignedTo.id : '',
        state: 1, // Set to "New" state for the clone
        tags: existingTags
      });
      
      setIsCloneModalOpen(false);
      setTestRunToClone(null);
      toast.success(`Test run cloned successfully as "${cloneData.name}"`);
      
    } catch {
      console.error('Failed to clone test run:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to clone test run';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- error is stable
  }, [createTestRun, selectedProject, tags, testRunToClone]);

  const handlePageChange = useCallback((page: number) => {
    if (currentSearchTerm.trim()) {
      searchTestRuns(currentSearchTerm, page);
    } else if (hasActiveFilters() && (appliedFilters.assignee !== 'all' || appliedFilters.state !== 'all')) {
      const multipleFilters: Record<string, string> = {};
      if (appliedFilters.assignee !== 'all') {
        multipleFilters.assignee = appliedFilters.assignee;
      }
      if (appliedFilters.state !== 'all') {
        multipleFilters.state = appliedFilters.state;
      }
      filterTestRunsWithMultipleFilters(multipleFilters, page);
    } else {
      fetchTestRuns(page);
    }
  }, [currentSearchTerm, searchTestRuns, hasActiveFilters, appliedFilters, filterTestRunsWithMultipleFilters, fetchTestRuns]);

  const closeCreateModal = useCallback(() => {
    setIsCreateModalOpen(false);
  }, []);

  const closeEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setSelectedTestRun(null);
  }, []);

  const handleTestRunNameClick = useCallback((testRun: TestRun) => {
    console.log('🏃 Test run name clicked:', testRun.name, 'ID:', testRun.id);
    navigate(`/test-runs/${testRun.id}`);
  }, [navigate]);

  const getStateIcon = (state: number) => {
    switch (state) {
      case 1: // New
      case 2: // In progress
        return <Play className="w-4 h-4" />;
      case 5: // Done
      case 6: // Closed
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStateColor = (state: number) => {
    switch (state) {
      case 1: // New
        return 'text-gray-400 bg-gray-500/20 border-gray-500/50';
      case 2: // In progress
        return 'text-blue-400 bg-blue-500/20 border-blue-500/50';
      case 3: // Under review
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50';
      case 4: // Rejected
        return 'text-red-400 bg-red-500/20 border-red-500/50';
      case 5: // Done
        return 'text-green-400 bg-green-500/20 border-green-500/50';
      case 6: // Closed
        return 'text-purple-400 bg-purple-500/20 border-purple-500/50';
      default:
        return 'text-gray-400 bg-gray-500/20 border-gray-500/50';
    }
  };

  const getStateLabel = (state: number) => {
    const stateLabels = {
      1: 'New',
      2: 'In progress',
      3: 'Under review',
      4: 'Rejected',
      5: 'Done',
      6: 'Closed'
    };
    return stateLabels[state as keyof typeof stateLabels] || 'Unknown';
  };

  if (loading && testRuns.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading test runs...</p>
        </div>
      </div>
    );
  }

  if (error && testRuns.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Card className="p-8 text-center">
          <div className="text-red-400 mb-4">
            <p className="text-lg font-medium">Failed to load test runs</p>
            <p className="text-sm text-gray-400 mt-2">{error}</p>
          </div>
          <Button onClick={() => fetchTestRuns(1)}>
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Test Runs</h2>
          <p className="text-gray-400">
            {selectedProject 
              ? `Manage test runs for ${selectedProject.name} (${pagination.totalItems} total)` 
              : `Please select a project to view test runs`
            }
          </p>
          {selectedProject && (
            <div className="mt-2">
              <div className="inline-flex items-center px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded-full text-sm text-cyan-400">
                📁 Project: {selectedProject.name} ({filteredTestRuns.length} {activeTab} test runs)
              </div>
            </div>
          )}
        </div>
        <Button 
          icon={Plus} 
          onClick={() => setIsCreateModalOpen(true)}
          disabled={!selectedProject}
          title={!selectedProject ? 'Please select a project first' : 'Create new test run'}
        >
          New Test Run
        </Button>
      </div>

      {/* Show message if no project selected */}
      {!selectedProject && (
        <Card className="p-8 text-center">
          <div className="text-gray-400 mb-4">
            <Play className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No project selected</p>
            <p className="text-sm">Please select a project from the sidebar to view and manage test runs.</p>
          </div>
        </Card>
      )}

      {/* Only show content if project is selected */}
      {selectedProject && (
        <>
          {/* Tabs */}
          <Card className="p-0 overflow-hidden">
            <div className="flex border-b border-slate-700">
              <button
                onClick={() => setActiveTab('active')}
                className={`flex-1 px-6 py-4 text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${
                  activeTab === 'active'
                    ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-400 border-b-2 border-cyan-400'
                    : 'text-gray-400 hover:text-cyan-400 hover:bg-slate-800/50'
                }`}
              >
                <Activity className="w-4 h-4" />
                <span>Active Test Runs</span>
                <span className="ml-2 px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded-full">
                  {testRuns.filter(tr => tr.state !== 6).length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('closed')}
                className={`flex-1 px-6 py-4 text-sm font-medium transition-colors flex items-center justify-center space-x-2 ${
                  activeTab === 'closed'
                    ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-400 border-b-2 border-cyan-400'
                    : 'text-gray-400 hover:text-cyan-400 hover:bg-slate-800/50'
                }`}
              >
                <Archive className="w-4 h-4" />
                <span>Closed Test Runs</span>
                <span className="ml-2 px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded-full">
                  {testRuns.filter(tr => tr.state === 6).length}
                </span>
              </button>
            </div>
          </Card>

          <TestRunsFilters
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            onSearchKeyPress={handleSearchKeyPress}
            currentSearchTerm={currentSearchTerm}
            filters={filters}
            appliedFilters={appliedFilters}
            onFilterChange={updateFilter}
            onApplyFilters={applyFilters}
            onClearAllFilters={clearAllFilters}
            onOpenFiltersSidebar={() => setIsFiltersSidebarOpen(true)}
            availableUsers={users}
            onClearIndividualFilter={clearIndividualFilter}
          />

          {/* Test Runs Table */}
          <Card className="overflow-hidden">
            {loading && (
              <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center z-10">
                <Loader className="w-6 h-6 text-cyan-400 animate-spin" />
              </div>
            )}
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800/50 border-b border-slate-700">
                  <tr>
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">ID</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Name</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">State</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Progress</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Test Cases</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Assignee</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTestRuns.map((testRun) => (
                    <tr key={testRun.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-6 text-sm text-gray-300 font-mono">
                        #{testRun.id}
                      </td>
                      <td className="py-4 px-6">
                        <div>
                          <button
                            onClick={() => handleTestRunNameClick(testRun)}
                            className="text-left w-full group"
                          >
                            <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors cursor-pointer mb-1">
                              {testRun.name}
                            </h3>
                          </button>
                          {testRun.description && (
                            <p className="text-sm text-gray-400 truncate max-w-xs">{testRun.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStateColor(testRun.state)}`}>
                          {getStateIcon(testRun.state)}
                          <span className="ml-1">{getStateLabel(testRun.state)}</span>
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Progress</span>
                            <span className="text-white font-medium">{testRun.progress}%</span>
                          </div>
                          <div className="w-full bg-slate-700 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-cyan-400 to-purple-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${testRun.progress}%` }}
                            ></div>
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-400">
                            <span>Pass Rate: {testRun.passRate}%</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="space-y-1 text-sm">
                          <div className="text-white font-medium">{testRun.testCasesCount} total</div>
                          <div className="flex space-x-2 text-xs">
                            <span className="text-green-400">{testRun.passedCount} passed</span>
                            <span className="text-red-400">{testRun.failedCount} failed</span>
                            {testRun.blockedCount > 0 && (
                              <span className="text-purple-400">{testRun.blockedCount} blocked</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full flex items-center justify-center mr-3">
                            <User className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{testRun.assignedTo.name}</p>
                            <p className="text-xs text-gray-400">{testRun.assignedTo.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2">
                          {activeTab === 'active' && ( // Only show edit button for active test runs
                            <button
                              onClick={() => openEditModal(testRun)}
                              className="p-2 text-gray-400 hover:text-cyan-400 hover:bg-slate-700 rounded-lg transition-colors"
                              title="Edit"
                              disabled={isSubmitting}
                            >
                              <SquarePen className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => openCloneModal(testRun)}
                            className="p-2 text-gray-400 hover:text-green-400 hover:bg-slate-700 rounded-lg transition-colors"
                            title="Clone Test Run"
                            disabled={isSubmitting}
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          {activeTab === 'active' && testRun.state !== 6 && ( // Only show close button for active test runs
                            <button
                              onClick={() => openCloseModal(testRun)}
                              className="p-2 text-gray-400 hover:text-orange-400 hover:bg-slate-700 rounded-lg transition-colors"
                              title="Close Test Run"
                              disabled={isSubmitting}
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => openDeleteDialog(testRun)}
                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
                            title="Delete"
                            disabled={isSubmitting}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredTestRuns.length === 0 && !loading && (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <Play className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No {activeTab} test runs found</p>
                    <p className="text-sm">
                      {currentSearchTerm 
                        ? `No ${activeTab} test runs found matching "${currentSearchTerm}". Try a different search term${activeTab === 'active' ? ' or create a new test run' : ''}.`
                        : activeTab === 'active' 
                          ? 'No active test runs found for this project. Create your first test run to get started.'
                          : 'No closed test runs found for this project. Close some test runs to see them here.'
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="border-t border-slate-700 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-400">
                    Showing {filteredTestRuns.length} of {testRuns.length} test runs
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                      disabled={pagination.currentPage === 1 || loading}
                      icon={ChevronLeft}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-gray-400">
                      Page {pagination.currentPage} of {pagination.totalPages}
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                      disabled={pagination.currentPage === pagination.totalPages || loading}
                      icon={ChevronRight}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </>
      )}

      <TestRunsFiltersSidebar
        isOpen={isFiltersSidebarOpen}
        onClose={() => setIsFiltersSidebarOpen(false)}
        filters={filters}
        onFilterChange={updateFilter}
        onApplyFilters={applyFilters}
        onClearAllFilters={clearAllFilters}
        availableUsers={users}
      />

      {/* Modals */}
      <CreateTestRunModal
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        onSubmit={handleCreateTestRun}
        isSubmitting={isSubmitting}
        availableTags={tags}
        onCreateTag={createTag}
        tagsLoading={tagsLoading}
      />

      <EditTestRunModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        onSubmit={handleEditTestRun}
        testRun={selectedTestRun}
        isSubmitting={isSubmitting}
        availableTags={tags}
        onCreateTag={createTag}
        tagsLoading={tagsLoading}
      />

      <CloneTestRunModal
        isOpen={isCloneModalOpen}
        onClose={() => {
          setIsCloneModalOpen(false);
          setTestRunToClone(null);
        }}
        onSubmit={handleCloneTestRun}
        testRun={testRunToClone}
        isSubmitting={isSubmitting}
      />

      <CloseTestRunModal
        isOpen={isCloseModalOpen}
        onClose={() => {
          setIsCloseModalOpen(false);
          setTestRunToClose(null);
        }}
        onConfirm={handleCloseTestRun}
        testRun={testRunToClose}
        isSubmitting={isSubmitting}
      />

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteTestRun}
        title="Delete Test Run"
        message={`Are you sure you want to delete the test run "${selectedTestRun?.name}"? This action is irreversible and will delete all associated test executions.`}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
};

export default TestRuns;