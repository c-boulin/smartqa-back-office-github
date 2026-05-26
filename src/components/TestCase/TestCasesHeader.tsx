import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Project } from '../../types';
import { useApp } from '../../context/AppContext';
import { buildProjectLabel } from '../Project/ProjectTitle';

interface TestCasesHeaderProps {
  selectedProject: Project | null;
  totalItems: number;
  selectedFolder: { id: string; name: string } | null;
  onCreateTestCase: () => void;
  disabled: boolean;
  rootLabel?: string;
}

const TestCasesHeader: React.FC<TestCasesHeaderProps> = ({
  selectedProject,
  selectedFolder,
  rootLabel,
}) => {
  const { state } = useApp();
  const resolvedRootLabel = rootLabel ?? (state.isTemplateMode ? 'Templates' : 'Projects');

  return (
    <div className="space-y-3">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-gray-400">
        <span>{resolvedRootLabel}</span>
        {selectedProject && (
          <>
            <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{buildProjectLabel(selectedProject)}</span>
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
    </div>
  );
};

export default TestCasesHeader;
