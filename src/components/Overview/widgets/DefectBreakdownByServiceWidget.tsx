import React, { useMemo, useRef, useState } from 'react';
import { ChevronRight, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, LabelList, Customized } from 'recharts';
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
    <div
      className="rounded-lg bg-slate-800 px-3 py-2.5 text-xs shadow-lg"
      style={{ border: `1.5px solid ${entry.color}` }}
    >
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: entry.color }}
        />
        <span className="font-medium text-white">{entry.name}</span>
      </div>
      <p className="mt-1 pl-[18px] text-slate-300">
        {entry.value} Issue ({pct}%)
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

/* ─── Convert a hex color to a pastel variant (mix with white at given opacity) ─── */
function toPastel(hex: string, opacity = 0.45): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const pr = Math.round(r + (255 - r) * (1 - opacity));
  const pg = Math.round(g + (255 - g) * (1 - opacity));
  const pb = Math.round(b + (255 - b) * (1 - opacity));
  return `rgb(${pr}, ${pg}, ${pb})`;
}

const BAR_RADIUS = 4;

function roundedRectPath(x: number, y: number, w: number, h: number, r: number): string {
  const cr = Math.min(r, w / 2, h / 2);
  return `M${x + cr},${y} h${w - 2 * cr} a${cr},${cr} 0 0 1 ${cr},${cr} v${h - 2 * cr} a${cr},${cr} 0 0 1 -${cr},${cr} h-${w - 2 * cr} a${cr},${cr} 0 0 1 -${cr},-${cr} v-${h - 2 * cr} a${cr},${cr} 0 0 1 ${cr},-${cr} Z`;
}

type BarGeoEntry = { x: number; y: number; width: number; height: number; fill: string; stackIndex: number; barIndex: number };

function makeCollectorShape(geoRef: React.MutableRefObject<BarGeoEntry[]>, stackIndex: number) {
  return function CollectorShape(props: Record<string, unknown>): React.ReactElement | null {
    const x = Number(props.x) || 0;
    const y = Number(props.y) || 0;
    const width = Number(props.width) || 0;
    const height = Number(props.height) || 0;
    const fill = (props.fill as string) ?? '#888';
    const barIndex = Number(props.index) || 0;
    if (height > 0) {
      geoRef.current.push({ x, y, width, height, fill, stackIndex, barIndex });
    }
    return <rect x={x} y={y} width={width} height={height} fill="transparent" />;
  };
}

function VisibleBarsLayer({ geoRef }: { geoRef: React.MutableRefObject<BarGeoEntry[]> }): React.ReactElement | null {
  const entries = geoRef.current;
  if (!entries.length) return null;
  const grouped = new Map<number, BarGeoEntry[]>();
  for (const entry of entries) {
    const arr = grouped.get(entry.barIndex) || [];
    arr.push(entry);
    grouped.set(entry.barIndex, arr);
  }
  const elements: React.ReactElement[] = [];
  for (const [, segs] of grouped) {
    segs.sort((a, b) => b.stackIndex - a.stackIndex);
    for (const seg of segs) {
      elements.push(
        <path
          key={`${seg.barIndex}-${seg.stackIndex}`}
          d={roundedRectPath(seg.x, seg.y, seg.width, seg.height, BAR_RADIUS)}
          fill={seg.fill}
        />
      );
    }
  }
  return <g>{elements}</g>;
}

