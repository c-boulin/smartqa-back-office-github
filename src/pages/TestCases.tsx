import React, { useState, useCallback, useMemo } from 'react';
import { Search, Loader } from 'lucide-react';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import ConfirmDialog from '../components/UI/ConfirmDialog';
import { ColumnVisibility } from '../components/UI/ColumnVisibilityDropdown';
import TestCasesHeader from '../components/TestCase/TestCasesHeader';
import TestCasesFilters from '../components/TestCase/TestCasesFilters';
import TestCasesTable from '../components/TestCase/TestCasesTable';
import TestCasesFolderSidebar from '../components/TestCase/TestCasesFolderSidebar';
import TestCasesFiltersSidebar from '../components/TestCase/TestCasesFiltersSidebar';
import CreateTestCaseModal from '../components/TestCase/CreateTestCaseModal';
import UpdateTestCaseModal from '../components/TestCase/UpdateTestCaseModal';
import DuplicateTestCaseModal from '../components/TestCase/DuplicateTestCaseModal';
import CreateFolderModal from '../components/Folder/CreateFolderModal';
import EditFolderModal from '../components/Folder/EditFolderModal';
import TestCaseDetailsSidebar from '../components/TestCase/TestCaseDetailsSidebar';
import CreateTestRunModal from '../components/TestRun/CreateTestRunModal';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useTestCases } from '../hooks/useTestCases';
import { useFolders } from '../hooks/useFolders';
import { useTestCasesFilters } from '../hooks/useTestCasesFilters';
import { useTestCasesNavigation } from '../hooks/useTestCasesNavigation';
import { useDragAutoScroll } from '../hooks/useDragAutoScroll';
import { useRestoreLastProject } from '../hooks/useRestoreLastProject';
import { foldersApiService } from '../services/foldersApi';
import { testCasesApiService } from '../services/testCasesApi';
import { testRunsApiService } from '../services/testRunsApi';
import { apiService } from '../services/api';
import { testCaseDataCache } from '../services/testCaseDataCache';
import { TestCase } from '../types';
import { Tag } from '../services/tagsApi';
import { getTestTypeString } from '../utils/testCaseHelpers';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const TestCases: React.FC = () => {
  const { getSelectedProject, state: appState, createTag } = useApp();
  const { state: authState } = useAuth();
  const navigate = useNavigate();
  const selectedProject = getSelectedProject();

  useRestoreLastProject();
  
  // Use tags from app context
  const tags = appState.tags;
  const tagsLoading = appState.isLoadingTags;
  
  const {
    folderTree,
    loading: foldersLoading,
    selectedFolderId,
    selectFolder,
    getSelectedFolder,
    updateFoldersFromTestCases
  } = useFolders(selectedProject?.id);

  const {
    filters,
    updateFilter,
    clearAllFilters: clearFilters,
    hasActiveFilters,
    buildMultipleFilters
  } = useTestCasesFilters();

  const [searchTerm, setSearchTerm] = useState('');
  const [currentSearchTerm, setCurrentSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(null);
  const [testCaseToDuplicate, setTestCaseToDuplicate] = useState<TestCase | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFiltersSidebarOpen, setIsFiltersSidebarOpen] = useState(false);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [isEditFolderModalOpen, setIsEditFolderModalOpen] = useState(false);
  const [isDeleteFolderDialogOpen, setIsDeleteFolderDialogOpen] = useState(false);
  const [folderToManage, setFolderToManage] = useState<{ id: string; name: string; parentId?: string; children?: Array<{ id: string }> } | null>(null);
  const [filtersCleared, setFiltersCleared] = useState(false);
  const [isDetailsSidebarOpen, setIsDetailsSidebarOpen] = useState(false);
  const [selectedTestCaseForDetails, setSelectedTestCaseForDetails] = useState<TestCase | null>(null);
  const [isDragDropInProgress, setIsDragDropInProgress] = useState(false);
  const [isCreateTestRunModalOpen, setIsCreateTestRunModalOpen] = useState(false);
  const [preselectedTestCaseId, setPreselectedTestCaseId] = useState<string | null>(null);
  const [gitlabLinksByTestCaseId, setGitlabLinksByTestCaseId] = useState<Record<string, string | null>>({});
  const [gitlabLinksFetched, setGitlabLinksFetched] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<ColumnVisibility>({
    id: true,
    title: true,
    folder: true,
    type: true,
    state: true,
    priority: true,
    tags: true,
    autoStatus: true,
  });

  const {
    testCases,
    allTestCases,
    loading,
    error,
    pagination,
    setCurrentFilterMode,
    isInitialLoadComplete,
    fetchAllTestCasesAndExtractFolders,
    filterTestCasesByFolder,
    showFolderTestCases,
    searchTestCases,
    // filterTestCasesByAutomation,
    // filterTestCasesByPriority,
    // filterTestCasesByType,
    // filterTestCasesByState,
    // filterTestCasesByTags,
    filterTestCasesWithMultipleFilters,
    createTestCase,
    updateTestCase,
    deleteTestCase
  } = useTestCases(selectedProject?.id, selectedFolderId, updateFoldersFromTestCases, false, tags);

  const { hasPendingNavigationFilter, isApplyingNavigationFilter } = useTestCasesNavigation(
    selectedProject,
    fetchAllTestCasesAndExtractFolders,
    updateFilter
  );

  useDragAutoScroll({
    enabled: true,
    scrollSpeed: 15,
    edgeSize: 150
  });

  const selectedFolder = getSelectedFolder();

  const handleToggleColumn = useCallback((column: keyof ColumnVisibility) => {
    setVisibleColumns(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
  }, []);

  const folderMap = useMemo(() => {
    const map: Record<string, string> = {};
    const buildMap = (folders: typeof folderTree) => {
      folders.forEach(folder => {
        map[folder.id] = folder.name;
        if (folder.children) {
          buildMap(folder.children);
        }
      });
    };
    buildMap(folderTree);
    return map;
  }, [folderTree]);

  const handleSearch = useCallback(async (term: string) => {
    setCurrentSearchTerm(term);
    if (term.trim()) {
      await searchTestCases(term, 1);
    } else {
      if (hasActiveFilters()) {
        applyFilters();
      } else {
        setCurrentFilterMode('folder');
        filterTestCasesByFolder(selectedFolderId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- applyFilters would cause infinite loop
  }, [searchTestCases, filterTestCasesByFolder, selectedFolderId, setCurrentFilterMode, hasActiveFilters]);

  const applyFilters = useCallback(async () => {
    if (!hasActiveFilters()) {
      setCurrentFilterMode('folder');
      filterTestCasesByFolder(selectedFolderId);
    } else {
      const multipleFilters = buildMultipleFilters();

      await filterTestCasesWithMultipleFilters(multipleFilters, 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filters is intentionally omitted to control when this runs
  }, [filters, hasActiveFilters, setCurrentFilterMode, showFolderTestCases, buildMultipleFilters, filterTestCasesWithMultipleFilters]);

  const clearAllFilters = useCallback(() => {
    clearFilters();
    setSearchTerm('');
    setCurrentSearchTerm('');
    setCurrentFilterMode('folder');
    setFiltersCleared(true);
    filterTestCasesByFolder(selectedFolderId);
  }, [clearFilters, setCurrentFilterMode, filterTestCasesByFolder, selectedFolderId]);

  const clearIndividualFilter = useCallback(async (filterType: keyof typeof filters, _value?: string) => {
    // Handle search clearing
    if (filterType === 'search') {
      setSearchTerm('');
      setCurrentSearchTerm('');
      // Check if we still have other active filters
      if (hasActiveFilters()) {
        applyFilters();
      } else {
        setCurrentFilterMode('folder');
        filterTestCasesByFolder(selectedFolderId);
      }
      return;
    }
    
    // Update the specific filter
    if (filterType === 'tags') {
      updateFilter('tags', []);
    } else {
      updateFilter(filterType, 'all');
    }
    
    // Wait a bit for state to update, then check if we still have active filters
    setTimeout(() => {
      // Build the updated filters manually to avoid stale closure
      const updatedFilters = {
        ...filters,
        [filterType]: filterType === 'tags' ? [] : 'all'
      };
      
      const hasRemainingFilters = updatedFilters.automationStatus !== 'all' || 
                                  updatedFilters.priority !== 'all' || 
                                  updatedFilters.type !== 'all' || 
                                  updatedFilters.state !== 'all' ||
                                  (updatedFilters.tags && updatedFilters.tags.length > 0);
      
      if (hasRemainingFilters) {
        // Still have filters, apply them
        // Re-apply all remaining filters
        applyFilters();
      } else {
        // No more filters, show folder test cases
        setCurrentFilterMode('folder');
        filterTestCasesByFolder(selectedFolderId);
      }
    }, 100); // Increase timeout to ensure state updates
    // eslint-disable-next-line react-hooks/exhaustive-deps -- applyFilters and hasActiveFilters would cause infinite loop
  }, [filters, updateFilter, buildMultipleFilters, filterTestCasesWithMultipleFilters, setCurrentFilterMode, showFolderTestCases]);

  // Track if this is the first time we're seeing the folder after initial load
  const isFirstFolderLoad = React.useRef(true);

  // Effect to handle folder changes while preserving filters
  React.useEffect(() => {
    if (selectedProject && !hasPendingNavigationFilter && isInitialLoadComplete) {
      // Skip the first run after initial load - data is already loaded
      if (isFirstFolderLoad.current) {

        isFirstFolderLoad.current = false;
        return;
      }

      const hasActiveSearch = currentSearchTerm.trim() !== '';

      if (filtersCleared) {

        setFiltersCleared(false);
        setCurrentFilterMode('folder');
        filterTestCasesByFolder(selectedFolderId);
        return;
      }

      if (hasActiveSearch) {

        searchTestCases(currentSearchTerm, 1);
      } else if (hasActiveFilters()) {

        applyFilters();
      } else {

        setCurrentFilterMode('folder');
        filterTestCasesByFolder(selectedFolderId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Complex filter dependencies intentionally omitted
  }, [selectedFolderId, isInitialLoadComplete]);

  const handleCreateFolder = useCallback(() => {
    setIsCreateFolderModalOpen(true);
  }, []);

  const handleCreateFolderSubmit = useCallback(async (data: {
    name: string;
    description: string;
    parentId?: string;
    childrenIds: string[];
  }) => {
    if (!selectedProject || !authState.user?.id) {
      toast.error('Missing required data');
      return;
    }

    try {
      setIsSubmitting(true);
      
      await foldersApiService.createFolder({
        name: data.name,
        description: data.description,
        projectId: selectedProject.id,
        parentId: data.parentId,
        childrenIds: data.childrenIds,
        userId: authState.user.id
      });

      setIsCreateFolderModalOpen(false);
      toast.success('Folder created successfully');
      await fetchAllTestCasesAndExtractFolders(selectedProject.id);
      
    } catch {
      console.error('Failed to create folder:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create folder';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- error, selectedFolderId, showFolderTestCases are stable or tracked separately
  }, [selectedProject, authState.user?.id, fetchAllTestCasesAndExtractFolders]);

  const handleEditFolder = useCallback(async (data: {
    name: string;
    description: string;
    parentId?: string;
    childrenIds: string[];
  }) => {
    if (!folderToManage || !selectedProject || !authState.user?.id) {
      toast.error('Missing required data');
      return;
    }

    try {
      setIsSubmitting(true);
      
      await foldersApiService.updateFolder(folderToManage.id, {
        name: data.name,
        description: data.description,
        projectId: selectedProject.id,
        parentId: data.parentId,
        childrenIds: data.childrenIds,
        testCaseIds: [],
        creatorId: authState.user.id,
        editorId: authState.user.id
      });

      setIsEditFolderModalOpen(false);
      setFolderToManage(null);
      toast.success('Folder updated successfully');

      // Refresh folder data
      await fetchAllTestCasesAndExtractFolders(selectedProject.id);
      
    } catch {
      console.error('Failed to update folder:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update folder';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- error, selectedFolderId, showFolderTestCases are stable or tracked separately
  }, [folderToManage, selectedProject, authState.user?.id, fetchAllTestCasesAndExtractFolders]);

  const handleDeleteFolder = useCallback(async () => {
    if (!folderToManage || !selectedProject) {
      toast.error('Missing required data');
      return;
    }

    try {
      setIsSubmitting(true);
      
      await foldersApiService.deleteFolder(folderToManage.id);

      setIsDeleteFolderDialogOpen(false);
      setFolderToManage(null);
      toast.success('Folder deleted successfully');

      // Clear folder selection if the deleted folder was selected
      if (selectedFolderId === folderToManage.id) {
        selectFolder(null);
      }

      // Refresh folder data
      await fetchAllTestCasesAndExtractFolders(selectedProject.id);

    } catch {
      console.error('Failed to delete folder:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete folder';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- error and showFolderTestCases are stable
  }, [folderToManage, selectedProject, selectedFolderId, selectFolder, fetchAllTestCasesAndExtractFolders]);

  const openEditFolderModal = useCallback((folder: { id: string; name: string; parentId?: string; children?: Array<{ id: string }> }) => {
    setFolderToManage(folder);
    setIsEditFolderModalOpen(true);
  }, []);

  const openDeleteFolderDialog = useCallback((folder: { id: string; name: string; parentId?: string; children?: Array<{ id: string }> }) => {
    setFolderToManage(folder);
    
    // Check if folder is empty (no test cases)
    if (!folder.testCasesCount || folder.testCasesCount === 0) {
      // For empty folders, delete directly without confirmation dialog
      handleDeleteEmptyFolder(folder);
    } else {
      // For folders with test cases, show confirmation dialog
      setIsDeleteFolderDialogOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleDeleteEmptyFolder is stable
  }, []);

  const handleDeleteEmptyFolder = useCallback(async (folder?: { id: string; name: string; parentId?: string; children?: Array<{ id: string }> }) => {
    const targetFolder = folder || folderToManage;
    if (!targetFolder || !selectedProject) {
      toast.error('Missing required data');
      return;
    }

    try {
      setIsSubmitting(true);
      
      await foldersApiService.deleteFolder(targetFolder.id);

      toast.success('Folder deleted successfully');

      // Clear folder selection if the deleted folder was selected
      if (selectedFolderId === targetFolder.id) {
        selectFolder(null);
      }

      // Refresh folder data
      await fetchAllTestCasesAndExtractFolders(selectedProject.id);

      // Clean up state
      setFolderToManage(null);
      
    } catch {
      console.error('Failed to delete empty folder:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete folder';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- error is stable
  }, [folderToManage, selectedProject, selectedFolderId, selectFolder, fetchAllTestCasesAndExtractFolders, showFolderTestCases]);

  const handleTestCaseTitleClick = useCallback((testCase: TestCase) => {

    setSelectedTestCaseForDetails(testCase);
    setIsDetailsSidebarOpen(true);
  }, []);

  const closeDetailsSidebar = useCallback(() => {
    setIsDetailsSidebarOpen(false);
    setSelectedTestCaseForDetails(null);
  }, []);

  const handleTestCaseDropped = useCallback(async (testCaseId: string, targetFolderId: string) => {
    if (!selectedProject) {
      toast.error('No project selected');
      return;
    }

    try {
      setIsDragDropInProgress(true);

      const testCaseToMove = testCases.find(tc => tc.id === testCaseId) ||
                            allTestCases.find(tc => tc.id === testCaseId);

      if (!testCaseToMove) {
        throw new Error('Test case not found');
      }

      const fullTestCaseResponse = await testCasesApiService.getTestCaseWithIncludes(testCaseId);
      const currentTestCaseData = fullTestCaseResponse.data;
      const included = fullTestCaseResponse.included || [];

      const updatePayload = {
        data: {
          type: "TestCase",
          attributes: {
            title: currentTestCaseData.attributes.title,
            description: currentTestCaseData.attributes.description,
            priority: currentTestCaseData.attributes.priority,
            type: currentTestCaseData.attributes.type,
            state: currentTestCaseData.attributes.state,
            automation: currentTestCaseData.attributes.automation,
            template: currentTestCaseData.attributes.template || 1,
            preconditions: currentTestCaseData.attributes.preconditions || ''
          },
          relationships: {
            folder: {
              data: { type: "Folder", id: `/api/folders/${targetFolderId}` }
            },
            project: currentTestCaseData.relationships.project,
            user: currentTestCaseData.relationships.user
          }
        }
      };

      if (currentTestCaseData.relationships.tags) {
        updatePayload.data.relationships.tags = currentTestCaseData.relationships.tags;
      }

      if (currentTestCaseData.relationships.attachments) {
        updatePayload.data.relationships.attachments = currentTestCaseData.relationships.attachments;
      }

      if (currentTestCaseData.relationships.stepResults?.data) {
        updatePayload.data.relationships.step_results = {
          data: currentTestCaseData.relationships.stepResults.data.map(step => {
            const stepResultId = step.id.split('/').pop() || step.id;
            const includedStepResult = included.find((item: { type: string; id: string; attributes?: { order?: number } }) => {
              const itemId = item.id.split('/').pop() || item.id;
              return item.type === 'StepResult' && itemId === stepResultId;
            });
            const order = includedStepResult?.attributes?.order || step.meta?.order || 0;

            return {
              type: step.type,
              id: step.id,
              meta: { order }
            };
          })
        };
      }

      if (currentTestCaseData.relationships.sharedSteps?.data) {
        updatePayload.data.relationships.shared_steps = {
          data: currentTestCaseData.relationships.sharedSteps.data.map(step => {
            const sharedStepId = step.id.split('/').pop() || step.id;
            const includedSharedStep = included.find((item: { type: string; id: string; attributes?: { order?: number } }) => {
              const itemId = item.id.split('/').pop() || item.id;
              return item.type === 'SharedStep' && itemId === sharedStepId;
            });
            const order = includedSharedStep?.attributes?.order || step.meta?.order || 0;

            return {
              type: step.type,
              id: step.id,
              meta: { order }
            };
          })
        };
      }

      await apiService.authenticatedRequest(`/test_cases/${testCaseId}`, {
        method: 'PATCH',
        body: JSON.stringify(updatePayload)
      });

      await fetchAllTestCasesAndExtractFolders(selectedProject.id);

      if (selectedFolderId) {
        setTimeout(() => {
          showFolderTestCases(selectedFolderId);
        }, 100);
      }

      toast.success(`Test case moved to folder successfully`);

    } catch (error) {
      console.error('❌ Failed to move test case:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to move test case';
      toast.error(errorMessage);
    } finally {
      setIsDragDropInProgress(false);
    }
  }, [testCases, allTestCases, selectedProject, fetchAllTestCasesAndExtractFolders, selectedFolderId, showFolderTestCases]);
  const handleSearchKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch(searchTerm);
    }
  }, [searchTerm, handleSearch]);

  const handleCreateTestCase = useCallback(async (data: Record<string, unknown>) => {
    if (!data || !selectedProject || !authState.user?.id) {
      toast.error('Missing required data');
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

      const testCasePayload: Record<string, unknown> = {
        title: data.title,
        description: data.description,
        priority: data.priority,
        testCaseType: data.testCaseType,
        state: data.state,
        automationStatus: data.automationStatus,
        template: data.template,
        preconditions: data.preconditions,
        tags: processedTags,
        projectId: selectedProject.id,
        creatorId: authState.user.id,
        testSteps: data.testSteps || [],
        stepResultsRelationships: data.stepResultsRelationships || [],
        sharedStepsRelationships: data.sharedStepsRelationships || [],
        createdAttachments: data.createdAttachments || []
      };

      // Only add folderId if a folder is selected
      if (selectedFolderId) {
        testCasePayload.folderId = selectedFolderId;
      }

      await createTestCase(testCasePayload);
      
      await fetchAllTestCasesAndExtractFolders(selectedProject.id);
      setIsCreateModalOpen(false);
      toast.success('Test case created successfully');
      
      // Re-apply folder filter to show only test cases from the selected folder
      if (selectedFolderId) {

        // Small delay to ensure test case creation and folder data refresh completes
        setTimeout(() => {
          showFolderTestCases(selectedFolderId);
        }, 100);
      }
      
    } catch {
      console.error('Failed to create test case:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create test case';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- createTag, error, showFolderTestCases are stable
  }, [createTestCase, selectedProject, selectedFolderId, authState.user?.id, fetchAllTestCasesAndExtractFolders]);

  const handleEditTestCase = useCallback(async (data: Record<string, unknown>) => {
    if (!selectedTestCase || !selectedProject || !authState.user?.id) {
      toast.error('Missing required data for update');
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
          const actualTag = tags.find(t => t.label === tag.label);
          if (actualTag) {
            processedTags.push(actualTag);
          } else {
            const tagById = tags.find(t => t.id === tag.id);
            if (tagById) {
              processedTags.push(tagById);
            } else {
              try {
                const newTag = await createTag(tag.label);
                processedTags.push(newTag);
              } catch {
                console.error('Failed to create tag:', error);
                toast.error(`Failed to create tag: ${tag.label}`);
                return;
              }
            }
          }
        }
      }
      
      const updateData = {
        title: data.title || '',
        description: data.description || '',
        priority: data.priority === 1 ? 'medium' : data.priority === 2 ? 'critical' : data.priority === 3 ? 'high' : data.priority === 4 ? 'low' : 'medium',
        testType: getTestTypeString(data.testCaseType),
        status: data.state === 1 ? 'active' :
                data.state === 2 ? 'draft' :
                data.state === 3 ? 'in_review' :
                data.state === 4 ? 'outdated' :
                data.state === 5 ? 'rejected' : 'draft',
        automationStatus: data.automationStatus || 1,
        template: data.template || 1,
        preconditions: data.preconditions || '',
        tags: processedTags,
        testSteps: data.testSteps || [],
        userId: authState.user.id,
        projectId: selectedProject.id,
        folderId: selectedTestCase.folderId || selectedFolderId,
        ownerId: data.owner || selectedTestCase.ownerId || authState.user.id,
        stepResultsRelationships: data.stepResultsRelationships || [],
        sharedStepsRelationships: data.sharedStepsRelationships || [],
        createdAttachments: data.createdAttachments || []
      };
      
      await updateTestCase(selectedTestCase.id, updateData);
      
      testCaseDataCache.invalidate(selectedTestCase.id);
      setIsEditModalOpen(false);
      setSelectedTestCase(null);
      toast.success('Test case updated successfully');
      await fetchAllTestCasesAndExtractFolders(selectedProject.id);
      
      // Re-apply folder filter to maintain folder context after update
      if (selectedFolderId) {

        // Small delay to ensure folder data refresh completes
        setTimeout(() => {
          showFolderTestCases(selectedFolderId);
        }, 100);
      }
      
    } catch {
      console.error('Failed to update test case:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update test case';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- error, selectedFolderId, showFolderTestCases are stable
  }, [updateTestCase, selectedTestCase, selectedProject, authState.user?.id, fetchAllTestCasesAndExtractFolders, createTag, tags, getTestTypeString]);

  const handleDeleteTestCase = useCallback(async () => {
    if (!selectedTestCase) return;
    
    try {
      setIsSubmitting(true);
      await deleteTestCase(selectedTestCase.id);
      
      if (selectedProject) {
        await fetchAllTestCasesAndExtractFolders(selectedProject.id);
      }
      
      // Re-apply folder filter to maintain folder context after deletion
      if (selectedFolderId) {

        // Small delay to ensure folder data refresh completes
        setTimeout(() => {
          showFolderTestCases(selectedFolderId);
        }, 100);
      }
      
      setSelectedTestCase(null);
    } catch {
      // Error is already handled in the hook
    } finally {
      setIsSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selectedFolderId, showFolderTestCases are stable
  }, [deleteTestCase, selectedTestCase, selectedProject, fetchAllTestCasesAndExtractFolders]);

  const handleDuplicateTestCase = useCallback((testCase: TestCase) => {
    setTestCaseToDuplicate(testCase);
    setIsDuplicateModalOpen(true);
  }, []);

  const handleDuplicateSubmit = useCallback(async (testCase: TestCase, targetProjectId: string, targetFolderId: string, title: string) => {
    try {
      await testCasesApiService.cloneTestCase(testCase.id, targetProjectId, targetFolderId, title);

      if (targetProjectId === selectedProject?.id) {
        await fetchAllTestCasesAndExtractFolders(selectedProject.id);

        if (selectedFolderId) {
          setTimeout(() => {
            showFolderTestCases(selectedFolderId);
          }, 100);
        }
        toast.success(`Test case cloned successfully`);
      } else {
        const targetProject = appState.projects.find(p => p.id === targetProjectId);
        const projectName = targetProject?.name || 'another project';
        toast.success(`Test case cloned successfully to ${projectName}`);
      }

    } catch (error) {
      console.error('Failed to clone test case:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to clone test case';
      toast.error(`Failed to clone test case: ${errorMessage}`);
      throw error;
    }
  }, [selectedProject, fetchAllTestCasesAndExtractFolders, selectedFolderId, showFolderTestCases, appState.projects]);
  const openEditModal = useCallback((testCase: TestCase) => {
    testCaseDataCache.prefetch(testCase.id, tags);
    setSelectedTestCase(testCase);
    setIsEditModalOpen(true);
  }, [tags]);

  const handlePrefetchTestCase = useCallback((testCase: TestCase) => {
    testCaseDataCache.prefetch(testCase.id, tags);
  }, [tags]);

  const openDeleteDialog = useCallback((testCase: TestCase) => {
    setSelectedTestCase(testCase);
    setIsDeleteDialogOpen(true);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    if (currentSearchTerm.trim()) {
      searchTestCases(currentSearchTerm, page);
    } else if (hasActiveFilters()) {
      const multipleFilters = buildMultipleFilters();
      filterTestCasesWithMultipleFilters(multipleFilters, page);
    } else {

      showFolderTestCases(undefined, page);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filters is intentionally omitted to control when this runs
  }, [filters, currentSearchTerm, searchTestCases, showFolderTestCases, hasActiveFilters, buildMultipleFilters, filterTestCasesWithMultipleFilters]);

  const handleCreateTag = useCallback(async (label: string): Promise<Tag> => {
    return await createTag(label);
  }, [createTag]);

  const handleRunTest = useCallback((testCase: TestCase) => {
    setPreselectedTestCaseId(testCase.id);
    setIsCreateTestRunModalOpen(true);
  }, []);

  const handleCreateTestRun = useCallback(async (data: {
    name: string;
    description: string;
    testCaseIds: string[];
    configurations: string[];
    testPlanId: string;
    assignedTo: string;
    state: string;
  }) => {
    if (!selectedProject || !authState.user?.id) {
      toast.error('Missing required data');
      return;
    }

    try {
      setIsSubmitting(true);

      const testRunData = {
        name: data.name,
        description: data.description,
        projectId: selectedProject.id,
        testCaseIds: preselectedTestCaseId ? [preselectedTestCaseId, ...data.testCaseIds] : data.testCaseIds,
        configurations: data.configurations,
        testPlanId: data.testPlanId || undefined,
        assignedTo: data.assignedTo,
        state: data.state,
        creatorId: authState.user.id
      };

      const response = await testRunsApiService.createTestRun(testRunData);

      const testRunId = response.data.attributes.id.toString();

      setIsCreateTestRunModalOpen(false);
      setPreselectedTestCaseId(null);
      toast.success('Test run created successfully');

      navigate(`/test-runs/${testRunId}`);
    } catch (error) {
      console.error('Failed to create test run:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create test run';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedProject, authState.user?.id, preselectedTestCaseId, navigate]);

  if (loading && testCases.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-gray-400">Loading test cases...</p>
        </div>
      </div>
    );
  }

  if (error && testCases.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Card className="p-8 text-center">
          <div className="text-red-400 mb-4">
            <p className="text-lg font-medium">Failed to load test cases</p>
            <p className="text-sm text-slate-600 dark:text-gray-400 mt-2">{error}</p>
          </div>
          <Button onClick={() => fetchAllTestCasesAndExtractFolders(selectedProject?.id || '')}>
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TestCasesHeader
        selectedProject={selectedProject}
        totalItems={pagination.totalItems}
        selectedFolder={selectedFolder}
        onCreateTestCase={() => setIsCreateModalOpen(true)}
        disabled={!selectedProject}
      />

      {/* Show message if no project selected */}
      {!selectedProject && (
        <Card className="p-8 text-center">
          <div className="text-slate-600 dark:text-gray-400 mb-4">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No project selected</p>
            <p className="text-sm">Please select a project from the sidebar to view and manage test cases.</p>
          </div>
        </Card>
      )}

      {/* Only show content if project is selected */}
      {selectedProject && (
        <div className="flex gap-4">
          <TestCasesFolderSidebar
            folderTree={folderTree}
            selectedFolderId={selectedFolderId}
            onSelectFolder={selectFolder}
            foldersLoading={foldersLoading}
            onCreateFolder={handleCreateFolder}
            onEditFolder={openEditFolderModal}
            onDeleteFolder={openDeleteFolderDialog}
            onTestCaseDropped={handleTestCaseDropped}
            onClearIndividualFilter={clearIndividualFilter}
          />

          {/* Main Content */}
          <div className="flex-1 space-y-4">
            <TestCasesFilters
              searchTerm={searchTerm}
              onSearchTermChange={setSearchTerm}
              onSearchKeyPress={handleSearchKeyPress}
              currentSearchTerm={currentSearchTerm}
              filters={filters}
              onFilterChange={updateFilter}
              onApplyFilters={applyFilters}
              onClearAllFilters={clearAllFilters}
              onClearIndividualFilter={clearIndividualFilter}
              onOpenFiltersSidebar={() => setIsFiltersSidebarOpen(true)}
              availableTags={tags}
              onCreateTag={handleCreateTag}
              visibleColumns={visibleColumns}
              onToggleColumn={handleToggleColumn}
            />

            <TestCasesTable
              testCases={testCases}
              loading={loading}
              isApplyingNavigationFilter={isApplyingNavigationFilter}
              currentSearchTerm={currentSearchTerm}
              selectedFolder={selectedFolder}
              pagination={pagination}
              onTestCaseTitleClick={handleTestCaseTitleClick}
              onEditTestCase={openEditModal}
              onPrefetchTestCase={handlePrefetchTestCase}
              onDeleteTestCase={openDeleteDialog}
              onDuplicateTestCase={handleDuplicateTestCase}
              onRunTest={handleRunTest}
              onPageChange={handlePageChange}
              isSubmitting={isSubmitting || isDragDropInProgress}
              gitlabLinksByTestCaseId={gitlabLinksByTestCaseId}
              gitlabLinksFetched={gitlabLinksFetched}
              visibleColumns={visibleColumns}
              folderMap={folderMap}
            />
          </div>
        </div>
      )}

      <TestCasesFiltersSidebar
        isOpen={isFiltersSidebarOpen}
        onClose={() => setIsFiltersSidebarOpen(false)}
        filters={filters}
        onFilterChange={updateFilter}
        onApplyFilters={applyFilters}
        onClearAllFilters={clearAllFilters}
        availableTags={tags}
        onCreateTag={handleCreateTag}
      />

      {/* Modals */}
      <CreateTestCaseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateTestCase}
        isSubmitting={isSubmitting}
        availableTags={tags}
        onCreateTag={handleCreateTag}
        tagsLoading={tagsLoading}
        selectedProject={selectedProject}
      />

      <UpdateTestCaseModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleEditTestCase}
        testCase={selectedTestCase}
        isSubmitting={isSubmitting}
        availableTags={tags}
        onCreateTag={handleCreateTag}
        tagsLoading={tagsLoading}
        selectedProject={selectedProject}
      />

      <DuplicateTestCaseModal
        isOpen={isDuplicateModalOpen}
        onClose={() => {
          setIsDuplicateModalOpen(false);
          setTestCaseToDuplicate(null);
        }}
        onDuplicate={handleDuplicateSubmit}
        testCase={testCaseToDuplicate}
        projects={appState.projects}
        currentProjectId={selectedProject?.id || ''}
      />

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteTestCase}
        title="Delete Test Case"
        message={`Are you sure you want to delete the test case "${selectedTestCase?.title}"? This action is irreversible.`}
        confirmText="Delete"
        variant="danger"
      />

      <CreateFolderModal
        isOpen={isCreateFolderModalOpen}
        onClose={() => setIsCreateFolderModalOpen(false)}
        onSubmit={handleCreateFolderSubmit}
        isSubmitting={isSubmitting}
        availableFolders={folderTree}
      />

      <EditFolderModal
        isOpen={isEditFolderModalOpen}
        onClose={() => {
          setIsEditFolderModalOpen(false);
          setFolderToManage(null);
        }}
        onSubmit={handleEditFolder}
        isSubmitting={isSubmitting}
        folder={folderToManage}
        availableFolders={folderTree}
      />

      <ConfirmDialog
        isOpen={isDeleteFolderDialogOpen}
        onClose={() => {
          setIsDeleteFolderDialogOpen(false);
          setFolderToManage(null);
        }}
        onConfirm={handleDeleteFolder}
        title="Delete Folder"
        message={`Are you sure you want to delete the folder "${folderToManage?.name}"? Test cases in this folder will not be deleted and will remain in the project.`}
        confirmText="Delete"
        variant="danger"
      />

      <TestCaseDetailsSidebar
        isOpen={isDetailsSidebarOpen}
        onClose={closeDetailsSidebar}
        testCase={selectedTestCaseForDetails}
        context="test-cases"
        availableTags={tags}
        onRunTest={handleRunTest}
      />

      <CreateTestRunModal
        isOpen={isCreateTestRunModalOpen}
        onClose={() => {
          setIsCreateTestRunModalOpen(false);
          setPreselectedTestCaseId(null);
        }}
        onSubmit={handleCreateTestRun}
        isSubmitting={isSubmitting}
        preselectedTestCaseId={preselectedTestCaseId}
      />
    </div>
  );
};

export default TestCases;