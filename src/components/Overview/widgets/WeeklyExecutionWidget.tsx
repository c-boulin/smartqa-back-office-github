import React, { useMemo } from 'react';
import { ResponsiveContainer } from 'recharts';
import type { OverviewDefectMixItem, OverviewWeeklyTotals, OverviewWidgetsWindow } from '../../../services/overviewWidgetsApi';
import { DEFECT_CHART_TYPES } from '../../../constants/defectChartTypes';
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
  defectMix: OverviewDefectMixItem[];
}

const PASSED_COLOR = '#10B981';
const FAILED_COLOR = '#EF4444';
const FALLBACK_COLOR = '#94A3B8';

function slugToCamel(slug: string): string {
  return slug.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

function defectColor(tag: string): string {
  const key = slugToCamel(tag);
  return DEFECT_CHART_TYPES.find(d => d.key === key)?.color ?? FALLBACK_COLOR;
}

const WeeklyExecutionWidget: React.FC<WeeklyExecutionWidgetProps> = ({ weeklyTotals, window, defectMix }) => {
  const { pass, fail } = weeklyTotals;
  const totalTests = pass + fail;

  const overallData = useMemo(() => {
    const rows = [];
    if (pass > 0) rows.push({ name: 'Passed', value: pass, color: PASSED_COLOR });
    if (fail > 0) rows.push({ name: 'Failed', value: fail, color: FAILED_COLOR });
    return rows;
  }, [pass, fail]);

  const defectData = useMemo(
    () => defectMix.map(item => ({ name: item.label, value: item.failCount, color: defectColor(item.tag) })),
    [defectMix],
  );

  const totalIssues = useMemo(() => defectMix.reduce((sum, item) => sum + item.failCount, 0), [defectMix]);

  return (
    <DashboardSection
      title="Weekly Test Execution & Defects Overview"
      description={`It shows a summary of the test cases run for ${formatOverviewWindowRangeShort(window.from, window.to)}, specifying passed and failed tests.`}
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
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          <div className="min-w-0 flex-1">
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
          </div>

          <div className="min-w-0 flex-1">
            <DonutChartCard title="Defects Overview">
              {defectData.length > 0 ? (
                <div className="flex flex-row items-center gap-3 sm:gap-4">
                  <div
                    className="flex shrink-0 flex-col justify-center gap-2.5 border-r border-slate-200 pr-3 dark:border-slate-600 sm:pr-4"
                    aria-label="Defect types legend"
                  >
                    {defectData.map(item => (
                      <span
                        key={item.name}
                        className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400"
                      >
                        <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: item.color }} />
                        {item.name}
                      </span>
                    ))}
                  </div>
                  <div className="relative h-72 min-w-0 flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <DashboardStyleDonutPie
                        data={defectData}
                        centerValue={totalIssues}
                        centerSubtitle="ISSUES"
                      />
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="flex h-72 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                  No defect data in this period
                </div>
              )}
            </DonutChartCard>
          </div>
        </div>
      </WidgetContentBody>
    </DashboardSection>
  );
};

export default WeeklyExecutionWidget;
