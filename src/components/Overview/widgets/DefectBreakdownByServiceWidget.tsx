import React, { useMemo, useState } from 'react';
import { ArrowUpRight, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { useNavigate } from 'react-router-dom';
import type {
  OverviewDefectSeriesProject,
  OverviewExecutionRow,
  OverviewWidgetsWindow,
} from '../../../services/overviewWidgetsApi';
import {
  formatOverviewWindowRangeShort,
} from '../../../utils/formatOverviewWindowRange';
import { DEFECT_BREAKDOWN_STACK_TYPES } from '../../../constants/defectChartTypes';
import { navigateToFilteredTests } from './navigateToFilteredTests';
import { defectTagForLaunchesFilter } from './defectTagFilterValues';

interface DefectBreakdownByServiceWidgetProps {
  defectSeriesByProject: OverviewDefectSeriesProject[];
  executionByService: OverviewExecutionRow[];
  window: OverviewWidgetsWindow;
  windowStartFrom: string;
  windowStartTo: string;
  defectColorMap: Record<string, string>;
}

interface ServiceSummary {
  key: string;
  projectId: number;
  label: string;
  totalIssues: number;
  passRate: number | null;
  testCases: number;
  topIssueCategory: string | null;
  topIssueCategoryCount: number;
  topIssueCategoryPercent: number | null;
  affectedCountries: string[];
  issuesByCategory: { name: string; count: number; color: string }[];
}

function deriveServiceSummaries(
  projects: OverviewDefectSeriesProject[],
  colorMap: Record<string, string>,
): ServiceSummary[] {
  return projects.map(proj => {
    const totals: Record<string, number> = {};

    for (const row of proj.series) {
      for (const defect of DEFECT_BREAKDOWN_STACK_TYPES) {
        const val = Number(row[defect.key]) || 0;
        totals[defect.key] = (totals[defect.key] ?? 0) + val;
      }
    }

    const issuesByCategory = DEFECT_BREAKDOWN_STACK_TYPES
      .map(d => ({
        name: d.label,
        count: totals[d.key] ?? 0,
        color: colorMap[d.slug] ?? d.color,
        slug: d.slug,
      }))
      .filter(c => c.count > 0)
      .sort((a, b) => b.count - a.count);

    return {
      key: proj.key,
      projectId: proj.projectId,
      label: proj.label,
      totalIssues: proj.totalIssues,
      passRate: proj.passRate,
      testCases: proj.testCases,
      topIssueCategory: proj.topIssueCategory,
      topIssueCategoryCount: proj.topIssueCategoryCount,
      topIssueCategoryPercent: proj.topIssueCategoryPercent,
      affectedCountries: proj.affectedCountries,
      issuesByCategory,
    };
  });
}

function formatPassRate(rate: number | null): string {
  return rate === null ? '—' : `${rate}%`;
}

function formatAffectedCountries(countries: string[]): string {
  return countries.length === 0 ? '—' : countries.join(', ');
}

/* ─── Metric card component ─── */
function InfoMetricCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900/60 p-4">
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</p>
      {children}
    </div>
  );
}

/* ─── Custom tooltip for the stacked bar chart ─── */
function IssuesByDayTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; payload?: Record<string, unknown> }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (Number(p.value) || 0), 0);
  const nonZero = payload.filter(p => (Number(p.value) || 0) > 0);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-xl dark:border-slate-600 dark:bg-slate-800 min-w-[160px]">
      <p className="mb-2 font-semibold text-slate-900 dark:text-white">{label}</p>
      {nonZero.map(entry => {
        const pct = total > 0 ? Math.round((Number(entry.value) / total) * 100) : 0;
        return (
          <div
            key={entry.name}
            className="flex items-center gap-2 py-0.5"
            style={{ borderLeft: `3px solid ${entry.color}`, paddingLeft: 8 }}
          >
            <span className="text-slate-700 dark:text-slate-300 flex-1">{entry.name}</span>
            <span className="font-medium text-slate-900 dark:text-white">
              {entry.value} issue ({pct}%)
            </span>
          </div>
        );
      })}
      <div className="mt-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-600 font-medium text-slate-900 dark:text-white">
        Total: {total}
      </div>
    </div>
  );
}

