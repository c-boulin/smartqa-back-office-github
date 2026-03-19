import { apiService } from './api';

import { Tag } from './tagsApi';

export interface CreateStepResultRequest {
  data: {
    type: "StepResult";
    attributes: {
      step: string;
      result: string;
    };
    relationships: {
      user: {
        data: {
          type: "User";
          id: string;
        };
      };
    };
  };
}

export interface CreateStepResultResponse {
  data: {
    id: string;
    type: string;
    attributes: {
      id: number;
      step: string;
      result: string;
    };
  };
}

/** Response from GET /test_cases/{id}/details */
export interface TestCaseDetailsPayload {
  id: string;
  projectId: string;
  projectRelativeId?: number;
  folderId?: string | null;
  ownerId?: string | null;
  title: string;
  description: string;
  preconditions?: string;
  priority: string;
  type: string;
  typeId: number;
  status: string;
  automationStatus: number;
  stepResults: Array<{ id: string; step: string; result: string; order: number }>;
  sharedSteps: Array<{
    id: string;
    pivotId?: number;
    order: number;
    title: string;
    description?: string;
    steps: Array<{ id: string; step: string; result: string; order: number }>;
  }>;
  tags: string[];
  attachments: Array<{ id: string; url: string; name: string }>;
  createdAt: string;
  updatedAt: string;
  estimatedDuration: number;
}

export interface ApiTestCase {
  id: string;
  type: string;
  attributes: {
    id: number;
    projectRelativeId?: number;
    title: string;
    description: string;
    priority: number; // L'API utilise des nombres pour priority
    type: number; // L'API utilise des nombres pour type
    state: number; // L'API utilise state au lieu de status
    automation: 1 | 2 | 3 | 4 | 5; // Le bon nom du champ dans l'API
    estimatedDuration?: number;
    tags?: string[];
    createdAt: string;
    updatedAt: string;
    template?: number;
    preconditions?: string;
  };
  relationships: {
    project: {
      data: { type: string; id: string };
    };
    folder?: {
      data: { type: string; id: string };
    };
    tags?: {
      data: Array<{ type: string; id: string }>;
    };
    testRuns?: {
      data: Array<{ type: string; id: string }>;
    };
    user?: {
      data: { type: string; id: string };
    };
    creator?: {
      data: { type: string; id: string };
    };
    editor?: {
      data: { type: string; id: string };
    };
    stepResults?: {
      data: Array<{ type: string; id: string; meta?: { order: number } }>;
    };
    sharedSteps?: {
      data: Array<{ type: string; id: string; meta?: { order: number; pivot_id?: number } }>;
    };
    attachments?: {
      data: Array<{ type: string; id: string }>;
    };
  };
}

export interface TestCasesApiResponse {
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
  data: ApiTestCase[];
  included?: Array<{
    id: string;
    type: string;
    attributes: {
      id: number;
      label: string;
    };
  }>;
}

