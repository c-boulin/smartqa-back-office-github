import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  fetchAllOverviewLaunchesProjectOptions,
  type OverviewLaunchesProjectOption,
} from '../../services/overviewWidgetsApi';

interface OverviewProjectSidebarProps {
  selectedProjectId: number | null;
  onSelectProject: (projectId: number | null) => void;
}

const AVATAR_COLORS = [
  'bg-cyan-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-blue-500',
  'bg-teal-500',
];

const OverviewProjectSidebar: React.FC<OverviewProjectSidebarProps> = ({
  selectedProjectId,
  onSelectProject,
}) => {
  const [projects, setProjects] = useState<OverviewLaunchesProjectOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const options = await fetchAllOverviewLaunchesProjectOptions();
        if (!cancelled) {
          setProjects(options);
        }
      } catch {
        if (!cancelled) {
          setProjects([]);
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

  if (loading) {
    return (
      <div className="w-56 shrink-0 flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 text-cyan-500 animate-spin" />
      </div>
    );
  }

  if (projects.length === 0) {
    return null;
  }

  return (
    <div className="w-56 shrink-0" data-mipqa="overview-project-sidebar">
      <h3 className="px-3 mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        Project
      </h3>
      <div className="space-y-1">
        <button
          type="button"
          data-mipqa="overview-project-all-btn"
          onClick={() => onSelectProject(null)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
            selectedProjectId === null
              ? 'bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800'
              : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent'
          }`}
        >
          <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">All</span>
          </div>
          <span className={`text-sm font-medium truncate ${
            selectedProjectId === null
              ? 'text-cyan-700 dark:text-cyan-300'
              : 'text-slate-700 dark:text-slate-300'
          }`}>
            All Projects
          </span>
        </button>

        {projects.map((project, idx) => {
          const isSelected = selectedProjectId === project.id;
          const colorClass = AVATAR_COLORS[idx % AVATAR_COLORS.length];
          const initial = project.name.charAt(0).toUpperCase();

          return (
            <button
              key={project.id}
              type="button"
              data-mipqa={`overview-project-${project.id}-btn`}
              onClick={() => onSelectProject(project.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                isSelected
                  ? 'bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg ${colorClass} flex items-center justify-center`}>
                <span className="text-xs font-bold text-white">{initial}</span>
              </div>
              <span className={`text-sm font-medium truncate ${
                isSelected
                  ? 'text-cyan-700 dark:text-cyan-300'
                  : 'text-slate-700 dark:text-slate-300'
              }`}>
                {project.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default OverviewProjectSidebar;