/* ─── Custom label to show totals above stacked bars ─── */
function renderBarTotalLabel(props: Record<string, unknown>, series: Array<Record<string, unknown>>): React.ReactElement | null {
  const { x, y, width, index } = props as { x: number; y: number; width: number; index: number };
  if (index == null || !series[index]) return null;
  const row = series[index];
  const total = DEFECT_BREAKDOWN_STACK_TYPES.reduce((sum, d) => sum + (Number(row[d.key]) || 0), 0);
  if (total === 0) return null;
  return (
    <text
      x={x + width / 2}
      y={y - 6}
      textAnchor="middle"
      fontSize={10}
      fontWeight={600}
      fill="#94A3B8"
    >
      {total}
    </text>
  );
}

const DefectBreakdownByServiceWidget: React.FC<DefectBreakdownByServiceWidgetProps> = ({
  defectSeriesByProject,
  executionByService,
  window: windowProp,
  windowStartFrom,
  windowStartTo,
  defectColorMap,
}) => {
  const navigate = useNavigate();
  const rangeShort = formatOverviewWindowRangeShort(windowProp.from, windowProp.to);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const summaries = useMemo(
    () => deriveServiceSummaries(defectSeriesByProject, defectColorMap),
    [defectSeriesByProject, defectColorMap],
  );

  const projectIdsByServiceKey = useMemo(
    () => new Map(executionByService.map(row => [row.key, row.projectIds])),
    [executionByService],
  );

  const selected = summaries[selectedIndex] ?? null;
  const selectedProject = defectSeriesByProject[selectedIndex] ?? null;

  const openTestsForService = (
    serviceKey: string,
    extra?: { startFrom?: string; startTo?: string; defectTag?: string },
  ): void => {
    const projectIds = projectIdsByServiceKey.get(serviceKey) ?? [];
    navigateToFilteredTests(navigate, {
      projectIds,
      startFrom: extra?.startFrom ?? windowStartFrom,
      startTo: extra?.startTo ?? windowStartTo,
      defectTag: extra?.defectTag,
    });
  };

  if (defectSeriesByProject.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Defect Breakdown by Service</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Defect types per service for {rangeShort}</p>
        <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
          No services with test activity in this period.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-6">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Defect Breakdown by Service</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">Defect types per service for {rangeShort}</p>
      </div>

      <div className="flex flex-col gap-5 lg:flex-row">
        {/* Left: Service list card */}
        <div className="w-full shrink-0 lg:w-[340px]">
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50">
            <div className="grid grid-cols-[1fr_72px_88px] gap-2 border-b border-slate-200 dark:border-slate-700 px-4 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              <span>Service</span>
              <span className="text-center">Issues</span>
              <span className="text-right">Pass rate</span>
            </div>
            <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/50">
              {summaries.map((s, idx) => {
                const isSelected = idx === selectedIndex;
                const handleSelect = (): void => setSelectedIndex(idx);
                const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelect();
                  }
                };
                return (
                  <div
                    key={s.projectId}
                    role="button"
                    tabIndex={0}
                    onClick={handleSelect}
                    onKeyDown={handleKeyDown}
                    className={`relative grid w-full cursor-pointer grid-cols-[1fr_72px_88px] items-center gap-2 px-4 py-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:focus-visible:ring-cyan-400 ${
                      isSelected
                        ? 'bg-slate-100 dark:bg-slate-700/60'
                        : 'hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                    }`}
                    data-mipqa={`defect-service-row-${s.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {isSelected && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400 rounded-r" />
                    )}
                    <span className="truncate pr-6 font-medium text-slate-900 dark:text-white">{s.label}</span>
                    <span className="text-center font-bold text-red-500">{s.totalIssues}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-600">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${Math.min(s.passRate ?? 0, 100)}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-xs font-medium text-slate-700 dark:text-slate-300">
                        {formatPassRate(s.passRate)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openTestsForService(s.key);
                      }}
                      title="View tests"
                      aria-label={`View tests for ${s.label}`}
                      data-mipqa={`defect-service-view-tests-${s.label.toLowerCase().replace(/\s+/g, '-')}`}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-cyan-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:hover:bg-slate-700 dark:hover:text-cyan-400 dark:focus-visible:ring-cyan-400"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Detail panel */}
        {selected && selectedProject && (
          <div className="min-w-0 flex-1">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">{selected.label}</h4>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Calendar className="h-3.5 w-3.5" />
                {rangeShort}
              </div>
            </div>

            {/* 5 metric cards */}
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
              <InfoMetricCard label="Total issues">
                <p className="text-2xl font-bold text-red-500">{selected.totalIssues}</p>
              </InfoMetricCard>

              <InfoMetricCard label="Top issue category">
                {selected.totalIssues === 0 || selected.topIssueCategory === null ? (
                  <p className="text-sm font-bold text-slate-900 dark:text-white">—</p>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor: selected.issuesByCategory[0]?.color ?? '#94A3B8',
                        }}
                      />
                      <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {selected.topIssueCategory}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {selected.topIssueCategoryCount} ({selected.topIssueCategoryPercent ?? 0}%)
                    </p>
                  </>
                )}
              </InfoMetricCard>

              <InfoMetricCard label="Pass rate">
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  {formatPassRate(selected.passRate)}
                </p>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-600">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${Math.min(selected.passRate ?? 0, 100)}%` }}
                  />
                </div>
              </InfoMetricCard>

              <InfoMetricCard label="Test cases">
                <p className="text-lg font-bold text-slate-900 dark:text-white">{selected.testCases}</p>
              </InfoMetricCard>

              <InfoMetricCard label="Affected countries">
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {formatAffectedCountries(selected.affectedCountries)}
                </p>
              </InfoMetricCard>
            </div>

            {/* Issues by category + Issues by day */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900/40 p-4">
                <h5 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Issues by category</h5>
                <div className="flex flex-col gap-2">
                  {selected.issuesByCategory.slice(0, 8).map(cat => (
                    <div key={cat.name} className="flex items-center gap-2 text-xs">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-slate-700 dark:text-slate-300">{cat.name}</span>
                      <span className="ml-auto font-medium text-slate-900 dark:text-white">
                        {cat.count} ({selected.totalIssues > 0 ? Math.round((cat.count / selected.totalIssues) * 100) : 0}%)
                      </span>
                    </div>
                  ))}
                  {selected.issuesByCategory.length === 0 && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">No issues in this period</p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900/40 p-4">
                <h5 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Issues by day</h5>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={selectedProject.series} margin={{ top: 20, right: 4, bottom: 0, left: -12 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.15} vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: '#9CA3AF', fontSize: 10 }}
                        interval={0}
                        angle={-25}
                        textAnchor="end"
                        height={50}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: '#9CA3AF', fontSize: 10 }}
                        allowDecimals={false}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        content={<IssuesByDayTooltip />}
                        cursor={{ fill: 'rgba(148,163,184,0.08)' }}
                      />
                      {DEFECT_BREAKDOWN_STACK_TYPES.map((defect, dIdx) => (
                        <Bar
                          key={defect.key}
                          dataKey={defect.key}
                          stackId="defects"
                          fill={defectColorMap[defect.slug] ?? defect.color}
                          name={defect.label}
                          barSize={28}
                          radius={dIdx === DEFECT_BREAKDOWN_STACK_TYPES.length - 1 ? [3, 3, 0, 0] : undefined}
                          cursor="pointer"
                          onClick={(payload: { date?: string; payload?: { date?: string } }) => {
                            const date = payload?.date ?? payload?.payload?.date;
                            if (!date || !selectedProject) return;
                            openTestsForService(selectedProject.key, {
                              startFrom: date,
                              startTo: date,
                              defectTag: defectTagForLaunchesFilter(defect.slug),
                            });
                          }}
                        >
                          {dIdx === DEFECT_BREAKDOWN_STACK_TYPES.length - 1 && (
                            <LabelList
                              content={(props) => renderBarTotalLabel(props as Record<string, unknown>, selectedProject.series as Array<Record<string, unknown>>)}
                            />
                          )}
                        </Bar>
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DefectBreakdownByServiceWidget;
