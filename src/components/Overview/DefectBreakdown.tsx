import React from 'react';
import { Project } from '../../types';
import DefectsChart from '../Charts/DefectsChart';

interface DefectBreakdownProps {
  projects: Project[];
}

const DefectBreakdown: React.FC<DefectBreakdownProps> = ({ projects }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Defect Breakdown by Service
          </h2>
          <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
            This widget displays last week's triage/defect status per service
          </p>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500 dark:text-gray-400">No projects available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {projects.map(project => (
              <DefectsChart key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DefectBreakdown;
