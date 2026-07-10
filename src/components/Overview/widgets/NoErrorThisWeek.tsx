import React from 'react';
import { CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { OverviewExecutionRow } from '../../../services/overviewWidgetsApi';
import { navigateToFilteredLaunches } from './navigateToFilteredLaunches';

interface NoErrorThisWeekProps {
  executionByService: OverviewExecutionRow[];
  windowStartFrom: string;
  windowStartTo: string;
}

const NoErrorThisWeek: React.FC<NoErrorThisWeekProps> = ({
  executionByService,
  windowStartFrom,
  windowStartTo,
}) => {
  const navigate = useNavigate();
  const healthyServices = executionByService.filter(s => s.band === 'passed');

  if (healthyServices.length === 0) return null;

  const handleClick = (service: OverviewExecutionRow): void => {
    navigateToFilteredLaunches(navigate, {
      projectIds: service.projectIds,
      startFrom: windowStartFrom,
      startTo: windowStartTo,
    });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h3 className="mb-4 text-base font-bold text-slate-900 dark:text-white">No error this week</h3>
      <div className="flex flex-wrap items-center gap-4">
        {healthyServices.map(service => (
          <button
            key={service.key}
            type="button"
            onClick={() => handleClick(service)}
            aria-label={`View launches for ${service.label}`}
            data-mipqa={`no-error-pill-${service.label.toLowerCase().replace(/\s+/g, '-')}`}
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 transition-colors hover:border-cyan-400 hover:bg-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-cyan-500 dark:hover:bg-cyan-950/30 dark:focus-visible:ring-cyan-400"
          >
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{service.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default NoErrorThisWeek;
