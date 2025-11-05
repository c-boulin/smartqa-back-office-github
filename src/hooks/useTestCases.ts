import { useState, useEffect, useRef, useCallback } from 'react';
import { testCasesApiService, TestCasesApiResponse } from '../services/testCasesApi';
import { sharedStepsApiService } from '../services/sharedStepsApi';
// import { foldersApiService } from '../services/foldersApi';
import { TestCase } from '../types';
import toast from 'react-hot-toast';

export const useTestCases = (projectId?: string | null, folderId?: string | null, onFoldersExtracted?: (folders: Array<Record<string, unknown>>) => void, skipInitialLoad?: boolean) => {
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [allTestCases, setAllTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFilterMode, setCurrentFilterMode] = useState<'folder' | 'search' | 'automation' | 'all'>('all');
  const [isInitialLoadComplete] = useState(false);
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

  // Initial load - fetch all test cases for project and extract folders
  const fetchAllTestCasesAndExtractFolders = useCallback(async (targetProjectId?: string, initialFilters?: Record<string, unknown>) => {
    const useProjectId = targetProjectId || projectId;
    
    if (!useProjectId) {
      console.log('🚫 Missing projectId, clearing all data');
      setTestCases([]);
      setAllTestCases([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      if (initialFilters) {
        console.log('📋 Initial load with filters: Fetching filtered test cases for project:', useProjectId, 'filters:', initialFilters);
      } else {
        console.log('📋 Initial load: Fetching ALL test cases for project:', useProjectId);
      }
      
      let response: TestCasesApiResponse;
      
      if (initialFilters) {
        // If we have initial filters (from dashboard navigation), apply them immediately
        response = await testCasesApiService.filterTestCasesWithMultipleFilters(
          initialFilters,
          1,
          30, // Use normal pagination for filtered results
          useProjectId
        );
        
        // Also fetch all test cases for folder extraction (separate call with pagination)
        // But don't update the display test cases with this response
        let allTestCasesData: Array<Record<string, unknown>> = [];
        let totalPages = 1;
        
        // Fetch first page to get total pages info
        const firstPageResponse = await testCasesApiService.getTestCases(
          1, 
          30,
          useProjectId
        );
        
        totalPages = Math.ceil(firstPageResponse.meta.totalItems / firstPageResponse.meta.itemsPerPage);
        console.log(`📋 Folder extraction - Total items: ${firstPageResponse.meta.totalItems}, Total pages: ${totalPages}`);
        
        // Add first page data
        allTestCasesData = [...firstPageResponse.data];
        
        // Fetch remaining pages if any
        for (let page = 2; page <= totalPages; page++) {
          console.log(`📋 Folder extraction - Fetching page ${page}/${totalPages}...`);
          const pageResponse = await testCasesApiService.getTestCases(
            page, 
            30,
            useProjectId
          );
          
          allTestCasesData = [...allTestCasesData, ...pageResponse.data];
        }
        
        console.log(`📋 Folder extraction - Total test cases fetched: ${allTestCasesData.length}`);
        
        // Use all test cases for folder extraction only
        const allTransformedTestCases = allTestCasesData.map(apiTestCase => 
          testCasesApiService.transformApiTestCase(apiTestCase, firstPageResponse.included)
        );
        setAllTestCases(allTransformedTestCases);
        
        // Extract folders from all test cases
        const folderMap = new Map();
        allTransformedTestCases.forEach(testCase => {
          if (testCase.folderId) {
            if (!folderMap.has(testCase.folderId)) {
              folderMap.set(testCase.folderId, {
                id: testCase.folderId,
                name: `Folder ${testCase.folderId}`,
                testCasesCount: 0
              });
            }
            const folder = folderMap.get(testCase.folderId);
            folder.testCasesCount++;
          }
        });
        
        const extractedFolders = Array.from(folderMap.values());
        if (onFoldersExtracted) {
          onFoldersExtracted(extractedFolders);
        }
        
      } else {
        // Normal load - fetch first page of test cases only
        response = await testCasesApiService.getTestCases(
          1, 
          30, // Use default page size since API limits to 30 anyway
          useProjectId
        );
        
        console.log(`📋 First page: ${response.data.length} test cases, Total: ${response.meta.totalItems}`);
        
        // For folder extraction, we still need all test cases
        // But we'll fetch them separately and only when needed
        let allTestCasesData: Array<Record<string, unknown>> = [];
        const totalPages = Math.ceil(response.meta.totalItems / response.meta.itemsPerPage);
        
        if (totalPages > 1) {
          console.log(`📋 Fetching all ${totalPages} pages for folder extraction...`);
          
          // Add first page data
          allTestCasesData = [...response.data];
          
          // Fetch remaining pages for folder extraction
          for (let page = 2; page <= totalPages; page++) {
            console.log(`📋 Folder extraction - Fetching page ${page}/${totalPages}...`);
            const pageResponse = await testCasesApiService.getTestCases(
              page, 
              30,
              useProjectId
            );
            
            allTestCasesData = [...allTestCasesData, ...pageResponse.data];
          }
          
          console.log(`📋 Folder extraction - Total test cases: ${allTestCasesData.length}`);
        } else {
          allTestCasesData = response.data;
        }
        
        // Set all test cases for folder extraction
        setAllTestCases(allTestCasesData.map(apiTestCase => 
          testCasesApiService.transformApiTestCase(apiTestCase, response.included)
        ));
        
        // Extract folders from all test cases
        const folderMap = new Map();
        const allTransformedTestCases = allTestCasesData.map(apiTestCase => 
          testCasesApiService.transformApiTestCase(apiTestCase, response.included)
        );
        
        allTransformedTestCases.forEach(testCase => {
          if (testCase.folderId) {
            if (!folderMap.has(testCase.folderId)) {
              folderMap.set(testCase.folderId, {
                id: testCase.folderId,
                name: `Folder ${testCase.folderId}`,
                testCasesCount: 0
              });
            }
            const folder = folderMap.get(testCase.folderId);
            folder.testCasesCount++;
          }
        });
        
        const extractedFolders = Array.from(folderMap.values());
        if (onFoldersExtracted) {
          onFoldersExtracted(extractedFolders);
        }
      }
      
      console.log('📋 API Response:', response);
      
      if (!response) {
        response = testCasesApiService.getDefaultTestCasesResponse();
      }
      
      const responseData = response?.data || [];
      const responseMeta = response?.meta || {
        currentPage: 1,
        totalItems: 0,
        itemsPerPage: 30
      };
      
      console.log('📋 Raw API data:', responseData.length, initialFilters ? 'filtered test cases' : 'test cases');
      
      const transformedTestCases = responseData.map(apiTestCase => 
        testCasesApiService.transformApiTestCase(apiTestCase, response.included)
      );
      
      console.log('📋 Transformed test cases:', transformedTestCases);
      
      // Set the display test cases (filtered or all)
      setTestCases(transformedTestCases);
      
      // Set pagination
      setPagination({
        currentPage: responseMeta.currentPage,
        totalItems: responseMeta.totalItems,
        itemsPerPage: responseMeta.itemsPerPage,
        totalPages: Math.ceil(responseMeta.totalItems / responseMeta.itemsPerPage)
      });
      
      if (initialFilters) {
        // Set the current filter mode to indicate we have filters applied
        setCurrentFilterMode('multiple');
      } else {
        setCurrentFilterMode('all');
      }
      
      console.log('✅ Fetched', transformedTestCases.length, initialFilters ? 'filtered test cases' : 'total test cases', 'for project');
      
      hasInitialLoad.current = true;
      
    } catch (err) {
      console.error('❌ Full error details:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch test cases';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('❌ Error fetching test cases:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, onFoldersExtracted]);

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
    
    console.log('📁 Showing test cases for folder:', useFolderId || 'all', 'page:', page);
    
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
        testCasesApiService.transformApiTestCase(apiTestCase, response.included)
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
        undefined, // Always omit folderId for search to search across all folders
        'include=tags' // Include tag data
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
        testCasesApiService.transformApiTestCase(apiTestCase, response.included)
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
        testCasesApiService.transformApiTestCase(apiTestCase, response.included)
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
        testCasesApiService.transformApiTestCase(apiTestCase, response.included)
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
        testCasesApiService.transformApiTestCase(apiTestCase, response.included)
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
        testCasesApiService.transformApiTestCase(apiTestCase, response.included)
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
        testCasesApiService.transformApiTestCase(apiTestCase, response.included)
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
        testCasesApiService.transformApiTestCase(apiTestCase, response.included)
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
      
      console.log('📎 HOOK DEBUG: Received testCaseData.createdAttachments:', testCaseData.createdAttachments);
      
      // Handle duplication with original relationships
      if (testCaseData.originalRelationships) {
        console.log('🔄 Processing test case duplication with original relationships');

        const targetProjectId = testCaseData.projectId || projectId!;
        const targetFolderId = testCaseData.folderId || folderId || undefined;
        const originalProjectId = testCaseData.originalRelationships.project?.data?.id?.split('/').pop();
        const isDifferentProject = targetProjectId !== originalProjectId;

        console.log('🎯 Duplication context:', {
          targetProjectId,
          originalProjectId,
          isDifferentProject
        });

        console.log('📦 Original relationships to duplicate:', {
          stepResultsCount: testCaseData.originalRelationships.stepResults?.data?.length || 0,
          sharedStepsCount: testCaseData.originalRelationships.sharedSteps?.data?.length || 0,
          stepResults: testCaseData.originalRelationships.stepResults?.data?.map((sr: { id: string; meta?: { order: number } }) => ({
            id: sr.id,
            order: sr.meta?.order,
            type: 'StepResult'
          })),
          sharedSteps: testCaseData.originalRelationships.sharedSteps?.data?.map((ss: { id: string; meta?: { order: number } }) => ({
            id: ss.id,
            order: ss.meta?.order,
            type: 'SharedStep'
          }))
        });

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

        console.log('🔄 Combined and sorted items:', allItems.map((item, index) => ({
          position: index + 1,
          type: item.type,
          originalOrder: item.originalOrder
        })));

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

              console.log(`✅ Created step result at position ${newOrder} (original order: ${item.originalOrder})`);
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

                console.log(`✅ Created shared step at position ${newOrder} (original order: ${item.originalOrder})`);
              } catch (sharedStepError) {
                console.error('Failed to duplicate shared step:', sharedStepError);
              }
            } else {
              sharedStepsForApi.push({
                id: item.ref.id.split('/').pop() || '',
                order: newOrder
              });
              console.log(`✅ Reusing shared step at position ${newOrder} (original order: ${item.originalOrder})`);
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
        console.log('📤 Final payload for duplicated test case:', {
          stepResults: stepResults.map(sr => ({ id: sr.id, order: sr.order })),
          sharedStepsForApi: sharedStepsForApi.map(ss => ({ id: ss.id, order: ss.order }))
        });

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
          const newTestCase = testCasesApiService.transformApiTestCase(response.data);
          setTestCases(prevTestCases => [newTestCase, ...prevTestCases]);

          setPagination(prev => ({
            ...prev,
            totalItems: prev.totalItems + 1,
            totalPages: Math.ceil((prev.totalItems + 1) / prev.itemsPerPage)
          }));
        } else {
          console.log('✅ Test case created in different project, not adding to current list');
        }

        return;
      }
      
      // Handle step results - create them first if they exist
      const stepResults: Array<{
        id: string;
        order: number;
      }> = [];
      
      if (testCaseData.testSteps && testCaseData.testSteps.length > 0 && testCaseData.creatorId) {
        console.log('🔄 Creating step results for new test case...');
        console.log('🔄 Received stepResultsRelationships:', testCaseData.stepResultsRelationships);
        
        // Create a map of UI step IDs to their order from relationships
        const stepOrderMap = new Map<string, number>();
        if (testCaseData.stepResultsRelationships) {
          testCaseData.stepResultsRelationships.forEach(rel => {
            stepOrderMap.set(rel.id, rel.meta.order);
            console.log(`📋 Step order mapping: UI ID ${rel.id} → order ${rel.meta.order}`);
          });
        }
        
        for (let i = 0; i < testCaseData.testSteps.length; i++) {
          const step = testCaseData.testSteps[i];
          const stepOrder = stepOrderMap.get(step.id) || (i + 1); // Fallback to index + 1
          
          console.log(`🔄 Processing step ${i + 1}: UI ID ${step.id} → order ${stepOrder}`);
          
          if (step.originalId) {
            // Existing step result - just include in relationships (no POST needed)
            stepResults.push({
              id: step.originalId,
              order: stepOrder
            });
            
            console.log(`✅ Including existing step result ${step.originalId} with order ${stepOrder}`);
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
              
              console.log(`✅ Created step result with API ID ${stepResultResponse.data.id} and order ${stepOrder}`);
            } catch (stepError) {
              console.error(`Failed to create step result ${i + 1}:`, stepError);
              throw new Error(`Failed to create step result ${i + 1}: ${stepError instanceof Error ? stepError.message : 'Unknown error'}`);
            }
          }
        }
        
        console.log('All step results created:', stepResults);
      }
      
      // Create attachments via API first
      const createdAttachments: Array<{ id: string; url: string }> = [];
      
      if (testCaseData.uploadedAttachments && testCaseData.uploadedAttachments.length > 0 && authState.user?.id) {
        console.log('📎 Creating', testCaseData.uploadedAttachments.length, 'attachments via API...');
        
        for (const attachment of testCaseData.uploadedAttachments) {
          try {
            console.log('📎 Creating attachment for:', attachment.file.name);
            
            const attachmentResponse = await attachmentsApiService.createAttachment({
              url: attachment.cloudFrontUrl,
              userId: testCaseData.creatorId
            });
            
            createdAttachments.push({
              id: attachmentResponse.data.attributes.id.toString(),
              url: attachment.cloudFrontUrl
            });
            
            console.log('✅ Created attachment with ID:', attachmentResponse.data.attributes.id);
          } catch (error) {
            console.error('❌ Failed to create attachment:', error);
            throw new Error(`Failed to create attachment for ${attachment.file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        
        console.log('✅ All attachments created:', createdAttachments);
      }
      console.log('📎 HOOK: Passing createdAttachments to API service:', testCaseData.createdAttachments);
      
      // Create the test case with step results and attachments
      let sharedStepsForApi: Array<{
        id: string;
        order: number;
      }> = [];
      
      if (testCaseData.sharedStepsRelationships && testCaseData.sharedStepsRelationships.length > 0) {
        console.log('🔄 Processing shared steps relationships for new test case...');
        console.log('🔄 Received sharedStepsRelationships:', testCaseData.sharedStepsRelationships);
        
        sharedStepsForApi = testCaseData.sharedStepsRelationships.map(relationship => ({
          id: relationship.id.split('/').pop() || '', // Extract ID from API path
          order: relationship.meta.order
        }));
        
        console.log('All shared steps relationships processed:', sharedStepsForApi);
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
        const newTestCase = testCasesApiService.transformApiTestCase(response.data);
        setTestCases(prevTestCases => [newTestCase, ...prevTestCases]);

        setPagination(prev => ({
          ...prev,
          totalItems: prev.totalItems + 1,
          totalPages: Math.ceil((prev.totalItems + 1) / prev.itemsPerPage)
        }));
      } else {
        console.log('✅ Test case created in different project, not adding to current list');
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
        console.log('🔄 Processing step results for test case update...');
        console.log('🔄 Received stepResultsRelationships:', testCaseData.stepResultsRelationships);
        
        // Create a map of UI step IDs to their order from relationships
        const stepOrderMap = new Map<string, number>();
        if (testCaseData.stepResultsRelationships) {
          testCaseData.stepResultsRelationships.forEach(rel => {
            stepOrderMap.set(rel.id, rel.meta.order);
            console.log(`📋 Step order mapping: UI ID ${rel.id} → order ${rel.meta.order}`);
          });
        }
        
        for (let i = 0; i < testCaseData.testSteps.length; i++) {
          const step = testCaseData.testSteps[i];
          const stepOrder = stepOrderMap.get(step.id) || (i + 1); // Use mapped order or fallback to index + 1
          
          console.log(`🔄 Processing step ${i + 1}: UI ID ${step.id} → order ${stepOrder}`);
          
          if (step.originalId) {
            console.log(`🔄 Updating existing step result ${step.originalId} with order ${stepOrder}`);
            
            try {
              await testCasesApiService.updateStepResult(step.originalId, {
                step: step.step,
                result: step.result,
                userId: testCaseData.userId
              });
              
              console.log(`✅ Updated step result ${step.originalId}`);
            } catch (stepError) {
              console.error(`❌ Failed to update step result ${step.originalId}:`, stepError);
              throw new Error(`Failed to update step result ${stepOrder}: ${stepError instanceof Error ? stepError.message : 'Unknown error'}`);
            }
            
            // Include in relationships
            stepResultsRelationships.push({
              type: "StepResult",
              id: `/api/step_results/${step.originalId}`,
              meta: {
                order: stepOrder
              }
            });
            
            console.log(`✅ Including updated step result ${step.originalId} with order ${stepOrder}`);
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
              
              console.log(`✅ Created new step result ${stepOrder}:`, stepResultResponse.data.id);
            } catch (stepError) {
              console.error(`❌ Failed to create step result ${stepOrder}:`, stepError);
              throw new Error(`Failed to create step result ${stepOrder}: ${stepError instanceof Error ? stepError.message : 'Unknown error'}`);
            }
          }
        }
        
        console.log('✅ All step results updated/created and processed:', stepResultsRelationships);
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
        console.log('🔄 Processing shared steps relationships for test case update...');
        console.log('🔄 Received sharedStepsRelationships:', testCaseData.sharedStepsRelationships);
        
        sharedStepsRelationships = testCaseData.sharedStepsRelationships;
        
        console.log('All shared steps relationships processed:', sharedStepsRelationships);
      }
      
      // Update the test case with step results relationships and attachments
      const response = await testCasesApiService.updateTestCase(id, {
        ...testCaseData,
        description: testCaseData.description,
        stepResultsRelationships,
        sharedStepsRelationships,
        createdAttachments: testCaseData.createdAttachments // This now contains both existing and newly created
      });
      
      const updatedTestCase = testCasesApiService.transformApiTestCase(response.data);
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

    console.log('🔄 useTestCases project effect triggered:', {
      projectId,
      projectChanged
    });

    previousProjectId.current = projectId;

    if (projectId && projectChanged && !skipInitialLoad) {
      console.log('📂 Project changed, doing initial load for project:', projectId);
      hasInitialLoad.current = false;
      // Only do initial load if we don't have filters applied from navigation
      // The parent component will handle the initial load with filters if needed
      fetchAllTestCasesAndExtractFolders(projectId);
    } else if (!projectId) {
      console.log('🚫 No project selected, clearing test cases');
      setTestCases([]);
      setAllTestCases([]);
      setLoading(false);
      hasInitialLoad.current = false;
    }
  }, [projectId, fetchAllTestCasesAndExtractFolders, skipInitialLoad]);

  // Effect for folder changes (filter existing data)
  useEffect(() => {
    const folderChanged = previousFolderId.current !== folderId;
    
    // When folder changes, we need to re-apply any active filters with the new folder context
    if (folderChanged && hasInitialLoad.current) {
      previousFolderId.current = folderId;
      console.log('📁 Folder changed to:', folderId || 'none (all test cases)');
      
      // Don't automatically filter by folder - let the parent component handle this
      // The parent component will check for active filters and apply them with the new folder context
      console.log('📁 Folder changed - parent component will handle filter application');
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