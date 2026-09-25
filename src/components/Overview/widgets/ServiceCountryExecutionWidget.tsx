import React, { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
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
  executionByCountryByService,
}) => {
  const [selectedService, setSelectedService] = useState<{ key: string; label: string } | null>(null);

  const failed = useMemo(() => executionByService.filter(r => r.band === 'failed'), [executionByService]);
  const passed = useMemo(() => executionByService.filter(r => r.band === 'passed'), [executionByService]);

  const countryRows = useMemo(() => {
    if (!selectedService) return [];
    return executionByCountryByService[selectedService.key] ?? [];
  }, [selectedService, executionByCountryByService]);

  const countryFailed = useMemo(() => countryRows.filter(r => r.band === 'failed'), [countryRows]);
  const countryPassed = useMemo(() => countryRows.filter(r => r.band === 'passed'), [countryRows]);

  const handleServiceClick = (row: OverviewExecutionRow) => {
    setSelectedService({ key: row.key, label: row.label });
  };

  const handleBack = () => {
    setSelectedService(null);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      {/* Section header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {selectedService && (
            <button
              onClick={handleBack}
              className="flex items-center justify-center rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              aria-label="Back to services"
              data-mipqa="service-health-back-button"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {selectedService
                ? `Service health By Country \u2014 ${selectedService.label}`
                : 'Service health By Service'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {selectedService
                ? 'Country breakdown for this service'
                : 'Last 7 days component health check'}
            </p>
          </div>
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

      {/* Service view (default) */}
      {!selectedService && (
        <>
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
                        onClick={() => handleServiceClick(row)}
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
                        onClick={() => handleServiceClick(row)}
                      />
                    ))}
                  </div>
                )}
              </StatusGroup>
            </StatusBoard>
          )}
        </>
      )}

      {/* Country drill-down view */}
      {selectedService && (
        <>
          {countryRows.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              No country data available for this service.
            </p>
          ) : (
            <StatusBoard>
              <StatusGroup title="Failed" count={countryFailed.length} status="failed">
                {countryFailed.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">None</p>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {countryFailed.map(row => (
                      <ServiceStatCard
                        key={`cf-${row.key}`}
                        serviceName={row.label}
                        passingRate={formatPassRateLabel(row.passRate)}
                        testCases={row.pass + row.fail}
                        status="failed"
                      />
                    ))}
                  </div>
                )}
              </StatusGroup>
              <StatusGroup title="Passed" count={countryPassed.length} status="passed">
                {countryPassed.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">None</p>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {countryPassed.map(row => (
                      <ServiceStatCard
                        key={`cp-${row.key}`}
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
        </>
      )}
    </div>
  );
};

export default ServiceCountryExecutionWidget;
