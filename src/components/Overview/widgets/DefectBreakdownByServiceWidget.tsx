import React, { useMemo, useState } from 'react';
import { ChevronRight, Calendar } from 'lucide-react';
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

/* ─── Custom tooltip for the stacked bar chart ─── */
function IssuesByDayTooltip({
  active,
  payload,
  hoveredKey,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; dataKey?: string; payload?: Record<string, unknown> }>;
  label?: string;
  hoveredKey?: string | null;
}) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (Number(p.value) || 0), 0);
  const entry = hoveredKey
    ? payload.find(p => p.dataKey === hoveredKey)
    : null;

  if (!entry || (Number(entry.value) || 0) === 0) return null;

  const pct = total > 0 ? Math.round((Number(entry.value) / total) * 100) : 0;

  return (
    <div className="rounded-lg bg-slate-800 px-3 py-2.5 text-xs shadow-lg border border-slate-700/50">
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: entry.color }}
        />
        <span className="font-medium text-white">{entry.name}</span>
      </div>
      <p className="mt-1 pl-[18px] text-slate-300">
        {entry.value} issue ({pct}%)
      </p>
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
  const [hoveredDefectKey, setHoveredDefectKey] = useState<string | null>(null);

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
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 dark:border-slate-700/50 dark:bg-[#0f1729]">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Defect Breakdown by Service</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Defect types per service for {rangeShort}</p>
        <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
          No services with test activity in this period.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 dark:border-slate-700/50 dark:bg-[#0f1729]">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Defect Breakdown by Service</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">Defect types per service for {rangeShort}</p>
      </div>

      <div className="flex flex-col gap-5 lg:flex-row">
        {/* Left: Service list */}
        <div className="w-full shrink-0 lg:w-[320px]">
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700/40 bg-slate-50 dark:bg-[#131d33]">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_72px_88px] gap-2 border-b border-slate-200 dark:border-slate-700/60 px-4 py-2.5 text-[11px] font-medium text-slate-500 dark:text-slate-500 uppercase tracking-wide">
              <span>Service</span>
              <span className="text-center">Total issue</span>
              <span className="text-right">Pass rate</span>
            </div>
            {/* Service rows */}
            <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/30">
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
                        ? 'bg-slate-100 dark:bg-slate-700/40'
                        : 'hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
                    }`}
                    data-mipqa={`defect-service-row-${s.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {isSelected && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r bg-cyan-400" />
                    )}
                    <span className="truncate pr-4 font-medium text-slate-900 dark:text-white">{s.label}</span>
                    <span className="text-center font-bold text-red-400">{s.totalIssues}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-600/50">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${Math.min(s.passRate ?? 0, 100)}%` }}
                        />
                      </div>
                      <span className="w-[38px] text-right text-xs font-medium text-slate-600 dark:text-emerald-400">
                        {formatPassRate(s.passRate)}
                      </span>
                    </div>
                    {isSelected && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openTestsForService(s.key);
                        }}
                        title="View tests"
                        aria-label={`View tests for ${s.label}`}
                        data-mipqa={`defect-service-view-tests-${s.label.toLowerCase().replace(/\s+/g, '-')}`}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:text-cyan-500 dark:text-slate-500 dark:hover:text-cyan-400"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Detail panel */}
        {selected && selectedProject && (
          <div className="min-w-0 flex-1">
            {/* Title + date range */}
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">{selected.label}</h4>
              <div className="flex items-center gap-1.5 rounded-md bg-slate-100 dark:bg-slate-800/60 px-2.5 py-1 text-xs text-slate-600 dark:text-slate-400">
                <Calendar className="h-3.5 w-3.5" />
                {rangeShort}
              </div>
            </div>

            {/* 5 metric cards */}
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
              {/* Total issues */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700/40 bg-slate-50 dark:bg-[#131d33] p-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-500 mb-1">Total issues</p>
                <p className="text-2xl font-bold text-red-500 dark:text-red-400">{selected.totalIssues}</p>
              </div>

              {/* Top issue category */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700/40 bg-slate-50 dark:bg-[#131d33] p-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-500 mb-1">Top issue category</p>
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
              </div>

              {/* Pass rate */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700/40 bg-slate-50 dark:bg-[#131d33] p-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-500 mb-1">Pass rate</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  {formatPassRate(selected.passRate)}
                </p>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-600/50">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${Math.min(selected.passRate ?? 0, 100)}%` }}
                  />
                </div>
              </div>

              {/* Test cases */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700/40 bg-slate-50 dark:bg-[#131d33] p-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-500 mb-1">Test cases</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{selected.testCases}</p>
              </div>

              {/* Affected countries */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700/40 bg-slate-50 dark:bg-[#131d33] p-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-500 mb-1">Affected countries</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {formatAffectedCountries(selected.affectedCountries)}
                </p>
              </div>
            </div>

            {/* Issues by category + Issues by day */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Issues by category */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700/40 bg-slate-50 dark:bg-[#131d33] p-4">
                <h5 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Issues by category</h5>
                <div className="flex flex-col gap-2.5">
                  {selected.issuesByCategory.slice(0, 8).map(cat => (
                    <div key={cat.name} className="flex items-center gap-2.5 text-xs">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-slate-700 dark:text-slate-300 flex-1">{cat.name}</span>
                      <span className="font-medium text-slate-900 dark:text-white tabular-nums">
                        {cat.count} ({selected.totalIssues > 0 ? Math.round((cat.count / selected.totalIssues) * 100) : 0}%)
                      </span>
                    </div>
                  ))}
                  {selected.issuesByCategory.length === 0 && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">No issues in this period</p>
                  )}
                </div>
              </div>

              {/* Issues by day chart */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700/40 bg-slate-50 dark:bg-[#131d33] p-4">
                <h5 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Issues by day</h5>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={selectedProject.series} margin={{ top: 20, right: 4, bottom: 0, left: -12 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: '#9CA3AF', fontSize: 10 }}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                        height={40}
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
                        content={<IssuesByDayTooltip hoveredKey={hoveredDefectKey} />}
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
                          onMouseEnter={() => setHoveredDefectKey(defect.key)}
                          onMouseLeave={() => setHoveredDefectKey(null)}
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
