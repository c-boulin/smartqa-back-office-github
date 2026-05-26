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
    country?: string;
    url?: string;
    /** API may return camelCase */
    gitlab_project_name?: string;
    test_suite_name?: string;
    gitlabProjectName?: string;
    testSuiteName?: string;
    category?: string | { id: string | number; name: string; iri?: string };
    project_type?: string | { id: string | number; name: string; iri?: string };
    projectType?: string | { id: string | number; name: string; iri?: string };
    type?: string;
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
    projectType?: {
      data: { type: string; id: string } | null;
    };
    category?: {
      data: { type: string; id: string } | null;
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


interface CategoryRelationship {
  data: { type: "Category"; id: string } | null;
}


export interface CreateProjectRequest {
  data: {
    type: "Project";
    attributes: {
      title: string;
      description: string;
      is_template?: boolean;
      country?: string;
      url?: string;
      type?: string;
    };
    relationships?: {
      category?: CategoryRelationship;
    };
  };
}

export interface UpdateProjectRequest {
  data: {
    type: "Project";
    attributes: {
      title: string;
      description: string;
      country?: string;
      url?: string;
      gitlab_project_name?: string;
      test_suite_name?: string;
      type?: string;
    };
    relationships?: {
      category?: CategoryRelationship;
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
    console.log('[projectsApi] raw projectType attr:', apiProject.attributes.projectType, '| project_type attr:', apiProject.attributes.project_type, '| rel:', apiProject.relationships.projectType);

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
      testRunsCount: apiProject.relationships.testRuns.data.length,
      country: apiProject.attributes.country,
      url: apiProject.attributes.url,
      gitlab_project_name: apiProject.attributes.gitlabProjectName ?? apiProject.attributes.gitlab_project_name,
      test_suite_name: apiProject.attributes.testSuiteName ?? apiProject.attributes.test_suite_name,
      category: typeof apiProject.attributes.category === 'object' && apiProject.attributes.category !== null
        ? apiProject.attributes.category.name
        : apiProject.attributes.category,
      categoryIri: (() => {
        const attrCat = apiProject.attributes.category;
        if (typeof attrCat === 'object' && attrCat !== null) return attrCat.iri ?? `/api/categories/${attrCat.id}`;
        const relCat = apiProject.relationships.category?.data;
        if (relCat) return relCat.id;
        return undefined;
      })(),
      project_type: (() => {
        const raw = apiProject.attributes.type ?? apiProject.attributes.projectType ?? apiProject.attributes.project_type;
        if (!raw) return undefined;
        const str = typeof raw === 'object' && raw !== null ? raw.name : String(raw);
        return str;
      })(),
      projectTypeIri: (() => {
        const raw = apiProject.attributes.type ?? apiProject.attributes.projectType ?? apiProject.attributes.project_type;
        if (!raw) return undefined;
        const str = typeof raw === 'object' && raw !== null ? raw.name : String(raw);
        return str;
      })(),
    };
  }

  async getProjects(page: number = 1, itemsPerPage: number = 30): Promise<ProjectsApiResponse> {
    const response = await apiService.authenticatedRequest(`/projects?page=${page}&itemsPerPage=${itemsPerPage}`);
    return response || this.getDefaultProjectsResponse();
  }

  /** Optimized endpoint for Projects page - returns ProjectsApiResponse format */
  private buildProjectsListUrl(params: Record<string, string>, sortParam?: string): string {
    const search = new URLSearchParams(params);
    const qs = search.toString();
    const extra = sortParam ? (qs ? `&${sortParam}` : sortParam) : '';
    return `/projects-list?${qs}${extra}`;
  }

  async getProjectsList(page: number = 1, itemsPerPage: number = 30, sortParam?: string, createdBy?: string): Promise<ProjectsApiResponse> {
    const params: Record<string, string> = { page: String(page), itemsPerPage: String(itemsPerPage) };
    if (createdBy) params.created_by = createdBy;
    const response = await apiService.authenticatedRequest(this.buildProjectsListUrl(params, sortParam));
    return response || this.getDefaultProjectsResponse();
  }

  async searchProjectsList(searchTerm: string, page: number = 1, itemsPerPage: number = 30, sortParam?: string, createdBy?: string): Promise<ProjectsApiResponse> {
    const trimmedTerm = searchTerm.trim();
    const isNumeric = /^\d+$/.test(trimmedTerm);
    const params: Record<string, string> = { page: String(page), itemsPerPage: String(itemsPerPage) };
    if (trimmedTerm) params[isNumeric ? 'id' : 'title'] = trimmedTerm;
    if (createdBy) params.created_by = createdBy;
    const response = await apiService.authenticatedRequest(this.buildProjectsListUrl(params, sortParam));
    return response || this.getDefaultProjectsResponse();
  }

  /** Optimized endpoint for Templates tab on Projects page */
  private buildTemplatesListUrl(params: Record<string, string>, sortParam?: string): string {
    const search = new URLSearchParams(params);
    const qs = search.toString();
    const extra = sortParam ? (qs ? `&${sortParam}` : sortParam) : '';
    return `/templates-list?${qs}${extra}`;
  }

  async getTemplatesList(page: number = 1, itemsPerPage: number = 30, sortParam?: string, createdBy?: string): Promise<ProjectsApiResponse> {
    const params: Record<string, string> = { page: String(page), itemsPerPage: String(itemsPerPage) };
    if (createdBy) params.created_by = createdBy;
    const response = await apiService.authenticatedRequest(this.buildTemplatesListUrl(params, sortParam));
    return response || this.getDefaultProjectsResponse();
  }

  async searchTemplatesList(searchTerm: string, page: number = 1, itemsPerPage: number = 30, sortParam?: string, createdBy?: string): Promise<ProjectsApiResponse> {
    const trimmedTerm = searchTerm.trim();
    const isNumeric = /^\d+$/.test(trimmedTerm);
    const params: Record<string, string> = { page: String(page), itemsPerPage: String(itemsPerPage) };
    if (trimmedTerm) params[isNumeric ? 'id' : 'title'] = trimmedTerm;
    if (createdBy) params.created_by = createdBy;
    const response = await apiService.authenticatedRequest(this.buildTemplatesListUrl(params, sortParam));
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
  async getProjectsForSidebar(searchTerm?: string): Promise<{ projects: Project[]; meta: { totalItems: number; currentPage: number; itemsPerPage: number } }> {
    try {
      let url = '/projects?itemsPerPage=30&page=1&order[createdAt]=desc';

      if (searchTerm && searchTerm.trim()) {
        url += `&title=${encodeURIComponent(searchTerm.trim())}`;
      }

      const response: ProjectsApiResponse = await apiService.authenticatedRequest(url);

      if (!response || !response.data) {
        return {
          projects: [],
          meta: { totalItems: 0, currentPage: 1, itemsPerPage: 30 }
        };
      }

      return {
        projects: response.data.map((project: ApiProject) => this.transformApiProject(project)),
        meta: response.meta
      };
    } catch (error) {
      console.error('Error fetching projects for sidebar:', error);
      return {
        projects: [],
        meta: { totalItems: 0, currentPage: 1, itemsPerPage: 30 }
      };
    }
  }

  async getProjectsForSidebarPage(page: number, searchTerm?: string): Promise<ProjectsApiResponse> {
    try {
      let url = `/projects?itemsPerPage=30&page=${page}&order[createdAt]=desc`;

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

  async getTemplate(id: string): Promise<{ data: ApiProject }> {
    return apiService.authenticatedRequest(`/templates/${id}`);
  }

  async createProject(projectData: {
    title: string;
    description: string;
    country?: string;
    url?: string;
    categoryIri?: string;
    projectTypeIri?: string;
  }): Promise<CreateProjectResponse> {
    const attributes: CreateProjectRequest['data']['attributes'] = {
      title: projectData.title,
      description: projectData.description,
    };
    if (projectData.country) attributes.country = projectData.country;
    if (projectData.url) attributes.url = projectData.url;
    if (projectData.projectTypeIri) attributes.type = projectData.projectTypeIri;

    const requestBody: CreateProjectRequest = {
      data: {
        type: "Project",
        attributes,
        relationships: projectData.categoryIri
          ? { category: { data: { type: "Category", id: projectData.categoryIri } } }
          : undefined,
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

  async createTemplate(templateData: {
    title: string;
    description: string;
    country?: string;
    url?: string;
    categoryIri?: string;
    projectTypeIri?: string;
  }): Promise<CreateProjectResponse> {
    const attributes: CreateProjectRequest['data']['attributes'] = {
      title: templateData.title,
      description: templateData.description,
      is_template: true,
    };
    if (templateData.country) attributes.country = templateData.country;
    if (templateData.url) attributes.url = templateData.url;
    if (templateData.projectTypeIri) attributes.type = templateData.projectTypeIri;

    const requestBody: CreateProjectRequest = {
      data: {
        type: "Project",
        attributes,
        relationships: templateData.categoryIri
          ? { category: { data: { type: "Category", id: templateData.categoryIri } } }
          : undefined,
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
    country?: string;
    url?: string;
    gitlab_project_name?: string;
    test_suite_name?: string;
    categoryIri?: string;
    projectTypeIri?: string;
  }): Promise<UpdateProjectResponse> {
    const attributes: UpdateProjectRequest['data']['attributes'] = {
      title: projectData.title,
      description: projectData.description,
    };
    if (projectData.country !== undefined) attributes.country = projectData.country;
    if (projectData.url !== undefined) attributes.url = projectData.url;
    if (projectData.gitlab_project_name !== undefined) attributes.gitlab_project_name = projectData.gitlab_project_name;
    if (projectData.test_suite_name !== undefined) attributes.test_suite_name = projectData.test_suite_name;
    if (projectData.projectTypeIri !== undefined) attributes.type = projectData.projectTypeIri;

    const requestBody: UpdateProjectRequest = {
      data: {
        type: "Project",
        attributes,
        relationships: projectData.categoryIri !== undefined
          ? { category: { data: projectData.categoryIri ? { type: "Category", id: projectData.categoryIri } : null } }
          : undefined,
      },
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

  async updateTemplate(id: string, templateData: {
    title: string;
    description: string;
    categoryIri?: string;
    country?: string;
    projectTypeIri?: string;
  }): Promise<UpdateProjectResponse> {
    const attributes: UpdateProjectRequest['data']['attributes'] = {
      title: templateData.title,
      description: templateData.description,
    };
    if (templateData.country !== undefined) attributes.country = templateData.country;
    if (templateData.projectTypeIri !== undefined) attributes.type = templateData.projectTypeIri;
    const requestBody: UpdateProjectRequest = {
      data: {
        type: "Project",
        attributes,
        relationships: templateData.categoryIri !== undefined
          ? { category: { data: templateData.categoryIri ? { type: "Category", id: templateData.categoryIri } : null } }
          : undefined,
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

  async deleteTemplate(id: string): Promise<void> {
    await apiService.authenticatedRequest(`/projects/${id}`, {
      method: 'DELETE',
    });
  }

  async cloneProject(id: string, projectData: { title: string; description: string; category?: string; categoryIri?: string; country?: string; project_type?: string; testCasesCount?: number }): Promise<{ data: ApiProject }> {
    const requestBody = {
      title: projectData.title,
      description: projectData.description
    };

    const response = await apiService.authenticatedRequest(`/projects/${id}/clone`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    if (!response) {
      throw new Error('No response received from server');
    }

    if (response.success && response.data) {
      const testCasesCount = projectData.testCasesCount ?? 0;
      return {
        data: {
          id: `/api/projects/${response.data.id}`,
          type: 'Project',
          attributes: {
            id: response.data.id,
            title: response.data.title,
            description: response.data.description,
            createdAt: response.data.created_at,
            updatedAt: response.data.updated_at,
            country: projectData.country,
            category: projectData.category,
            project_type: projectData.project_type,
          },
          relationships: {
            testCases: { data: Array.from({ length: testCasesCount }, (_, i) => ({ type: 'TestCase', id: String(i) })) },
            testRuns: { data: [] },
            sharedSteps: { data: [] },
            creator: { data: { type: 'User', id: '' } },
            editor: { data: { type: 'User', id: '' } },
            destroyer: { data: [] }
          }
        }
      };
    }

    return response;
  }

  async getTemplates(page: number = 1, itemsPerPage: number = 30): Promise<ProjectsApiResponse> {
    const response = await apiService.authenticatedRequest(`/templates?page=${page}&itemsPerPage=${itemsPerPage}`);
    return response || this.getDefaultProjectsResponse();
  }

  async getTemplatesWithSort(page: number = 1, itemsPerPage: number = 30, sortParam?: string): Promise<ProjectsApiResponse> {
    let url = `/templates?page=${page}&itemsPerPage=${itemsPerPage}`;
    if (sortParam) {
      url += `&${sortParam}`;
    }
    const response = await apiService.authenticatedRequest(url);
    return response || this.getDefaultProjectsResponse();
  }

  async searchTemplates(searchTerm: string, page: number = 1, itemsPerPage: number = 30, sortParam?: string): Promise<ProjectsApiResponse> {
    const trimmedTerm = searchTerm.trim();
    const isNumeric = /^\d+$/.test(trimmedTerm);
    const searchParam = trimmedTerm ? (isNumeric ? `id=${encodeURIComponent(trimmedTerm)}` : `title=${encodeURIComponent(trimmedTerm)}`) : '';
    let url = `/templates?page=${page}&itemsPerPage=${itemsPerPage}`;
    if (searchParam) {
      url += `&${searchParam}`;
    }
    if (sortParam) {
      url += `&${sortParam}`;
    }

    const response = await apiService.authenticatedRequest(url);
    return response || this.getDefaultProjectsResponse();
  }

  async getTemplatesCreatedByUser(userId: string, page: number = 1, itemsPerPage: number = 30, sortParam?: string): Promise<ProjectsApiResponse> {
    let url = `/templates?created_by=${userId}&page=${page}&itemsPerPage=${itemsPerPage}`;
    if (sortParam) {
      url += `&${sortParam}`;
    }

    const response = await apiService.authenticatedRequest(url);
    return response || this.getDefaultProjectsResponse();
  }

  async searchTemplatesCreatedByUser(searchTerm: string, userId: string, page: number = 1, itemsPerPage: number = 30, sortParam?: string): Promise<ProjectsApiResponse> {
    const searchParam = searchTerm.trim() ? `title=${encodeURIComponent(searchTerm)}` : '';
    let url = `/templates?created_by=${userId}&page=${page}&itemsPerPage=${itemsPerPage}`;
    if (searchParam) {
      url += `&${searchParam}`;
    }
    if (sortParam) {
      url += `&${sortParam}`;
    }

    const response = await apiService.authenticatedRequest(url);
    return response || this.getDefaultProjectsResponse();
  }

  async cloneTemplate(id: string, projectData: { title: string; description: string; category?: string; categoryIri?: string; country?: string; project_type?: string; testCasesCount?: number }): Promise<{ data: ApiProject }> {
    const requestBody = {
      title: projectData.title,
      description: projectData.description
    };

    const response = await apiService.authenticatedRequest(`/templates/${id}/clone`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    if (!response) {
      throw new Error('No response received from server');
    }

    if (response.success && response.data) {
      const testCasesCount = projectData.testCasesCount ?? 0;
      return {
        data: {
          id: `/api/templates/${response.data.id}`,
          type: 'Project',
          attributes: {
            id: response.data.id,
            title: response.data.title,
            description: response.data.description,
            createdAt: response.data.created_at,
            updatedAt: response.data.updated_at,
            country: projectData.country,
            category: projectData.category,
            project_type: projectData.project_type,
          },
          relationships: {
            testCases: { data: Array.from({ length: testCasesCount }, (_, i) => ({ type: 'TestCase', id: String(i) })) },
            testRuns: { data: [] },
            sharedSteps: { data: [] },
            creator: { data: { type: 'User', id: '' } },
            editor: { data: { type: 'User', id: '' } },
            destroyer: { data: [] }
          }
        }
      };
    }

    return response;
  }

  async cloneTemplateToProject(id: string, projectData: {
    title: string;
    description: string;
    country?: string;
    categoryIri?: string;
    categoryName?: string;
    projectTypeIri?: string;
  }): Promise<{ data: ApiProject }> {
    const requestBody: Record<string, unknown> = {
      title: projectData.title,
      description: projectData.description,
    };
    if (projectData.country) requestBody.country = projectData.country;
    if (projectData.projectTypeIri) requestBody.type = projectData.projectTypeIri;

    const response = await apiService.authenticatedRequest(`/projects/${id}/clone`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    if (!response) {
      throw new Error('No response received from server');
    }

    if (response.success && response.data) {
      return {
        data: {
          id: `/api/projects/${response.data.id}`,
          type: 'Project',
          attributes: {
            id: response.data.id,
            title: response.data.title,
            description: response.data.description,
            createdAt: response.data.created_at,
            updatedAt: response.data.updated_at,
            country: response.data.country ?? projectData.country,
            category: projectData.categoryName
              ? { id: projectData.categoryIri ?? '', name: projectData.categoryName, iri: projectData.categoryIri }
              : response.data.category,
            type: response.data.type ?? projectData.projectTypeIri,
          },
          relationships: {
            testCases: { data: [] },
            testRuns: { data: [] },
            sharedSteps: { data: [] },
            creator: { data: { type: 'User', id: '' } },
            editor: { data: { type: 'User', id: '' } },
            destroyer: { data: [] },
            ...(projectData.categoryIri ? { category: { data: { type: 'Category', id: projectData.categoryIri } } } : {}),
          }
        }
      };
    }

    return response;
  }
}

export const projectsApiService = new ProjectsApiService();