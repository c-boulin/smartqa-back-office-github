import { apiService } from './api';

export interface DefectTypeData {
  id: number;
  name: string;
  slug: string;
  abbreviation: string;
  color: string;
  isDefault: boolean;
  position: number;
}

export interface DefectGroupData {
  id: number;
  name: string;
  slug: string;
  position: number;
  defectTypes: DefectTypeData[];
}

interface DefectGroupsResponse {
  data: DefectGroupData[];
}

const HEADERS = { Accept: 'application/json', 'Content-Type': 'application/json' };

export async function fetchDefectGroups(): Promise<DefectGroupData[]> {
  const res = await apiService.authenticatedRequest('/overview-defect-groups', { headers: HEADERS }) as DefectGroupsResponse;
  return res.data;
}

export async function createDefectGroup(payload: { name: string; slug: string; position: number }): Promise<DefectGroupData> {
  const res = await apiService.authenticatedRequest('/overview-defect-groups', {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(payload),
  }) as { data: DefectGroupData };
  return res.data;
}

export async function updateDefectGroup(id: number, payload: { name?: string; position?: number }): Promise<DefectGroupData> {
  const res = await apiService.authenticatedRequest(`/overview-defect-groups/${id}`, {
    method: 'PUT',
    headers: HEADERS,
    body: JSON.stringify(payload),
  }) as { data: DefectGroupData };
  return res.data;
}

export async function deleteDefectGroup(id: number): Promise<void> {
  await apiService.authenticatedRequest(`/overview-defect-groups/${id}`, {
    method: 'DELETE',
    headers: HEADERS,
  });
}

export interface CreateDefectTypePayload {
  group_id: number;
  name: string;
  slug: string;
  abbreviation: string;
  color: string;
  is_default: boolean;
}

export interface UpdateDefectTypePayload {
  name?: string;
  abbreviation?: string;
  color?: string;
  group_id?: number;
}

export async function createDefectType(payload: CreateDefectTypePayload): Promise<DefectTypeData> {
  const res = await apiService.authenticatedRequest('/overview-defect-types', {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(payload),
  }) as { data: DefectTypeData };
  return res.data;
}

export async function updateDefectType(id: number, payload: UpdateDefectTypePayload): Promise<DefectTypeData> {
  const res = await apiService.authenticatedRequest(`/overview-defect-types/${id}`, {
    method: 'PUT',
    headers: HEADERS,
    body: JSON.stringify(payload),
  }) as { data: DefectTypeData };
  return res.data;
}

export async function deleteDefectType(id: number): Promise<void> {
  await apiService.authenticatedRequest(`/overview-defect-types/${id}`, {
    method: 'DELETE',
    headers: HEADERS,
  });
}

export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function autoAbbreviation(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 4);
}
