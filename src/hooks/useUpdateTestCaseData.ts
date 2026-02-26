import { useState, useCallback } from 'react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Type imports needed for proper typing
import { testCaseDataService, ProcessedStepResult, ProcessedSharedStep, ProcessedAttachment, TestCaseCompleteData } from '../services/testCaseDataService';
import { testCaseDataCache } from '../services/testCaseDataCache';
import { TestCase } from '../types';
import { Tag } from '../services/tagsApi';
// import { SharedStep } from '../services/sharedStepsApi';

interface TestStep {
  id: string;
  step: string;
  result: string;
  originalId?: string;
  originalStep?: string;
  originalResult?: string;
}

interface SharedStepInstance {
  id: string;
  title: string;
  description?: string;
  order: number;
  pivotId?: number;
  instanceId?: string;
  projectId: string;
  stepsCount: number;
  usedInCount: number;
  stepResults: string[];
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface UseUpdateTestCaseDataReturn {
  testSteps: TestStep[];
  setTestSteps: React.Dispatch<React.SetStateAction<TestStep[]>>;
  sharedSteps: SharedStepInstance[];
  setSharedSteps: React.Dispatch<React.SetStateAction<SharedStepInstance[]>>;
  stepOrder: Array<{ type: 'step' | 'shared'; id: string }>;
  setStepOrder: React.Dispatch<React.SetStateAction<Array<{ type: 'step' | 'shared'; id: string }>>>;
  selectedTags: Tag[];
  setSelectedTags: React.Dispatch<React.SetStateAction<Tag[]>>;
  existingAttachments: ProcessedAttachment[];
  setExistingAttachments: React.Dispatch<React.SetStateAction<ProcessedAttachment[]>>;
  loadingAttachments: boolean;
  isLoadingData: boolean;
  loadTestCaseData: (testCase: TestCase, availableTags: Tag[]) => Promise<void>;
  resetData: () => void;
  deleteSharedStepInstance: (pivotId: number) => Promise<void>;
}

export const useUpdateTestCaseData = (): UseUpdateTestCaseDataReturn => {
  const [testSteps, setTestSteps] = useState<TestStep[]>([]);
  const [sharedSteps, setSharedSteps] = useState<SharedStepInstance[]>([]);
  const [stepOrder, setStepOrder] = useState<Array<{ type: 'step' | 'shared'; id: string }>>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<ProcessedAttachment[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- State setter needed for parent component - CRASHES if removed!
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // const deleteSharedStepInstance = useCallback(async (pivotId: number, testCaseId?: string) => {
  //   if (!testCaseId) {
  //     console.error('❌ Cannot delete shared step instance: missing test case ID');
  //     return;
  //   }
  //
  //   try {
  //     
  //     await testCaseDataService.deleteSharedStepInstance(testCaseId, pivotId);
  //     
  //     // Remove from local state
  //     setSharedSteps(prev => prev.filter(step => step.pivotId !== pivotId));
  //     setStepOrder(prev => prev.filter(item => 
  //       !(item.type === 'shared' && item.id.includes(`-${pivotId}`))
  //     ));
  //     
  //     
  //   } catch (error) {
  //     console.error('❌ Failed to delete shared step instance:', error);
  //     throw error;
  //   }
  // }, []);

  const applyCompleteData = useCallback((
    data: TestCaseCompleteData,
    _testCase: TestCase,
    availableTags: Tag[]
  ) => {
    const transformedTestSteps = data.stepResults.map(sr => ({
      id: sr.id,
      originalId: sr.originalId,
      step: sr.step,
      result: sr.result,
      originalStep: sr.originalStep,
      originalResult: sr.originalResult
    }));
    setTestSteps(transformedTestSteps);
    setSharedSteps(data.sharedSteps);
    setExistingAttachments(data.attachments);
    setStepOrder(data.stepOrder.map(item => ({ type: item.type, id: item.id })));
    setSelectedTags(
      data.tags
        .map(label => availableTags.find(t => t.label === label) || { id: label, label })
        .filter((t): t is Tag => !!t.id)
    );
  }, []);

  const loadTestCaseData = useCallback(async (testCase: TestCase, availableTags: Tag[]) => {
    setIsLoadingData(true);
    
    try {
      // Use cache first - instant display for recently viewed or prefetched test cases
      const cachedOrFetched = await testCaseDataCache.getOrWait(testCase.id, availableTags);
      
      if (cachedOrFetched) {
        applyCompleteData(cachedOrFetched, testCase, availableTags);
        setIsLoadingData(false);
        return;
      }
      
      // Fallback: fetch directly if cache missed and fetch failed
      const result = await testCaseDataService.fetchTestCaseDataForUpdate(testCase.id, availableTags, {
        onPartialData: (partial) => {
          const transformedTestSteps = partial.stepResults.map(sr => ({
            id: sr.id,
            originalId: sr.originalId,
            step: sr.step,
            result: sr.result,
            originalStep: sr.originalStep,
            originalResult: sr.originalResult
          }));
          setTestSteps(transformedTestSteps);
          setExistingAttachments(partial.attachments);
          setStepOrder(partial.stepOrder.map(item => ({ type: item.type, id: item.id })));
          setSelectedTags(
            partial.tags
              .map(label => availableTags.find(t => t.label === label) || { id: label, label })
              .filter((t): t is Tag => !!t.id)
          );
        }
      });
      
      if (!result.success) {
        console.error('❌ Failed to fetch complete test case data:', result.error);
        
        // Use partial data if available
        if (result.partialData) {

          setTestSteps(result.partialData.stepResults?.map(sr => ({
            id: sr.id,
            originalId: sr.originalId,
            step: sr.step,
            result: sr.result,
            originalStep: sr.originalStep,
            originalResult: sr.originalResult
          })) || []);
          
          setSharedSteps(result.partialData.sharedSteps || []);
          setExistingAttachments(result.partialData.attachments || []);
          
          // Build step order from partial data
          const stepOrder = (result.partialData.stepResults || []).map(sr => ({
            type: 'step' as const,
            id: sr.id
          })).concat(
            (result.partialData.sharedSteps || []).map(ss => ({
              type: 'shared' as const,
              id: `shared-${ss.id}-${ss.pivotId}`
            }))
          );
          
          setStepOrder(stepOrder);
        }
        
        throw new Error(result.error || 'Failed to fetch test case data');
      }
      
      // Successfully fetched all data
      applyCompleteData(result.data!, testCase, availableTags);
      
    } catch (error) {
      console.error('❌ Failed to load test case data:', error);
      setTestSteps([]);
      setSharedSteps([]);
      setExistingAttachments([]);
      setStepOrder([]);
      throw error;
    } finally {
      setIsLoadingData(false);
    }
  }, [applyCompleteData]);

  const resetData = useCallback(() => {
    setTestSteps([]);
    setSharedSteps([]);
    setStepOrder([]);
    setSelectedTags([]);
    setExistingAttachments([]);
    setIsLoadingData(false);
  }, []);

  const handleDeleteSharedStepInstance = useCallback(async (pivotId: number) => {
    // Remove from local state by pivot ID
    setSharedSteps(prev => prev.filter(step => step.pivotId !== pivotId));
    setStepOrder(prev => prev.filter(item =>
      !(item.type === 'shared' && item.id.includes(`-${pivotId}`))
    ));
  }, []);
  return {
    testSteps,
    setTestSteps,
    sharedSteps,
    setSharedSteps,
    stepOrder,
    setStepOrder,
    selectedTags,
    setSelectedTags,
    existingAttachments,
    setExistingAttachments,
    loadingAttachments,
    isLoadingData,
    loadTestCaseData,
    resetData,
    deleteSharedStepInstance: handleDeleteSharedStepInstance
  };
};