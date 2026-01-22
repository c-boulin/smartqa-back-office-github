import { useState, useEffect, useRef, useCallback } from 'react';
import { testRunsApiService, TestRunsApiResponse } from '../services/testRunsApi';
import { TestRun } from '../services/testRunsApi';
import toast from 'react-hot-toast';

export const useTestRuns = (projectId?: string | null) => {
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalItems: 0,
    itemsPerPage: 30,
    totalPages: 1
  });

  // Use ref to track changes without triggering re-renders
  const previousProjectId = useRef<string | null>(null);

  // Stable fetchTestRuns function
  const fetchTestRuns = useCallback(async (page: number = 1, targetProjectId?: string) => {
    const useProjectId = targetProjectId || projectId;

    if (!useProjectId) {

      setTestRuns([]);
      setLoading(false);
      return;
    }

    const apiProjectId = useProjectId === 'all' ? undefined : useProjectId;

    try {
      setLoading(true);
      setError(null);

      let response: TestRunsApiResponse = await testRunsApiService.getTestRuns(
        apiProjectId,
        page,
        30
      );
      
      if (!response) {
        response = testRunsApiService.getDefaultTestRunsResponse();
      }
      
      const responseData = response?.data || [];
      const responseMeta = response?.meta || {
        currentPage: 1,
        totalItems: 0,
        itemsPerPage: 30
      };
      const included = response?.included || [];
      
      const transformedTestRuns = responseData.map(apiTestRun => 
        testRunsApiService.transformApiTestRun(apiTestRun, included)
      );


      // Count active vs closed
      const _activeCount = transformedTestRuns.filter(tr => tr.state !== 6).length;
      const _closedCount = transformedTestRuns.filter(tr => tr.state === 6).length;

      setTestRuns(transformedTestRuns);
      setPagination({
        currentPage: responseMeta.currentPage,
        totalItems: responseMeta.totalItems,
        itemsPerPage: responseMeta.itemsPerPage,
        totalPages: Math.ceil(responseMeta.totalItems / responseMeta.itemsPerPage)
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch test runs';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('❌ Error fetching test runs:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const searchTestRuns = useCallback(async (searchTerm: string, page: number = 1) => {
    if (!projectId) {
      setTestRuns([]);
      return;
    }

    const apiProjectId = projectId === 'all' ? undefined : projectId;

    try {
      setLoading(true);
      setError(null);

      let response: TestRunsApiResponse = await testRunsApiService.searchTestRuns(
        searchTerm,
        apiProjectId,
        page,
        30
      );
      
      if (!response) {
        response = testRunsApiService.getDefaultTestRunsResponse();
      }
      
      const responseData = response?.data || [];
      const responseMeta = response?.meta || {
        currentPage: 1,
        totalItems: 0,
        itemsPerPage: 30
      };
      const included = response?.included || [];
      
      const transformedTestRuns = responseData.map(apiTestRun => 
        testRunsApiService.transformApiTestRun(apiTestRun, included)
      );
      
      setTestRuns(transformedTestRuns);
      setPagination({
        currentPage: responseMeta.currentPage,
        totalItems: responseMeta.totalItems,
        itemsPerPage: responseMeta.itemsPerPage,
        totalPages: Math.ceil(responseMeta.totalItems / responseMeta.itemsPerPage)
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search test runs';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('❌ Error searching test runs:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const filterTestRunsByAssignee = useCallback(async (assigneeId: string, page: number = 1) => {
    if (!projectId) {
      setTestRuns([]);
      return;
    }

    const apiProjectId = projectId === 'all' ? undefined : projectId;

    try {
      setLoading(true);
      setError(null);

      let response: TestRunsApiResponse = await testRunsApiService.filterTestRunsByAssignee(
        assigneeId,
        apiProjectId,
        page,
        30
      );
      
      if (!response) {
        response = testRunsApiService.getDefaultTestRunsResponse();
      }
      
      const responseData = response?.data || [];
      const responseMeta = response?.meta || {
        currentPage: 1,
        totalItems: 0,
        itemsPerPage: 30
      };
      const included = response?.included || [];
      
      const transformedTestRuns = responseData.map(apiTestRun => 
        testRunsApiService.transformApiTestRun(apiTestRun, included)
      );
      
      setTestRuns(transformedTestRuns);
      setPagination({
        currentPage: responseMeta.currentPage,
        totalItems: responseMeta.totalItems,
        itemsPerPage: responseMeta.itemsPerPage,
        totalPages: Math.ceil(responseMeta.totalItems / responseMeta.itemsPerPage)
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to filter test runs by assignee';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('❌ Error filtering test runs by assignee:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const filterTestRunsByState = useCallback(async (state: string, page: number = 1) => {
    if (!projectId) {
      setTestRuns([]);
      return;
    }

    const apiProjectId = projectId === 'all' ? undefined : projectId;

    try {
      setLoading(true);
      setError(null);

      let response: TestRunsApiResponse = await testRunsApiService.filterTestRunsByState(
        state,
        apiProjectId,
        page,
        30
      );
      
      if (!response) {
        response = testRunsApiService.getDefaultTestRunsResponse();
      }
      
      const responseData = response?.data || [];
      const responseMeta = response?.meta || {
        currentPage: 1,
        totalItems: 0,
        itemsPerPage: 30
      };
      const included = response?.included || [];
      
      const transformedTestRuns = responseData.map(apiTestRun => 
        testRunsApiService.transformApiTestRun(apiTestRun, included)
      );
      
      setTestRuns(transformedTestRuns);
      setPagination({
        currentPage: responseMeta.currentPage,
        totalItems: responseMeta.totalItems,
        itemsPerPage: responseMeta.itemsPerPage,
        totalPages: Math.ceil(responseMeta.totalItems / responseMeta.itemsPerPage)
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to filter test runs by state';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('❌ Error filtering test runs by state:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const filterTestRunsWithMultipleFilters = useCallback(async (filters: {
    assignee?: string;
    state?: string;
  }, page: number = 1) => {
    if (!projectId) {
      setTestRuns([]);
      return;
    }

    const apiProjectId = projectId === 'all' ? undefined : projectId;

    try {
      setLoading(true);
      setError(null);

      let response: TestRunsApiResponse = await testRunsApiService.filterTestRunsWithMultipleFilters(
        filters,
        apiProjectId,
        page,
        30
      );
      
      if (!response) {
        response = testRunsApiService.getDefaultTestRunsResponse();
      }
      
      const responseData = response?.data || [];
      const responseMeta = response?.meta || {
        currentPage: 1,
        totalItems: 0,
        itemsPerPage: 30
      };
      const included = response?.included || [];
      
      const transformedTestRuns = responseData.map(apiTestRun => 
        testRunsApiService.transformApiTestRun(apiTestRun, included)
      );
      
      setTestRuns(transformedTestRuns);
      setPagination({
        currentPage: responseMeta.currentPage,
        totalItems: responseMeta.totalItems,
        itemsPerPage: responseMeta.itemsPerPage,
        totalPages: Math.ceil(responseMeta.totalItems / responseMeta.itemsPerPage)
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to filter test runs with multiple filters';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('❌ Error filtering test runs with multiple filters:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const createTestRun = useCallback(async (testRunData: {
    name: string;
    description: string;
    projectId: string;
    testCaseIds?: string[];
    configurations?: Configuration[];
    assignedTo?: string;
    state?: number;
    tags?: Tag[];
    testPlanId?: string;
  }) => {
    try {
      setLoading(true);
      
      const response = await testRunsApiService.createTestRun(testRunData);
      
      const newTestRun = testRunsApiService.transformApiTestRun(response.data, response.included);
      setTestRuns(prevTestRuns => [newTestRun, ...prevTestRuns]);
      
      setPagination(prev => ({
        ...prev,
        totalItems: prev.totalItems + 1,
        totalPages: Math.ceil((prev.totalItems + 1) / prev.itemsPerPage)
      }));
      
      toast.success('Test run created successfully');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create test run';
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateTestRun = useCallback(async (id: string, testRunData: {
    name: string;
    description: string;
    state: number;
    testCaseIds: string[];
    configurations?: Configuration[];
    assignedTo?: string;
    tags?: Tag[];
    testPlanId?: string;
  }) => {
    try {
      setLoading(true);
      
      const response = await testRunsApiService.updateTestRun(id, testRunData);
      
      const updatedTestRun = testRunsApiService.transformApiTestRun(response.data, response.included);
      setTestRuns(prevTestRuns => 
        prevTestRuns.map(testRun => 
          testRun.id === id ? updatedTestRun : testRun
        )
      );
      
      toast.success('Test run updated successfully');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update test run';
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteTestRun = useCallback(async (id: string) => {
    try {
      setLoading(true);
      
      await testRunsApiService.deleteTestRun(id);
      
      setTestRuns(prevTestRuns => prevTestRuns.filter(testRun => testRun.id !== id));
      
      setPagination(prev => ({
        ...prev,
        totalItems: Math.max(0, prev.totalItems - 1),
        totalPages: Math.ceil(Math.max(0, prev.totalItems - 1) / prev.itemsPerPage)
      }));
      
      toast.success('Test run deleted successfully');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete test run';
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const closeTestRun = useCallback(async (id: string) => {
    try {
      setLoading(true);
      
      const response = await testRunsApiService.closeTestRun(id);
      
      const updatedTestRun = testRunsApiService.transformApiTestRun(response.data, response.included);
      setTestRuns(prevTestRuns => 
        prevTestRuns.map(testRun => 
          testRun.id === id ? updatedTestRun : testRun
        )
      );
      
      toast.success('Test run closed successfully');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to close test run';
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Smart reload optimization - ONLY when project changes
  useEffect(() => {
    const projectChanged = previousProjectId.current !== projectId;

    // Update refs BEFORE doing anything
    previousProjectId.current = projectId;

    // Load test runs ONLY if we have a project AND the project changed
    if (projectId && projectChanged) {

      fetchTestRuns(1, projectId);
    } else if (!projectId) {
      // No project selected

      setTestRuns([]);
      setLoading(false);
    } else {
      // Same project, do nothing

    }
  }, [projectId, fetchTestRuns]);

  return {
    testRuns,
    loading,
    error,
    pagination,
    fetchTestRuns,
    searchTestRuns,
    filterTestRunsByAssignee,
    filterTestRunsByState,
    filterTestRunsWithMultipleFilters,
    createTestRun,
    updateTestRun,
    deleteTestRun,
    closeTestRun
  };
};