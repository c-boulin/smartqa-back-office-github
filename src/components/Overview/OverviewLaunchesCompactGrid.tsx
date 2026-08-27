import React from 'react';
import { ArrowDown, ArrowUp, Clock, Link2, Menu, User } from 'lucide-react';
import type { OverviewLaunchRow } from './OverviewLaunchesTable';
import type { OverviewLaunchesSortColumn } from '../../services/overviewWidgetsApi';
import type { DefectTypeData } from '../../services/defectGroupsApi';

function splitLaunchTitle(title: string): { name: string; pipeline: string | null } {
  const match = title.match(/^(.*?)\s+(#\d+)$/);
  if (match) return { name: match[1], pipeline: match[2] };
  return { name: title, pipeline: null };
}

/* ─── MiniDonut ─── */
function MiniDonut({ slices }: { slices: Array<{ type: DefectTypeData; count: number }> }): React.ReactElement | null {
  if (slices.length === 0) return null;
  const total = slices.reduce((sum, s) => sum + Math.max(0, s.count), 0);
  if (total <= 0) return null;
  let cursor = 0;
  const segments = slices.map(s => {
    const start = (cursor / total) * 100;
    cursor += Math.max(0, s.count);
    const end = (cursor / total) * 100;
    return `${s.type.color} ${start}% ${end}%`;
  });
  return (
    <div
      className="relative h-5 w-5 shrink-0 rounded-full"
      style={{ background: `conic-gradient(${segments.join(', ')})` }}
      title={slices.map(s => `${s.type.name}: ${s.count}`).join(', ')}
      aria-hidden
    >
      <div className="absolute inset-[3px] rounded-full bg-white dark:bg-slate-900" />
    </div>
  );
}

function renderCount(value: number | undefined): React.ReactNode {
  if (value === undefined || value === 0) {
    return <span className="text-slate-400 dark:text-slate-600">{'\u2014'}</span>;
  }
  return value;
}

/* ─── Sort Button ─── */
interface SortBtnProps {
  column: OverviewLaunchesSortColumn;
  label: React.ReactNode;
  activeColumn: OverviewLaunchesSortColumn;
  direction: 'asc' | 'desc';
  onSort: (c: OverviewLaunchesSortColumn) => void;
  align?: 'left' | 'right';
}

function SortBtn({ column, label, activeColumn, direction, onSort, align = 'left' }: SortBtnProps): React.ReactElement {
  const active = activeColumn === column;
  const Icon = active && direction === 'asc' ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className={`inline-grid select-none text-[10px] font-semibold uppercase leading-tight hover:text-cyan-600 dark:hover:text-cyan-400 ${
        active ? 'text-teal-600 dark:text-teal-400' : 'text-slate-600 dark:text-slate-400'
      }`}
      style={{
        gridTemplateColumns: 'minmax(0, max-content) 0.75rem',
        alignItems: 'center',
        columnGap: '0.25rem',
        maxWidth: '100%',
      }}
      aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <span className={`min-w-0 ${align === 'right' ? 'text-right' : 'text-left'}`}>{label}</span>
      <Icon className="h-3 w-3 min-w-[0.75rem] shrink-0" aria-hidden />
    </button>
  );
}

/* ─── Props ─── */
interface OverviewLaunchesCompactGridProps {
  rows: OverviewLaunchRow[];
  launchSort: { column: OverviewLaunchesSortColumn; direction: 'asc' | 'desc' };
  toggleLaunchSort: (c: OverviewLaunchesSortColumn) => void;
  hoveredStartRowId: string | null;
  setHoveredStartRowId: (id: string | null) => void;
  startTimeHoverLabel: (row: OverviewLaunchRow) => string;
  navigateToLaunch: (row: OverviewLaunchRow) => void;
  openSuiteListView: () => void;
  defectTypesForColumn: (launchId: number, column: 'productBug' | 'autoBug' | 'systemIssue' | 'toInvestigate') => Array<{ type: DefectTypeData; count: number }>;
}

/* ─── 2x2 Results Header ─── */
function ResultsHeader({ launchSort, toggleLaunchSort }: { launchSort: OverviewLaunchesCompactGridProps['launchSort']; toggleLaunchSort: OverviewLaunchesCompactGridProps['toggleLaunchSort'] }): React.ReactElement {
  return (
    <div className="compact-2x2">
      <div><SortBtn column="total" label="Total" activeColumn={launchSort.column} direction={launchSort.direction} onSort={toggleLaunchSort} align="right" /></div>
      <div><SortBtn column="passed" label="Passed" activeColumn={launchSort.column} direction={launchSort.direction} onSort={toggleLaunchSort} align="right" /></div>
      <div><SortBtn column="failed" label="Failed" activeColumn={launchSort.column} direction={launchSort.direction} onSort={toggleLaunchSort} align="right" /></div>
      <div><SortBtn column="skipped" label="Skipped" activeColumn={launchSort.column} direction={launchSort.direction} onSort={toggleLaunchSort} align="right" /></div>
    </div>
  );
}

/* ─── 2x2 Defects Header ─── */
function DefectsHeader({ launchSort, toggleLaunchSort }: { launchSort: OverviewLaunchesCompactGridProps['launchSort']; toggleLaunchSort: OverviewLaunchesCompactGridProps['toggleLaunchSort'] }): React.ReactElement {
  return (
    <div className="compact-2x2">
      <div><SortBtn column="product_bug" label="Product bug" activeColumn={launchSort.column} direction={launchSort.direction} onSort={toggleLaunchSort} align="right" /></div>
      <div><SortBtn column="auto_bug" label="Auto bug" activeColumn={launchSort.column} direction={launchSort.direction} onSort={toggleLaunchSort} align="right" /></div>
      <div><SortBtn column="system_issue" label="System issue" activeColumn={launchSort.column} direction={launchSort.direction} onSort={toggleLaunchSort} align="right" /></div>
      <div><SortBtn column="to_investigate" label={<span className="leading-tight">To investigate</span>} activeColumn={launchSort.column} direction={launchSort.direction} onSort={toggleLaunchSort} align="right" /></div>
    </div>
  );
}

/* ─── 2x2 Results Body Cell ─── */
function ResultsBody({ row }: { row: OverviewLaunchRow }): React.ReactElement {
  return (
    <div className="compact-2x2 tabular-nums text-xs">
      <div className="text-right text-slate-900 dark:text-white">{row.total}</div>
      <div className="text-right text-teal-600 dark:text-teal-400">{row.passed}</div>
      <div className="text-right text-slate-900 dark:text-white">{row.failed}</div>
      <div className="text-right text-slate-900 dark:text-white">{row.skipped}</div>
    </div>
  );
}

/* ─── 2x2 Defects Body Cell ─── */
function DefectsBody({ row, defectTypesForColumn }: { row: OverviewLaunchRow; defectTypesForColumn: OverviewLaunchesCompactGridProps['defectTypesForColumn'] }): React.ReactElement {
  const launchId = row.parentLaunchId ?? Number(row.id);
  const isCron = row.source === 'cron';
  return (
    <div className="compact-2x2 tabular-nums text-xs">
      <div className="flex items-center justify-end gap-1">
        {isCron && row.productBug !== undefined && row.productBug > 0 && <MiniDonut slices={defectTypesForColumn(launchId, 'productBug')} />}
        <span className="text-slate-900 dark:text-white">{isCron ? renderCount(row.productBug) : <span className="text-slate-400 dark:text-slate-600">{'\u2014'}</span>}</span>
      </div>
      <div className="flex items-center justify-end gap-1">
        {isCron && row.autoBug !== undefined && row.autoBug > 0 && <MiniDonut slices={defectTypesForColumn(launchId, 'autoBug')} />}
        <span className="text-slate-900 dark:text-white">{isCron ? renderCount(row.autoBug) : <span className="text-slate-400 dark:text-slate-600">{'\u2014'}</span>}</span>
      </div>
      <div className="flex items-center justify-end gap-1">
        {isCron && row.systemIssue !== undefined && row.systemIssue > 0 && <MiniDonut slices={defectTypesForColumn(launchId, 'systemIssue')} />}
        <span className="text-slate-900 dark:text-white">{isCron ? renderCount(row.systemIssue) : <span className="text-slate-400 dark:text-slate-600">{'\u2014'}</span>}</span>
      </div>
      <div className="flex items-center justify-end gap-1">
        {isCron && row.toInvestigate !== undefined && row.toInvestigate > 0 && <MiniDonut slices={defectTypesForColumn(launchId, 'toInvestigate')} />}
        <span className="text-slate-900 dark:text-white">{isCron ? renderCount(row.toInvestigate) : <span className="text-slate-400 dark:text-slate-600">{'\u2014'}</span>}</span>
      </div>
    </div>
  );
}

/* ─── Main Component ─── */
function OverviewLaunchesCompactGrid({
  rows,
  launchSort,
  toggleLaunchSort,
  hoveredStartRowId,
  setHoveredStartRowId,
  startTimeHoverLabel,
  navigateToLaunch,
  openSuiteListView,
  defectTypesForColumn,
}: OverviewLaunchesCompactGridProps): React.ReactElement {
  return (
    <div className="launches-compact-grid" role="table" aria-label="Launches">
      {/* ─── Header ─── */}
      <div role="rowgroup">
        <div
          role="row"
          className="compact-row-grid border-b border-slate-200 bg-slate-50 py-2 px-3 dark:border-slate-700 dark:bg-slate-800/80"
        >
          <div role="columnheader" className="min-w-0 self-end">
            <SortBtn column="name" label="Name" activeColumn={launchSort.column} direction={launchSort.direction} onSort={toggleLaunchSort} />
          </div>
          <div role="columnheader" className="min-w-0 self-end">
            <SortBtn column="start_time" label="Start time" activeColumn={launchSort.column} direction={launchSort.direction} onSort={toggleLaunchSort} />
          </div>
          <div role="columnheader" className="min-w-0 self-end">
            <span className="text-[10px] font-semibold uppercase text-slate-600 dark:text-slate-400">Ran By</span>
          </div>
          <div role="columnheader" className="min-w-0 self-end border-l border-slate-200 pl-2 dark:border-slate-700">
            <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Results</span>
            <ResultsHeader launchSort={launchSort} toggleLaunchSort={toggleLaunchSort} />
          </div>
          <div role="columnheader" className="min-w-0 self-end border-l border-slate-200 pl-2 dark:border-slate-700">
            <span className="mb-1 block text-[9px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Defects</span>
            <DefectsHeader launchSort={launchSort} toggleLaunchSort={toggleLaunchSort} />
          </div>
        </div>
      </div>

      {/* ─── Body ─── */}
      <div role="rowgroup">
        {rows.map(row => {
          const { name: titleName, pipeline: titlePipeline } = splitLaunchTitle(row.title);
          return (
            <div
              key={row.id}
              role="row"
              className="compact-row-grid border-b border-slate-100 py-2.5 px-3 transition-colors hover:bg-slate-50/80 dark:border-slate-700/60 dark:hover:bg-slate-800/40"
            >
              {/* Name */}
              <div role="cell" className="min-w-0">
                <div className="flex items-start gap-1.5">
                  <span className="mt-0.5 inline-flex shrink-0 text-slate-400" aria-hidden>
                    <Menu className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    {row.suiteDrillDown === true ? (
                      <button
                        type="button"
                        onClick={() => openSuiteListView()}
                        className="block w-full min-w-0 break-words text-left text-sm font-semibold text-cyan-600 dark:text-cyan-400 hover:underline"
                      >
                        <span className="block">{titleName}</span>
                        {titlePipeline && <span className="block mt-0.5 text-xs font-normal text-slate-500 dark:text-slate-400">{titlePipeline}</span>}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => navigateToLaunch(row)}
                        className="block w-full min-w-0 break-words text-left text-sm font-semibold text-cyan-600 dark:text-cyan-400 hover:underline"
                      >
                        <span className="block">{titleName}</span>
                        {titlePipeline && <span className="block mt-0.5 text-xs font-normal text-slate-500 dark:text-slate-400">{titlePipeline}</span>}
                      </button>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-600 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3 shrink-0" />
                        {row.durationLabel}
                      </span>
                      {row.suiteDrillDown !== true && <Link2 className="h-3 w-3 shrink-0 text-slate-400" aria-hidden />}
                    </div>
                    {row.attributeText !== '' && (
                      <p className="mt-1 font-mono text-[11px] leading-relaxed text-slate-500 dark:text-slate-500 [overflow-wrap:anywhere]">
                        {row.attributeText}
                      </p>
                    )}
                    {row.description && (
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{row.description}</p>
                    )}
                    {row.testCasesLine && (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">{row.testCasesLine}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Start Time */}
              <div
                role="cell"
                className="min-w-0 self-start pt-0.5 text-xs text-slate-700 dark:text-slate-300 cursor-default"
                onMouseEnter={() => {
                  if (row.startTimeRelative !== '\u2014' && row.startTimeRelative !== '-') {
                    setHoveredStartRowId(row.id);
                  }
                }}
                onMouseLeave={() => setHoveredStartRowId(null)}
              >
                {hoveredStartRowId === row.id ? startTimeHoverLabel(row) : row.startTimeRelative}
              </div>

              {/* Ran By */}
              <div role="cell" className="min-w-0 self-start pt-0.5 text-xs text-slate-700 dark:text-slate-300">
                {row.suiteDrillDown === true ? (
                  <span className="text-slate-400 dark:text-slate-600">{'\u2014'}</span>
                ) : row.runnedByLabel !== '' ? (
                  <span className="inline-flex items-center gap-1 max-w-full">
                    <User className="h-3.5 w-3.5 shrink-0 text-teal-600 dark:text-teal-400" aria-hidden />
                    <span className="[overflow-wrap:anywhere]">{row.runnedByLabel}</span>
                  </span>
                ) : row.createdByUserId === null ? (
                  <span className="inline-flex items-center gap-1">
                    <User className="h-3.5 w-3.5 shrink-0 text-teal-600 dark:text-teal-400" aria-hidden />
                    <span>Cron</span>
                  </span>
                ) : (
                  <span className="text-slate-400 dark:text-slate-600">{'\u2014'}</span>
                )}
              </div>

              {/* Results 2x2 */}
              <div role="cell" className="min-w-0 self-start border-l border-slate-100 pl-2 dark:border-slate-700/60">
                <ResultsBody row={row} />
              </div>

              {/* Defects 2x2 */}
              <div role="cell" className="min-w-0 self-start border-l border-slate-100 pl-2 dark:border-slate-700/60">
                <DefectsBody row={row} defectTypesForColumn={defectTypesForColumn} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { splitLaunchTitle, OverviewLaunchesCompactGrid };
export type { OverviewLaunchesCompactGridProps };
