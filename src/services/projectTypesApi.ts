export interface ProjectType {
  id: string;
  name: string;
}

export const HARDCODED_PROJECT_TYPES: ProjectType[] = [
  { id: 'Webapp', name: 'Webapp' },
  { id: 'Native App', name: 'Native app' },
  { id: 'Other', name: 'Other' },
];

class ProjectTypesApiService {
  async getProjectTypes(): Promise<ProjectType[]> {
    return HARDCODED_PROJECT_TYPES;
  }
}

export const projectTypesApiService = new ProjectTypesApiService();
