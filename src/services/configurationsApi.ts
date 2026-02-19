import { apiService } from './api';

/** Project relation: empty array = no project (global), object = automated (per project) */
export type ApiConfigurationProjectData = [] | { type: string; id: string };

export interface ApiConfiguration {
  id: string;
  type: string;
  attributes: {
    id: number;
    label: string;
    projectId?: number | null;
    project_id?: number | null;
    createdAt: string;
    updatedAt: string;
  };
  relationships?: {
    project?: {
      data: ApiConfigurationProjectData;
    };
  };
}

export interface ConfigurationsApiResponse {
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
  data: ApiConfiguration[];
}

export interface Configuration {
  id: string;
  label: string;
  /** Set for project-specific (automated) configurations; null/undefined for global. */
  projectId?: string | null;
}

export interface ConfigurationAttributes {
  label: string;
}

export interface CreateConfigurationRequest {
  data: {
    type: "Configuration";
    attributes: ConfigurationAttributes;
  };
}

export interface CreateConfigurationResponse {
  data: ApiConfiguration;
}

class ConfigurationsApiService {
  public getDefaultConfigurationsResponse(): ConfigurationsApiResponse {
    return {
      links: {
        self: '',
        first: '',
        last: ''
      },
      meta: {
        totalItems: 0,
        itemsPerPage: 100,
        currentPage: 1
      },
      data: []
    };
  }

  async getConfigurations(): Promise<ConfigurationsApiResponse> {
    const response = await apiService.authenticatedRequest('/configurations?itemsPerPage=100');
    return response || this.getDefaultConfigurationsResponse();
  }

  async createConfiguration(attributes: ConfigurationAttributes): Promise<CreateConfigurationResponse> {
    const requestBody: CreateConfigurationRequest = {
      data: {
        type: "Configuration",
        attributes: {
          label: attributes.label,
        },
      },
    };

    const response = await apiService.authenticatedRequest('/configurations', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    if (!response) {
      throw new Error('No response received from server');
    }

    return response;
  }

  async updateConfiguration(id: string, attributes: Partial<ConfigurationAttributes>): Promise<CreateConfigurationResponse> {
    const requestBody = {
      data: {
        type: "Configuration",
        id: `/api/configurations/${id}`,
        attributes: {
          ...(attributes.label !== undefined && { label: attributes.label }),
        },
      },
    };

    const response = await apiService.authenticatedRequest(`/configurations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(requestBody),
    });

    if (!response) {
      throw new Error('No response received from server');
    }

    return response;
  }

  // Helper method to transform API configuration to our internal format
  transformApiConfiguration(apiConfiguration: ApiConfiguration): Configuration {
    const attrs = apiConfiguration.attributes;
    // API exposes project via relationships.project.data (object = automated, [] = global)
    const projectData = apiConfiguration.relationships?.project?.data;
    const projectIdFromRelation =
      Array.isArray(projectData) || !projectData
        ? null
        : (() => {
            const match = projectData.id.match(/\/api\/projects\/(\d+)$/);
            return match ? match[1] : null;
          })();
    const projectIdRaw = attrs.projectId ?? attrs.project_id ?? projectIdFromRelation;
    return {
      id: attrs.id.toString(),
      label: attrs.label,
      projectId: projectIdRaw != null ? String(projectIdRaw) : null,
    };
  }
}

export const configurationsApiService = new ConfigurationsApiService();