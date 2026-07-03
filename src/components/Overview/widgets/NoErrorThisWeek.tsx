import React from 'react';
import { CheckCircle } from 'lucide-react';
import type { OverviewExecutionRow } from '../../../services/overviewWidgetsApi';

interface NoErrorThisWeekProps {
  executionByService: OverviewExecutionRow[];
}

const NoErrorThisWeek: React.FC<NoErrorThisWeekProps> = ({ executionByService }) => {
  const healthyServices = executionByService.filter(s => s.band === 'passed');

  if (healthyServices.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h3 className="mb-4 text-base font-bold text-slate-900 dark:text-white">No error this week</h3>
      <div className="flex flex-wrap items-center gap-4">
        {healthyServices.map(service => (
          <div
            key={service.key}
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-800"
          >
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{service.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NoErrorThisWeek;
