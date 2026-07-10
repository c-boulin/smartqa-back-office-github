import React, { useMemo, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { OverviewExecutionRow } from '../../../services/overviewWidgetsApi';
import { ServiceStatCard, StatusBoard, StatusGroup } from './dashboard';
import { navigateToFilteredLaunches } from './navigateToFilteredLaunches';

interface ServiceCountryExecutionWidgetProps {
  executionByService: OverviewExecutionRow[];
  executionByCountry: OverviewExecutionRow[];
  executionByCountryByService: Record<string, OverviewExecutionRow[]>;
  windowStartFrom: string;
  windowStartTo: string;
}

type ScopeView = 'services' | 'countries' | 'serviceByCountry';

function formatPassRateLabel(passRate: number | null | undefined): string {
  if (passRate == null || Number.isNaN(passRate)) {
    return '\u2014';
  }
  return `${passRate}%`;
}

const FAILED_LEGEND_RED_SHADES = ['bg-red-950', 'bg-red-700', 'bg-red-500', 'bg-red-300'] as const;

function FailedPassRateLegendSwatch(): React.ReactElement {
  return (
    <div className="flex h-1.5 w-14 shrink-0 overflow-hidden rounded-full" aria-hidden>
      {FAILED_LEGEND_RED_SHADES.map((className, i) => (
        <span key={i} className={`min-w-0 flex-1 ${className}`} />
      ))}
    </div>
  );
}

const ServiceCountryExecutionWidget: React.FC<ServiceCountryExecutionWidgetProps> = ({
  executionByService,
  executionByCountry,
  executionByCountryByService,
  windowStartFrom,
  windowStartTo,
}) => {
  const navigate = useNavigate();
  const [scope, setScope] = useState<ScopeView>('services');
  const [selectedServiceKey, setSelectedServiceKey] = useState<string | null>(null);

  const selectedServiceLabel = useMemo(() => {
    if (selectedServiceKey === null) return '';
    return executionByService.find(s => s.key === selectedServiceKey)?.label ?? '';
  }, [executionByService, selectedServiceKey]);

  const rows: OverviewExecutionRow[] = useMemo(() => {
    if (scope === 'countries') return executionByCountry;
    if (scope === 'serviceByCountry' && selectedServiceKey !== null) {
      return executionByCountryByService[selectedServiceKey] ?? [];
    }
    return executionByService;
  }, [scope, selectedServiceKey, executionByService, executionByCountry, executionByCountryByService]);

  const failed = rows.filter(r => r.band === 'failed');
  const passed = rows.filter(r => r.band === 'passed');

  const goToServices = (): void => {
    setScope('services');
    setSelectedServiceKey(null);
  };

  const goToCountries = (): void => {
    setScope('countries');
    setSelectedServiceKey(null);
  };

  const openServiceByCountry = (serviceKey: string): void => {
    setSelectedServiceKey(serviceKey);
    setScope('serviceByCountry');
  };

  const handleViewLaunches = (row: OverviewExecutionRow): void => {
    navigateToFilteredLaunches(navigate, {
      projectIds: row.projectIds,
      startFrom: windowStartFrom,
      startTo: windowStartTo,
    });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      {/* Section header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Service health By Country</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Last 7 days component health check</p>
        </div>
        <div className="flex items-center gap-5" role="group" aria-label="Pass rate legend">
          <div className="flex items-center gap-2">
            <FailedPassRateLegendSwatch />
            <span className="text-xs text-slate-600 dark:text-slate-400">Need attention (less then 99%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-14 shrink-0 rounded-full bg-green-500" aria-hidden />
            <span className="text-xs text-slate-600 dark:text-slate-400">Healthy (100%)</span>
          </div>
        </div>
      </div>

      {/* Scope navigation */}
      <div className="mb-5">
        {scope === 'serviceByCountry' ? (
          <div className="flex min-w-0 flex-col gap-0.5">
            <button
              type="button"
              onClick={goToServices}
              className="flex items-center gap-1 text-xs font-medium text-cyan-500 hover:text-cyan-400 transition-colors"
              data-mipqa="back-to-services-btn"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Back to services
            </button>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {selectedServiceLabel} - Country breakdown
            </p>
          </div>
        ) : (
          <nav className="flex flex-wrap items-center gap-1 text-sm" aria-label="Execution scope">
            {scope === 'services' ? (
              <span className="font-medium text-cyan-600 dark:text-cyan-400">service</span>
            ) : (
              <button
                type="button"
                onClick={goToServices}
                className="font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-white"
              >
                service
              </button>
            )}
            <span className="select-none text-slate-400 dark:text-slate-500" aria-hidden>
              &gt;
            </span>
            {scope === 'services' ? (
              <button
                type="button"
                onClick={goToCountries}
                className="font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline dark:text-slate-400 dark:hover:text-slate-200"
              >
                country
              </button>
            ) : (
              <span className="font-medium text-cyan-600 dark:text-cyan-400">country</span>
            )}
          </nav>
        )}
      </div>

      {/* Cards */}
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
          No execution data for this view.
        </p>
      ) : (
        <StatusBoard>
          <StatusGroup
            title={scope === 'serviceByCountry' ? 'Failed countries' : 'Failed'}
            count={failed.length}
            status="failed"
          >
            {failed.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">None</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {failed.map(row => (
                  <ServiceStatCard
                    key={`f-${scope}-${row.key}`}
                    serviceName={row.label}
                    passingRate={formatPassRateLabel(row.passRate)}
                    passRateValue={row.passRate}
                    testCases={row.pass + row.fail}
                    status="failed"
                    onClick={scope === 'services' ? () => openServiceByCountry(row.key) : undefined}
                    onViewLaunches={() => handleViewLaunches(row)}
                  />
                ))}
              </div>
            )}
          </StatusGroup>
          <StatusGroup
            title={scope === 'serviceByCountry' ? 'Healthy countries' : 'Passed'}
            count={passed.length}
            status="passed"
          >
            {passed.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">None</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {passed.map(row => (
                  <ServiceStatCard
                    key={`p-${scope}-${row.key}`}
                    serviceName={row.label}
                    passingRate={formatPassRateLabel(row.passRate)}
                    passRateValue={row.passRate}
                    testCases={row.pass + row.fail}
                    status="passed"
                    onClick={scope === 'services' ? () => openServiceByCountry(row.key) : undefined}
                    onViewLaunches={() => handleViewLaunches(row)}
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