/* ─── Overlay layer rendering the hovered segment on top of all bars ─── */
function HoveredBarOverlay({ geo }: { geo: { x: number; y: number; width: number; height: number; fill: string; r: number } | null }): React.ReactElement | null {
  if (!geo || geo.height <= 0) return null;
  return (
    <path
      d={roundedRectPath(geo.x, geo.y, geo.width, geo.height, geo.r)}
      fill={geo.fill}
      stroke={toPastel(geo.fill)}
      strokeWidth={2.5}
      style={{ transition: 'all 0.15s ease-out', pointerEvents: 'none' }}
    />
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
  const [hoveredBarGeo, setHoveredBarGeo] = useState<{ x: number; y: number; width: number; height: number; fill: string; r: number } | null>(null);
  const barGeoRef = useRef<BarGeoEntry[]>([]);

  const collectorShapes = useMemo(
    () => DEFECT_BREAKDOWN_STACK_TYPES.map((_, dIdx) => makeCollectorShape(barGeoRef, dIdx)),
    [],
  );

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
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Defect Breakdown by Service</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Defect types per service for {rangeShort}</p>
        <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
          No services with test activity in this period.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 dark:border-slate-700 dark:bg-slate-800">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Defect Breakdown by Service</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">Defect types per service for {rangeShort}</p>
      </div>

      <div className="flex flex-col gap-5 lg:flex-row">
        {/* Left: Service list */}
        <div className="w-full shrink-0 lg:w-[340px]">
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700/40 bg-white dark:bg-slate-800/50">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_90px_100px] gap-2 px-5 py-2.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
              <span>Service</span>
              <span className="text-center">Total issue</span>
              <span className="text-right">Pass rate</span>
            </div>
            {/* Service rows */}
            <div className="max-h-[380px] overflow-y-auto space-y-1 px-2 pb-2 sidebar-project-scrollbar">
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
                  className={`group/row relative grid w-full cursor-pointer grid-cols-[1fr_90px_100px] items-center gap-2 rounded-lg px-4 py-4 text-left text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:focus-visible:ring-cyan-400 ${
                    isSelected
                      ? 'bg-slate-100 dark:bg-slate-600/30 border-l-[4px] border-cyan-400 pl-3.5'
                      : 'border border-transparent hover:border-slate-300 dark:hover:border-slate-500/50 hover:bg-slate-50 dark:hover:bg-slate-700/20'
                  }`}
                  data-mipqa={`defect-service-row-${s.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <span className="truncate font-bold text-slate-900 dark:text-white">{s.label}</span>
                  <span className="text-center font-bold text-red-500 dark:text-red-400">{s.totalIssues}</span>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      {formatPassRate(s.passRate)}
                    </span>
                    <div className="h-[3px] w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-600/50">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${Math.min(s.passRate ?? 0, 100)}%` }}
                      />
                    </div>
                  </div>
                  {!isSelected && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openTestsForService(s.key);
                      }}
                      title="View tests"
                      aria-label={`View tests for ${s.label}`}
                      data-mipqa={`defect-service-view-tests-${s.label.toLowerCase().replace(/\s+/g, '-')}`}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 dark:text-slate-500 opacity-0 group-hover/row:opacity-100 transition-opacity hover:text-cyan-500 dark:hover:text-cyan-400"
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
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Calendar className="h-3.5 w-3.5" />
                {rangeShort}
              </div>
            </div>

            {/* Metrics strip */}
            <div className="mb-5 flex rounded-lg border border-slate-200 dark:border-slate-700/30 divide-x divide-slate-200 dark:divide-slate-700/30 bg-white dark:bg-slate-700/40">
              {/* Total issues */}
              <div className="flex-1 px-4 py-3 min-w-0">
                <p className="text-[11px] text-slate-500 dark:text-slate-500 mb-0.5">Total issues</p>
                <p className="text-xl font-bold text-red-500">{selected.totalIssues}</p>
              </div>

              {/* Top issue category */}
              <div className="flex-1 px-4 py-3 min-w-0">
                <p className="text-[11px] text-slate-500 dark:text-slate-500 mb-0.5">Top issue category</p>
                {selected.totalIssues === 0 || selected.topIssueCategory === null ? (
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">—</p>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{
                          backgroundColor: selected.issuesByCategory[0]?.color ?? '#94A3B8',
                        }}
                      />
                      <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {selected.topIssueCategory}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-500 mt-0.5">
                      {selected.topIssueCategoryCount} ({selected.topIssueCategoryPercent ?? 0}%)
                    </p>
                  </>
                )}
              </div>

              {/* Pass rate */}
              <div className="flex-1 px-4 py-3 min-w-0">
                <p className="text-[11px] text-slate-500 dark:text-slate-500 mb-0.5">Pass rate</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {formatPassRate(selected.passRate)}
                </p>
                <div className="mt-1 h-1 w-3/4 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${Math.min(selected.passRate ?? 0, 100)}%` }}
                  />
                </div>
              </div>

              {/* Test cases */}
              <div className="flex-1 px-4 py-3 min-w-0">
                <p className="text-[11px] text-slate-500 dark:text-slate-500 mb-0.5">Test cases</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{selected.testCases}</p>
              </div>

              {/* Affected countries */}
              <div className="flex-1 px-4 py-3 min-w-0">
                <p className="text-[11px] text-slate-500 dark:text-slate-500 mb-0.5">Affected countries</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {formatAffectedCountries(selected.affectedCountries)}
                </p>
              </div>
            </div>

            {/* Issues by category + Issues by day */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_3fr]">
              {/* Issues by category */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700/40 bg-slate-50 dark:bg-slate-700/40 p-4">
                <h5 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Issues by category</h5>
                <div className="flex flex-col gap-2">
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
              <div className="rounded-xl border border-slate-200 dark:border-slate-700/40 bg-slate-50 dark:bg-slate-700/40 p-4">
                <h5 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Issues by day</h5>
                <div className="h-56">
                  {/* Clear collected geometry before each render */}
                  {(() => { barGeoRef.current = []; return null; })()}
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={selectedProject.series} margin={{ top: 20, right: 4, bottom: 0, left: 4 }}>
                      <XAxis
                        dataKey="label"
                        tick={{ fill: '#9CA3AF', fontSize: 10 }}
                        interval={0}
                        height={32}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value: string) => {
                          const d = new Date(value.replace(/^[A-Za-z]+,\s*/, ''));
                          if (!isNaN(d.getTime())) {
                            const day = d.toLocaleDateString('en-US', { weekday: 'short' });
                            return `${day}, ${d.getDate()}`;
                          }
                          const parts = value.split(',');
                          if (parts.length >= 2) return `${parts[0].trim().slice(0, 3)}, ${parts[1].trim().split('-').pop()}`;
                          return value.length > 7 ? value.slice(0, 7) : value;
                        }}
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
                          barSize={38}
                          shape={collectorShapes[dIdx]}
                          cursor="pointer"
                          onMouseEnter={(data: Record<string, unknown>) => {
                            setHoveredDefectKey(defect.key);
                            const bx = Number(data.x) || 0;
                            const by = Number(data.y) || 0;
                            const bw = Number(data.width) || 0;
                            const bh = Number(data.height) || 0;
                            if (bh > 0) {
                              setHoveredBarGeo({
                                x: bx, y: by, width: bw, height: bh,
                                fill: defectColorMap[defect.slug] ?? defect.color,
                                r: BAR_RADIUS,
                              });
                            }
                          }}
                          onMouseLeave={() => { setHoveredDefectKey(null); setHoveredBarGeo(null); }}
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
                      <Customized component={() => <VisibleBarsLayer geoRef={barGeoRef} />} />
                      <Customized component={() => <HoveredBarOverlay geo={hoveredBarGeo} />} />
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
