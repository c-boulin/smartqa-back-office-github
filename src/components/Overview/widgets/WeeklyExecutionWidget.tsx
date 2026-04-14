import React, { useMemo } from 'react';
import { ResponsiveContainer } from 'recharts';
import type { OverviewWeeklyTotals, OverviewWidgetsWindow } from '../../../services/overviewWidgetsApi';
import {
  formatOverviewWindowRangeShort,
  overviewWidgetsLastWeekTrendLabel,
} from '../../../utils/formatOverviewWindowRange';
import { DashboardStyleDonutPie } from '../../Charts/DashboardStyleDonutPie';
import {
  DashboardSection,
  DateFilter,
  DonutChartCard,
  SectionToolbar,
  ViewSwitch,
  WidgetContentBody,
  WidgetContentHeader,
} from './dashboard';

interface WeeklyExecutionWidgetProps {
  weeklyTotals: OverviewWeeklyTotals;
  window: OverviewWidgetsWindow;
}

/** Passed / failed colours aligned with dashboard “Test Cases in Active Test Runs”. */
const PASSED_COLOR = '#10B981';
const FAILED_COLOR = '#EF4444';

/**
 * Pass/fail donut for the previous calendar week.
 * Uses the same Recharts donut as the dashboard active test runs chart ({@link DashboardStyleDonutPie}).
 */
const WeeklyExecutionWidget: React.FC<WeeklyExecutionWidgetProps> = ({ weeklyTotals, window }) => {
  const { pass, fail } = weeklyTotals;
  const totalTests = pass + fail;

  const overallData = useMemo(() => {
    const rows = [];
    if (pass > 0) {
      rows.push({ name: 'Passed', value: pass, color: PASSED_COLOR });
    }
    if (fail > 0) {
      rows.push({ name: 'Failed', value: fail, color: FAILED_COLOR });
    }
    return rows;
  }, [pass, fail]);

  return (
    <DashboardSection
      title="Weekly Test Execution & Defects Overview"
      description={`It shows a summary of the test cases run for ${formatOverviewWindowRangeShort(window.from, window.to)} (previous calendar week, Mon–Sun), specifying passed and failed tests.`}
      icon="report"
    >
      <WidgetContentHeader>
        <SectionToolbar>
          <div className="flex flex-wrap items-center gap-4">
            <DateFilter value={overviewWidgetsLastWeekTrendLabel(window)} />
            <ViewSwitch options={['Overall statistics', 'Donut view']} />
          </div>
        </SectionToolbar>
      </WidgetContentHeader>

      <WidgetContentBody>
        <DonutChartCard title="Execution Summary">
          <div className="flex flex-row items-center gap-3 sm:gap-4">
            <div
              className="flex shrink-0 flex-col justify-center gap-2.5 border-r border-slate-200 pr-3 dark:border-slate-600 sm:pr-4"
              aria-label="Pass and fail legend"
            >
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: PASSED_COLOR }} />
                Passed
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: FAILED_COLOR }} />
                Failed
              </span>
            </div>
            <div className="relative h-72 min-w-0 flex-1">
              {overallData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <DashboardStyleDonutPie
                    data={overallData}
                    centerValue={totalTests}
                    centerSubtitle="SUM"
                  />
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                  No execution totals in this period
                </div>
              )}
            </div>
          </div>
        </DonutChartCard>
      </WidgetContentBody>
    </DashboardSection>
  );
};

export default WeeklyExecutionWidget;
