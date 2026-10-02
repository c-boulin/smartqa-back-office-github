import React from 'react';
import { Gamepad2 } from 'lucide-react';
import {
  DvsIcon,
  SbIcon,
  BoltIcon,
  LandingIcon,
  AiAgentIcon,
} from './overviewCategoryIcons';
import {
  EMPTY_OVERVIEW_CATEGORY_SELECTION,
  OVERVIEW_CATEGORIES,
  OverviewCategoryMeta,
  OverviewCategorySelection,
} from '../../constants/overviewCategories';

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
  selection: OverviewCategorySelection;
  onSelectionChange: (selection: OverviewCategorySelection) => void;
}

function setsMatch<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length || a.length === 0) return false;
  const setB = new Set(b);
  return a.every(s => setB.has(s));
}

// TEMP(bolt-overview) — projectIds branch only exists for the Bolt placeholder.
// TODO(remove): replace with real Bolt gitlab repoNames when the QATE Bolt repo exists
function categoryMatchesSelection(category: OverviewCategoryMeta, selection: OverviewCategorySelection): boolean {
  if (category.repoNames.length > 0) return setsMatch(category.repoNames, selection.repoNames);
  if (category.projectIds && category.projectIds.length > 0) {
    return selection.repoNames.length === 0 && setsMatch(category.projectIds, selection.projectIds);
  }
  return false;
}

function selectionForCategory(category: OverviewCategoryMeta): OverviewCategorySelection {
  return { repoNames: category.repoNames, projectIds: category.projectIds ?? [] };
}

const OverviewProjectSidebar: React.FC<OverviewProjectSidebarProps> = ({
  selection,
  onSelectionChange,
}) => {
  return (
    <div
      className="w-52 shrink-0 min-h-[calc(100vh-3.5rem)] bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 py-5 px-3"
      data-mipqa="overview-project-sidebar"
    >
      <h3 className="px-1 mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        Project
      </h3>

      <div className="space-y-1">
        {CATEGORIES.map(category => {
          const isSelected = category.enabled && categoryMatchesSelection(category, selection);
          const Icon = category.Icon;

          const baseClasses = 'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors';
          const stateClasses = isSelected
            ? 'bg-slate-700 dark:bg-[#1e3a5f]'
            : category.enabled
              ? 'hover:bg-slate-100 dark:hover:bg-slate-800/50'
              : 'opacity-50 cursor-not-allowed';

          const labelClasses = `text-sm font-medium ${
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
                  onSelectionChange(EMPTY_OVERVIEW_CATEGORY_SELECTION);
                } else {
                  onSelectionChange(selectionForCategory(category));
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
