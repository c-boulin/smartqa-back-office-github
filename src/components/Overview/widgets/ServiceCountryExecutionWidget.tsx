import React, { useMemo } from 'react';
import type { OverviewExecutionRow } from '../../../services/overviewWidgetsApi';
import { ServiceStatCard, StatusBoard, StatusGroup } from './dashboard';

interface ServiceCountryExecutionWidgetProps {
  executionByService: OverviewExecutionRow[];
  executionByCountry: OverviewExecutionRow[];
  executionByCountryByService: Record<string, OverviewExecutionRow[]>;
  windowStartFrom: string;
  windowStartTo: string;
}

function formatPassRateLabel(passRate: number | null | undefined): string {
  if (passRate == null || Number.isNaN(passRate)) {
    return '\u2014';
  }
  return `${passRate}%`;
}

const ServiceCountryExecutionWidget: React.FC<ServiceCountryExecutionWidgetProps> = ({
  executionByService,
}) => {
  const failed = useMemo(() => executionByService.filter(r => r.band === 'failed'), [executionByService]);
  const passed = useMemo(() => executionByService.filter(r => r.band === 'passed'), [executionByService]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      {/* Section header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Service health By Service</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Last 7 days component health check</p>
        </div>
        <div className="flex flex-col gap-1.5" role="group" aria-label="Pass rate legend">
          <div className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-10 shrink-0 rounded-full bg-red-500 dark:bg-red-400" aria-hidden />
            <span className="text-xs text-slate-600 dark:text-slate-400">Need attention (less than 99%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-10 shrink-0 rounded-full bg-green-500 dark:bg-green-400" aria-hidden />
            <span className="text-xs text-slate-600 dark:text-slate-400">Healthy (100%)</span>
          </div>
        </div>
      </div>

      {/* Cards */}
      {executionByService.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
          No execution data for this view.
        </p>
      ) : (
        <StatusBoard>
          <StatusGroup title="Failed" count={failed.length} status="failed">
            {failed.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">None</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {failed.map(row => (
                  <ServiceStatCard
                    key={`f-${row.key}`}
                    serviceName={row.label}
                    passingRate={formatPassRateLabel(row.passRate)}
                    testCases={row.pass + row.fail}
                    status="failed"
                  />
                ))}
              </div>
            )}
          </StatusGroup>
          <StatusGroup title="Passed" count={passed.length} status="passed">
            {passed.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">None</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {passed.map(row => (
                  <ServiceStatCard
                    key={`p-${row.key}`}
                    serviceName={row.label}
                    passingRate={formatPassRateLabel(row.passRate)}
                    testCases={row.pass + row.fail}
                    status="passed"
                  />
                ))}
              </div>
            )}
          </StatusGroup>
        </StatusBoard>
      )}
    </div>
  );
};

export default ServiceCountryExecutionWidget;
