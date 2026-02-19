import { apiService } from './api';

export interface AutomatedConfigurationItem {
  id: string;
  project_id: string;
  label: string;
  browser: string | null;
  useragent: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AutomatedConfigurationsResponse {
  data: AutomatedConfigurationItem[];
}

export interface CreateAutomatedConfigurationPayload {
  label: string;
  browser?: string | null;
  useragent?: string | null;
}

export const automatedConfigurationsApi = {
  async getByProject(projectId: string): Promise<AutomatedConfigurationsResponse> {
    const response = await apiService.authenticatedRequest(
      `/projects/${projectId}/automated-configurations`
    );
    return response ?? { data: [] };
  },

  async create(projectId: string, payload: CreateAutomatedConfigurationPayload): Promise<{ data: AutomatedConfigurationItem }> {
    const response = await apiService.authenticatedRequest(
      `/projects/${projectId}/automated-configurations`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    if (!response?.data) throw new Error('Invalid response');
    return response as { data: AutomatedConfigurationItem };
  },

  async update(
    projectId: string,
    id: string,
    payload: CreateAutomatedConfigurationPayload
  ): Promise<{ data: AutomatedConfigurationItem }> {
    const response = await apiService.authenticatedRequest(
      `/projects/${projectId}/automated-configurations/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    );
    if (!response?.data) throw new Error('Invalid response');
    return response as { data: AutomatedConfigurationItem };
  },
};
