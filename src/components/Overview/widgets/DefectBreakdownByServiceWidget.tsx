import React, { useMemo, useState } from 'react';
import { ArrowUpRight, Calendar, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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
import { navigateToFilteredLaunches } from './navigateToFilteredLaunches';
import { DEFECT_TAG_TO_FILTER_VALUE } from './defectTagFilterValues';

interface DefectBreakdownByServiceWidgetProps {
  defectSeriesByProject: OverviewDefectSeriesProject[];
  executionByService: OverviewExecutionRow[];
  window: OverviewWidgetsWindow;
  windowStartFrom: string;
  windowStartTo: string;
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

function deriveServiceSummaries(projects: OverviewDefectSeriesProject[]): ServiceSummary[] {
  return projects.map(proj => {
    const totals: Record<string, number> = {};

    for (const row of proj.series) {
      for (const defect of DEFECT_BREAKDOWN_STACK_TYPES) {
        const val = Number(row[defect.key]) || 0;
        totals[defect.key] = (totals[defect.key] ?? 0) + val;
      }
    }

    const issuesByCategory = DEFECT_BREAKDOWN_STACK_TYPES
      .map(d => ({ name: d.label, count: totals[d.key] ?? 0, color: d.color }))
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

function StatCell({ label, value, subValue }: { label: string; value: string; subValue?: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-sm font-bold text-slate-900 dark:text-white">{value}</p>
      {subValue && <p className="text-xs text-slate-500 dark:text-slate-400">{subValue}</p>}
    </div>
  );
}

const DefectBreakdownByServiceWidget: React.FC<DefectBreakdownByServiceWidgetProps> = ({
  defectSeriesByProject,
  executionByService,
  window,
  windowStartFrom,
  windowStartTo,
}) => {
  const navigate = useNavigate();
  const rangeShort = formatOverviewWindowRangeShort(window.from, window.to);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const summaries = useMemo(() => deriveServiceSummaries(defectSeriesByProject), [defectSeriesByProject]);

  const projectIdsByServiceKey = useMemo(
    () => new Map(executionByService.map(row => [row.key, row.projectIds])),
    [executionByService],
  );

  const selected = summaries[selectedIndex] ?? null;
  const selectedProject = defectSeriesByProject[selectedIndex] ?? null;

  const openLaunchesForService = (
    serviceKey: string,
    extra?: { startFrom?: string; startTo?: string; defectTag?: 'product_bug' | 'auto_bug' | 'system_issue' | 'to_investigate' },
  ): void => {
    const projectIds = projectIdsByServiceKey.get(serviceKey) ?? [];
    navigateToFilteredLaunches(navigate, {
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

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left: Service table */}
        <div className="w-full shrink-0 lg:w-[380px]">
          <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="grid grid-cols-[1fr_80px_90px] gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
              <span>Service</span>
              <span className="text-center">Total issue</span>
              <span className="text-right">Pass rate</span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {summaries.map((s, idx) => {
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
                    className={`relative grid w-full cursor-pointer grid-cols-[1fr_80px_90px] items-center gap-2 px-4 py-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:focus-visible:ring-cyan-400 ${
                      idx === selectedIndex
                        ? 'bg-cyan-50 dark:bg-cyan-950/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'
                    }`}
                    data-mipqa={`defect-service-row-${s.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <span className="truncate pr-8 font-medium text-slate-900 dark:text-white">{s.label}</span>
                    <span className="text-center font-bold text-red-500">{s.totalIssues}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-600">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500"
                          style={{ width: `${Math.min(s.passRate ?? 0, 100)}%` }}
                        />
                      </div>
                      <span className="w-12 text-right text-xs font-medium text-slate-700 dark:text-slate-300">
                        {formatPassRate(s.passRate)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openLaunchesForService(s.key);
                      }}
                      title="View launches"
                      aria-label={`View launches for ${s.label}`}
                      data-mipqa={`defect-service-view-launches-${s.label.toLowerCase().replace(/\s+/g, '-')}`}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-cyan-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:hover:bg-slate-700 dark:hover:text-cyan-400 dark:focus-visible:ring-cyan-400"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
          {summaries.length > 6 && (
            <button
              type="button"
              className="mt-2 flex items-center gap-1 text-xs text-cyan-500 hover:text-cyan-400"
            >
              <ChevronRight className="h-3.5 w-3.5" />
              Show more
            </button>
          )}
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

            <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
              <StatCell label="Total issues" value={String(selected.totalIssues)} />
              <StatCell
                label="Top issue category"
                value={selected.totalIssues === 0 || selected.topIssueCategory === null ? '—' : selected.topIssueCategory}
                subValue={
                  selected.totalIssues === 0 || selected.topIssueCategory === null
                    ? undefined
                    : `${selected.topIssueCategoryCount} (${selected.topIssueCategoryPercent ?? 0}%)`
                }
              />
              <StatCell label="Pass rate" value={formatPassRate(selected.passRate)} />
              <StatCell label="Test cases" value={String(selected.testCases)} />
              <StatCell label="Affected countries" value={formatAffectedCountries(selected.affectedCountries)} />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div>
                <h5 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Issues by category</h5>
                <div className="flex flex-col gap-2">
                  {selected.issuesByCategory.slice(0, 6).map(cat => (
                    <div key={cat.name} className="flex items-center gap-2 text-xs">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-slate-700 dark:text-slate-300">{cat.name}</span>
                      <span className="ml-auto font-medium text-slate-900 dark:text-white">
                        {cat.count} ({selected.totalIssues > 0 ? Math.round((cat.count / selected.totalIssues) * 100) : 0}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h5 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Issues by day</h5>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={selectedProject.series}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: '#9CA3AF', fontSize: 10 }}
                        interval={0}
                        angle={-25}
                        textAnchor="end"
                        height={50}
                      />
                      <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} allowDecimals={false} />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          const total = payload.reduce((s, p) => s + (Number(p.value) || 0), 0);
                          return (
                            <div className="rounded-lg border border-slate-200 bg-white p-2 text-xs shadow-lg dark:border-slate-600 dark:bg-slate-800">
                              <p className="mb-1 font-medium text-slate-900 dark:text-white">{label}</p>
                              <p className="text-slate-500 dark:text-slate-400">Total: {total}</p>
                            </div>
                          );
                        }}
                      />
                      {DEFECT_BREAKDOWN_STACK_TYPES.map(defect => (
                        <Bar
                          key={defect.key}
                          dataKey={defect.key}
                          stackId="defects"
                          fill={defect.color}
                          name={defect.label}
                          cursor="pointer"
                          onClick={(payload: { date?: string; payload?: { date?: string } }) => {
                            const date = payload?.date ?? payload?.payload?.date;
                            if (!date || !selectedProject) return;
                            openLaunchesForService(selectedProject.key, {
                              startFrom: date,
                              startTo: date,
                              defectTag: DEFECT_TAG_TO_FILTER_VALUE[defect.slug],
                            });
                          }}
                        />
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
