import React from 'react';
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

export function buildProjectLabel(project: Pick<Project, 'name' | 'category' | 'country' | 'project_type' | 'projectTypeIri'>): string {
  return [
    project.category,
    project.country,
    project.name,
    project.project_type || project.projectTypeIri,
  ].filter(Boolean).join(' - ');
}

interface ProjectTitleProps {
  project: Pick<Project, 'name' | 'category' | 'country' | 'project_type' | 'projectTypeIri'>;
  nameClassName?: string;
  hideCategory?: boolean;
  categoryAndTitleOnly?: boolean;
  truncate?: boolean;
}

const Separator = () => (
  <span className="text-slate-400 dark:text-slate-500 text-xs shrink-0 select-none font-normal"> </span>
);

const ProjectTitle: React.FC<ProjectTitleProps> = ({ project, nameClassName = '', hideCategory = false, categoryAndTitleOnly = false, truncate = false }) => {
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
        <span key="country" className="flex items-center gap-0.5 text-xs font-semibold text-slate-900 dark:text-white uppercase shrink-0">
          {country === 'WW' ? 'WW' : country}
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

  if (truncate) {
    const fullTitle = [
      !hideCategory && category ? category : null,
      country,
      name,
      project_type,
    ].filter(Boolean).join(' - ');

    const metaNodes: React.ReactNode[] = [];
    if (!hideCategory && category) {
      metaNodes.push(
        <span key="category" className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold text-white rounded-md shrink-0 ${categoryColor(category)}`}>
          {category}
        </span>
      );
    }
    if (country) {
      if (metaNodes.length > 0) metaNodes.push(<Separator key="sep-country" />);
      metaNodes.push(
        <span key="country" className="text-xs font-semibold text-slate-900 dark:text-white uppercase shrink-0">
          {country}
        </span>
      );
    }

    const label = project_type && !categoryAndTitleOnly ? `${name} ${project_type}` : name;

    return (
      <span className="flex items-center gap-x-1.5 overflow-hidden w-full" title={fullTitle}>
        {metaNodes.length > 0 && (
          <span className="flex items-center gap-x-1.5 shrink-0">{metaNodes}</span>
        )}
        {metaNodes.length > 0 && <Separator key="sep-name" />}
        <span className={`font-semibold text-slate-900 dark:text-white leading-tight truncate min-w-0 ${nameClassName}`}>
          {label}
        </span>
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
