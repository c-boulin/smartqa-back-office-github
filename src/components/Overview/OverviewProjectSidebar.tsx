import React from 'react';
import { Gamepad2 } from 'lucide-react';
import {
  DvsIcon,
  SbIcon,
  BoltIcon,
  LandingIcon,
  AiAgentIcon,
} from './overviewCategoryIcons';
import { OVERVIEW_CATEGORIES, OverviewCategoryMeta } from '../../constants/overviewCategories';

type IconComponent = React.ComponentType<{ className?: string }>;

const CATEGORY_ICONS: Record<string, IconComponent> = {
  dvs: DvsIcon,
  sb: SbIcon,
  bolt: BoltIcon,
  games: Gamepad2,
  landing: LandingIcon,
  'ai-agent': AiAgentIcon,
};

type CategoryWithIcon = OverviewCategoryMeta & { Icon: IconComponent };

const CATEGORIES: CategoryWithIcon[] = OVERVIEW_CATEGORIES.map(category => ({
  ...category,
  Icon: CATEGORY_ICONS[category.id],
}));

interface OverviewProjectSidebarProps {
  selectedRepos: string[];
  onSelectReposChange: (repoSlugs: string[]) => void;
}

function reposMatch(a: string[], b: string[]): boolean {
  if (a.length !== b.length || a.length === 0) return false;
  const setB = new Set(b);
  return a.every(s => setB.has(s));
}

const OverviewProjectSidebar: React.FC<OverviewProjectSidebarProps> = ({
  selectedRepos,
  onSelectReposChange,
}) => {
  return (
    <div className="w-56 shrink-0 pt-1" data-mipqa="overview-project-sidebar">
      <h3 className="px-3 mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        Project
      </h3>

      <div className="space-y-1">
        {CATEGORIES.map(category => {
          const isSelected = category.enabled && reposMatch(category.repoNames, selectedRepos);
          const Icon = category.Icon;

          const baseClasses = 'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors';
          const stateClasses = isSelected
            ? 'bg-slate-700 dark:bg-[#1e3a5f]'
            : category.enabled
              ? 'hover:bg-slate-100 dark:hover:bg-slate-800/50'
              : 'opacity-50 cursor-not-allowed';

          const labelClasses = `text-sm font-medium truncate ${
            isSelected
              ? 'text-white'
              : 'text-slate-700 dark:text-slate-300'
          }`;

          return (
            <button
              key={category.id}
              type="button"
              data-mipqa={`overview-category-${category.id}-btn`}
              disabled={!category.enabled}
              aria-pressed={isSelected}
              onClick={() => {
                if (!category.enabled) return;
                if (isSelected) {
                  onSelectReposChange([]);
                } else {
                  onSelectReposChange(category.repoNames);
                }
              }}
              className={`${baseClasses} ${stateClasses}`}
            >
              <div className="w-8 h-8 rounded-full bg-[#01ADD8] flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-white" />
              </div>
              <span className={labelClasses}>{category.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default OverviewProjectSidebar;
