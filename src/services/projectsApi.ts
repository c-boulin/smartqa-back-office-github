import { apiService } from './api';

// API Response interfaces matching the actual API structure
export interface ApiProject {
  id: string;
  type: string;
  attributes: {
    id: number;
    title: string;
    description: string;
    createdAt: string;
    updatedAt: string;
  };
  relationships: {
    testCases: {
      data: Array<{ type: string; id: string }>;
    };
    testRuns: {
      data: Array<{ type: string; id: string }>;
    };
    sharedSteps: {
      data: Array<{ type: string; id: string }>;
    };
    creator: {
      data: { type: string; id: string };
    };
    editor: {
      data: { type: string; id: string };
    };
    destroyer: {
      data: Array<{ id: string; type: string }>;
    };
  };
}

export interface ProjectsApiResponse {
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
  data: ApiProject[];
}

export interface CreateProjectRequest {
  data: {
    type: "Project";
    attributes: {
      title: string;
      description: string;
    };
  };
}

export interface UpdateProjectRequest {
  data: {
    type: "Project";
    attributes: {
      title: string;
      description: string;
    };
  };
}

export interface CreateProjectResponse {
  data: ApiProject;
}

export interface UpdateProjectResponse {
  data: ApiProject;
}

class ProjectsApiService {
  public getDefaultProjectsResponse(): ProjectsApiResponse {
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

  // Helper method to transform API project to our internal format
  transformApiProject(apiProject: ApiProject) {
    // Extract the project ID from the API URL format
    const projectId = apiProject.attributes.id.toString();
    
    console.log('🔄 Transforming API project:', {
      apiId: apiProject.id,
      attributesId: apiProject.attributes.id,
      finalProjectId: projectId,
      title: apiProject.attributes.title
    });
    
    if (!projectId || projectId === 'undefined' || projectId === '') {
      console.error('❌ Invalid project ID during transformation:', apiProject);
    }
    
    return {
      id: projectId,
      name: apiProject.attributes.title,
      description: apiProject.attributes.description,
      status: 'active' as const, // Default status since API doesn't provide this
      createdAt: new Date(apiProject.attributes.createdAt),
      updatedAt: new Date(apiProject.attributes.updatedAt),
      testCasesCount: apiProject.relationships.testCases.data.length,
      testsPassedCount: 0, // Not provided by API, would need separate calculation
      testsFailedCount: 0, // Not provided by API, would need separate calculation
      testRunsCount: apiProject.relationships.testRuns.data.length
    };
  }

  async getProjects(page: number = 1, itemsPerPage: number = 30): Promise<ProjectsApiResponse> {
    const response = await apiService.authenticatedRequest(`/projects?page=${page}&itemsPerPage=${itemsPerPage}`);
    return response || this.getDefaultProjectsResponse();
  }

  async getProjectsWithSort(page: number = 1, itemsPerPage: number = 30, sortParam?: string): Promise<ProjectsApiResponse> {
    let url = `/projects?page=${page}&itemsPerPage=${itemsPerPage}`;
    if (sortParam) {
      url += `&${sortParam}`;
    }
    const response = await apiService.authenticatedRequest(url);
    return response || this.getDefaultProjectsResponse();
  }
  // Method for sidebar dropdown - fetches ALL projects with optional search
  async getProjectsForSidebar(searchTerm?: string) {
    try {
      // Fetch first page of projects
      let url = '/projects?itemsPerPage=1000&page=1';
      
      // Add search if provided
      if (searchTerm && searchTerm.trim()) {
        url += `&title=${encodeURIComponent(searchTerm.trim())}`;
      }
      
      const response = await apiService.authenticatedRequest(url);
      
      if (!response || !response.data) {
        return [];
      }

      return response.data.map((project: ApiProject) => this.transformApiProject(project));
    } catch (error) {
      console.error('Error fetching projects for sidebar:', error);
      return [];
    }
  }

  async getProjectsForSidebarPage(page: number, searchTerm?: string): Promise<ProjectsApiResponse> {
    try {
      let url = `/projects?itemsPerPage=30&page=${page}`;
      
      // Add search if provided
      if (searchTerm && searchTerm.trim()) {
        url += `&title=${encodeURIComponent(searchTerm.trim())}`;
      }
      
      const response = await apiService.authenticatedRequest(url);
      return response || this.getDefaultProjectsResponse();
    } catch (error) {
      console.error('Error fetching projects page for sidebar:', error);
      return this.getDefaultProjectsResponse();
    }
  }

  async searchProjects(searchTerm: string, page: number = 1, itemsPerPage: number = 30, sortParam?: string): Promise<ProjectsApiResponse> {
    const trimmedTerm = searchTerm.trim();
    const isNumeric = /^\d+$/.test(trimmedTerm);
    const searchParam = trimmedTerm ? (isNumeric ? `id=${encodeURIComponent(trimmedTerm)}` : `title=${encodeURIComponent(trimmedTerm)}`) : '';
    let url = `/projects?page=${page}&itemsPerPage=${itemsPerPage}`;
    if (searchParam) {
      url += `&${searchParam}`;
    }
    if (sortParam) {
      url += `&${sortParam}`;
    }
    
    const response = await apiService.authenticatedRequest(url);
    return response || this.getDefaultProjectsResponse();
  }

  async getProjectsCreatedByUser(userId: string, page: number = 1, itemsPerPage: number = 30, sortParam?: string): Promise<ProjectsApiResponse> {
    let url = `/projects?created_by=${userId}&page=${page}&itemsPerPage=${itemsPerPage}`;
    if (sortParam) {
      url += `&${sortParam}`;
    }
    
    const response = await apiService.authenticatedRequest(url);
    return response || this.getDefaultProjectsResponse();
  }

  async searchProjectsCreatedByUser(searchTerm: string, userId: string, page: number = 1, itemsPerPage: number = 30, sortParam?: string): Promise<ProjectsApiResponse> {
    const searchParam = searchTerm.trim() ? `title=${encodeURIComponent(searchTerm)}` : '';
    let url = `/projects?created_by=${userId}&page=${page}&itemsPerPage=${itemsPerPage}`;
    if (searchParam) {
      url += `&${searchParam}`;
    }
    if (sortParam) {
      url += `&${sortParam}`;
    }
    
    const response = await apiService.authenticatedRequest(url);
    return response || this.getDefaultProjectsResponse();
  }

  async getProject(id: string): Promise<{ data: ApiProject }> {
    return apiService.authenticatedRequest(`/projects/${id}`);
  }

  async createProject(projectData: {
    title: string;
    description: string;
  }): Promise<CreateProjectResponse> {
    const requestBody: CreateProjectRequest = {
      data: {
        type: "Project",
        attributes: {
          title: projectData.title,
          description: projectData.description
        }
      }
    };

    const response = await apiService.authenticatedRequest('/projects', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    if (!response) {
      throw new Error('No response received from server');
    }

    return response;
  }

  async updateProject(id: string, projectData: {
    title: string;
    description: string;
  }): Promise<UpdateProjectResponse> {
    const requestBody: UpdateProjectRequest = {
      data: {
        type: "Project",
        attributes: {
          title: projectData.title,
          description: projectData.description
        }
      }
    };

    const response = await apiService.authenticatedRequest(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(requestBody),
    });

    if (!response) {
      throw new Error('No response received from server');
    }

    return response;
  }

  async deleteProject(id: string): Promise<void> {
    await apiService.authenticatedRequest(`/projects/${id}`, {
      method: 'DELETE',
    });
  }
}

export const projectsApiService = new ProjectsApiService();