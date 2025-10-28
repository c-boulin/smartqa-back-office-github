import { useState, useCallback } from 'react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Type imports needed for proper typing
import { testCaseDataService, ProcessedStepResult, ProcessedSharedStep, ProcessedAttachment } from '../services/testCaseDataService';
import { TestCase } from '../types';
import { Tag } from '../services/tagsApi';
// import { SharedStep } from '../services/sharedStepsApi';

interface TestStep {
  id: string;
  step: string;
  result: string;
  originalId?: string;
}

interface SharedStepInstance {
  id: string;
  title: string;
  description?: string;
  order: number;
  pivotId: number;
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
  //     console.log('🗑️ Deleting shared step instance with pivot_id:', pivotId);
  //     await testCaseDataService.deleteSharedStepInstance(testCaseId, pivotId);
  //     
  //     // Remove from local state
  //     setSharedSteps(prev => prev.filter(step => step.pivotId !== pivotId));
  //     setStepOrder(prev => prev.filter(item => 
  //       !(item.type === 'shared' && item.id.includes(`-${pivotId}`))
  //     ));
  //     
  //     console.log('✅ Successfully removed shared step instance from local state');
  //   } catch (error) {
  //     console.error('❌ Failed to delete shared step instance:', error);
  //     throw error;
  //   }
  // }, []);

  const loadTestCaseData = useCallback(async (testCase: TestCase, availableTags: Tag[]) => {
    setIsLoadingData(true);
    
    try {
      console.log('🔄 Using new API endpoints to fetch test case data:', testCase.id);
      
      // Use the new service to fetch data from all three endpoints
      const result = await testCaseDataService.fetchTestCaseDataForUpdate(testCase.id);
      
      if (!result.success) {
        console.error('❌ Failed to fetch complete test case data:', result.error);
        
        // Use partial data if available
        if (result.partialData) {
          console.log('⚠️ Using partial data due to some API failures');
          setTestSteps(result.partialData.stepResults?.map(sr => ({
            id: sr.id,
            originalId: sr.originalId,
            step: sr.step,
            result: sr.result
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
      const { stepResults, sharedSteps: fetchedSharedSteps, attachments, stepOrder } = result.data!;
      
      console.log('✅ Successfully fetched test case data:', {
        stepResults: stepResults.length,
        sharedSteps: fetchedSharedSteps.length,
        attachments: attachments.length,
        stepOrder: stepOrder.length
      });
      
      // Transform step results to TestStep format
      const transformedTestSteps = stepResults.map(sr => ({
        id: sr.id,
        originalId: sr.originalId,
        step: sr.step,
        result: sr.result
      }));
      
      setTestSteps(transformedTestSteps);
      setSharedSteps(fetchedSharedSteps);
      setExistingAttachments(attachments);
      
      // Set step order (convert to the format expected by the UI)
      const uiStepOrder = stepOrder.map(item => ({
        type: item.type,
        id: item.id
      }));
      setStepOrder(uiStepOrder);
      
      // Process tags
      let existingTags: Tag[] = [];
      if (testCase.tags && testCase.tags.length > 0) {
        existingTags = testCase.tags
          .filter(tagLabel => tagLabel && typeof tagLabel === 'string')
          .map(tagLabel => {
            const foundTag = availableTags.find(availableTag => availableTag.label === tagLabel);
            return foundTag || {
              id: tagLabel,
              label: tagLabel
            };
          })
          .filter(tag => tag !== null && tag !== undefined);
      }
      setSelectedTags(existingTags);
      
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
  }, []);

  const resetData = useCallback(() => {
    setTestSteps([]);
    setSharedSteps([]);
    setStepOrder([]);
    setSelectedTags([]);
    setExistingAttachments([]);
    setIsLoadingData(false);
  }, []);

  const handleDeleteSharedStepInstance = useCallback(async (pivotId: number) => {
    // Find the test case ID from the current context
    // This would need to be passed from the parent component
    console.log('🗑️ Attempting to delete shared step instance with pivot_id:', pivotId);
    
    // For now, just remove from local state
    // The actual API call should be made from the parent component
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