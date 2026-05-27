import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Project } from '../../types';

interface PageBreadcrumbProps {
  currentPage: string;
}

function buildBreadcrumbLabel(project: Pick<Project, 'name' | 'country' | 'project_type' | 'projectTypeIri'>): string {
  return [
    project.country,
    project.name,
    project.project_type || project.projectTypeIri,
  ].filter(Boolean).join(' - ');
}

const PageBreadcrumb: React.FC<PageBreadcrumbProps> = ({ currentPage }) => {
  const { state, getSelectedProject } = useApp();
  const selectedProject = getSelectedProject();
  const rootLabel = state.isTemplateMode ? 'Templates' : 'Projects';

  const projectLabel = selectedProject ? buildBreadcrumbLabel(selectedProject) : null;

  return (
    <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-gray-400">
      <span>{rootLabel}</span>
      {projectLabel && (
        <>
          <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{projectLabel}</span>
        </>
      )}
      <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="text-cyan-600 dark:text-cyan-400 font-medium">{currentPage}</span>
    </div>
  );
};

export default PageBreadcrumb;
