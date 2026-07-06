import React, { useEffect, useState } from 'react';
import { GitBranch, Loader2 } from 'lucide-react';
import {
  fetchAllOverviewLaunchesProjectOptions,
  type OverviewLaunchesProjectOption,
} from '../../services/overviewWidgetsApi';

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
  onSelectRepo: (repoSlug: string | null, projectIds: number[]) => void;
}

const OverviewProjectSidebar: React.FC<OverviewProjectSidebarProps> = ({
  selectedRepo,
  onSelectRepo,
}) => {
  const [repoProjectMap, setRepoProjectMap] = useState<Record<string, number[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const options: OverviewLaunchesProjectOption[] = await fetchAllOverviewLaunchesProjectOptions();
        if (cancelled) return;

        const map: Record<string, number[]> = {};
        for (const repo of GITLAB_REPOS) {
          map[repo.slug] = options
            .filter(p => p.name.toLowerCase().includes(repo.slug.toLowerCase()))
            .map(p => p.id);
        }
        setRepoProjectMap(map);
      } catch {
        if (!cancelled) {
          setRepoProjectMap({});
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="w-56 shrink-0" data-mipqa="overview-project-sidebar">
      <h3 className="px-3 mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        Project
      </h3>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-cyan-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-1">
          <button
            type="button"
            data-mipqa="overview-repo-all-btn"
            onClick={() => onSelectRepo(null, [])}
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
              All Projects
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
                onClick={() => onSelectRepo(repo.slug, repoProjectMap[repo.slug] ?? [])}
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
      )}
    </div>
  );
};

export default OverviewProjectSidebar;
