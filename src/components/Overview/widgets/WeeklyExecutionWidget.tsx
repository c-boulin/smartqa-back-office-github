import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { OverviewDefectMixItem, OverviewWeeklyTotals, OverviewWidgetsWindow } from '../../../services/overviewWidgetsApi';
import { DEFECT_CHART_TYPES } from '../../../constants/defectChartTypes';
import { DashboardStyleDonutWithCenterLabel } from '../../Charts/DashboardStyleDonutPie';
import { navigateToFilteredTests } from './navigateToFilteredTests';
import { defectTagForLaunchesFilter } from './defectTagFilterValues';

interface WeeklyExecutionWidgetProps {
  weeklyTotals: OverviewWeeklyTotals;
  window: OverviewWidgetsWindow;
  defectMix: OverviewDefectMixItem[];
  windowStartFrom: string;
  windowStartTo: string;
  defectColorMap: Record<string, string>;
}

const PASSED_COLOR = '#10B981';
const FAILED_COLOR = '#EF4444';
const FALLBACK_COLOR = '#94A3B8';

const DEFECT_COLOR_BY_SLUG: Record<string, string> = Object.fromEntries(
  DEFECT_CHART_TYPES.map(d => [d.slug, d.color]),
);

const WeeklyExecutionWidget: React.FC<WeeklyExecutionWidgetProps> = ({
  weeklyTotals,
  defectMix,
  windowStartFrom,
  windowStartTo,
  defectColorMap,
}) => {
  const navigate = useNavigate();
  const { pass, fail } = weeklyTotals;
  const totalTests = pass + fail;

  function defectColor(tag: string): string {
    return defectColorMap[tag] ?? DEFECT_COLOR_BY_SLUG[tag] ?? FALLBACK_COLOR;
  }
  const overallData = useMemo(() => {
    const rows = [];
    if (pass > 0) rows.push({ name: 'Passed', value: pass, color: PASSED_COLOR });
    if (fail > 0) rows.push({ name: 'Failed', value: fail, color: FAILED_COLOR });
    return rows;
  }, [pass, fail]);

  const defectData = useMemo(
    () => defectMix.map(item => ({ name: item.label, value: item.failCount, color: defectColor(item.tag) })),
    [defectMix, defectColorMap],
  );

  const defectTagByLabel = useMemo(
    () => new Map(defectMix.map(item => [item.label, item.tag])),
    [defectMix],
  );

  const totalIssues = useMemo(() => defectMix.reduce((sum, item) => sum + item.failCount, 0), [defectMix]);

  const passPercent = totalTests > 0 ? ((pass / totalTests) * 100).toFixed(1) : '0';
  const failPercent = totalTests > 0 ? ((fail / totalTests) * 100).toFixed(1) : '0';

  const handleOverallSliceClick = (data: { name: string; value: number }): void => {
    const isPassed = data.name.toLowerCase().startsWith('pass');
    navigateToFilteredTests(navigate, {
      startFrom: windowStartFrom,
      startTo: windowStartTo,
      status: isPassed ? 'passed' : 'failed',
    });
  };

  const handleDefectSliceClick = (data: { name: string; value: number }): void => {
    const tag = defectTagByLabel.get(data.name);
    const defectTag = defectTagForLaunchesFilter(tag);
    if (!defectTag) return;
    navigateToFilteredTests(navigate, {
      startFrom: windowStartFrom,
      startTo: windowStartTo,
      defectTag,
    });
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Tests: Passed vs Failed */}
      <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Tests: Passed vs Failed</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Distribution of {totalTests.toLocaleString()} tests
          </p>
        </div>
        <div className="flex flex-1 flex-col items-center gap-4 2xl:flex-row 2xl:items-start 2xl:gap-8">
          <div className="relative h-48 w-48 shrink-0 2xl:h-72 2xl:w-72">
            {overallData.length > 0 ? (
              <DashboardStyleDonutWithCenterLabel
                data={overallData}
                centerValue={totalTests.toLocaleString()}
                centerSubtitle="TOTAL TESTS"
                onSliceClick={handleOverallSliceClick}
                showSegmentLabels
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                No data
              </div>
            )}
          </div>
          <div className="min-w-0 grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2 text-sm">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: PASSED_COLOR }} />
            <span className="text-slate-700 dark:text-slate-300">Passed</span>
            <span className="whitespace-nowrap font-semibold text-slate-900 dark:text-white tabular-nums">
              {pass.toLocaleString()} ({passPercent.replace('.', ',')}%)
            </span>
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: FAILED_COLOR }} />
            <span className="text-slate-700 dark:text-slate-300">Failed</span>
            <span className="whitespace-nowrap font-semibold text-slate-900 dark:text-white tabular-nums">
              {fail.toLocaleString()} ({failPercent.replace('.', ',')}%)
            </span>
          </div>
        </div>
      </div>

      {/* Issues by category */}
      <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Issues by category</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Distribution of {totalIssues.toLocaleString()} issues
          </p>
        </div>
        <div className="flex flex-1 flex-col items-center gap-4 2xl:flex-row 2xl:items-start 2xl:gap-8">
          <div className="relative h-48 w-48 shrink-0 2xl:h-72 2xl:w-72">
            {defectData.length > 0 ? (
              <DashboardStyleDonutWithCenterLabel
                data={defectData}
                centerValue={totalIssues.toLocaleString()}
                centerSubtitle="ISSUES"
                onSliceClick={handleDefectSliceClick}
                showSegmentLabels
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                No defects
              </div>
            )}
          </div>
          <div className="min-w-0 grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2 text-sm">
            {defectData.map(item => (
              <React.Fragment key={item.name}>
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-slate-700 dark:text-slate-300">{item.name}</span>
                <span className="whitespace-nowrap font-semibold text-slate-900 dark:text-white tabular-nums">
                  {item.value} ({totalIssues > 0 ? ((item.value / totalIssues) * 100).toFixed(1).replace('.', ',') : '0,0'}%)
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyExecutionWidget;
