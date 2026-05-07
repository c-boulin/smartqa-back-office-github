import React from 'react';
import { Globe } from 'lucide-react';
import { Project } from '../../types';

export const CATEGORY_COLORS: Record<string, string> = {
  'Ticketing':  'bg-blue-500',
  'VOD':        'bg-orange-500',
  'Games':      'bg-green-500',
  'Sports':     'bg-red-500',
  'WL Product': 'bg-teal-500',
  'Music':      'bg-cyan-500',
  'Lifestyle':  'bg-pink-500',
  'Loyalty':    'bg-amber-500',
  'Campaign':   'bg-sky-500',
};

export function categoryColor(category?: string): string {
  return category ? (CATEGORY_COLORS[category] ?? 'bg-slate-500') : 'bg-slate-500';
}

interface ProjectTitleProps {
  project: Pick<Project, 'name' | 'category' | 'country' | 'project_type' | 'projectTypeIri'>;
  nameClassName?: string;
  hideCategory?: boolean;
  categoryAndTitleOnly?: boolean;
}

const Separator = () => (
  <span className="text-slate-400 dark:text-slate-500 text-xs shrink-0 select-none font-normal">-</span>
);

const ProjectTitle: React.FC<ProjectTitleProps> = ({ project, nameClassName = '', hideCategory = false, categoryAndTitleOnly = false }) => {
  const { category, country, name } = project;
  const project_type = project.project_type || project.projectTypeIri;

  const parts: React.ReactNode[] = [];

  if (category && !hideCategory) {
    parts.push(
      <span
        key="category"
        className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold text-white rounded-md shrink-0 ${categoryColor(category)}`}
      >
        {category}
      </span>
    );
  }

  if (!categoryAndTitleOnly) {
    if (country) {
      if (parts.length > 0) parts.push(<Separator key="sep-country" />);
      parts.push(
        <span key="country" className="flex items-center gap-0.5 text-xs font-mono font-semibold text-slate-900 dark:text-white uppercase shrink-0">
          {country === 'WW' ? <><Globe className="w-3 h-3" />WW</> : country}
        </span>
      );
    }
  }

  if (parts.length > 0) parts.push(<Separator key="sep-name" />);
  parts.push(
    <span key="name" className={`font-semibold text-slate-900 dark:text-white leading-tight ${nameClassName}`}>
      {name}
    </span>
  );

  if (!categoryAndTitleOnly && project_type) {
    parts.push(<Separator key="sep-type" />);
    parts.push(
      <span key="type" className={`font-semibold text-slate-900 dark:text-white leading-tight shrink-0 ${nameClassName}`}>
        {project_type}
      </span>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
      {parts}
    </span>
  );
};

export default ProjectTitle;
