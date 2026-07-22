import { apiService } from './api';

export interface MonitoringSettingsData {
  keepLaunchesDays: number | null;
  keepLogsDays: number;
  keepAttachmentsDays: number;
}

interface MonitoringSettingsResponse {
  data: MonitoringSettingsData;
}

const HEADERS = { Accept: 'application/json', 'Content-Type': 'application/json' };

export async function fetchMonitoringSettings(): Promise<MonitoringSettingsData> {
  const res = await apiService.authenticatedRequest('/monitoring-settings', { headers: HEADERS }) as MonitoringSettingsResponse;
  return res.data;
}

export async function saveMonitoringSettings(payload: {
  keep_launches_days: number | null;
  keep_logs_days: number;
  keep_attachments_days: number;
}): Promise<MonitoringSettingsData> {
  const res = await apiService.authenticatedRequest('/monitoring-settings', {
    method: 'PUT',
    headers: HEADERS,
    body: JSON.stringify(payload),
  }) as MonitoringSettingsResponse;
  return res.data;
}
