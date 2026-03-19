import { apiService } from './api';

export interface ApiSharedStep {
  id: string;
  type: string;
  attributes: {
    id: number;
    title: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
  };
  relationships: {
    project: {
      data: { type: string; id: string };
    };
    creator: {
      data: { type: string; id: string };
    };
    stepResults?: {
      data: Array<{ type: string; id: string }>;
    };
    testCases?: {
      data: Array<{ type: string; id: string }>;
    };
  };
}

export interface ApiCreator {
  id: string;
  type: string;
  attributes: {
    id: number;
    name: string;
    login: string;
    email: string;
  };
}

export interface SharedStepsApiResponse {
  links: {
    self: string;
    first: string;
    last: string;
    next?: string;
    prev?: string;
  };
  meta: {
    totalItems: number;
    itemsPerPage: number;
    currentPage: number;
  };
  data: ApiSharedStep[];
  included?: ApiCreator[];
}

export interface CreateSharedStepRequest {
  data: {
    type: "SharedStep";
    attributes: {
      title: string;
    };
    relationships: {
      project: {
        data: { type: string; id: string };
      };
      user: {
        data: { type: string; id: string };
      };
      creator: {
        data: { type: string; id: string };
      };
      step_results?: {
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

export interface UpdateSharedStepRequest {
  data: {
    type: "SharedStep";
    attributes: {
      title: string;
      description: string;
    };
    relationships?: {
      step_results?: {
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

export interface CreateSharedStepResponse {
  data: ApiSharedStep;
}

export interface UpdateSharedStepResponse {
  data: ApiSharedStep;
  included?: ApiCreator[];
}

export interface StepResultDetail {
  id: string;
  step: string;
  result: string;
  order: number;
}

export interface SharedStep {
  id: string;
  title: string;
  description?: string;
  projectId: string;
  stepsCount: number;
  usedInCount: number;
  stepResults?: (string | StepResultDetail)[];
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

class SharedStepsApiService {
  public getDefaultSharedStepsResponse(): SharedStepsApiResponse {
    return {
      links: {
        self: '',
        first: '',
        last: ''
      },
      meta: {
        totalItems: 0,
        itemsPerPage: 30,
        currentPage: 1
      },
      data: [],
      included: []
    };
  }

  private buildSharedStepsListUrl(projectId: string, params: Record<string, string>): string {
    const search = new URLSearchParams({ page: '1', itemsPerPage: '30', ...params });
    return `/projects/${projectId}/shared-steps-list?${search.toString()}`;
  }

  async getSharedSteps(projectId: string, page: number = 1, itemsPerPage: number = 30): Promise<SharedStepsApiResponse> {
    const params: Record<string, string> = { page: String(page), itemsPerPage: String(itemsPerPage) };
    const response = await apiService.authenticatedRequest(this.buildSharedStepsListUrl(projectId, params));
    return response || this.getDefaultSharedStepsResponse();
  }

  async searchSharedSteps(searchTerm: string, projectId: string, page: number = 1, itemsPerPage: number = 30): Promise<SharedStepsApiResponse> {
    const isNumeric = /^\d+$/.test(searchTerm.trim());
    const params: Record<string, string> = { page: String(page), itemsPerPage: String(itemsPerPage) };
    if (isNumeric) params.id = searchTerm.trim(); else params.title = searchTerm.trim();
    const response = await apiService.authenticatedRequest(this.buildSharedStepsListUrl(projectId, params));
    return response || this.getDefaultSharedStepsResponse();
  }

  async getSharedStep(id: string): Promise<{ data: ApiSharedStep; included?: (ApiCreator | { type: string; id: string; attributes: { step: string; result: string; order: number; [key: string]: unknown } })[] }> {
    return apiService.authenticatedRequest(`/shared_steps/${id}?include=creator,stepResults`);
  }

  /** Optimized endpoint: returns SharedStep format directly for edit modal (no transform needed) */
  async getSharedStepForEditModal(id: string): Promise<SharedStep> {
    const response = await apiService.authenticatedRequest<SharedStep>(`/shared_steps/${id}/edit-modal`);
    if (!response) {
      throw new Error('No response from shared step edit modal');
    }
    return {
      ...response,
      createdAt: new Date(response.createdAt),
      updatedAt: new Date(response.updatedAt)
    };
  }


  async createSharedStep(sharedStepData: {
    title: string;
    projectId: string;
    creatorId: string;
    stepResults?: Array<{
      id: string;
      order: number;
    }>;
  }): Promise<CreateSharedStepResponse> {
    const requestBody: CreateSharedStepRequest = {
      data: {
        type: "SharedStep",
        attributes: {
          title: sharedStepData.title
        },
        relationships: {
          project: {
            data: { type: "Project", id: `/api/projects/${sharedStepData.projectId}` }
          },
          user: {
            data: { type: "User", id: `/api/users/${sharedStepData.creatorId}` }
          }
        }
      }
    };

    // Add step results relationship if provided
    if (sharedStepData.stepResults && sharedStepData.stepResults.length > 0) {
      requestBody.data.relationships.step_results = {
        data: sharedStepData.stepResults.map(stepResult => ({
          type: "StepResult",
          id: `/api/step_results/${stepResult.id}`,
          meta: {
            order: stepResult.order
          }
        }))
      };
    }

    const response = await apiService.authenticatedRequest('/shared_steps?include=creator', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    if (!response) {
      throw new Error('No response received from server');
    }

    return response;
  }

  async updateSharedStep(id: string, sharedStepData: {
    title: string;
    description: string;
    stepResults?: Array<{
      id: string;
      order: number;
    }>;
  }): Promise<UpdateSharedStepResponse> {
    const requestBody: UpdateSharedStepRequest = {
      data: {
        type: "SharedStep",
        attributes: {
          title: sharedStepData.title,
          description: sharedStepData.description
        }
      }
    };

    // Add step results relationship if provided
    if (sharedStepData.stepResults && sharedStepData.stepResults.length > 0) {
      requestBody.data.relationships = {
        step_results: {
          data: sharedStepData.stepResults.map(stepResult => ({
            type: "StepResult",
            id: `/api/step_results/${stepResult.id}`,
            meta: {
              order: stepResult.order
            }
          }))
        }
      };
    }

    const response = await apiService.authenticatedRequest(`/shared_steps/${id}?include=creator`, {
      method: 'PATCH',
      body: JSON.stringify(requestBody),
    });

    if (!response) {
      throw new Error('No response received from server');
    }

    return response;
  }

  async deleteSharedStep(id: string): Promise<void> {
    await apiService.authenticatedRequest(`/shared_steps/${id}`, {
      method: 'DELETE',
    });
  }

  async createStepResult(stepData: {
    step: string;
    result: string;
    userId: string;
  }): Promise<{
    data: {
      id: string;
      type: string;
      attributes: {
        id: number;
        step: string;
        result: string;
      };
    };
  }> {
    const requestBody = {
      data: {
        type: "StepResult",
        attributes: {
          step: stepData.step,
          result: stepData.result
        },
        relationships: {
          user: {
            data: {
              type: "User",
              id: `/api/users/${stepData.userId}`
            }
          }
        }
      }
    };

    const response = await apiService.authenticatedRequest('/step_results', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    if (!response) {
      throw new Error('No response received from server');
    }

    return response;
  }

  async updateStepResult(id: string, stepData: {
    step: string;
    result: string;
    userId: string;
  }): Promise<void> {
    const requestBody = {
      data: {
        type: "StepResult",
        attributes: {
          step: stepData.step,
          result: stepData.result
        },
        relationships: {
          user: {
            data: {
              type: "User",
              id: `/api/users/${stepData.userId}`
            }
          }
        }
      }
    };

    await apiService.authenticatedRequest(`/step_results/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(requestBody),
    });
  }

  async getStepResult(id: string): Promise<{
    data: {
      id: string;
      type: string;
      attributes: {
        id: number;
        step: string;
        result: string;
        order: number;
      };
    };
  }> {
    return apiService.authenticatedRequest(`/step_results/${id}`);
  }

  // Helper method to find creator in included data
  private findCreatorInIncluded(creatorId: string, included: ApiCreator[] = []): ApiCreator | null {
    return included.find(item => 
      item.type === 'User' && item.attributes.id.toString() === creatorId
    ) || null;
  }

  // Helper method to transform API shared step to our internal format
  transformApiSharedStep(apiSharedStep: ApiSharedStep, included: (ApiCreator | { type: string; id: string; attributes: { step: string; result: string; order: number; [key: string]: unknown } })[] = []): SharedStep {
    // Extract project ID from the relationship URL
    const projectId = apiSharedStep.relationships.project.data.id.split('/').pop() || '';

    // Extract creator ID from the relationship URL
    const creatorId = apiSharedStep.relationships.creator.data.id.split('/').pop() || '';

    // Find creator details in included data
    const creator = this.findCreatorInIncluded(creatorId, included as ApiCreator[]);

    // Count steps and results
    const stepsCount = apiSharedStep.relationships.stepResults?.data?.length || 0;

    // Count unique test cases using this shared step (deduplicate by test case ID)
    const testCaseIds = apiSharedStep.relationships.testCases?.data?.map(tc => tc.id) || [];
    const uniqueTestCaseIds = [...new Set(testCaseIds)];
    const usedInCount = uniqueTestCaseIds.length;

    // Extract step result IDs OR full details from included data
    const stepResultRefs = apiSharedStep.relationships.stepResults?.data || [];
    const stepResults = stepResultRefs.map(stepResult => {
      const stepResultId = stepResult.id.split('/').pop() || stepResult.id;

      // Check if full step result details are in included data
      const includedStepResult = included.find((item: { type: string; id: string }) => {
        const itemId = item.id.split('/').pop() || item.id;
        return item.type === 'StepResult' && itemId === stepResultId;
      });

      // If we have full details, return an object with details
      if (includedStepResult && 'attributes' in includedStepResult && 'step' in includedStepResult.attributes) {
        return {
          id: stepResultId,
          step: includedStepResult.attributes.step,
          result: includedStepResult.attributes.result,
          order: includedStepResult.attributes.order
        };
      }

      // Otherwise, just return the ID (old behavior)
      return stepResultId;
    });

    return {
      id: apiSharedStep.attributes.id.toString(),
      title: apiSharedStep.attributes.title,
      description: apiSharedStep.attributes.description,
      projectId: projectId,
      stepsCount: stepsCount,
      usedInCount: usedInCount,
      stepResults: stepResults,
      createdBy: {
        id: creatorId,
        name: creator?.attributes.name || 'Unknown User',
        email: creator?.attributes.email || ''
      },
      createdAt: new Date(apiSharedStep.attributes.createdAt),
      updatedAt: new Date(apiSharedStep.attributes.updatedAt)
    };
  }
}

export const sharedStepsApiService = new SharedStepsApiService();