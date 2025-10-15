import { apiService } from './api';

export interface ApiTestPlan {
  id?: number | string;
  type?: string;
  attributes?: {
    id?: number;
    title?: string;
    status?: string | number;
    date_start?: string;
    date_end?: string;
    createdAt?: string;
    updatedAt?: string;
  };
  relationships?: {
    project?: {
      data?: {
        type?: string;
        id?: string;
      };
    };
    creator?: {
      data?: {
        type?: string;
        id?: string;
      };
    };
    editor?: {
      data?: {
        type?: string;
        id?: string;
      };
    };
    testRuns?: {
      data?: Array<{
        type?: string;
        id?: string;
      }>;
    };
  };
  // Fallback properties for non-JSON:API format
  title?: string;
  createdAt?: string;
  updatedAt?: string;
  projectId?: number | string;
  creatorId?: number | string;
  editorId?: number | string;
  dateStart?: string;
  dateEnd?: string;
}

export interface CreateTestPlanApiTestPlan {
  id?: number | string;
  type?: string;
  attributes?: {
    id?: number;
    title?: string;
    createdAt?: string;
    updatedAt?: string;
  };
  relationships: {
    project: {
      data: { type: string; id: string };
    };
    creator: {
      data: { type: string; id: string };
    };
    editor: {
      data: { type: string; id: string };
    };
  };
}

export interface TestPlansApiResponse {
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
  data: ApiTestPlan[];
  included?: any[];
}

export interface CreateTestPlanRequest {
  data: {
    type: "TestPlan";
    attributes: {
      title: string;
      date_start?: string;
      date_end?: string;
    };
    relationships: {
      project?: {
        data: { type: string; id: string };
      };
      user: {
        data: { type: string; id: string };
      };
    };
  };
}

export interface UpdateTestPlanRequest {
  data: {
    type: "TestPlan";
    attributes: {
      title: string;
      date_start?: string;
      date_end?: string;
    };
    relationships: {
      project?: {
        data: { type: string; id: string };
      };
      test_runs: {
        data: any[];
      };
    };
  };
}

export interface CreateTestPlanResponse {
  data: ApiTestPlan;
}

export interface UpdateTestPlanResponse {
  data: ApiTestPlan;
}

export interface TestPlan {
  id: string;
  title: string;
  status: string;
  projectId: string;
  assignedTo?: string;
  dateStart?: Date;
  dateEnd?: Date;
  createdAt: Date;
  updatedAt: Date;
  totalTestRuns: number;
  closedTestRuns: number;
  testRunIds: string[];
}

class TestPlansApiService {
  private parseDate(dateString?: string): Date {
    if (!dateString) return new Date();
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? new Date() : date;
  }

  private parseOptionalDate(dateString?: string): Date | undefined {
    if (!dateString) return undefined;
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? undefined : date;
  }