export interface CreateTestCaseRequest {
  data: {
    type: "TestCase";
    attributes: {
      title: string;
      description: string;
      priority: number; // Convertir en nombre pour l'API
      type: number; // Convertir en nombre pour l'API
      state: number; // Utiliser state au lieu de status
      automation: 1 | 2 | 3 | 4 | 5;
      template: number;
      preconditions: string;
    };
    relationships: {
      project: {
        data: { type: string; id: string };
      };
      folder?: {
        data: { type: string; id: string };
      };
      tags?: {
        data: Array<{ type: string; id: string }>;
      };
      user: {
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

export interface UpdateTestCaseRequest {
  data: {
    type: "TestCase";
    attributes: {
      title: string;
      description: string;
      priority: number;
      type: number;
      state: number;
      automation: 1 | 2 | 3 | 4 | 5;
      template: number;
      preconditions: string;
    };
    relationships?: {
      tags?: {
        data: Array<{ type: string; id: string }>;
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
      shared_steps?: {
        data: Array<{
          type: string;
          id: string;
          meta: {
            order: number;
          };
        }>;
      };
      attachments?: {
        data: Array<{ type: string; id: string }>;
      };
      project?: {
        data: { type: string; id: string };
      };
      folder?: {
        data: { type: string; id: string };
      };
      user?: {
        data: { type: string; id: string };
      };
    };
  };
}

export interface CreateTestCaseResponse {
  data: ApiTestCase;
}

export interface UpdateTestCaseResponse {
  data: ApiTestCase;
}

class TestCasesApiService {
  // Helper functions for date parsing
  private parseDate(dateString: string): Date {
    if (!dateString) {
      console.warn('Empty date string provided, using current date');
      return new Date();
    }
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string provided:', dateString, 'using current date');
      return new Date();
    }
    
    return date;
  }

  private parseOptionalDate(dateString?: string): Date | undefined {
    if (!dateString) return undefined;
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.warn('Invalid optional date string provided:', dateString);
      return undefined;
    }
    
    return date;
  }

  // Mappings pour convertir entre notre format et l'API
  private priorityToApi = {
    'low': 4,
    'medium': 1,
    'high': 3,
    'critical': 2
  };

  private priorityFromApi = {
    1: 'medium' as const,
    2: 'critical' as const,
    3: 'high' as const,
    4: 'low' as const
  };

  private typeToApi = {
    'other': 1,
    'acceptance': 2,
    'accessibility': 3,
    'compatibility': 4,
    'destructive': 5,
    'functional': 6,
    'performance': 7,
    'regression': 8,
    'security': 9,
    'smoke': 10,
    'usability': 11
  };

  private typeFromApi = {
    1: 'other' as const,
    2: 'acceptance' as const,
    3: 'accessibility' as const,
    4: 'compatibility' as const,
    5: 'destructive' as const,
    6: 'functional' as const,
    7: 'performance' as const,
    8: 'regression' as const,
    9: 'security' as const,
    10: 'smoke' as const,
    11: 'usability' as const
  };

  private statusToApi = {
    'active': 1,
    'draft': 2,
    'in_review': 3,
    'outdated': 4,
    'rejected': 5,
    'deprecated': 4
  };

  private statusFromApi = {
    1: 'active' as const,
    2: 'draft' as const,
    3: 'in_review' as const,
    4: 'outdated' as const,
    5: 'rejected' as const
  };

  public getDefaultTestCasesResponse(): TestCasesApiResponse {
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
      data: []
    };
  }

  private buildTestCasesListUrl(projectId: string, params: Record<string, string>): string {
    const search = new URLSearchParams({ page: '1', itemsPerPage: '30', ...params });
    return `/projects/${projectId}/test-cases-list?${search.toString()}`;
  }

  async getTestCases(page: number = 1, itemsPerPage: number = 30, projectId?: string, folderId?: string): Promise<TestCasesApiResponse> {
    if (!projectId) {
      return this.getDefaultTestCasesResponse();
    }
    const params: Record<string, string> = { page: String(page), itemsPerPage: String(itemsPerPage) };
    if (folderId) params.folder = folderId;
    const response = await apiService.authenticatedRequest(this.buildTestCasesListUrl(projectId, params));
    return response || this.getDefaultTestCasesResponse();
  }

  async searchTestCases(searchTerm: string, page: number = 1, itemsPerPage: number = 30, projectId?: string, folderId?: string): Promise<TestCasesApiResponse> {
    if (!projectId) return this.getDefaultTestCasesResponse();
    const isNumeric = /^\d+$/.test(searchTerm.trim());
    const params: Record<string, string> = { page: String(page), itemsPerPage: String(itemsPerPage) };
    if (isNumeric) params.id = searchTerm.trim(); else params.title = searchTerm.trim();
    if (folderId) params.folder = folderId;
    const response = await apiService.authenticatedRequest(this.buildTestCasesListUrl(projectId, params));
    return response || this.getDefaultTestCasesResponse();
  }

  async filterTestCasesByAutomation(automationStatus: 1 | 2 | 3 | 4 | 5, page: number = 1, itemsPerPage: number = 30, projectId?: string, folderId?: string): Promise<TestCasesApiResponse> {
    if (!projectId) return this.getDefaultTestCasesResponse();
    const params: Record<string, string> = { automation: String(automationStatus), page: String(page), itemsPerPage: String(itemsPerPage) };
    if (folderId) params.folder = folderId;
    const response = await apiService.authenticatedRequest(this.buildTestCasesListUrl(projectId, params));
    return response || this.getDefaultTestCasesResponse();
  }

  async filterTestCasesByPriority(priority: number, page: number = 1, itemsPerPage: number = 30, projectId?: string, folderId?: string): Promise<TestCasesApiResponse> {
    if (!projectId) return this.getDefaultTestCasesResponse();
    const params: Record<string, string> = { priority: String(priority), page: String(page), itemsPerPage: String(itemsPerPage) };
    if (folderId) params.folder = folderId;
    const response = await apiService.authenticatedRequest(this.buildTestCasesListUrl(projectId, params));
    return response || this.getDefaultTestCasesResponse();
  }

  async filterTestCasesByType(type: number, page: number = 1, itemsPerPage: number = 30, projectId?: string, folderId?: string): Promise<TestCasesApiResponse> {
    if (!projectId) return this.getDefaultTestCasesResponse();
    const params: Record<string, string> = { type: String(type), page: String(page), itemsPerPage: String(itemsPerPage) };
    if (folderId) params.folder = folderId;
    const response = await apiService.authenticatedRequest(this.buildTestCasesListUrl(projectId, params));
    return response || this.getDefaultTestCasesResponse();
  }

  async filterTestCasesByState(state: number, page: number = 1, itemsPerPage: number = 30, projectId?: string, folderId?: string): Promise<TestCasesApiResponse> {
    if (!projectId) return this.getDefaultTestCasesResponse();
    const params: Record<string, string> = { state: String(state), page: String(page), itemsPerPage: String(itemsPerPage) };
    if (folderId) params.folder = folderId;
    const response = await apiService.authenticatedRequest(this.buildTestCasesListUrl(projectId, params));
    return response || this.getDefaultTestCasesResponse();
  }
  async filterTestCasesByTags(tagIds: string[], page: number = 1, itemsPerPage: number = 30, projectId?: string, folderId?: string): Promise<TestCasesApiResponse> {
    if (!projectId) return this.getDefaultTestCasesResponse();
    const params: Record<string, string> = { tags: tagIds.join(','), page: String(page), itemsPerPage: String(itemsPerPage) };
    if (folderId) params.folder = folderId;
    const response = await apiService.authenticatedRequest(this.buildTestCasesListUrl(projectId, params));
    return response || this.getDefaultTestCasesResponse();
  }

  async filterTestCasesWithMultipleFilters(filters: {
    automationStatus?: 1 | 2 | 3 | 4 | 5;
    priority?: number;
    type?: number;
    state?: number;
    tagIds?: string[];
  }, page: number = 1, itemsPerPage: number = 30, projectId?: string, folderId?: string): Promise<TestCasesApiResponse> {
    if (!projectId) return this.getDefaultTestCasesResponse();
    const params: Record<string, string> = { page: String(page), itemsPerPage: String(itemsPerPage) };
    if (folderId) params.folder = folderId;
    if (filters.automationStatus) params.automation = String(filters.automationStatus);
    if (filters.priority) params.priority = String(filters.priority);
    if (filters.type) params.type = String(filters.type);
    if (filters.state) params.state = String(filters.state);
    if (filters.tagIds?.length) params.tags = filters.tagIds.join(',');
    const response = await apiService.authenticatedRequest(this.buildTestCasesListUrl(projectId, params));
    return response || this.getDefaultTestCasesResponse();
  }

  async createStepResult(stepData: {
    step: string;
    result: string;
    userId: string;
  }): Promise<CreateStepResultResponse> {
    const requestBody: CreateStepResultRequest = {
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

  async getTestCase(id: string): Promise<{ data: ApiTestCase; included?: Array<Record<string, unknown>> }> {
    return apiService.authenticatedRequest(`/test_cases/${id}?include=attachments`);
  }

  async getTestCaseWithIncludes(id: string): Promise<{
    data: ApiTestCase;
    included?: Array<{
      id: string;
      type: string;
      attributes: {
        id: number;
        step?: string;
        result?: string;
        order: number;
        title?: string;
        description?: string;
        createdAt?: string;
        updatedAt?: string;
        label?: string;
      };
    }>;
  }> {
    return apiService.authenticatedRequest(`/test_cases/${id}?include=stepResults,sharedSteps,attachments`);
  }

  /**
   * Optimized endpoint: returns test case with stepResults, sharedSteps, attachments in one request (frontend-ready shape).
   */
  async getTestCaseDetails(id: string): Promise<TestCaseDetailsPayload> {
    const response = await apiService.authenticatedRequest<TestCaseDetailsPayload>(`/test_cases/${id}/details`);
    if (!response) {
      throw new Error('No response from test case details');
    }
    return response;
  }

  async createTestCase(testCaseData: {
    title: string;
    description: string;
    priority: number;
    testCaseType: number;
    state: number;
    automationStatus: 1 | 2 | 3 | 4 | 5;
    estimatedDuration: number;
    tags: Tag[];
    projectId: string;
    folderId?: string;
    creatorId: string;
    createdAttachments?: Array<{
      type: "Attachment";
      id: string;
    }>;
    stepResults?: Array<{
      id: string;
      order: number;
    }>;
    sharedStepsForApi?: Array<{
      id: string;
      order: number;
    }>;
    template?: number;
    preconditions?: string;
  }): Promise<CreateTestCaseResponse> {
    const requestBody: CreateTestCaseRequest = {
      data: {
        type: "TestCase",
        attributes: {
          title: testCaseData.title,
          description: testCaseData.description,
          priority: testCaseData.priority, // Use numeric value directly
          type: testCaseData.testCaseType, // Use numeric value directly
          state: testCaseData.state, // Use numeric value directly
          automation: testCaseData.automationStatus,
          template: testCaseData.template || 1,
          preconditions: testCaseData.preconditions || ''
        },
        relationships: {
          project: {
            data: { type: "Project", id: `/api/projects/${testCaseData.projectId}` }
          },
          user: {
            data: { type: "User", id: `/api/users/${testCaseData.creatorId}` }
          }
        }
      }
    };

    // Add folder relationship if provided
    if (testCaseData.folderId) {
      requestBody.data.relationships.folder = {
        data: { type: "Folder", id: `/api/folders/${testCaseData.folderId}` }
      };
    }

    // Add tags relationship if provided
    if (testCaseData.tags && testCaseData.tags.length > 0) {
      requestBody.data.relationships.tags = {
        data: testCaseData.tags.map(tag => ({ type: "Tag", id: `/api/tags/${tag.id}` }))
      };
    }

    // Add step_results relationship if provided
    if (testCaseData.stepResults && testCaseData.stepResults.length > 0) {
      requestBody.data.relationships.step_results = {
        data: testCaseData.stepResults.map(stepResult => ({
          type: "StepResult",
          id: `/api/step_results/${stepResult.id}`,
          meta: {
            order: stepResult.order
          }
        }))
      };
    }

    // Add shared_steps relationship if provided
    if (testCaseData.sharedStepsForApi && testCaseData.sharedStepsForApi.length > 0) {
      requestBody.data.relationships.shared_steps = {
        data: testCaseData.sharedStepsForApi.map(sharedStep => ({
          type: "SharedStep",
          id: `/api/shared_steps/${sharedStep.id}`,
          meta: {
            order: sharedStep.order
          }
        }))
      };
    }
    

    // ALWAYS add attachments relationship (required by API)
    // ALWAYS add attachments relationship - fill with created attachment IDs if available
    if (testCaseData.createdAttachments && testCaseData.createdAttachments.length > 0) {

      requestBody.data.relationships.attachments = {
        data: testCaseData.createdAttachments
      };

    }

    const response = await apiService.authenticatedRequest('/test_cases', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    if (!response) {
      throw new Error('No response received from server');
    }

    return response;
  }

  async updateTestCase(id: string, testCaseData: {
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    testType: 'functional' | 'regression' | 'smoke' | 'integration' | 'performance';
    status: 'draft' | 'active' | 'deprecated';
    automationStatus: 1 | 2 | 3 | 4 | 5;
    template: number;
    preconditions: string;
    tags: Tag[];
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
      type: string;
      id: string;
    }>;
  }): Promise<UpdateTestCaseResponse> {


    // Ensure all numeric fields are numbers
    const priorityNum = this.priorityToApi[testCaseData.priority];
    const typeNum = this.typeToApi[testCaseData.testType];
    const stateNum = this.statusToApi[testCaseData.status];
    const automationNum = typeof testCaseData.automationStatus === 'string'
      ? parseInt(testCaseData.automationStatus, 10) as 1 | 2 | 3 | 4 | 5
      : testCaseData.automationStatus;
    const templateNum = typeof testCaseData.template === 'string'
      ? parseInt(testCaseData.template, 10)
      : testCaseData.template;

    const requestBody: UpdateTestCaseRequest = {
      data: {
        type: "TestCase",
        attributes: {
          title: testCaseData.title,
          description: testCaseData.description,
          priority: priorityNum,
          type: typeNum,
          state: stateNum,
          automation: automationNum,
          template: templateNum,
          preconditions: testCaseData.preconditions,
        }
      }
    };


    // Initialize relationships object
    requestBody.data.relationships = {};
    
    // Add tags relationship if provided
    // Always send tags relationship (empty array if no tags selected)
    requestBody.data.relationships.tags = {
      data: testCaseData.tags.map(tag => ({ type: "Tag", id: `/api/tags/${tag.id}` }))
    };
    
    // Add step_results relationship if provided
    // ALWAYS send step_results relationship (empty array if no step results)
    if (testCaseData.stepResultsRelationships !== undefined) {
      requestBody.data.relationships.step_results = {
        data: testCaseData.stepResultsRelationships
      };
    }
    
    // Add shared_steps relationship if provided
    // ALWAYS send shared_steps relationship (empty array if no shared steps)
    if (testCaseData.sharedStepsRelationships !== undefined) {
      requestBody.data.relationships.shared_steps = {
        data: testCaseData.sharedStepsRelationships
      };
    }

    // Always send attachments relationship (empty array if no attachments)
    requestBody.data.relationships.attachments = {
      data: testCaseData.createdAttachments || []
    };

    // Add project relationship if provided
    if (testCaseData.projectId) {
      requestBody.data.relationships.project = {
        data: { type: "Project", id: `/api/projects/${testCaseData.projectId}` }
      };
    }

    // Add folder relationship if provided
    if (testCaseData.folderId) {
      requestBody.data.relationships.folder = {
        data: { type: "Folder", id: `/api/folders/${testCaseData.folderId}` }
      };
    }

    // Add user (owner) relationship if provided
    if (testCaseData.ownerId) {
      requestBody.data.relationships.user = {
        data: { type: "User", id: `/api/users/${testCaseData.ownerId}` }
      };
    }


    const response = await apiService.authenticatedRequest(`/test_cases/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(requestBody),
    });

    if (!response) {
      throw new Error('No response received from server');
    }

    return response;
  }

  async deleteTestCase(id: string): Promise<void> {
    await apiService.authenticatedRequest(`/test_cases/${id}`, {
      method: 'DELETE',
    });
  }

  async cloneTestCase(id: string, targetProjectId: string, targetFolderId: string, title: string): Promise<CreateTestCaseResponse> {
    const requestBody = {
      data: {
        type: "TestCase",
        attributes: {
          title: title
        },
        relationships: {
          project: {
            data: { type: "Project", id: `/api/projects/${targetProjectId}` }
          },
          folder: {
            data: { type: "Folder", id: `/api/folders/${targetFolderId}` }
          }
        }
      }
    };

    const response = await apiService.authenticatedRequest(`/test_cases/${id}/clone`, {
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

  // Helper method to transform API test case to our internal format
  transformApiTestCase(apiTestCase: ApiTestCase, included?: Array<Record<string, unknown>>, availableTags: Tag[] = []) {
    const availableTagMap = new Map(availableTags.map(tag => [tag.id, tag.label]));

    // Extraire l'ID du projet depuis l'URL de l'API
    const projectId = apiTestCase.relationships.project.data.id.split('/').pop() || '';
    const folderId = apiTestCase.relationships.folder?.data?.id?.split('/').pop();
    const ownerId = apiTestCase.relationships.user?.data?.id?.split('/').pop();

    // Extract tags from relationships and resolve them using available tags or included data
    let tags: string[] = [];
    
    if (apiTestCase.relationships.tags?.data) {
      const tagIds = apiTestCase.relationships.tags.data.map(tagRef => {
        const extractedId = tagRef.id.split('/').pop();
        return extractedId;
      });

      tags = tagIds.map(tagId => {
        if (!tagId) {
          return null;
        }

        if (availableTagMap.has(tagId)) {
          return availableTagMap.get(tagId) as string;
        }

        if (included) {
          const tagData = included.find(item => {
            const tagItem = item as { type?: unknown; attributes?: { id?: unknown; label?: unknown } };
            return tagItem.type === 'Tag' && tagItem.attributes?.id?.toString() === tagId;
          }) as { attributes?: { label?: unknown } } | undefined;

          if (tagData?.attributes?.label) {
            return String(tagData.attributes.label);
          }
        }

        console.warn('🏷️ ❌ Tag data not found for ID:', tagId);
        return `Tag ${tagId}`;
      }).filter((label): label is string => Boolean(label));
    } else if (Array.isArray(apiTestCase.attributes.tags)) {
      // Fallback: use tags from attributes if available
      tags = apiTestCase.attributes.tags;
    }

    // Extract step result IDs from relationships
    const stepResults = apiTestCase.relationships.stepResults?.data?.map(stepResult => 
      stepResult.id.split('/').pop() || stepResult.id
    ) || [];
    
    // Extract shared step IDs from relationships
    const sharedStepIds = apiTestCase.relationships.sharedSteps?.data?.map(sharedStep => 
      sharedStep.id.split('/').pop() || sharedStep.id
    ) || [];
    
    const transformed = {
      id: apiTestCase.attributes.id.toString(),
      projectId: projectId,
      projectRelativeId: apiTestCase.attributes.projectRelativeId,
      folderId: folderId,
      ownerId: ownerId,
      title: apiTestCase.attributes.title,
      description: apiTestCase.attributes.description,
      preconditions: apiTestCase.attributes.preconditions || '', // Add preconditions from API
      priority: this.priorityFromApi[apiTestCase.attributes.priority as keyof typeof this.priorityFromApi] || 'medium',
      type: this.typeFromApi[apiTestCase.attributes.type as keyof typeof this.typeFromApi] || 'functional',
      typeId: apiTestCase.attributes.type, // Store numeric type ID for filtering
      status: this.statusFromApi[apiTestCase.attributes.state as keyof typeof this.statusFromApi] || 'draft',
      automationStatus: typeof apiTestCase.attributes.automation === 'string'
        ? parseInt(apiTestCase.attributes.automation, 10) as 1 | 2 | 3 | 4 | 5
        : apiTestCase.attributes.automation, // Utilise directement le champ automation de l'API
      steps: [], // Steps are handled via stepResults
      stepResults: stepResults, // Add step result IDs
      sharedSteps: sharedStepIds, // Add shared step IDs from relationships
      tags: tags,
      createdAt: this.parseDate(apiTestCase.attributes.createdAt),
      updatedAt: this.parseDate(apiTestCase.attributes.updatedAt),
      estimatedDuration: apiTestCase.attributes.estimatedDuration || 5
    };

    return transformed;
  }
}

export const testCasesApiService = new TestCasesApiService();