import React, { useMemo } from 'react';
import { ResponsiveContainer } from 'recharts';
import type { OverviewWeeklyTotals, OverviewWidgetsWindow } from '../../../services/overviewWidgetsApi';
import {
  formatOverviewWindowRangeShort,
  overviewWidgetsLastWeekTrendLabel,
} from '../../../utils/formatOverviewWindowRange';
import { DEFECT_CHART_TYPES } from '../../../constants/defectChartTypes';
import { WEEKLY_DEFECT_CLASSIFICATION_MOCK } from '../../../constants/weeklyDefectClassificationMock';
import { DashboardStyleDonutPie } from '../../Charts/DashboardStyleDonutPie';
import {
  DashboardSection,
  DateFilter,
  DonutChartCard,
  SectionToolbar,
  TwoColumnGrid,
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
 * Dual donut: live pass/fail totals for the previous calendar week and defect-type mix.
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

  const defectChartData = useMemo(() => {
    const colorByTag = Object.fromEntries(DEFECT_CHART_TYPES.map(d => [d.key, d.color]));
    return WEEKLY_DEFECT_CLASSIFICATION_MOCK.filter(d => d.failCount > 0).map(d => ({
      name: d.label,
      value: d.failCount,
      color: colorByTag[d.tag] ?? '#94A3B8',
    }));
  }, []);

  const totalClassification = defectChartData.reduce((s, d) => s + d.value, 0);

  return (
    <DashboardSection
      title="Weekly Test Execution & Defects Overview"
      description={`It shows a summary of the test cases run for ${formatOverviewWindowRangeShort(window.from, window.to)} (previous calendar week, Mon–Sun), specifying passed and failed tests along with defect type classifications.`}
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
        <TwoColumnGrid>
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

          <DonutChartCard title="Issue Classification">
            <div className="flex flex-row items-center gap-3 sm:gap-4">
              <div className="relative h-72 min-w-0 flex-1">
                {defectChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <DashboardStyleDonutPie
                      data={defectChartData}
                      centerValue={totalClassification}
                      centerSubtitle="ISSUES"
                    />
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                    No classification sample data
                  </div>
                )}
              </div>
              <div
                className="max-h-72 w-[10rem] shrink-0 overflow-y-auto overflow-x-hidden border-l border-slate-200 py-0.5 pl-3 dark:border-slate-600 sm:w-44 sm:pl-4"
                aria-label="Defect classification legend"
              >
                <div className="flex flex-col gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                  {DEFECT_CHART_TYPES.map(d => (
                    <div key={d.key} className="flex min-w-0 items-center gap-1.5">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: d.color }} />
                      <span className="break-words leading-tight">{d.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DonutChartCard>
        </TwoColumnGrid>
      </WidgetContentBody>
    </DashboardSection>
  );
};

export default WeeklyExecutionWidget;
