import { apiService } from './api';

/** Project relation: empty array = no project (global), object = automated (per project) */
export type ApiConfigurationProjectData = [] | { type: string; id: string };

export interface ApiConfiguration {
  id: string;
  type: string;
  attributes: {
    id: number;
    label: string;
    projectId?: string | number | null;
    project_id?: string | number | null;
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
  private cachedConfigurations: Configuration[] | null = null;
  private inFlightPromise: Promise<Configuration[]> | null = null;
  private cacheGeneration = 0;

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

  async getConfigurations(page = 1): Promise<ConfigurationsApiResponse> {
    const response = await apiService.authenticatedRequest(`/configurations?itemsPerPage=100&page=${page}`);
    return response || this.getDefaultConfigurationsResponse();
  }

  async fetchAllConfigurations(): Promise<Configuration[]> {
    if (this.cachedConfigurations) {
      return this.cachedConfigurations;
    }
    if (this.inFlightPromise) {
      return this.inFlightPromise;
    }

    const generation = this.cacheGeneration;
    const promise = this.loadAllPages()
      .then((configurations) => {
        // A fetch started before an invalidation must not repopulate the cache with stale data.
        if (generation === this.cacheGeneration) {
          this.cachedConfigurations = configurations;
        }
        return configurations;
      })
      .finally(() => {
        if (this.inFlightPromise === promise) {
          this.inFlightPromise = null;
        }
      });

    this.inFlightPromise = promise;
    return promise;
  }

  invalidateConfigurationsCache(): void {
    this.cachedConfigurations = null;
    this.inFlightPromise = null;
    this.cacheGeneration += 1;
  }

  private async loadAllPages(): Promise<Configuration[]> {
    const firstPage = await this.getConfigurations();
    if (!firstPage.data || firstPage.data.length === 0) {
      return [];
    }

    const configurations = firstPage.data.map((apiConfig) => this.transformApiConfiguration(apiConfig));
    const totalPages = Math.ceil(firstPage.meta.totalItems / firstPage.meta.itemsPerPage);
    if (totalPages <= 1) {
      return configurations;
    }

    const pagePromises: Promise<Configuration[]>[] = [];
    for (let page = 2; page <= totalPages; page++) {
      pagePromises.push(
        this.getConfigurations(page).then((response) =>
          response.data.map((apiConfig) => this.transformApiConfiguration(apiConfig))
        )
      );
    }
    const remainingPages = await Promise.all(pagePromises);
    return configurations.concat(...remainingPages);
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
    const projectIdRaw = attrs.projectId ?? attrs.project_id ?? null;
    return {
      id: attrs.id.toString(),
      label: attrs.label,
      projectId: projectIdRaw != null ? String(projectIdRaw) : null,
    };
  }
}

export const configurationsApiService = new ConfigurationsApiService();