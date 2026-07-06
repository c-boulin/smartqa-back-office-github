import React from 'react';
import { GitBranch } from 'lucide-react';

export interface GitLabRepo {
  slug: string;
  label: string;
}

const GITLAB_REPOS: GitLabRepo[] = [
  { slug: 'QATESmartbuilder', label: 'QATESmartbuilder' },
  { slug: 'QATEconf', label: 'QATEconf' },
  { slug: 'QATEgraph', label: 'QATEgraph' },
];

const AVATAR_COLORS = [
  'bg-cyan-500',
  'bg-emerald-500',
  'bg-amber-500',
];

interface OverviewProjectSidebarProps {
  selectedRepo: string | null;
  onSelectRepo: (repoSlug: string | null) => void;
}

const OverviewProjectSidebar: React.FC<OverviewProjectSidebarProps> = ({
  selectedRepo,
  onSelectRepo,
}) => {
  return (
    <div className="w-56 shrink-0" data-mipqa="overview-project-sidebar">
      <h3 className="px-3 mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        Repository
      </h3>

      <div className="space-y-1">
        <button
          type="button"
          data-mipqa="overview-repo-all-btn"
          onClick={() => onSelectRepo(null)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
            selectedRepo === null
              ? 'bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800'
              : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent'
          }`}
        >
          <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">All</span>
          </div>
          <span className={`text-sm font-medium truncate ${
            selectedRepo === null
              ? 'text-cyan-700 dark:text-cyan-300'
              : 'text-slate-700 dark:text-slate-300'
          }`}>
            All Repositories
          </span>
        </button>

        {GITLAB_REPOS.map((repo, idx) => {
          const isSelected = selectedRepo === repo.slug;
          const colorClass = AVATAR_COLORS[idx % AVATAR_COLORS.length];

          return (
            <button
              key={repo.slug}
              type="button"
              data-mipqa={`overview-repo-${repo.slug}-btn`}
              onClick={() => onSelectRepo(repo.slug)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                isSelected
                  ? 'bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg ${colorClass} flex items-center justify-center`}>
                <GitBranch className="w-4 h-4 text-white" />
              </div>
              <span className={`text-sm font-medium truncate ${
                isSelected
                  ? 'text-cyan-700 dark:text-cyan-300'
                  : 'text-slate-700 dark:text-slate-300'
              }`}>
                {repo.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default OverviewProjectSidebar;
