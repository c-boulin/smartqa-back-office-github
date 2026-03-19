import { apiService } from './api';
import { testCasesApiService, type TestCaseDetailsPayload } from './testCasesApi';
import { sharedStepsApiService } from './sharedStepsApi';
import { Tag } from './tagsApi';

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
  pivotId?: number;
  instanceId?: string;
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
  /** Tag objects with id and label - ensures API receives id not label */
  tags: Array<{ id: string; label: string }>;
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

/** Partial data emitted for progressive loading - available before shared steps load */
export interface TestCasePartialData {
  stepResults: ProcessedStepResult[];
  attachments: ProcessedAttachment[];
  tags: string[];
  stepOrder: Array<{ type: 'step' | 'shared'; id: string; order: number }>;
}

export interface FetchTestCaseDataOptions {
  onPartialData?: (data: TestCasePartialData) => void;
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
   * Fetch complete test case data with optional progressive loading.
   * When onPartialData is provided, it's called as soon as step results, attachments, and tags are ready
   * (before shared steps finish loading), so the UI can display content faster.
   */
  async fetchCompleteTestCaseData(
    testCaseId: string,
    availableTags: Tag[] = [],
    options: FetchTestCaseDataOptions = {}
  ): Promise<TestCaseDataFetchResult> {
    const { onPartialData } = options;

    try {
      // Run both requests in parallel - they are independent
      const [response, sharedStepsResponse] = await Promise.all([
        apiService.authenticatedRequest(
          `/test_cases/${testCaseId}?include=attachments,stepResults,user`
        ),
        apiService.authenticatedRequest(
          `/test_cases/${testCaseId}/shared_steps`
        )
      ]);

      if (!response?.data) {
        throw new Error('No data in response');
      }

      const included = response.included || [];
      const sharedStepRefs = sharedStepsResponse?.data?.relationships?.sharedSteps?.data || [];

      // Process tags
      const availableTagMap = new Map(availableTags.map(tag => [tag.id, tag.label]));
      const tagRefs = response.data.relationships?.tags?.data || [];
      const tags: string[] = tagRefs.map((tagRef: { id: string; type: string }) => {
        const tagId = tagRef.id.split('/').pop() || tagRef.id;
        const fromMap = availableTagMap.get(tagId);
        if (fromMap) {
          return fromMap;
        }
        return '';
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

      // Emit partial data immediately so UI can display step results and attachments before shared steps load
      if (onPartialData) {
        const partialStepOrder = this.buildStepOrder(stepResults, []);
        onPartialData({
          stepResults,
          attachments,
          tags,
          stepOrder: partialStepOrder
        });
      }

      // Process shared steps using the metadata from the separate endpoint
      // Fetch full details for each shared step
      const sharedStepsPromises = sharedStepRefs.map(async (sharedStepRef: { id: string; meta: { order: number; pivot_id: number } }) => {
        const sharedStepId = sharedStepRef.id.split('/').pop() || sharedStepRef.id;

        try {
          // Fetch the full shared step with its step results
          const sharedStepResponse = await apiService.authenticatedRequest(
            `/shared_steps/${sharedStepId}?include=stepResults,user`
          );

          if (!sharedStepResponse?.data) {
            console.warn(`⚠️ No data for shared step ${sharedStepId}`);
            return null;
          }

          const transformedSharedStep = sharedStepsApiService.transformApiSharedStep(
            sharedStepResponse.data,
            sharedStepResponse.included || []
          );

          return {
            ...transformedSharedStep,
            order: sharedStepRef.meta.order,
            pivotId: sharedStepRef.meta.pivot_id
          } as ProcessedSharedStep;
        } catch (error) {
          console.error(`❌ Failed to fetch shared step ${sharedStepId}:`, error);
          return null;
        }
      });

      const sharedSteps: ProcessedSharedStep[] = (await Promise.all(sharedStepsPromises))
        .filter((step): step is ProcessedSharedStep => step !== null);

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
   * Fetch data specifically for the update modal (includes edit capabilities).
   * Uses optimized GET /test_cases/{id}/update-modal which returns TestCaseCompleteData directly.
   */
  async fetchTestCaseDataForUpdate(
    testCaseId: string,
    _availableTags: Tag[] = [],
    _options: FetchTestCaseDataOptions = {}
  ): Promise<TestCaseDataFetchResult> {
    try {
      const data = await apiService.authenticatedRequest<TestCaseCompleteData>(
        `/test_cases/${testCaseId}/update-modal`
      );
      if (!data) {
        throw new Error('No data in response');
      }
      return {
        success: true,
        data: {
          stepResults: data.stepResults ?? [],
          sharedSteps: data.sharedSteps ?? [],
          attachments: (data.attachments ?? []).map(att => ({
            id: att.id,
            url: att.url ?? '',
            fileName: att.fileName ?? att.url?.split('/').pop() ?? 'Unknown file',
            name: att.name,
            order: att.order,
          })),
          stepOrder: (data.stepOrder ?? []).map(item => ({
            type: item.type as 'step' | 'shared',
            id: item.id,
            order: item.order ?? 0,
          })),
          tags: (data.tags ?? []).map(t => typeof t === 'string' ? { id: t, label: t } : t),
        },
      };
    } catch (error) {
      console.error('❌ Failed to fetch test case update modal data:', error);
      return {
        success: false,
        error: `Failed to fetch test case data: ${error instanceof Error ? error.message : 'Unknown'}`,
        partialData: { stepResults: [], sharedSteps: [], attachments: [], tags: [] },
      };
    }
  }

  /**
   * Fetch data specifically for the details sidebar (read-only view).
   * Uses optimized GET /test_cases/{id}/details when available.
   */
  async fetchTestCaseDataForDetails(testCaseId: string, _availableTags: Tag[] = []): Promise<TestCaseDataFetchResult> {
    try {
      const details = await testCasesApiService.getTestCaseDetails(testCaseId);

      const stepResults: ProcessedStepResult[] = (details.stepResults ?? []).map(sr => ({
        id: sr.id,
        originalId: sr.id,
        step: sr.step ?? '',
        result: sr.result ?? '',
        originalStep: sr.step ?? '',
        originalResult: sr.result ?? '',
        order: sr.order ?? 0,
      }));

      const sharedSteps: ProcessedSharedStep[] = (details.sharedSteps ?? []).map((ss, index) => ({
        id: ss.id,
        title: ss.title ?? '',
        description: ss.description ?? '',
        order: ss.order ?? index,
        pivotId: ss.pivotId,
        projectId: '',
        stepsCount: ss.steps?.length ?? 0,
        usedInCount: 0,
        stepResults: (ss.steps ?? []).map(st => ({
          id: st.id,
          step: st.step ?? '',
          result: st.result ?? '',
          order: st.order ?? 0,
        })),
        createdBy: { id: '', name: '', email: '' },
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const attachments: ProcessedAttachment[] = (details.attachments ?? []).map((att, index) => ({
        id: att.id,
        url: att.url ?? '',
        fileName: att.url?.split('/').pop() ?? 'Unknown file',
        name: att.name,
        order: index + 1,
      }));

      const stepOrder = this.buildStepOrder(stepResults, sharedSteps);

      return {
        success: true,
        data: {
          stepResults,
          sharedSteps,
          attachments,
          stepOrder,
          tags: details.tags ?? [],
        },
      };
    } catch (error) {
      console.error('❌ Failed to fetch test case details (details endpoint):', error);
      return this.fetchCompleteTestCaseData(testCaseId, _availableTags);
    }
  }
}

export const testCaseDataService = new TestCaseDataService();