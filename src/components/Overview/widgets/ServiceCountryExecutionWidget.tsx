import React, { useMemo, useState } from 'react';
import type { OverviewExecutionRow } from '../../../services/overviewWidgetsApi';
import {
  DashboardSection,
  ServiceStatCard,
  StatusBoard,
  StatusGroup,
  WidgetContentBody,
  WidgetContentHeader,
} from './dashboard';

interface ServiceCountryExecutionWidgetProps {
  executionByService: OverviewExecutionRow[];
  executionByCountry: OverviewExecutionRow[];
  executionByCountryByService: Record<string, OverviewExecutionRow[]>;
}

/** Top-level service list vs global country vs drill-down for one service. */
type ScopeView = 'services' | 'countries' | 'serviceByCountry';

/**
 * Formats pass rate for cards (e.g. "75%", "100%").
 */
function formatPassRateLabel(passRate: number | null | undefined): string {
  if (passRate == null || Number.isNaN(passRate)) {
    return '—';
  }
  return `${passRate}%`;
}

/** Tailwind classes for the four failing-band segments, left (darkest) → right (lightest). */
const FAILED_LEGEND_RED_SHADES = ['bg-red-950', 'bg-red-700', 'bg-red-500', 'bg-red-300'] as const;

/**
 * Legend strip for “below 99%” pass rate: four equal columns from dark maroon to light red (pill shape).
 */
function FailedPassRateLegendSwatch(): React.ReactElement {
  return (
    <div className="flex h-1.5 w-14 shrink-0 overflow-hidden rounded-full" aria-hidden>
      {FAILED_LEGEND_RED_SHADES.map((className, i) => (
        <span key={i} className={`min-w-0 flex-1 ${className}`} />
      ))}
    </div>
  );
}

/**
 * Pass-rate cards: service list (clickable → by-country), global country view, and breadcrumb rules per scope.
 */
const ServiceCountryExecutionWidget: React.FC<ServiceCountryExecutionWidgetProps> = ({
  executionByService,
  executionByCountry,
  executionByCountryByService,
}) => {
  const [scope, setScope] = useState<ScopeView>('services');
  const [selectedServiceKey, setSelectedServiceKey] = useState<string | null>(null);

  const selectedServiceLabel = useMemo(() => {
    if (selectedServiceKey === null) {
      return '';
    }
    return executionByService.find(s => s.key === selectedServiceKey)?.label ?? '';
  }, [executionByService, selectedServiceKey]);

  const rows: OverviewExecutionRow[] = useMemo(() => {
    if (scope === 'countries') {
      return executionByCountry;
    }
    if (scope === 'serviceByCountry' && selectedServiceKey !== null) {
      return executionByCountryByService[selectedServiceKey] ?? [];
    }
    return executionByService;
  }, [scope, selectedServiceKey, executionByService, executionByCountry, executionByCountryByService]);

  const failed = rows.filter(r => r.band === 'failed');
  const passed = rows.filter(r => r.band === 'passed');

  const statsHeading =
    scope === 'services'
      ? 'Last week stats by service'
      : scope === 'countries'
        ? 'Last week stats by country'
        : `${selectedServiceLabel} — by country`;

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

  /**
   * Pass/fail legend in the widget body (not the dark section header): pill swatches, labels under bars, right-aligned.
   */
  const passRateLegend = (
    <div
      className="flex flex-nowrap items-end gap-4 sm:gap-6"
      role="group"
      aria-label="Pass rate legend"
    >
      <div className="flex shrink-0 flex-col items-end gap-1">
        <FailedPassRateLegendSwatch />
        <span className="text-right text-xs text-slate-600 dark:text-slate-400">less than 99%</span>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span
          className="inline-block h-1.5 w-14 shrink-0 rounded-full bg-green-500"
          aria-hidden
        />
        <span className="text-right text-xs text-slate-600 dark:text-slate-400">100%</span>
      </div>
    </div>
  );

  return (
    <DashboardSection
      title="Service & Country Test Execution Overview"
      description="This graph presents all test executions from the past week, grouped by services and countries."
      icon="service"
      titleBarClassName="bg-blue-950 dark:bg-blue-950"
    >
      <WidgetContentHeader>
        <div className="min-w-0">
          <p className="text-base font-bold text-slate-900 dark:text-white">{statsHeading}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Component health check</p>
        </div>
      </WidgetContentHeader>

      <WidgetContentBody>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
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
          <div className="flex shrink-0 justify-end">{passRateLegend}</div>
        </div>

        {rows.length === 0 ? (
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
                      key={`f-${scope}-${row.key}`}
                      serviceName={row.label}
                      passingRate={formatPassRateLabel(row.passRate)}
                      passRateValue={row.passRate}
                      testCases={row.pass + row.fail}
                      status="failed"
                      onClick={
                        scope === 'services' ? () => openServiceByCountry(row.key) : undefined
                      }
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
                      key={`p-${scope}-${row.key}`}
                      serviceName={row.label}
                      passingRate={formatPassRateLabel(row.passRate)}
                      passRateValue={row.passRate}
                      testCases={row.pass + row.fail}
                      status="passed"
                      onClick={
                        scope === 'services' ? () => openServiceByCountry(row.key) : undefined
                      }
                    />
                  ))}
                </div>
              )}
            </StatusGroup>
          </StatusBoard>
        )}
      </WidgetContentBody>
    </DashboardSection>
  );
};

export default ServiceCountryExecutionWidget;