  public getDefaultTestPlansResponse(): TestPlansApiResponse {
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

  async getTestPlans(projectId?: string, page: number = 1, itemsPerPage: number = 30, userId?: string): Promise<TestPlansApiResponse> {
    try {
      let url = `/test_plans?page=${page}&itemsPerPage=${itemsPerPage}&order[createdAt]=desc&include=testRuns`;
      
      if (projectId) {
        url += `&project=${projectId}`;
      }
      
      if (userId) {
        url += `&user=${userId}`;
      }
      
      const response = await apiService.authenticatedRequest(url);
      return response || this.getDefaultTestPlansResponse();
    } catch (error) {
      console.error('Error fetching test plans:', error);
      return this.getDefaultTestPlansResponse();
    }
  }

  async searchTestPlans(searchTerm: string, projectId?: string, userId?: string, page: number = 1, itemsPerPage: number = 30): Promise<TestPlansApiResponse> {
    try {
      const isNumeric = /^\d+$/.test(searchTerm.trim());
      const searchParam = isNumeric ? `id=${encodeURIComponent(searchTerm)}` : `title=${encodeURIComponent(searchTerm)}`;
      let url = `/test_plans?${searchParam}&page=${page}&itemsPerPage=${itemsPerPage}&order[createdAt]=desc&include=testRuns`;
      
      if (projectId) {
        url += `&project=${projectId}`;
      }
      
      if (userId) {
        url += `&user=${userId}`;
      }
      
      const response = await apiService.authenticatedRequest(url);
      return response || this.getDefaultTestPlansResponse();
    } catch (error) {
      console.error('Error searching test plans:', error);
      return this.getDefaultTestPlansResponse();
    }
  }

  async getTestPlan(id: string): Promise<{ data: ApiTestPlan }> {
    return apiService.authenticatedRequest(`/test_plans/${id}`);
  }

  async getTestPlanWithTestRuns(id: string): Promise<{ data: ApiTestPlan; included?: any[] }> {
    return apiService.authenticatedRequest(`/test_plans/${id}?include=testRuns,user`);
  }

  async createTestPlan(testPlanData: {
    title: string;
    projectId?: string;
    assignedTo: string;
    dateStart?: string;
    dateEnd?: string;
  }): Promise<CreateTestPlanResponse> {
    const requestBody: CreateTestPlanRequest = {
      data: {
        type: "TestPlan",
        attributes: {
          title: testPlanData.title,
          ...(testPlanData.dateStart && { date_start: testPlanData.dateStart }),
          ...(testPlanData.dateEnd && { date_end: testPlanData.dateEnd })
        },
        relationships: {
          user: {
            data: { type: "User", id: `/api/users/${testPlanData.assignedTo}` }
          }

        }
      }
    };

    // Add project relationship if provided
    if (testPlanData.projectId) {
      requestBody.data.relationships.project = {
        data: { type: "Project", id: `/api/projects/${testPlanData.projectId}` }
      };
    }
    const response = await apiService.authenticatedRequest('/test_plans', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    if (!response) {
      throw new Error('No response received from server');
    }

    return response;
  }

  async updateTestPlanStatus(id: string, status: string, currentTestPlan: TestPlan): Promise<UpdateTestPlanResponse> {
    // Fetch the full test plan data to get all relationships
    const fullTestPlanResponse = await this.getTestPlanWithTestRuns(id);
    const fullTestPlan = fullTestPlanResponse.data;

    const requestBody = {
      data: {
        id: `/api/test_plans/${id}`,
        type: "TestPlan",
        attributes: {
          title: currentTestPlan.title,
          status: status,
          createdAt: currentTestPlan.createdAt.toISOString(),
          updatedAt: new Date().toISOString(),
          ...(currentTestPlan.dateStart && { dateStart: currentTestPlan.dateStart.toISOString() }),
          ...(currentTestPlan.dateEnd && { dateEnd: currentTestPlan.dateEnd.toISOString() })
        },
        relationships: {
          project: fullTestPlan.relationships?.project || { data: { type: "Project", id: `/api/projects/${currentTestPlan.projectId}` } },
          user: fullTestPlan.relationships?.user || { data: { type: "User", id: `/api/users/${currentTestPlan.assignedTo}` } },
          testRuns: {
            data: currentTestPlan.testRunIds.map(testRunId => ({
              type: "TestRun",
              id: `/api/test_runs/${testRunId}`
            }))
          },
          creator: fullTestPlan.relationships?.creator || { data: [] },
          editor: fullTestPlan.relationships?.editor || { data: [] }
        }
      }
    };

    const response = await apiService.authenticatedRequest(`/test_plans/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(requestBody),
    });

    if (!response) {
      throw new Error('No response received from server');
    }

    return response;
  }

  async updateTestPlan(id: string, testPlanData: {
    title: string;
    projectId?: string;
    assignedTo: string;
    dateStart?: string;
    dateEnd?: string;
  }): Promise<UpdateTestPlanResponse> {
    const requestBody: UpdateTestPlanRequest = {
      data: {
        type: "TestPlan",
        attributes: {
          title: testPlanData.title,
          ...(testPlanData.dateStart && { date_start: testPlanData.dateStart }),
          ...(testPlanData.dateEnd && { date_end: testPlanData.dateEnd })
        },
        relationships: {
          user: {
            data: { type: "User", id: `/api/users/${testPlanData.assignedTo}` }
          },
          test_runs: {
            data: []
          }
        }
      }
    };

    // Add project relationship if provided
    if (testPlanData.projectId) {
      requestBody.data.relationships.project = {
        data: { type: "Project", id: `/api/projects/${testPlanData.projectId}` }
      };
    }

    const response = await apiService.authenticatedRequest(`/test_plans/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(requestBody),
    });

    if (!response) {
      throw new Error('No response received from server');
    }

    return response;
  }

  async deleteTestPlan(id: string): Promise<void> {
    await apiService.authenticatedRequest(`/test_plans/${id}`, {
      method: 'DELETE',
    });
  }

  // Helper method to transform API test plan to our internal format
  transformApiTestPlan(apiTestPlan: ApiTestPlan, included?: any[]): TestPlan {
    // Extract project ID from relationships if available
    const projectId = apiTestPlan.relationships?.project?.data?.id?.split('/').pop() || '';
    
    // Extract assigned user ID from relationships if available
    const assignedTo = apiTestPlan.relationships?.user?.data?.id?.split('/').pop() || '';
    
    // Process test runs from included data
    let totalTestRuns = 0;
    let closedTestRuns = 0;
    
    if (apiTestPlan.relationships?.testRuns?.data && included) {
      console.log('📋 Processing test runs for test plan:', apiTestPlan.attributes?.title);
      
      // Get test run IDs from relationships
      const testRunIds = apiTestPlan.relationships.testRuns.data.map(tr => 
        tr.id.split('/').pop()
      );
      
      console.log('📋 Found test run IDs:', testRunIds);
      
      testRunIds.forEach(testRunId => {
        const testRunData = included.find(item => 
          item.type === 'TestRun' && (
            item.attributes.id.toString() === testRunId ||
            item.id === testRunId ||
            item.id === `/api/test_runs/${testRunId}`
          )
        );
        
        if (testRunData) {
          totalTestRuns++;
          
            const state = testRunData.attributes?.state;
          const isClosed = state === 6 || state === "6" || parseInt(state?.toString() || '0') === 6;
          
          console.log(`📋 Test run ${testRunData.attributes?.name || testRunData.id}: state=${state} (type: ${typeof state}), isClosed=${isClosed}`);
          
          if (isClosed) {
            closedTestRuns++;
          }
         } else {
           console.warn('📋 Test run not found in included data for ID:', testRunId);
           console.log('📋 Available included items:', included.map(item => ({
             type: item.type,
             id: item.id,
             attributesId: item.attributes?.id
           })));
        }
      });
      
      console.log(`📋 Final counts for test plan "${apiTestPlan.attributes?.title}": ${closedTestRuns}/${totalTestRuns} closed`);
    }
    
    // Extract test run IDs
    const testRunIds = apiTestPlan.relationships?.testRuns?.data?.map(tr =>
      tr.id.split('/').pop() || ''
    ) || [];

    return {
      id: apiTestPlan.attributes?.id?.toString() || '',
      title: apiTestPlan.attributes?.title || '',
      status: apiTestPlan.attributes?.status?.toString() || '1',
      projectId: projectId,
      assignedTo: assignedTo,
      dateStart: this.parseOptionalDate(apiTestPlan.attributes?.date_start || apiTestPlan.attributes?.dateStart),
      dateEnd: this.parseOptionalDate(apiTestPlan.attributes?.date_end || apiTestPlan.attributes?.dateEnd),
      createdAt: this.parseDate(apiTestPlan.attributes?.createdAt || ''),
      updatedAt: this.parseDate(apiTestPlan.attributes?.updatedAt || ''),
      totalTestRuns: totalTestRuns,
      closedTestRuns: closedTestRuns,
      testRunIds: testRunIds
    };
  }
}

export const testPlansApiService = new TestPlansApiService();