import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

export interface EntityBreadcrumbProps {
  section: string;
  detailSegment?: string;
  /** When true, render nothing if no project is available for the trail (matches Test Cases list behavior). */
  hideWhenNoSelection?: boolean;
  /** List index: root > section (e.g. Projects > All) — no project name. */
  variant?: 'default' | 'list';
  /** When the route shows a project that may differ from global selection (e.g. deep links). Pass `null` to skip the name segment without using global selection. */
  projectNameOverride?: string | null;
  /** With projectNameOverride: root label; if omitted, derived from override project when passed with name only. */
  isTemplateOverride?: boolean;
  /** Id used for name-segment navigation (dashboard / test cases). Defaults to selected project id. */
  projectEntityId?: string | null;
  className?: string;
}

const linkClass =
  'rounded-sm transition-colors hover:text-cyan-600 dark:hover:text-cyan-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50';

export const EntityBreadcrumb: React.FC<EntityBreadcrumbProps> = ({
  section,
  detailSegment,
  hideWhenNoSelection = false,
  variant = 'default',
  projectNameOverride,
  isTemplateOverride,
  projectEntityId,
  className = ''
}) => {
  const navigate = useNavigate();
  const { state, getSelectedProject, dispatch } = useApp();
  const selected = getSelectedProject();

  const rootFromMode =
    state.sidebarEntityMode === 'templates' ? 'Templates' : 'Projects';

  const root =
    isTemplateOverride !== undefined
      ? isTemplateOverride
        ? 'Templates'
        : 'Projects'
      : rootFromMode;

  const displayName =
    projectNameOverride !== undefined && projectNameOverride !== null && projectNameOverride !== ''
      ? projectNameOverride
      : projectNameOverride === null
        ? undefined
        : selected?.name;

  if (hideWhenNoSelection && variant !== 'list' && !displayName) {
    return null;
  }

  const projectsListPath = '/projects?tab=projects';
  const templatesListPath = '/projects?tab=templates';

  const RootLink = root === 'Templates' ? (
    <Link to={templatesListPath} className={linkClass}>
      {root}
    </Link>
  ) : (
    <Link to={projectsListPath} className={linkClass}>
      {root}
    </Link>
  );

  const resolvedEntityId =
    projectEntityId !== undefined && projectEntityId !== null ? projectEntityId : selected?.id;

  const isTemplateEntity =
    isTemplateOverride !== undefined
      ? Boolean(isTemplateOverride)
      : Boolean(selected?.isTemplate);

  const handleEntityNameNavigate = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!resolvedEntityId) return;
    dispatch({ type: 'SET_SELECTED_PROJECT_ID', payload: resolvedEntityId });
    if (isTemplateEntity) {
      dispatch({ type: 'SET_SIDEBAR_ENTITY_MODE', payload: 'templates' });
      navigate('/test-cases');
    } else {
      dispatch({ type: 'SET_SIDEBAR_ENTITY_MODE', payload: 'projects' });
      navigate('/dashboard');
    }
  };

  const NameSegment =
    displayName && resolvedEntityId ? (
      <Link
        to={isTemplateEntity ? '/test-cases' : '/dashboard'}
        className={`font-semibold text-slate-900 dark:text-white ${linkClass}`}
        onClick={handleEntityNameNavigate}
      >
        {displayName}
      </Link>
    ) : displayName ? (
      <span className="font-semibold text-slate-900 dark:text-white">{displayName}</span>
    ) : null;

  if (variant === 'list') {
    return (
      <nav
        className={`text-xs sm:text-sm text-slate-500 dark:text-gray-400 mb-2 flex flex-wrap items-center gap-x-1 gap-y-0.5 ${className}`}
        aria-label="Breadcrumb"
      >
        {RootLink}
        <ChevronRight className="w-3 h-3 opacity-60 shrink-0" aria-hidden />
        <span>{section}</span>
      </nav>
    );
  }

  const showProjectName = Boolean(displayName);

  return (
    <nav
      className={`text-xs sm:text-sm text-slate-500 dark:text-gray-400 mb-2 flex flex-wrap items-center gap-x-1 gap-y-0.5 ${className}`}
      aria-label="Breadcrumb"
    >
      {RootLink}
      {showProjectName && (
        <>
          <ChevronRight className="w-3 h-3 opacity-60 shrink-0" aria-hidden />
          {NameSegment}
        </>
      )}
      <ChevronRight className="w-3 h-3 opacity-60 shrink-0" aria-hidden />
      <span>{section}</span>
      {detailSegment ? (
        <>
          <ChevronRight className="w-3 h-3 opacity-60 shrink-0" aria-hidden />
          <span className="font-medium text-slate-900 dark:text-white">{detailSegment}</span>
        </>
      ) : null}
    </nav>
  );
};

export default EntityBreadcrumb;
