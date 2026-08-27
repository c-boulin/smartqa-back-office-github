import React from 'react';
import { CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { OverviewExecutionRow } from '../../../services/overviewWidgetsApi';
import { navigateToFilteredTests } from './navigateToFilteredTests';

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
    navigateToFilteredTests(navigate, {
      projectIds: service.projectIds,
      startFrom: windowStartFrom,
      startTo: windowStartTo,
    });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h3 className="mb-4 text-base font-bold text-slate-900 dark:text-white">No error this week</h3>
      <div className="flex flex-wrap items-center gap-6">
        {healthyServices.map(service => (
          <button
            key={service.key}
            type="button"
            onClick={() => handleClick(service)}
            aria-label={`View tests for ${service.label}`}
            data-mipqa={`no-error-service-${service.label.toLowerCase().replace(/\s+/g, '-')}`}
            className="flex items-center gap-2 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded-md px-1 py-0.5"
          >
            <CheckCircle className="h-5 w-5 text-emerald-400" />
            <span className="text-sm text-slate-700 dark:text-slate-300">{service.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default NoErrorThisWeek;
