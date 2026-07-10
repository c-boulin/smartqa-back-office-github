import React, { useMemo } from 'react';
import { ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import type { OverviewDefectMixItem, OverviewWeeklyTotals, OverviewWidgetsWindow } from '../../../services/overviewWidgetsApi';
import { DEFECT_CHART_TYPES } from '../../../constants/defectChartTypes';
import { DashboardStyleDonutPie } from '../../Charts/DashboardStyleDonutPie';
import { navigateToFilteredLaunches } from './navigateToFilteredLaunches';
import { DEFECT_TAG_TO_SORT_COLUMN } from './defectSortColumns';

interface WeeklyExecutionWidgetProps {
  weeklyTotals: OverviewWeeklyTotals;
  window: OverviewWidgetsWindow;
  defectMix: OverviewDefectMixItem[];
  windowStartFrom: string;
  windowStartTo: string;
}

const PASSED_COLOR = '#10B981';
const FAILED_COLOR = '#EF4444';
const FALLBACK_COLOR = '#94A3B8';

const DEFECT_COLOR_BY_SLUG: Record<string, string> = Object.fromEntries(
  DEFECT_CHART_TYPES.map(d => [d.slug, d.color]),
);

function defectColor(tag: string): string {
  return DEFECT_COLOR_BY_SLUG[tag] ?? FALLBACK_COLOR;
}

const WeeklyExecutionWidget: React.FC<WeeklyExecutionWidgetProps> = ({
  weeklyTotals,
  defectMix,
  windowStartFrom,
  windowStartTo,
}) => {
  const navigate = useNavigate();
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

  const defectTagByLabel = useMemo(
    () => new Map(defectMix.map(item => [item.label, item.tag])),
    [defectMix],
  );

  const totalIssues = useMemo(() => defectMix.reduce((sum, item) => sum + item.failCount, 0), [defectMix]);

  const passPercent = totalTests > 0 ? ((pass / totalTests) * 100).toFixed(1) : '0';
  const failPercent = totalTests > 0 ? ((fail / totalTests) * 100).toFixed(1) : '0';

  const handleOverallSliceClick = (data: { name: string; value: number }): void => {
    const isPassed = data.name.toLowerCase().startsWith('pass');
    navigateToFilteredLaunches(navigate, {
      startFrom: windowStartFrom,
      startTo: windowStartTo,
      sort: isPassed ? 'passed' : 'failed',
      direction: 'desc',
    });
  };

  const handleDefectSliceClick = (data: { name: string; value: number }): void => {
    const tag = defectTagByLabel.get(data.name);
    const sortColumn = tag != null ? DEFECT_TAG_TO_SORT_COLUMN[tag] : undefined;
    navigateToFilteredLaunches(navigate, {
      startFrom: windowStartFrom,
      startTo: windowStartTo,
      sort: sortColumn,
      direction: sortColumn ? 'desc' : undefined,
    });
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Tests: Passed vs Failed */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Tests: Passed vs Failed</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Distribution of {totalTests.toLocaleString()} tests
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="relative h-56 w-56 shrink-0">
            {overallData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <DashboardStyleDonutPie
                  data={overallData}
                  centerValue={totalTests.toLocaleString()}
                  centerSubtitle="TOTAL TESTS"
                  onSliceClick={handleOverallSliceClick}
                />
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                No data
              </div>
            )}
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: PASSED_COLOR }} />
              <span className="text-sm text-slate-700 dark:text-slate-300">Passed</span>
              <span className="ml-2 text-sm font-semibold text-slate-900 dark:text-white">
                {pass.toLocaleString()} ({passPercent}%)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: FAILED_COLOR }} />
              <span className="text-sm text-slate-700 dark:text-slate-300">Failed</span>
              <span className="ml-2 text-sm font-semibold text-slate-900 dark:text-white">
                {fail.toLocaleString()} ({failPercent}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Issues by category */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Issues by category</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Distribution of {totalIssues.toLocaleString()} issues
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="relative h-56 w-56 shrink-0">
            {defectData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <DashboardStyleDonutPie
                  data={defectData}
                  centerValue={totalIssues.toLocaleString()}
                  centerSubtitle="ISSUES"
                  onSliceClick={handleDefectSliceClick}
                />
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                No defects
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 overflow-hidden">
            {defectData.map(item => (
              <div key={item.name} className="flex items-center gap-2 text-xs">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="truncate text-slate-700 dark:text-slate-300">{item.name}</span>
                <span className="ml-auto whitespace-nowrap font-medium text-slate-900 dark:text-white">
                  {item.value} ({totalIssues > 0 ? Math.round((item.value / totalIssues) * 100) : 0}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyExecutionWidget;
