import { useState, useEffect, useRef, useCallback } from 'react';
import { testPlansApiService, TestPlansApiResponse } from '../services/testPlansApi';
import { TestPlan } from '../services/testPlansApi';
import toast from 'react-hot-toast';

export const useTestPlans = (projectId?: string | null) => {
  const [testPlans, setTestPlans] = useState<TestPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalItems: 0,
    itemsPerPage: 30,
    totalPages: 1
  });
  const hasLoadedRef = useRef(false);
  const isLoadingRef = useRef(false);

  // Use ref to track changes without triggering re-renders
  const previousProjectId = useRef<string | null>(null);

  // Stable fetchTestPlans function
  const fetchTestPlans = useCallback(async (page: number = 1, targetProjectId?: string, userId?: string) => {
    const useProjectId = targetProjectId || projectId;
    
    // Prevent multiple simultaneous requests
    if (isLoadingRef.current) {
      console.log('📋 Already loading test plans, skipping request');
      return;
    }

    try {
      isLoadingRef.current = true;
      setLoading(true);
      setError(null);
      
      console.log('📋 Fetching test plans for project:', useProjectId || 'all projects', 'page:', page);
      
      let response: TestPlansApiResponse = await testPlansApiService.getTestPlans(
        useProjectId, // Filter by project ID
        page,
        30,
        userId // Filter by user ID
      );
      
      if (!response || typeof response !== 'object') {
        response = testPlansApiService.getDefaultTestPlansResponse();
      }
      
      const responseData = response?.data || [];
      const responseMeta = response?.meta || {
        currentPage: 1,
        totalItems: 0,
        itemsPerPage: 30
      };
      
      // If no data found on first page, mark as loaded to prevent further requests
      if (page === 1 && responseData.length === 0) {
        console.log('📋 No test plans found on first page - marking as loaded');
        hasLoadedRef.current = true;
      }
      
      const transformedTestPlans = responseData.map(apiTestPlan => 
        testPlansApiService.transformApiTestPlan(apiTestPlan, response?.included)
      );
      
      console.log('✅ Fetched', transformedTestPlans.length, 'test plans');
      
      setTestPlans(transformedTestPlans);
      setPagination({
        currentPage: responseMeta.currentPage,
        totalItems: responseMeta.totalItems,
        itemsPerPage: responseMeta.itemsPerPage,
        totalPages: Math.ceil(responseMeta.totalItems / responseMeta.itemsPerPage)
      });
      
      // Mark as loaded after successful first page
      if (page === 1) {
        hasLoadedRef.current = true;
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch test plans';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('❌ Error fetching test plans:', err);
      
      // Mark as loaded even on error to prevent infinite retries
      if (page === 1) {
        hasLoadedRef.current = true;
      }
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [projectId]);

  const searchTestPlans = useCallback(async (searchTerm: string, page: number = 1, userId?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Searching test plans:', searchTerm);
      
      let response: TestPlansApiResponse = await testPlansApiService.searchTestPlans(
        searchTerm,
        projectId, // Filter by project ID
        userId, // Filter by user ID
        page,
        30
      );
      
      if (!response || typeof response !== 'object') {
        response = testPlansApiService.getDefaultTestPlansResponse();
      }
      
      const responseData = response?.data || [];
      const responseMeta = response?.meta || {
        currentPage: 1,
        totalItems: 0,
        itemsPerPage: 30
      };
      
      const transformedTestPlans = responseData.map(apiTestPlan => 
        testPlansApiService.transformApiTestPlan(apiTestPlan, response?.included)
      );
      
      setTestPlans(transformedTestPlans);
      setPagination({
        currentPage: responseMeta.currentPage,
        totalItems: responseMeta.totalItems,
        itemsPerPage: responseMeta.itemsPerPage,
        totalPages: Math.ceil(responseMeta.totalItems / responseMeta.itemsPerPage)
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search test plans';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('❌ Error searching test plans:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const createTestPlan = useCallback(async (testPlanData: {
    title: string;
    creatorId: string;
  }) => {
    try {
      setLoading(true);
      
      const response = await testPlansApiService.createTestPlan(testPlanData);
      
      const newTestPlan = testPlansApiService.transformApiTestPlan(response.data);
      setTestPlans(prevTestPlans => [newTestPlan, ...prevTestPlans]);
      
      setPagination(prev => ({
        ...prev,
        totalItems: prev.totalItems + 1,
        totalPages: Math.ceil((prev.totalItems + 1) / prev.itemsPerPage)
      }));
      
      toast.success('Test plan created successfully');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create test plan';
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateTestPlan = useCallback(async (id: string, testPlanData: {
    title: string;
  }) => {
    try {
      setLoading(true);
      
      const response = await testPlansApiService.updateTestPlan(id, testPlanData);
      
      const updatedTestPlan = testPlansApiService.transformApiTestPlan(response.data);
      setTestPlans(prevTestPlans => 
        prevTestPlans.map(testPlan => 
          testPlan.id === id ? updatedTestPlan : testPlan
        )
      );
      
      toast.success('Test plan updated successfully');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update test plan';
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateTestPlanStatus = useCallback(async (id: string, status: string) => {
    try {
      setLoading(true);

      const currentTestPlan = testPlans.find(tp => tp.id === id);
      if (!currentTestPlan) {
        throw new Error('Test plan not found');
      }

      const response = await testPlansApiService.updateTestPlanStatus(id, status, currentTestPlan);

      const updatedTestPlan = testPlansApiService.transformApiTestPlan(response.data);
      setTestPlans(prevTestPlans =>
        prevTestPlans.map(testPlan =>
          testPlan.id === id ? updatedTestPlan : testPlan
        )
      );

      toast.success('Test plan status updated successfully');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update test plan status';
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [testPlans]);

  const deleteTestPlan = useCallback(async (id: string) => {
    try {
      setLoading(true);

      await testPlansApiService.deleteTestPlan(id);

      setTestPlans(prevTestPlans => prevTestPlans.filter(testPlan => testPlan.id !== id));

      setPagination(prev => ({
        ...prev,
        totalItems: Math.max(0, prev.totalItems - 1),
        totalPages: Math.ceil(Math.max(0, prev.totalItems - 1) / prev.itemsPerPage)
      }));

      toast.success('Test plan deleted successfully');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete test plan';
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Smart reload optimization - ONLY when project changes
  useEffect(() => {
    const projectChanged = previousProjectId.current !== projectId;

    console.log('🔄 useTestPlans effect triggered:', {
      projectId,
      projectChanged
    });

    // Update refs BEFORE doing anything
    previousProjectId.current = projectId;

    // Load test plans ONLY if the project changed
    if (projectChanged) {
      console.log('📂 Project changed, loading test plans for project:', projectId || 'all projects');
      fetchTestPlans(1, projectId || undefined);
    } else {
      // Same project, do nothing
      console.log('✅ Same project, keeping current test plans');
    }
  }, [projectId, fetchTestPlans]);

  return {
    testPlans,
    loading,
    error,
    pagination,
    fetchTestPlans,
    searchTestPlans,
    createTestPlan,
    updateTestPlan,
    updateTestPlanStatus,
    deleteTestPlan
  };
};