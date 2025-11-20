import { apiService } from './api';
import { sharedStepsApiService } from './sharedStepsApi';

// TypeScript interfaces for API responses
export interface TestCaseAttachmentsResponse {
  data: {
    type: string;
    id: string;
    relationships: {
      attachments: {
        data: Array<{
          type: string;
          id: string;
          meta?: {
            order?: number;
          };
        }>;
      };
    };
  };
}

export interface TestCaseStepResultsResponse {
  data: {
    type: string;
    id: string;
    relationships: {
      stepResults: {
        data: Array<{
          type: string;
          id: string;
          meta: {
            order: number;
          };
        }>;
      };
    };
  };
}

export interface TestCaseSharedStepsResponse {
  data: {
    type: string;
    id: string;
    relationships: {
      sharedSteps: {
        data: Array<{
          type: string;
          id: string;
          meta: {
            order: number;
            pivot_id: number;
          };
        }>;
      };
    };
  };
}

// Processed data interfaces
export interface ProcessedStepResult {
  id: string;
  originalId: string;
  step: string;
  result: string;
  order: number;
}

export interface ProcessedSharedStep {
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

export interface ProcessedAttachment {
  id: string;
  url: string;
  fileName: string;
  name?: string;
  order?: number;
}

export interface TestCaseCompleteData {
  stepResults: ProcessedStepResult[];
  sharedSteps: ProcessedSharedStep[];
  attachments: ProcessedAttachment[];
  stepOrder: Array<{
    type: 'step' | 'shared';
    id: string;
    order: number;
  }>;
}

export interface TestCaseDataFetchResult {
  success: boolean;
  data?: TestCaseCompleteData;
  error?: string;
  partialData?: {
    stepResults?: ProcessedStepResult[];
    sharedSteps?: ProcessedSharedStep[];
    attachments?: ProcessedAttachment[];
  };
}

class TestCaseDataService {
  /**
   * Fetch attachments for a test case
   */
  private async fetchTestCaseAttachments(testCaseId: string): Promise<ProcessedAttachment[]> {
    try {
      console.log('📎 Fetching attachments for test case:', testCaseId);
      
      const response: TestCaseAttachmentsResponse = await apiService.authenticatedRequest(
        `/test_cases/${testCaseId}/attachments`
      );
      
      if (!response?.data?.relationships?.attachments?.data) {
        console.log('📎 No attachments found in response');
        return [];
      }
      
      const attachmentRefs = response.data.relationships.attachments.data;
      console.log('📎 Found', attachmentRefs.length, 'attachment references');
      
      // Fetch details for each attachment
      const attachmentPromises = attachmentRefs.map(async (attachmentRef, index) => {
        try {
          const attachmentId = attachmentRef.id.split('/').pop() || attachmentRef.id;
          console.log('📎 Fetching attachment details for ID:', attachmentId);
          
          const attachmentResponse = await apiService.authenticatedRequest(`/attachments/${attachmentId}`);
          
          if (attachmentResponse?.data?.attributes) {
            const url = attachmentResponse.data.attributes.url;
            const fileName = url.split('/').pop() || 'Unknown file';
            const name = attachmentResponse.data.attributes.name;

            return {
              id: attachmentId,
              url: url,
              fileName: fileName,
              name: name,
              order: attachmentRef.meta?.order || index + 1
            };
          }
          return null;
        } catch (error) {
          console.error('📎 Failed to fetch attachment details:', error);
          return null;
        }
      });
      
      const attachments = (await Promise.all(attachmentPromises))
        .filter(Boolean) as ProcessedAttachment[];
      
      // Sort by order
      attachments.sort((a, b) => (a.order || 0) - (b.order || 0));
      
      console.log('📎 Successfully processed', attachments.length, 'attachments');
      return attachments;
      
    } catch (error) {
      console.error('📎 Failed to fetch test case attachments:', error);
      throw new Error(`Failed to fetch attachments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch step results for a test case
   */
  private async fetchTestCaseStepResults(testCaseId: string): Promise<ProcessedStepResult[]> {
    try {
      console.log('📋 Fetching step results for test case:', testCaseId);
      
      const response: TestCaseStepResultsResponse = await apiService.authenticatedRequest(
        `/test_cases/${testCaseId}/step_results`
      );
      
      if (!response?.data?.relationships?.stepResults?.data) {
        console.log('📋 No step results found in response');
        return [];
      }
      
      const stepResultRefs = response.data.relationships.stepResults.data;
      console.log('📋 Found', stepResultRefs.length, 'step result references');
      
      // Fetch details for each step result
      const stepResultPromises = stepResultRefs.map(async (stepResultRef) => {
        try {
          const stepResultId = stepResultRef.id.split('/').pop() || stepResultRef.id;
          console.log('📋 Fetching step result details for ID:', stepResultId);
          
          const stepResultResponse = await apiService.authenticatedRequest(`/step_results/${stepResultId}`);
          
          if (stepResultResponse?.data?.attributes) {
            return {
              id: stepResultId,
              originalId: stepResultId,
              step: stepResultResponse.data.attributes.step || '',
              result: stepResultResponse.data.attributes.result || '',
              order: stepResultRef.meta.order
            };
          }
          return null;
        } catch (error) {
          console.error('📋 Failed to fetch step result details:', error);
          return null;
        }
      });
      
      const stepResults = (await Promise.all(stepResultPromises))
        .filter(Boolean) as ProcessedStepResult[];
      
      // Sort by order
      stepResults.sort((a, b) => a.order - b.order);
      
      console.log('📋 Successfully processed', stepResults.length, 'step results');
      return stepResults;
      
    } catch (error) {
      console.error('📋 Failed to fetch test case step results:', error);
      throw new Error(`Failed to fetch step results: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch shared steps for a test case
   */
  private async fetchTestCaseSharedSteps(testCaseId: string): Promise<ProcessedSharedStep[]> {
    try {
      console.log('🔗 Fetching shared steps for test case:', testCaseId);
      
      const response: TestCaseSharedStepsResponse = await apiService.authenticatedRequest(
        `/test_cases/${testCaseId}/shared_steps`
      );
      
      if (!response?.data?.relationships?.sharedSteps?.data) {
        console.log('🔗 No shared steps found in response');
        return [];
      }
      
      const sharedStepRefs = response.data.relationships.sharedSteps.data;
      console.log('🔗 Found', sharedStepRefs.length, 'shared step references');
      
      // Fetch details for each shared step
      const sharedStepPromises = sharedStepRefs.map(async (sharedStepRef) => {
        try {
          const sharedStepId = sharedStepRef.id.split('/').pop() || sharedStepRef.id;
          const pivotId = sharedStepRef.meta.pivot_id;
          const order = sharedStepRef.meta.order;
          
          console.log('🔗 Fetching shared step details for ID:', sharedStepId, 'pivot_id:', pivotId, 'order:', order);
          
          const sharedStepResponse = await sharedStepsApiService.getSharedStep(sharedStepId);
          
          if (sharedStepResponse?.data) {
            const transformedSharedStep = sharedStepsApiService.transformApiSharedStep(
              sharedStepResponse.data, 
              sharedStepResponse.included
            );
            
            // Add the pivot_id and order from the relationship metadata
            return {
              ...transformedSharedStep,
              order: order,
              pivotId: pivotId
            } as ProcessedSharedStep;
          }
          return null;
        } catch (error) {
          console.error('🔗 Failed to fetch shared step details:', error);
          return null;
        }
      });
      
      const sharedSteps = (await Promise.all(sharedStepPromises))
        .filter(Boolean) as ProcessedSharedStep[];
      
      // Sort by order
      sharedSteps.sort((a, b) => a.order - b.order);
      
      console.log('🔗 Successfully processed', sharedSteps.length, 'shared steps');
      return sharedSteps;
      
    } catch (error) {
      console.error('🔗 Failed to fetch test case shared steps:', error);
      throw new Error(`Failed to fetch shared steps: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build the combined step order array
   */
  private buildStepOrder(stepResults: ProcessedStepResult[], sharedSteps: ProcessedSharedStep[]): Array<{
    type: 'step' | 'shared';
    id: string;
    order: number;
  }> {
    const allItems: Array<{
      type: 'step' | 'shared';
      id: string;
      order: number;
    }> = [];
    
    // Add step results
    stepResults.forEach(stepResult => {
      allItems.push({
        type: 'step',
        id: stepResult.id,
        order: stepResult.order
      });
    });
    
    // Add shared steps with pivot_id for uniqueness
    sharedSteps.forEach(sharedStep => {
      allItems.push({
        type: 'shared',
        id: `shared-${sharedStep.id}-${sharedStep.pivotId}`, // Include pivot_id for uniqueness
        order: sharedStep.order
      });
    });
    
    // Sort by order
    allItems.sort((a, b) => a.order - b.order);
    
    console.log('📊 Built step order with', allItems.length, 'items');
    return allItems;
  }

  /**
   * Fetch complete test case data from all three endpoints
   */
  async fetchCompleteTestCaseData(testCaseId: string): Promise<TestCaseDataFetchResult> {
    console.log('🔄 Starting complete test case data fetch for ID:', testCaseId);
    
    const errors: string[] = [];
    const partialData: TestCaseDataFetchResult['partialData'] = {};
    
    try {
      // Make all three API calls in parallel for better performance
      const [attachmentsResult, stepResultsResult, sharedStepsResult] = await Promise.allSettled([
        this.fetchTestCaseAttachments(testCaseId),
        this.fetchTestCaseStepResults(testCaseId),
        this.fetchTestCaseSharedSteps(testCaseId)
      ]);
      
      // Process attachments result
      if (attachmentsResult.status === 'fulfilled') {
        partialData.attachments = attachmentsResult.value;
        console.log('✅ Attachments fetched successfully:', attachmentsResult.value.length);
      } else {
        errors.push(`Attachments: ${attachmentsResult.reason.message}`);
        console.error('❌ Attachments fetch failed:', attachmentsResult.reason);
        partialData.attachments = [];
      }
      
      // Process step results result
      if (stepResultsResult.status === 'fulfilled') {
        partialData.stepResults = stepResultsResult.value;
        console.log('✅ Step results fetched successfully:', stepResultsResult.value.length);
      } else {
        errors.push(`Step results: ${stepResultsResult.reason.message}`);
        console.error('❌ Step results fetch failed:', stepResultsResult.reason);
        partialData.stepResults = [];
      }
      
      // Process shared steps result
      if (sharedStepsResult.status === 'fulfilled') {
        partialData.sharedSteps = sharedStepsResult.value;
        console.log('✅ Shared steps fetched successfully:', sharedStepsResult.value.length);
      } else {
        errors.push(`Shared steps: ${sharedStepsResult.reason.message}`);
        console.error('❌ Shared steps fetch failed:', sharedStepsResult.reason);
        partialData.sharedSteps = [];
      }
      
      // Build step order from successfully fetched data
      const stepOrder = this.buildStepOrder(
        partialData.stepResults || [],
        partialData.sharedSteps || []
      );
      
      // If we have any data, consider it a success (even if some endpoints failed)
      const hasAnyData = (partialData.stepResults?.length || 0) > 0 || 
                         (partialData.sharedSteps?.length || 0) > 0 || 
                         (partialData.attachments?.length || 0) > 0;
      
      if (hasAnyData || errors.length === 0) {
        console.log('✅ Test case data fetch completed successfully');
        return {
          success: true,
          data: {
            stepResults: partialData.stepResults || [],
            sharedSteps: partialData.sharedSteps || [],
            attachments: partialData.attachments || [],
            stepOrder
          }
        };
      } else {
        console.log('⚠️ Test case data fetch completed with errors:', errors);
        return {
          success: false,
          error: `Failed to fetch test case data: ${errors.join(', ')}`,
          partialData
        };
      }
      
    } catch (error) {
      console.error('❌ Critical error during test case data fetch:', error);
      return {
        success: false,
        error: `Critical error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        partialData
      };
    }
  }

  /**
   * Delete a shared step instance using pivot_id
   */
  async deleteSharedStepInstance(testCaseId: string, pivotId: number): Promise<void> {
    try {
      console.log('🗑️ Deleting shared step instance with pivot_id:', pivotId, 'from test case:', testCaseId);
      
      await apiService.authenticatedRequest(`/test_cases/${testCaseId}/shared_steps/${pivotId}`, {
        method: 'DELETE'
      });
      
      console.log('✅ Successfully deleted shared step instance with pivot_id:', pivotId);
    } catch (error) {
      console.error('❌ Failed to delete shared step instance:', error);
      throw new Error(`Failed to delete shared step instance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch data specifically for the update modal (includes edit capabilities)
   */
  async fetchTestCaseDataForUpdate(testCaseId: string): Promise<TestCaseDataFetchResult> {
    console.log('📝 Fetching test case data for update modal:', testCaseId);
    return this.fetchCompleteTestCaseData(testCaseId);
  }

  /**
   * Fetch data specifically for the details sidebar (read-only view)
   */
  async fetchTestCaseDataForDetails(testCaseId: string): Promise<TestCaseDataFetchResult> {
    console.log('👁️ Fetching test case data for details sidebar:', testCaseId);
    return this.fetchCompleteTestCaseData(testCaseId);
  }
}

export const testCaseDataService = new TestCaseDataService();