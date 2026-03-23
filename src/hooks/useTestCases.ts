import { useState, useEffect, useRef, useCallback } from 'react';
import { testCasesApiService, TestCasesApiResponse } from '../services/testCasesApi';
import { Tag } from '../services/tagsApi';
import { sharedStepsApiService } from '../services/sharedStepsApi';
import { foldersApiService } from '../services/foldersApi';
import { TestCase } from '../types';
import toast from 'react-hot-toast';

export const useTestCases = (projectId?: string | null, folderId?: string | null, onFoldersExtracted?: (folders: Array<Record<string, unknown>>) => void, skipInitialLoad?: boolean, availableTags: Tag[] = []) => {
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [allTestCases, setAllTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFilterMode, setCurrentFilterMode] = useState<'folder' | 'search' | 'automation' | 'all'>('all');
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalItems: 0,
    itemsPerPage: 30,
    totalPages: 1
  });

  // Utiliser des refs pour tracker les changements sans déclencher de re-rendus
  const previousProjectId = useRef<string | null>(null);
  const previousFolderId = useRef<string | null>(null);
  const hasInitialLoad = useRef<boolean>(false);
  const availableTagsRef = useRef<Tag[]>(availableTags || []);

  useEffect(() => {
    availableTagsRef.current = availableTags || [];
  }, [availableTags]);

  // Initial load - fetch all test cases for project and extract folders
  const fetchAllTestCasesAndExtractFolders = useCallback(async (targetProjectId?: string, initialFilters?: Record<string, unknown>) => {
    const useProjectId = targetProjectId || projectId;
    
    if (!useProjectId) {

      setTestCases([]);
      setAllTestCases([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      if (initialFilters) {
        // Initial filters provided
      } else {
        // No initial filters
      }
      
      let response: TestCasesApiResponse;
      
      if (initialFilters) {
        // Fetch test cases and folders in parallel
        const [filteredResponse, firstPageResponse, foldersResponse] = await Promise.all([
          testCasesApiService.filterTestCasesWithMultipleFilters(
            initialFilters,
            1,
            30,
            useProjectId
          ),
          testCasesApiService.getTestCases(1, 30, useProjectId),
          foldersApiService.getFolders(useProjectId)
        ]);

        response = filteredResponse;

        let allTestCasesData: Array<Record<string, unknown>> = [];
        let totalPages = 1;
        
        totalPages = Math.ceil(firstPageResponse.meta.totalItems / firstPageResponse.meta.itemsPerPage);

        // Add first page data
        allTestCasesData = [...firstPageResponse.data];
        
        // Fetch remaining pages if any
        for (let page = 2; page <= totalPages; page++) {

          const pageResponse = await testCasesApiService.getTestCases(
            page, 
            30,
            useProjectId
          );
          
          allTestCasesData = [...allTestCasesData, ...pageResponse.data];
        }

        // Use all test cases for folder extraction only
        const allTransformedTestCases = allTestCasesData.map(apiTestCase =>
          testCasesApiService.transformApiTestCase(apiTestCase, firstPageResponse.included, availableTagsRef.current)
        );
        setAllTestCases(allTransformedTestCases);

        // Counts must reflect every fetched test case — not only folders present in page 1 `included`
        const folderCountMap = new Map<string, number>();
        allTransformedTestCases.forEach(testCase => {
          if (testCase.folderId) {
            folderCountMap.set(testCase.folderId, (folderCountMap.get(testCase.folderId) || 0) + 1);
          }
        });

        // Build complete folder list from folders API
        const allFolders: Array<Record<string, unknown>> = [];
        for (const apiFolder of foldersResponse.data) {
          const folderProjectId = apiFolder.relationships.project.data.id.split('/').pop();
          if (folderProjectId !== useProjectId) {
            continue;
          }

          const folderId = apiFolder.attributes.id.toString();
          const parentId = apiFolder.relationships.parent?.data?.id?.split('/').pop();

          allFolders.push({
            id: folderId,
            name: apiFolder.attributes.name,
            parentFolderId: parentId || null,
            projectId: useProjectId,
            testCasesCount: folderCountMap.get(folderId) || 0
          });
        }

        if (onFoldersExtracted) {
          onFoldersExtracted(allFolders);
        }

        // Transform and set the filtered test cases for display
        const filteredTestCases = filteredResponse.data.map(apiTestCase =>
          testCasesApiService.transformApiTestCase(apiTestCase, filteredResponse.included, availableTagsRef.current)
        );
        setTestCases(filteredTestCases);

        // Set pagination based on filtered results
        setPagination({
          currentPage: filteredResponse.meta.currentPage,
          totalItems: filteredResponse.meta.totalItems,
          itemsPerPage: filteredResponse.meta.itemsPerPage,
          totalPages: filteredResponse.meta.totalPages
        });

      } else {
        // Normal load - fetch test cases and folders in parallel
        const [firstPageResponse, foldersResponse] = await Promise.all([
          testCasesApiService.getTestCases(1, 30, useProjectId),
          foldersApiService.getFolders(useProjectId)
        ]);

        response = firstPageResponse;

        // Fetch all pages for complete data
        let allTestCasesData: Array<Record<string, unknown>> = [];
        const totalPages = Math.ceil(response.meta.totalItems / response.meta.itemsPerPage);

        if (totalPages > 1) {

          // Add first page data
          allTestCasesData = [...response.data];

          // Fetch remaining pages
          for (let page = 2; page <= totalPages; page++) {

            const pageResponse = await testCasesApiService.getTestCases(
              page,
              30,
              useProjectId
            );

            allTestCasesData = [...allTestCasesData, ...pageResponse.data];
          }

        } else {
          allTestCasesData = response.data;
        }

        // Set all test cases
        const allTransformedTestCases = allTestCasesData.map(apiTestCase =>
          testCasesApiService.transformApiTestCase(apiTestCase, response.included, availableTagsRef.current)
        );
        setAllTestCases(allTransformedTestCases);

        // Count test cases per folder (all pages — do not rely on `included` Folder entries from page 1 only)
        const folderCountMap = new Map<string, number>();
        allTransformedTestCases.forEach(testCase => {
          if (testCase.folderId) {
            folderCountMap.set(testCase.folderId, (folderCountMap.get(testCase.folderId) || 0) + 1);
          }
        });

        // Build complete folder list from folders API
        const allFolders: Array<Record<string, unknown>> = [];
        for (const apiFolder of foldersResponse.data) {
          const folderProjectId = apiFolder.relationships.project.data.id.split('/').pop();
          if (folderProjectId !== useProjectId) {
            continue;
          }

          const folderId = apiFolder.attributes.id.toString();
          const parentId = apiFolder.relationships.parent?.data?.id?.split('/').pop();

          allFolders.push({
            id: folderId,
            name: apiFolder.attributes.name,
            parentFolderId: parentId || null,
            projectId: useProjectId,
            testCasesCount: folderCountMap.get(folderId) || 0
          });
        }

        if (onFoldersExtracted) {
          onFoldersExtracted(allFolders);
        }

        // For display: apply folder filter client-side if folderId is set
        let displayTestCases = allTransformedTestCases;
        if (folderId) {

          displayTestCases = allTransformedTestCases.filter(tc => tc.folderId === folderId);
        }

        // Set the display test cases
        setTestCases(displayTestCases);

        // Set pagination based on filtered results
        setPagination({
          currentPage: 1,
          totalItems: displayTestCases.length,
          itemsPerPage: 30,
          totalPages: Math.ceil(displayTestCases.length / 30)
        });
      }

      if (initialFilters) {
        // Set the current filter mode to indicate we have filters applied
        setCurrentFilterMode('multiple');
      } else if (folderId) {
        setCurrentFilterMode('folder');
      } else {
        setCurrentFilterMode('all');
      }

      hasInitialLoad.current = true;
      setIsInitialLoadComplete(true);
      
    } catch (err) {
      console.error('❌ Full error details:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch test cases';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('❌ Error fetching test cases:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, folderId, onFoldersExtracted]);

  // Function to filter test cases by folder (client-side)
  const filterTestCasesByFolder = useCallback((targetFolderId?: string | null) => {
    const useFolderId = targetFolderId !== undefined ? targetFolderId : folderId;
    
    setCurrentFilterMode('folder');
    
    if (!useFolderId) {
      // Show all test cases
      setTestCases(allTestCases);
      setPagination({
        currentPage: 1,
        totalItems: allTestCases.length,
        itemsPerPage: 30,
        totalPages: Math.ceil(allTestCases.length / 30)
      });
    } else {
      // Filter by folder
      const filtered = allTestCases.filter(tc => tc.folderId === useFolderId);
      setTestCases(filtered);
      setPagination({
        currentPage: 1,
        totalItems: filtered.length,
        itemsPerPage: 30,
        totalPages: Math.ceil(filtered.length / 30)
      });
    }
  }, [allTestCases, folderId]);

  // Function to show folder-filtered test cases with server-side pagination
  const showFolderTestCases = useCallback(async (targetFolderId?: string | null, page: number = 1) => {
    const useFolderId = targetFolderId !== undefined ? targetFolderId : folderId;

    if (!projectId) {
      setTestCases([]);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Make API call with pagination
      const response = await testCasesApiService.getTestCases(
        page, 
        30, 
        projectId,
        useFolderId || undefined
      );
      
      const transformedTestCases = response.data.map(apiTestCase => 
        testCasesApiService.transformApiTestCase(apiTestCase, response.included, availableTagsRef.current)
      );
      
      setTestCases(transformedTestCases);
      setPagination({
        currentPage: response.meta.currentPage,
        totalItems: response.meta.totalItems,
        itemsPerPage: response.meta.itemsPerPage,
        totalPages: Math.ceil(response.meta.totalItems / response.meta.itemsPerPage)
      });
      
      setCurrentFilterMode('folder');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch test cases';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('❌ Error fetching test cases:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, folderId]);

  const searchTestCases = useCallback(async (searchTerm: string, page: number = 1, _globalSearch: boolean = false) => {
    if (!projectId) {
      setTestCases([]);
      return;
    }

    setCurrentFilterMode('search');

    try {
      setLoading(true);
      setError(null);
      
      let response: TestCasesApiResponse = await testCasesApiService.searchTestCases(
        searchTerm, 
        page, 
        30, 
        projectId,
        undefined // Always omit folderId for search to search across all folders
      );
      
      if (!response) {
        response = testCasesApiService.getDefaultTestCasesResponse();
      }
      
      const responseData = response?.data || [];
      const responseMeta = response?.meta || {
        currentPage: 1,
        totalItems: 0,
        itemsPerPage: 30
      };
      
      const transformedTestCases = responseData.map(apiTestCase => 
        testCasesApiService.transformApiTestCase(apiTestCase, response.included, availableTagsRef.current)
      );
      
      setTestCases(transformedTestCases);
      setPagination({
        currentPage: responseMeta.currentPage,
        totalItems: responseMeta.totalItems,
        itemsPerPage: responseMeta.itemsPerPage,
        totalPages: Math.ceil(responseMeta.totalItems / responseMeta.itemsPerPage)
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search test cases';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('❌ Error searching test cases:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]); // Remove folderId dependency

  const filterTestCasesByAutomation = useCallback(async (automationStatus: 1 | 2 | 3 | 4 | 5, page: number = 1) => {
    if (!projectId) {
      setTestCases([]);
      return;
    }

    setCurrentFilterMode('automation');

    try {
      setLoading(true);
      setError(null);
      
      let response: TestCasesApiResponse = await testCasesApiService.filterTestCasesByAutomation(
        automationStatus,
        page, 
        30, 
        projectId,
        folderId
      );
      
      if (!response) {
        response = testCasesApiService.getDefaultTestCasesResponse();
      }
      
      const responseData = response?.data || [];
      const responseMeta = response?.meta || {
        currentPage: 1,
        totalItems: 0,
        itemsPerPage: 30
      };
      
      const transformedTestCases = responseData.map(apiTestCase => 
        testCasesApiService.transformApiTestCase(apiTestCase, response.included, availableTagsRef.current)
      );
      
      setTestCases(transformedTestCases);
      setPagination({
        currentPage: responseMeta.currentPage,
        totalItems: responseMeta.totalItems,
        itemsPerPage: responseMeta.itemsPerPage,
        totalPages: Math.ceil(responseMeta.totalItems / responseMeta.itemsPerPage)
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to filter test cases';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('❌ Error filtering test cases:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, folderId]);

  const filterTestCasesByTags = useCallback(async (tagIds: string[], page: number = 1) => {
    if (!projectId) {
      setTestCases([]);
      return;
    }

    setCurrentFilterMode('tags');

    try {
      setLoading(true);
      setError(null);
      
      let response: TestCasesApiResponse = await testCasesApiService.filterTestCasesByTags(
        tagIds,
        page, 
        30, 
        projectId,
        folderId
      );
      
      if (!response) {
        response = testCasesApiService.getDefaultTestCasesResponse();
      }
      
      const responseData = response?.data || [];
      const responseMeta = response?.meta || {
        currentPage: 1,
        totalItems: 0,
        itemsPerPage: 30
      };
      
      const transformedTestCases = responseData.map(apiTestCase => 
        testCasesApiService.transformApiTestCase(apiTestCase, response.included, availableTagsRef.current)
      );
      
      setTestCases(transformedTestCases);
      setPagination({
        currentPage: responseMeta.currentPage,
        totalItems: responseMeta.totalItems,
        itemsPerPage: responseMeta.itemsPerPage,
        totalPages: Math.ceil(responseMeta.totalItems / responseMeta.itemsPerPage)
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to filter test cases by tags';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('❌ Error filtering test cases by tags:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, folderId]);

  const filterTestCasesByState = useCallback(async (state: 'draft' | 'active' | 'deprecated', page: number = 1) => {
    if (!projectId) {
      setTestCases([]);
      return;
    }

    setCurrentFilterMode('state');

    try {
      setLoading(true);
      setError(null);
      
      let response: TestCasesApiResponse = await testCasesApiService.filterTestCasesByState(
        state,
        page, 
        30, 
        projectId,
        folderId
      );
      
      if (!response) {
        response = testCasesApiService.getDefaultTestCasesResponse();
      }
      
      const responseData = response?.data || [];
      const responseMeta = response?.meta || {
        currentPage: 1,
        totalItems: 0,
        itemsPerPage: 30
      };
      
      const transformedTestCases = responseData.map(apiTestCase => 
        testCasesApiService.transformApiTestCase(apiTestCase, response.included, availableTagsRef.current)
      );
      
      setTestCases(transformedTestCases);
      setPagination({
        currentPage: responseMeta.currentPage,
        totalItems: responseMeta.totalItems,
        itemsPerPage: responseMeta.itemsPerPage,
        totalPages: Math.ceil(responseMeta.totalItems / responseMeta.itemsPerPage)
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to filter test cases by state';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('❌ Error filtering test cases by state:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, folderId]);

  const filterTestCasesByPriority = useCallback(async (priority: number, page: number = 1) => {
    if (!projectId) {
      setTestCases([]);
      return;
    }

    setCurrentFilterMode('priority');

    try {
      setLoading(true);
      setError(null);
      
      let response: TestCasesApiResponse = await testCasesApiService.filterTestCasesByPriority(
        priority,
        page, 
        30, 
        projectId,
        folderId
      );
      
      if (!response) {
        response = testCasesApiService.getDefaultTestCasesResponse();
      }
      
      const responseData = response?.data || [];
      const responseMeta = response?.meta || {
        currentPage: 1,
        totalItems: 0,
        itemsPerPage: 30
      };
      
      const transformedTestCases = responseData.map(apiTestCase => 
        testCasesApiService.transformApiTestCase(apiTestCase, response.included, availableTagsRef.current)
      );
      
      setTestCases(transformedTestCases);
      setPagination({
        currentPage: responseMeta.currentPage,
        totalItems: responseMeta.totalItems,
        itemsPerPage: responseMeta.itemsPerPage,
        totalPages: Math.ceil(responseMeta.totalItems / responseMeta.itemsPerPage)
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to filter test cases by priority';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('❌ Error filtering test cases by priority:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, folderId]);

  const filterTestCasesByType = useCallback(async (type: number, page: number = 1) => {
    if (!projectId) {
      setTestCases([]);
      return;
    }

    setCurrentFilterMode('type');

    try {
      setLoading(true);
      setError(null);
      
      let response: TestCasesApiResponse = await testCasesApiService.filterTestCasesByType(
        type,
        page, 
        30, 
        projectId,
        folderId
      );
      
      if (!response) {
        response = testCasesApiService.getDefaultTestCasesResponse();
      }
      
      const responseData = response?.data || [];
      const responseMeta = response?.meta || {
        currentPage: 1,
        totalItems: 0,
        itemsPerPage: 30
      };
      
      const transformedTestCases = responseData.map(apiTestCase => 
        testCasesApiService.transformApiTestCase(apiTestCase, response.included, availableTagsRef.current)
      );
      
      setTestCases(transformedTestCases);
      setPagination({
        currentPage: responseMeta.currentPage,
        totalItems: responseMeta.totalItems,
        itemsPerPage: responseMeta.itemsPerPage,
        totalPages: Math.ceil(responseMeta.totalItems / responseMeta.itemsPerPage)
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to filter test cases by type';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('❌ Error filtering test cases by type:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, folderId]);

  const filterTestCasesWithMultipleFilters = useCallback(async (filters: {
    automationStatus?: 1 | 2 | 3 | 4 | 5;
    priority?: number;
    type?: number;
    state?: number;
    tagIds?: string[];
  }, page: number = 1) => {
    if (!projectId) {
      setTestCases([]);
      return;
    }

    setCurrentFilterMode('multiple');

    try {
      setLoading(true);
      setError(null);
      
      let response: TestCasesApiResponse = await testCasesApiService.filterTestCasesWithMultipleFilters(
        filters,
        page, 
        30, 
        projectId,
        folderId
      );
      
      if (!response) {
        response = testCasesApiService.getDefaultTestCasesResponse();
      }
      
      const responseData = response?.data || [];
      const responseMeta = response?.meta || {
        currentPage: 1,
        totalItems: 0,
        itemsPerPage: 30
      };
      
      const transformedTestCases = responseData.map(apiTestCase => 
        testCasesApiService.transformApiTestCase(apiTestCase, response.included, availableTagsRef.current)
      );
      
      setTestCases(transformedTestCases);
      setPagination({
        currentPage: responseMeta.currentPage,
        totalItems: responseMeta.totalItems,
        itemsPerPage: responseMeta.itemsPerPage,
        totalPages: Math.ceil(responseMeta.totalItems / responseMeta.itemsPerPage)
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to filter test cases';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('❌ Error filtering test cases with multiple filters:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, folderId]);

  const createTestCase = useCallback(async (testCaseData: {
    title: string;
    description: string;
    priority: number;
    testCaseType: number;
    state: number;
    automationStatus: 1 | 2 | 3 | 4 | 5;
    template: number;
    preconditions: string;
    tags: Tag[];
    projectId?: string;
    folderId?: string;
    creatorId?: string;
    originalRelationships?: Record<string, unknown>;
    createdAttachments?: Array<{
      type: "Attachment";
      id: string;
    }>;
    testSteps?: Array<{
      id: string;
      step: string;
      result: string;
      originalId?: string;
    }>;
    stepResultsRelationships?: Array<{
      type: string;
      id: string;
      meta: {
        order: number;
      };
    }>;
    sharedStepsRelationships?: Array<{
      type: string;
      id: string;
      meta: {
        order: number;
      };
    }>;
  }) => {
    try {
      setLoading(true);

      // Handle duplication with original relationships
      if (testCaseData.originalRelationships) {

        const targetProjectId = testCaseData.projectId || projectId!;
        const targetFolderId = testCaseData.folderId || folderId || undefined;
        const originalProjectId = testCaseData.originalRelationships.project?.data?.id?.split('/').pop();
        const isDifferentProject = targetProjectId !== originalProjectId;

        // Combine step results and shared steps, then sort by order
        const allItems: Array<{
          type: 'stepResult' | 'sharedStep';
          ref: { id: string; meta?: { order: number } };
          originalOrder: number;
        }> = [];

        // Add step results to the list
        if (testCaseData.originalRelationships.stepResults?.data) {
          testCaseData.originalRelationships.stepResults.data.forEach((sr: { id: string; meta?: { order: number } }) => {
            allItems.push({
              type: 'stepResult',
              ref: sr,
              originalOrder: sr.meta?.order || 0
            });
          });
        }

        // Add shared steps to the list
        if (testCaseData.originalRelationships.sharedSteps?.data) {
          testCaseData.originalRelationships.sharedSteps.data.forEach((ss: { id: string; meta?: { order: number } }) => {
            allItems.push({
              type: 'sharedStep',
              ref: ss,
              originalOrder: ss.meta?.order || 0
            });
          });
        }

        // Sort all items by their original order
        allItems.sort((a, b) => a.originalOrder - b.originalOrder);

        // Process each item in order
        const stepResults: Array<{
          id: string;
          order: number;
        }> = [];

        const sharedStepsForApi: Array<{
          id: string;
          order: number;
        }> = [];

        for (let i = 0; i < allItems.length; i++) {
          const item = allItems[i];
          const newOrder = i + 1;

          if (item.type === 'stepResult') {
            try {
              const stepResultId = item.ref.id.split('/').pop();
              const originalStepResult = await testCasesApiService.getStepResult(stepResultId);

              const stepResultResponse = await testCasesApiService.createStepResult({
                step: originalStepResult.data.attributes.step,
                result: originalStepResult.data.attributes.result,
                userId: testCaseData.creatorId
              });

              stepResults.push({
                id: stepResultResponse.data.attributes.id.toString(),
                order: newOrder
              });

            } catch (stepError) {
              console.error('Failed to create step result:', stepError);
            }
          } else if (item.type === 'sharedStep') {
            if (isDifferentProject) {
              try {
                const sharedStepId = item.ref.id.split('/').pop();
                const originalSharedStep = await sharedStepsApiService.getSharedStep(sharedStepId);

                const originalStepResults = originalSharedStep.data.relationships?.stepResults?.data || [];
                const sortedOriginalStepResults = [...originalStepResults].sort(
                  (a: { meta?: { order: number } }, b: { meta?: { order: number } }) => (a.meta?.order || 0) - (b.meta?.order || 0)
                );
                const newSharedStepResults: Array<{ id: string; order: number }> = [];

                for (let j = 0; j < sortedOriginalStepResults.length; j++) {
                  const stepResultRef = sortedOriginalStepResults[j];
                  const stepResultOrder = j + 1;

                  try {
                    const stepResultId = stepResultRef.id.split('/').pop();
                    const originalStepResult = await testCasesApiService.getStepResult(stepResultId);

                    const newStepResult = await testCasesApiService.createStepResult({
                      step: originalStepResult.data.attributes.step,
                      result: originalStepResult.data.attributes.result,
                      userId: testCaseData.creatorId
                    });

                    newSharedStepResults.push({
                      id: newStepResult.data.attributes.id.toString(),
                      order: stepResultOrder
                    });
                  } catch (stepError) {
                    console.error('Failed to duplicate step result for shared step:', stepError);
                  }
                }

                const newSharedStep = await sharedStepsApiService.createSharedStep({
                  title: originalSharedStep.data.attributes.title,
                  projectId: targetProjectId,
                  creatorId: testCaseData.creatorId!,
                  stepResults: newSharedStepResults
                });

                sharedStepsForApi.push({
                  id: newSharedStep.data.attributes.id.toString(),
                  order: newOrder
                });

              } catch (sharedStepError) {
                console.error('Failed to duplicate shared step:', sharedStepError);
              }
            } else {
              sharedStepsForApi.push({
                id: item.ref.id.split('/').pop() || '',
                order: newOrder
              });

            }
          }
        }

        // Handle attachments - reuse existing ones
        let duplicatedAttachments: Array<{
          type: "Attachment";
          id: string;
        }> = [];

        if (testCaseData.originalRelationships.attachments?.data) {
          duplicatedAttachments = testCaseData.originalRelationships.attachments.data.map((attachment: Record<string, unknown>) => ({
            type: "Attachment",
            id: attachment.id
          }));
        }

        // Create the test case with all relationships

        const response = await testCasesApiService.createTestCase({
          ...testCaseData,
          projectId: targetProjectId,
          folderId: targetFolderId,
          creatorId: testCaseData.creatorId || '',
          stepResults,
          sharedStepsForApi,
          createdAttachments: duplicatedAttachments
        });

        // Only add to current list if created in the current project
        if (targetProjectId === projectId) {
          const newTestCase = testCasesApiService.transformApiTestCase(response.data, undefined, availableTagsRef.current);
          setTestCases(prevTestCases => [newTestCase, ...prevTestCases]);

          setPagination(prev => ({
            ...prev,
            totalItems: prev.totalItems + 1,
            totalPages: Math.ceil((prev.totalItems + 1) / prev.itemsPerPage)
          }));
        } else {
          // Folder not in tree
        }

        return;
      }
      
      // Handle step results - create them first if they exist
      const stepResults: Array<{
        id: string;
        order: number;
      }> = [];
      
      if (testCaseData.testSteps && testCaseData.testSteps.length > 0 && testCaseData.creatorId) {


        // Create a map of UI step IDs to their order from relationships
        const stepOrderMap = new Map<string, number>();
        if (testCaseData.stepResultsRelationships) {
          testCaseData.stepResultsRelationships.forEach(rel => {
            stepOrderMap.set(rel.id, rel.meta.order);

          });
        }
        
        for (let i = 0; i < testCaseData.testSteps.length; i++) {
          const step = testCaseData.testSteps[i];
          const stepOrder = stepOrderMap.get(step.id) || (i + 1); // Fallback to index + 1

          if (step.originalId) {
            // Existing step result - just include in relationships (no POST needed)
            stepResults.push({
              id: step.originalId,
              order: stepOrder
            });

          } else {
            const testStep = testCaseData.testSteps[i];
            // New step result - create it via POST request (only for new ones)
            try {
              const stepResultResponse = await testCasesApiService.createStepResult({
                step: testStep.step,
                result: testStep.result,
                userId: testCaseData.creatorId
              });
              
              stepResults.push({
                id: stepResultResponse.data.attributes.id.toString(),
                order: stepOrder
              });

            } catch (stepError) {
              console.error(`Failed to create step result ${i + 1}:`, stepError);
              throw new Error(`Failed to create step result ${i + 1}: ${stepError instanceof Error ? stepError.message : 'Unknown error'}`);
            }
          }
        }

      }
      
      // Create attachments via API first
      const createdAttachments: Array<{ id: string; url: string }> = [];
      
      if (testCaseData.uploadedAttachments && testCaseData.uploadedAttachments.length > 0 && authState.user?.id) {

        for (const attachment of testCaseData.uploadedAttachments) {
          try {

            const attachmentResponse = await attachmentsApiService.createAttachment({
              url: attachment.cloudFrontUrl,
              userId: testCaseData.creatorId
            });
            
            createdAttachments.push({
              id: attachmentResponse.data.attributes.id.toString(),
              url: attachment.cloudFrontUrl
            });

          } catch (error) {
            console.error('❌ Failed to create attachment:', error);
            throw new Error(`Failed to create attachment for ${attachment.file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

      }

      // Create the test case with step results and attachments
      let sharedStepsForApi: Array<{
        id: string;
        order: number;
      }> = [];
      
      if (testCaseData.sharedStepsRelationships && testCaseData.sharedStepsRelationships.length > 0) {


        sharedStepsForApi = testCaseData.sharedStepsRelationships.map(relationship => ({
          id: relationship.id.split('/').pop() || '', // Extract ID from API path
          order: relationship.meta.order
        }));

      }
      
      // STEP 2: Create the test case with attachment relationships
      // Use the projectId and folderId from testCaseData if provided (for cross-project operations)
      // Fall back to hook context values if not provided
      const targetProjectId = testCaseData.projectId || projectId!;
      const targetFolderId = testCaseData.folderId || folderId || undefined;

      const response = await testCasesApiService.createTestCase({
        ...testCaseData,
        projectId: targetProjectId,
        folderId: targetFolderId,
        creatorId: testCaseData.creatorId || '',
        stepResults,
        sharedStepsForApi,
        createdAttachments: testCaseData.createdAttachments
      });

      // Only add to current list if created in the current project
      if (targetProjectId === projectId) {
        const newTestCase = testCasesApiService.transformApiTestCase(response.data, undefined, availableTagsRef.current);
        setTestCases(prevTestCases => [newTestCase, ...prevTestCases]);

        setPagination(prev => ({
          ...prev,
          totalItems: prev.totalItems + 1,
          totalPages: Math.ceil((prev.totalItems + 1) / prev.itemsPerPage)
        }));
      } else {
        // Test case not in current folder
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create test case';
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [projectId, folderId]);

  const updateTestCase = useCallback(async (id: string, testCaseData: {
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    testType: 'functional' | 'regression' | 'smoke' | 'integration' | 'performance';
    status: 'draft' | 'active' | 'deprecated';
    automationStatus: 1 | 2 | 3 | 4 | 5;
    template: number;
    preconditions: string;
    tags: Tag[];
    testSteps?: Array<{
      id: string;
      step: string;
      result: string;
      originalId?: string;
    }>;
    userId?: string;
    projectId?: string;
    folderId?: string;
    ownerId?: string;
    stepResultsRelationships?: Array<{
      type: string;
      id: string;
      meta: {
        order: number;
      };
    }>;
    sharedStepsRelationships?: Array<{
      type: string;
      id: string;
      meta: {
        order: number;
      };
    }>;
    createdAttachments?: Array<{
      type: "Attachment";
      id: string;
    }>;
  }) => {
    try {
      setLoading(true);
      
      // Handle step results - update existing ones and create new ones
      const stepResultsRelationships: Array<{
        type: string;
        id: string;
        meta: {
          order: number;
        };
      }> = [];
      
      if (testCaseData.testSteps && testCaseData.testSteps.length > 0 && testCaseData.userId) {


        // Create a map of UI step IDs to their order from relationships
        const stepOrderMap = new Map<string, number>();
        if (testCaseData.stepResultsRelationships) {
          testCaseData.stepResultsRelationships.forEach(rel => {
            stepOrderMap.set(rel.id, rel.meta.order);

          });
        }
        
        for (let i = 0; i < testCaseData.testSteps.length; i++) {
          const step = testCaseData.testSteps[i];
          const stepOrder = stepOrderMap.get(step.id) || (i + 1); // Use mapped order or fallback to index + 1

          if (step.originalId) {
            // Check if the step content was modified
            const wasModified = step.step !== step.originalStep || step.result !== step.originalResult;

            if (wasModified) {
              // Only update if content changed

              try {
                await testCasesApiService.updateStepResult(step.originalId, {
                  step: step.step,
                  result: step.result,
                  userId: testCaseData.userId
                });

              } catch (stepError) {
                console.error(`❌ PATCH: Failed to update step result ${step.originalId}:`, stepError);
                throw new Error(`Failed to update step result ${stepOrder}: ${stepError instanceof Error ? stepError.message : 'Unknown error'}`);
              }
            } else {
              // Step result unchanged
            }

            // Include in relationships (whether modified or not)
            stepResultsRelationships.push({
              type: "StepResult",
              id: `/api/step_results/${step.originalId}`,
              meta: {
                order: stepOrder
              }
            });

          } else {
            // New step result - create it via POST request
            try {
              const stepResultResponse = await testCasesApiService.createStepResult({
                step: step.step,
                result: step.result,
                userId: testCaseData.userId
              });
              
              stepResultsRelationships.push({
                type: "StepResult",
                id: `/api/step_results/${stepResultResponse.data.attributes.id}`,
                meta: {
                  order: stepOrder
                }
              });

            } catch (stepError) {
              console.error(`❌ Failed to create step result ${stepOrder}:`, stepError);
              throw new Error(`Failed to create step result ${stepOrder}: ${stepError instanceof Error ? stepError.message : 'Unknown error'}`);
            }
          }
        }

      }
      
      // Handle shared steps relationships - use the provided relationships with order
      let sharedStepsRelationships: Array<{
        type: string;
        id: string;
        meta: {
          order: number;
        };
      }> = [];
      
      if (testCaseData.sharedStepsRelationships && testCaseData.sharedStepsRelationships.length > 0) {


        sharedStepsRelationships = testCaseData.sharedStepsRelationships;

      }
      
      // Update the test case with step results relationships and attachments
      const response = await testCasesApiService.updateTestCase(id, {
        ...testCaseData,
        description: testCaseData.description,
        stepResultsRelationships,
        sharedStepsRelationships,
        createdAttachments: testCaseData.createdAttachments // This now contains both existing and newly created
      });
      
      const updatedTestCase = testCasesApiService.transformApiTestCase(response.data, undefined, availableTagsRef.current);
      setTestCases(prevTestCases => 
        prevTestCases.map(testCase => 
          testCase.id === id ? updatedTestCase : testCase
        )
      );
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update test case';
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteTestCase = useCallback(async (id: string) => {
    try {
      setLoading(true);
      
      await testCasesApiService.deleteTestCase(id);
      
      setTestCases(prevTestCases => prevTestCases.filter(testCase => testCase.id !== id));
      
      setPagination(prev => ({
        ...prev,
        totalItems: Math.max(0, prev.totalItems - 1),
        totalPages: Math.ceil(Math.max(0, prev.totalItems - 1) / prev.itemsPerPage)
      }));
      
      toast.success('Test case deleted successfully');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete test case';
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Effect for initial load when project changes
  useEffect(() => {
    const projectChanged = previousProjectId.current !== projectId;

    previousProjectId.current = projectId;

    if (projectId && projectChanged && !skipInitialLoad) {

      hasInitialLoad.current = false;
      // Only do initial load if we don't have filters applied from navigation
      // The parent component will handle the initial load with filters if needed
      fetchAllTestCasesAndExtractFolders(projectId);
    } else if (!projectId) {

      setTestCases([]);
      setAllTestCases([]);
      setLoading(false);
      hasInitialLoad.current = false;
      setIsInitialLoadComplete(false);
    }
  }, [projectId, fetchAllTestCasesAndExtractFolders, skipInitialLoad]);

  // Effect for folder changes (filter existing data)
  useEffect(() => {
    const folderChanged = previousFolderId.current !== folderId;
    
    // When folder changes, we need to re-apply any active filters with the new folder context
    if (folderChanged && hasInitialLoad.current) {
      previousFolderId.current = folderId;

      // Don't automatically filter by folder - let the parent component handle this
      // The parent component will check for active filters and apply them with the new folder context

    }
  }, [folderId, filterTestCasesByFolder]);

  return {
    testCases, // Filtered by selected folder
    allTestCases, // All test cases for the project
    loading,
    error,
    pagination,
    currentFilterMode,
    setCurrentFilterMode,
    isInitialLoadComplete,
    fetchAllTestCasesAndExtractFolders,
    fetchAllTestCasesForProject: fetchAllTestCasesAndExtractFolders,
    filterTestCasesByFolder,
    showFolderTestCases,
    searchTestCases,
    filterTestCasesByAutomation,
    filterTestCasesByPriority,
    filterTestCasesByType,
    filterTestCasesByTags,
    filterTestCasesByState,
    filterTestCasesWithMultipleFilters,
    createTestCase,
    updateTestCase,
    deleteTestCase
  };
};