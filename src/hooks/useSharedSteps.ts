import { useState, useEffect, useRef, useCallback } from 'react';
import { sharedStepsApiService, SharedStepsApiResponse } from '../services/sharedStepsApi';
import { SharedStep } from '../services/sharedStepsApi';
import toast from 'react-hot-toast';

export const useSharedSteps = (projectId?: string | null) => {
  const [sharedSteps, setSharedSteps] = useState<SharedStep[]>([]);
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

  // Stable fetchSharedSteps function
  const fetchSharedSteps = useCallback(async (page: number = 1, targetProjectId?: string) => {
    const useProjectId = targetProjectId || projectId;
    
    if (!useProjectId) {
      console.log('🚫 Missing projectId, clearing shared steps');
      setSharedSteps([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('📋 Fetching shared steps for project:', useProjectId, 'page:', page);
      
      let response: SharedStepsApiResponse = await sharedStepsApiService.getSharedSteps(
        useProjectId,
        page,
        30
      );
      
      if (!response) {
        response = sharedStepsApiService.getDefaultSharedStepsResponse();
      }
      
      const responseData = response?.data || [];
      const responseMeta = response?.meta || {
        currentPage: 1,
        totalItems: 0,
        itemsPerPage: 30
      };
      const included = response?.included || [];
      
      const transformedSharedSteps = responseData.map(apiSharedStep => 
        sharedStepsApiService.transformApiSharedStep(apiSharedStep, included)
      );
      
      console.log('✅ Fetched', transformedSharedSteps.length, 'shared steps');
      
      setSharedSteps(transformedSharedSteps);
      setPagination({
        currentPage: responseMeta.currentPage,
        totalItems: responseMeta.totalItems,
        itemsPerPage: responseMeta.itemsPerPage,
        totalPages: Math.ceil(responseMeta.totalItems / responseMeta.itemsPerPage)
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch shared steps';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('❌ Error fetching shared steps:', err);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- projectId is intentionally omitted to avoid re-creation
  }, []); // No dependencies to avoid re-creations

  const searchSharedSteps = useCallback(async (searchTerm: string, page: number = 1) => {
    if (!projectId) {
      setSharedSteps([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Searching shared steps:', searchTerm);
      
      let response: SharedStepsApiResponse = await sharedStepsApiService.searchSharedSteps(
        searchTerm,
        projectId,
        page,
        30
      );
      
      if (!response) {
        response = sharedStepsApiService.getDefaultSharedStepsResponse();
      }
      
      const responseData = response?.data || [];
      const responseMeta = response?.meta || {
        currentPage: 1,
        totalItems: 0,
        itemsPerPage: 30
      };
      const included = response?.included || [];
      
      const transformedSharedSteps = responseData.map(apiSharedStep => 
        sharedStepsApiService.transformApiSharedStep(apiSharedStep, included)
      );
      
      setSharedSteps(transformedSharedSteps);
      setPagination({
        currentPage: responseMeta.currentPage,
        totalItems: responseMeta.totalItems,
        itemsPerPage: responseMeta.itemsPerPage,
        totalPages: Math.ceil(responseMeta.totalItems / responseMeta.itemsPerPage)
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search shared steps';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('❌ Error searching shared steps:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const createSharedStep = useCallback(async (sharedStepData: {
    title: string;
    projectId: string;
    creatorId: string;
  }) => {
    try {
      setLoading(true);
      
      const response = await sharedStepsApiService.createSharedStep(sharedStepData);
      
      // Transform the response to ensure creator information is properly displayed
      const newSharedStep = sharedStepsApiService.transformApiSharedStep(response.data, response.included);
      setSharedSteps(prevSharedSteps => [newSharedStep, ...prevSharedSteps]);
      
      setPagination(prev => ({
        ...prev,
        totalItems: prev.totalItems + 1,
        totalPages: Math.ceil((prev.totalItems + 1) / prev.itemsPerPage)
      }));
      
      
      toast.success('Shared step created successfully');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create shared step';
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSharedStep = useCallback(async (id: string, sharedStepData: {
    title: string;
    description: string;
  }) => {
    try {
      setLoading(true);
      
      const response = await sharedStepsApiService.updateSharedStep(id, sharedStepData);
      
      const updatedSharedStep = sharedStepsApiService.transformApiSharedStep(response.data, response.included);
      setSharedSteps(prevSharedSteps => 
        prevSharedSteps.map(sharedStep => 
          sharedStep.id === id ? updatedSharedStep : sharedStep
        )
      );
      
      toast.success('Shared step updated successfully');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update shared step';
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteSharedStep = useCallback(async (id: string) => {
    try {
      setLoading(true);
      
      await sharedStepsApiService.deleteSharedStep(id);
      
      setSharedSteps(prevSharedSteps => prevSharedSteps.filter(sharedStep => sharedStep.id !== id));
      
      setPagination(prev => ({
        ...prev,
        totalItems: Math.max(0, prev.totalItems - 1),
        totalPages: Math.ceil(Math.max(0, prev.totalItems - 1) / prev.itemsPerPage)
      }));
      
      toast.success('Shared step deleted successfully');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete shared step';
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Smart reload optimization - ONLY when project changes
  useEffect(() => {
    const projectChanged = previousProjectId.current !== projectId;

    console.log('🔄 useSharedSteps effect triggered:', {
      projectId,
      projectChanged
    });

    // Update refs BEFORE doing anything
    previousProjectId.current = projectId;

    // Load shared steps ONLY if we have a project AND the project changed
    if (projectId && projectChanged) {
      console.log('📂 Project changed, loading shared steps for project:', projectId);
      fetchSharedSteps(1, projectId);
    } else if (!projectId) {
      // No project selected
      console.log('🚫 No project selected, clearing shared steps');
      setSharedSteps([]);
      setLoading(false);
    } else {
      // Same project, do nothing
      console.log('✅ Same project, keeping current shared steps');
    }
  }, [projectId, fetchSharedSteps]);

  return {
    sharedSteps,
    loading,
    error,
    pagination,
    fetchSharedSteps,
    searchSharedSteps,
    createSharedStep,
    updateSharedStep,
    deleteSharedStep
  };
};