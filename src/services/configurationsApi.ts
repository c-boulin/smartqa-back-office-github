import { apiService } from './api';

export interface ApiConfiguration {
  id: string;
  type: string;
  attributes: {
    id: number;
    label: string;
    createdAt: string;
    updatedAt: string;
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
}

export interface CreateConfigurationRequest {
  data: {
    type: "Configuration";
    attributes: {
      label: string;
    };
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

  async createConfiguration(label: string): Promise<CreateConfigurationResponse> {
    const requestBody: CreateConfigurationRequest = {
      data: {
        type: "Configuration",
        attributes: {
          label: label
        }
      }
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

  // Helper method to transform API configuration to our internal format
  transformApiConfiguration(apiConfiguration: ApiConfiguration): Configuration {
    return {
      id: apiConfiguration.attributes.id.toString(), // Use the numeric ID from attributes
      label: apiConfiguration.attributes.label
    };
  }
}

export const configurationsApiService = new ConfigurationsApiService();