import { Project } from '../types';

const TEST_CASES_ONLY_PROJECT_NAMES = ['game qa hub'];

export const TEST_CASES_PATH = '/test-cases';

const normalize = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();

export const isTestCasesOnlyProject = (project?: Pick<Project, 'name'> | null): boolean =>
  !!project?.name && TEST_CASES_ONLY_PROJECT_NAMES.includes(normalize(project.name));

export const getProjectLandingPath = (project?: Pick<Project, 'name'> | null): string =>
  isTestCasesOnlyProject(project) ? TEST_CASES_PATH : '/dashboard';
