import React from 'react';
import { ChevronRight, Plus, Sparkles } from 'lucide-react';
import Tooltip from '../UI/Tooltip';
import PermissionGuard from '../PermissionGuard';
import { PERMISSIONS } from '../../utils/permissions';
import { usePermissions } from '../../hooks/usePermissions';
import { Project } from '../../types';
import { useApp } from '../../context/AppContext';

function buildBreadcrumbLabel(project: Pick<Project, 'name' | 'country' | 'project_type' | 'projectTypeIri'>): string {
  return [
    project.country,
    project.name,
    project.project_type || project.projectTypeIri,
  ].filter(Boolean).join(' - ');
}

interface TestCasesHeaderProps {
  selectedProject: Project | null;
  totalItems: number;
  selectedFolder: { id: string; name: string } | null;
  onCreateTestCase: () => void;
  disabled: boolean;
  onGenerateWithAi: () => void;
  rootLabel?: string;
}

const TestCasesHeader: React.FC<TestCasesHeaderProps> = ({
  selectedProject,
  selectedFolder,
  rootLabel,
  onCreateTestCase,
  onGenerateWithAi,
  disabled,
}) => {
  const { state } = useApp();
  const { hasPermission } = usePermissions();
  const canCreate = !state.isTemplateMode || hasPermission(PERMISSIONS.TEMPLATE.UPDATE);
  const resolvedRootLabel = rootLabel ?? (state.isTemplateMode ? 'Templates' : 'Projects');

  return (
    <div className="space-y-3">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-gray-400">
        <span>{resolvedRootLabel}</span>
        {selectedProject && (
          <>
            <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{buildBreadcrumbLabel(selectedProject)}</span>
          </>
        )}
        {selectedFolder && (
          <>
            <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{selectedFolder.name}</span>
          </>
        )}
        <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="text-cyan-600 dark:text-cyan-400 font-medium">Test Cases</span>
      </div>

      {/* Title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
        <h1 data-mipqa="testcases-title" className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">
          Test Cases
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
          {selectedProject
            ? 'Manage and organize your test cases, steps and folders'
            : 'Please select a project to view test cases'}
        </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <Tooltip content="generate your test with ai">
              <button type="button" data-mipqa="generate-testcase-ai-button" onClick={onGenerateWithAi} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-700 to-fuchsia-700 px-4 py-2 text-sm font-medium text-white shadow-lg hover:from-purple-800 hover:to-fuchsia-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-fuchsia-400">
                <Sparkles className="h-4 w-4" />Generate Test Case with AI
              </button>
            </Tooltip>
          </div>
          {canCreate && !disabled && <PermissionGuard permission={PERMISSIONS.TEST_CASE.CREATE}>
            <button type="button" data-mipqa="create-testcase-button" onClick={onCreateTestCase} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-lg hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"><Plus className="h-4 w-4" />New Test Case</button>
          </PermissionGuard>}
        </div>
      </div>
    </div>
  );
};

export default TestCasesHeader;
