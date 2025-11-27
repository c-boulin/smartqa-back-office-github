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
  originalStep: string;
  originalResult: string;
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
  stepResults: (string | { id: string; step: string; result: string; order: number })[];
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
  tags: string[];
}

export interface TestCaseDataFetchResult {
  success: boolean;
  data?: TestCaseCompleteData;
  error?: string;
  partialData?: {
    stepResults?: ProcessedStepResult[];
    sharedSteps?: ProcessedSharedStep[];
    attachments?: ProcessedAttachment[];
    tags?: string[];
  };
}

class TestCaseDataService {
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

    return allItems;
  }

  /**
   * Fetch complete test case data in a single optimized request
   */
  async fetchCompleteTestCaseData(testCaseId: string): Promise<TestCaseDataFetchResult> {

    try {
      // Single request with all includes (including nested sharedSteps.stepResults)
      const response = await apiService.authenticatedRequest(
        `/test_cases/${testCaseId}?include=attachments,stepResults,sharedSteps,sharedSteps.stepResults,user,tags`
      );

      if (!response?.data) {
        throw new Error('No data in response');
      }

      const included = response.included || [];

      // Process tags
      const tagRefs = response.data.relationships?.tags?.data || [];
      const tags: string[] = tagRefs.map((tagRef: { id: string; type: string }) => {
        const tagId = tagRef.id.split('/').pop() || tagRef.id;
        const includedTag = included.find((item: { type: string; id: string }) => {
          const itemId = item.id.split('/').pop() || item.id;
          return item.type === 'Tag' && itemId === tagId;
        });
        return includedTag?.attributes?.label || '';
      }).filter(Boolean);

      // Process attachments
      const attachmentRefs = response.data.relationships?.attachments?.data || [];
      const attachments: ProcessedAttachment[] = attachmentRefs.map((attachmentRef: { id: string; meta?: { order?: number } }, index: number) => {
        const attachmentId = attachmentRef.id.split('/').pop() || attachmentRef.id;
        const includedAttachment = included.find((item: { type: string; id: string }) => {
          const itemId = item.id.split('/').pop() || item.id;
          return item.type === 'Attachment' && itemId === attachmentId;
        });

        if (includedAttachment?.attributes) {
          const url = includedAttachment.attributes.url;
          const fileName = url.split('/').pop() || 'Unknown file';
          const name = includedAttachment.attributes.name || fileName;

          return {
            id: attachmentId,
            url: url,
            fileName: fileName,
            name: name,
            order: attachmentRef.meta?.order || includedAttachment.attributes.pivotId || index + 1
          };
        }
        return null;
      }).filter(Boolean) as ProcessedAttachment[];

      attachments.sort((a, b) => (a.order || 0) - (b.order || 0));

      // Process step results
      const stepResultRefs = response.data.relationships?.stepResults?.data || [];
      const stepResults: ProcessedStepResult[] = stepResultRefs.map((stepResultRef: { id: string; meta?: { order?: number } }) => {
        const stepResultId = stepResultRef.id.split('/').pop() || stepResultRef.id;
        const includedStepResult = included.find((item: { type: string; id: string }) => {
          const itemId = item.id.split('/').pop() || item.id;
          return item.type === 'StepResult' && itemId === stepResultId;
        });

        if (includedStepResult?.attributes) {
          const stepContent = includedStepResult.attributes.step || '';
          const resultContent = includedStepResult.attributes.result || '';
          return {
            id: stepResultId,
            originalId: stepResultId,
            step: stepContent,
            result: resultContent,
            originalStep: stepContent,
            originalResult: resultContent,
            order: includedStepResult.attributes.order || stepResultRef.meta?.order || 0,
            pivotId: includedStepResult.attributes.pivotId || 0
          };
        }
        return null;
      }).filter(Boolean) as ProcessedStepResult[];

      stepResults.sort((a, b) => a.order - b.order);

      // Process shared steps
      const sharedStepRefs = response.data.relationships?.sharedSteps?.data || [];

      const sharedSteps: ProcessedSharedStep[] = sharedStepRefs.map((sharedStepRef: { id: string; meta?: { pivot_id?: number; order?: number } }, index: number) => {
        const sharedStepId = sharedStepRef.id.split('/').pop() || sharedStepRef.id;

        const includedSharedStep = included.find((item: { type: string; id: string }) => {
          const itemId = item.id.split('/').pop() || item.id;
          return item.type === 'SharedStep' && itemId === sharedStepId;
        });

        if (includedSharedStep) {

          const transformedSharedStep = sharedStepsApiService.transformApiSharedStep(
            includedSharedStep,
            included
          );

          const order = includedSharedStep.attributes?.order || sharedStepRef.meta?.order || index + 1;
          const pivotId = includedSharedStep.attributes?.pivotId || sharedStepRef.meta?.pivot_id || 0;

          return {
            ...transformedSharedStep,
            order: order,
            pivotId: pivotId
          } as ProcessedSharedStep;
        }

        return null;
      }).filter(Boolean) as ProcessedSharedStep[];

      sharedSteps.sort((a, b) => a.order - b.order);

      // Build step order
      const stepOrder = this.buildStepOrder(stepResults, sharedSteps);

      return {
        success: true,
        data: {
          stepResults,
          sharedSteps,
          attachments,
          stepOrder,
          tags
        }
      };

    } catch (error) {
      console.error('❌ Failed to fetch test case data:', error);
      return {
        success: false,
        error: `Failed to fetch test case data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        partialData: {
          stepResults: [],
          sharedSteps: [],
          attachments: [],
          tags: []
        }
      };
    }
  }

  /**
   * Delete a shared step instance using pivot_id
   */
  async deleteSharedStepInstance(testCaseId: string, pivotId: number): Promise<void> {
    try {

      await apiService.authenticatedRequest(`/test_cases/${testCaseId}/shared_steps/${pivotId}`, {
        method: 'DELETE'
      });

    } catch (error) {
      console.error('❌ Failed to delete shared step instance:', error);
      throw new Error(`Failed to delete shared step instance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch data specifically for the update modal (includes edit capabilities)
   */
  async fetchTestCaseDataForUpdate(testCaseId: string): Promise<TestCaseDataFetchResult> {

    return this.fetchCompleteTestCaseData(testCaseId);
  }

  /**
   * Fetch data specifically for the details sidebar (read-only view)
   */
  async fetchTestCaseDataForDetails(testCaseId: string): Promise<TestCaseDataFetchResult> {

    return this.fetchCompleteTestCaseData(testCaseId);
  }
}

export const testCaseDataService = new TestCaseDataService();