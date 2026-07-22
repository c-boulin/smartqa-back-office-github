import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
} from 'lucide-react';
import { useOverviewTests } from '../../hooks/useOverviewTests';
import { DEFECT_CHART_TYPES } from '../../constants/defectChartTypes';
import {
  fetchOverviewDefectTypes,
  type OverviewDefectType,
  type OverviewTestApiRow,
  type OverviewTestsSortColumn,
} from '../../services/overviewWidgetsApi';
import { fetchDefectGroups, type DefectGroupData } from '../../services/defectGroupsApi';
import Pagination from '../UI/Pagination';
import { DefectSelectionModal } from './DefectSelectionModal';

interface OverviewTestsTableProps {
  gitlabProjectNames?: string[];
}

const DEFECT_LABEL_BY_SLUG = new Map(DEFECT_CHART_TYPES.map(d => [d.slug, d.label]));

interface SortHeaderProps {
  column: OverviewTestsSortColumn;
  label: React.ReactNode;
  activeSort: OverviewTestsSortColumn;
  activeDirection: 'asc' | 'desc';
  onSort: (col: OverviewTestsSortColumn, dir: 'asc' | 'desc') => void;
  thClassName?: string;
}

const SortHeader: React.FC<SortHeaderProps> = ({
  column,
  label,
  activeSort,
  activeDirection,
  onSort,
  thClassName,
}) => {
  const isActive = activeSort === column;
  const handleClick = (): void => {
    if (isActive) {
      onSort(column, activeDirection === 'asc' ? 'desc' : 'asc');
    } else {
      onSort(column, column === 'start_time' ? 'desc' : 'asc');
    }
  };
  return (
    <th className={`py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400 align-bottom ${thClassName ?? ''}`}>
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center gap-1 transition-colors ${
          isActive
            ? 'text-cyan-600 dark:text-cyan-400'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
        }`}
      >
        {label}
        {isActive
          ? activeDirection === 'asc'
            ? <ArrowUp className="h-3 w-3" />
            : <ArrowDown className="h-3 w-3" />
          : null}
      </button>
    </th>
  );
};

const OverviewTestsTable: React.FC<OverviewTestsTableProps> = ({ gitlabProjectNames }) => {
  const navigate = useNavigate();
  const {
    rows,
    meta,
    loading,
    error,
    sort,
    direction,
    setPage,
    setSort,
    filters,
    reload,
  } = useOverviewTests({ gitlabProjectNames });

  const [defectTypes, setDefectTypes] = useState<OverviewDefectType[]>([]);
  const [defectGroups, setDefectGroups] = useState<DefectGroupData[]>([]);
  const [expandedErrorRows, setExpandedErrorRows] = useState<Set<string>>(new Set());
  const [hoveredStartRowKey, setHoveredStartRowKey] = useState<string | null>(null);
  const [selectedTestIds, setSelectedTestIds] = useState<Set<number>>(new Set());
  const [defectModalTarget, setDefectModalTarget] = useState<Array<{
    overviewTestId: number;
    testName: string;
  }> | null>(null);
  const [defectSlugOverrides, setDefectSlugOverrides] = useState<Map<number, string | null>>(new Map());

  useEffect(() => {
    let cancelled = false;
    fetchOverviewDefectTypes()
      .then(list => { if (!cancelled) setDefectTypes(list); })
      .catch(() => { /* fallback to constant labels */ });
    fetchDefectGroups()
      .then(groups => { if (!cancelled) setDefectGroups(groups); })
      .catch(() => { /* modal will still render with empty groups */ });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setSelectedTestIds(new Set());
    setDefectSlugOverrides(new Map());
  }, [meta.currentPage, sort, direction, filters]);

  const defectTypeBySlug = useMemo<Map<string, OverviewDefectType>>(
    () => new Map(defectTypes.map(d => [d.slug, d])),
    [defectTypes],
  );

  const resolveDefectSlug = useCallback((row: OverviewTestApiRow): string | null => {
    if (row.overviewTestId != null && defectSlugOverrides.has(row.overviewTestId)) {
      return defectSlugOverrides.get(row.overviewTestId) ?? null;
    }
    return row.defectType ?? null;
  }, [defectSlugOverrides]);

  const selectableItems = useMemo(
    () => rows.filter(row =>
      (row.statusBand === 'failed' || row.statusLabel.toUpperCase().includes('FAIL'))
      && row.overviewTestId !== null,
    ),
    [rows],
  );

  const allSelectableSelected =
    selectableItems.length > 0
    && selectableItems.every(item => selectedTestIds.has(item.overviewTestId as number));
  const someSelectableSelected =
    selectableItems.some(item => selectedTestIds.has(item.overviewTestId as number));

  const toggleSelectAll = useCallback(() => {
    if (allSelectableSelected) {
      setSelectedTestIds(new Set());
    } else {
      setSelectedTestIds(new Set(selectableItems.map(item => item.overviewTestId as number)));
    }
  }, [allSelectableSelected, selectableItems]);

  const toggleSelectItem = useCallback((id: number) => {
    setSelectedTestIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const openDefectModalForRow = useCallback((row: OverviewTestApiRow) => {
    if (row.overviewTestId == null) return;
    setDefectModalTarget([{ overviewTestId: row.overviewTestId, testName: row.name }]);
  }, []);

  const openDefectModalForSelection = useCallback(() => {
    const activeIds = selectedTestIds.size > 0
      ? selectedTestIds
      : new Set(selectableItems.map(item => item.overviewTestId as number));
    const targets = selectableItems
      .filter(item => activeIds.has(item.overviewTestId as number))
      .map(item => ({ overviewTestId: item.overviewTestId as number, testName: item.name }));
    if (targets.length > 0) setDefectModalTarget(targets);
  }, [selectedTestIds, selectableItems]);

  const handleDefectApplied = useCallback((results: Array<{ overviewTestId: number; defect: { defectType: { slug: string } } | null }>) => {
    setDefectSlugOverrides(prev => {
      const next = new Map(prev);
      for (const r of results) {
        next.set(r.overviewTestId, r.defect?.defectType.slug ?? null);
      }
      return next;
    });
    setSelectedTestIds(new Set());
    setDefectModalTarget(null);
    reload();
  }, [reload]);

  const openTestLog = useCallback((row: OverviewTestApiRow) => {
    if (row.overviewTestId == null) return;
    const params = new URLSearchParams();
    params.set('history_selected_tre', String(row.testRunExecutionId));
    navigate({
      pathname: `/overview/launches/${row.testRunExecutionId}/test/${row.overviewTestId}`,
      search: `?${params.toString()}`,
    });
  }, [navigate]);

  const rowKeyFor = (row: OverviewTestApiRow): string =>
    `${row.testRunExecutionId}-${row.overviewTestId ?? row.name}`;

  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    if (filters.status) parts.push(`Status: ${filters.status}`);
    if (filters.defectTag) {
      parts.push(`Defect: ${DEFECT_LABEL_BY_SLUG.get(filters.defectTag) ?? filters.defectTag}`);
    }
    if (filters.hasIssues) parts.push('Has issues');
    if (filters.projectIds.length > 0) parts.push(`Projects: ${filters.projectIds.length}`);
    if (filters.startFrom && filters.startTo) {
      parts.push(`${filters.startFrom} → ${filters.startTo}`);
    }
    return parts;
  }, [filters]);

  const hidePassedDecisions = filters.status === 'passed';
  const columnCount = hidePassedDecisions ? 3 : 5;

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {filterSummary.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {filterSummary.map(part => (
                <span
                  key={part}
                  className="inline-flex items-center rounded-full bg-cyan-50 dark:bg-cyan-900/30 px-2.5 py-1 text-xs font-medium text-cyan-700 dark:text-cyan-300 ring-1 ring-inset ring-cyan-200 dark:ring-cyan-800"
                >
                  {part}
                </span>
              ))}
            </div>
          )}
        </div>

        {!hidePassedDecisions && selectableItems.length > 0 && (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {selectedTestIds.size > 0 && (
              <span
                data-mipqa="tests-selected-count"
                className="text-xs text-slate-500 dark:text-slate-400"
              >
                {selectedTestIds.size} selected
              </span>
            )}
            <button
              type="button"
              data-mipqa="tests-make-decision-btn"
              onClick={openDefectModalForSelection}
              className="inline-flex items-center gap-1.5 rounded-md bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500 transition-colors"
            >
              Make Decision
            </button>
          </div>
        )}

        <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <table data-mipqa="overview-tests-table" className="w-full min-w-[900px] table-fixed text-sm">
            <colgroup>
              {!hidePassedDecisions && <col className="w-10" />}
              <col style={{ width: hidePassedDecisions ? '55%' : '34%' }} />
              <col className="w-[15%]" />
              <col className="w-[19%]" />
              {!hidePassedDecisions && <col className="w-[12%]" />}
            </colgroup>
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80">
              <tr className="text-left">
                {!hidePassedDecisions && (
                  <th className="py-3 pl-4 pr-2">
                    {selectableItems.length > 0 ? (
                    <label
                      data-mipqa="tests-select-all-checkbox"
                      className="relative inline-flex h-4 w-4 cursor-pointer select-none items-center justify-center"
                    >
                      <input
                        type="checkbox"
                        checked={allSelectableSelected}
                        ref={el => { if (el) el.indeterminate = someSelectableSelected && !allSelectableSelected; }}
                        onChange={toggleSelectAll}
                        className="sr-only"
                      />
                      <span className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                        allSelectableSelected
                          ? 'border-cyan-500 bg-cyan-500'
                          : someSelectableSelected
                            ? 'border-cyan-500 bg-cyan-500/20 dark:bg-cyan-500/30'
                            : 'border-slate-300 bg-white hover:border-slate-400 dark:border-slate-500 dark:bg-slate-700/60 dark:hover:border-slate-400'
                      }`}>
                        {someSelectableSelected && !allSelectableSelected ? (
                          <span className="block h-0.5 w-2 rounded-full bg-cyan-400" />
                        ) : allSelectableSelected ? (
                          <svg viewBox="0 0 10 8" className="h-2.5 w-2.5 fill-none stroke-white stroke-2">
                            <polyline points="1,4 4,7 9,1" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : null}
                      </span>
                    </label>
                    ) : (
                      <span className="inline-flex p-1" aria-hidden="true" />
                    )}
                  </th>
                )}
                <SortHeader
                  column="name"
                  label="Name"
                  activeSort={sort}
                  activeDirection={direction}
                  onSort={setSort}
                  thClassName="pr-4"
                />
                <SortHeader
                  column="status"
                  label={<span className="whitespace-nowrap">Status</span>}
                  activeSort={sort}
                  activeDirection={direction}
                  onSort={setSort}
                  thClassName="px-2 whitespace-nowrap"
                />
                <SortHeader
                  column="start_time"
                  label={<span className="whitespace-nowrap">Start time</span>}
                  activeSort={sort}
                  activeDirection={direction}
                  onSort={setSort}
                  thClassName="px-2 whitespace-nowrap"
                />
                {!hidePassedDecisions && (
                  <th className="py-3 px-2 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400 align-bottom">
                    Defect type
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {loading && (
                <tr>
                  <td colSpan={columnCount} className="px-4 py-12">
                    <div className="flex flex-col items-center gap-2 text-slate-500 dark:text-slate-400">
                      <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
                      <span className="text-sm">Loading tests…</span>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && error !== null && (
                <tr>
                  <td colSpan={columnCount} className="px-4 py-12">
                    <div className="flex flex-col items-center gap-2 text-red-600 dark:text-red-400">
                      <AlertCircle className="h-6 w-6" />
                      <span className="text-sm font-medium">Could not load tests</span>
                      <span className="text-xs text-red-500 dark:text-red-400/80">{error}</span>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && error === null && rows.length === 0 && (
                <tr>
                  <td colSpan={columnCount} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                    No tests match the current filters.
                  </td>
                </tr>
              )}
              {!loading && error === null && (() => {
                const output: React.ReactNode[] = [];
                let lastGroupKey: number | null = null;
                let groupSeq = 0;
                for (const row of rows) {
                  if (row.testRunExecutionId !== lastGroupKey) {
                    lastGroupKey = row.testRunExecutionId;
                    groupSeq += 1;
                    const headerLabel = row.rootOverviewSuiteName
                      ? `${row.launchTitle} / ${row.rootOverviewSuiteName}`
                      : row.launchTitle;
                    output.push(
                      <tr
                        key={`group-${row.testRunExecutionId}-${groupSeq}`}
                        data-mipqa="overview-tests-group-header"
                        className="bg-slate-100 dark:bg-slate-800/60"
                      >
                        <td
                          colSpan={columnCount}
                          className="border-y border-slate-200 dark:border-slate-700 py-2 pl-4 pr-3"
                        >
                          <button
                            type="button"
                            data-mipqa="overview-tests-group-link"
                            onClick={() => navigate(`/overview/launches/${row.testRunExecutionId}?tab=launches`)}
                            className="inline-flex items-center gap-1.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors [overflow-wrap:anywhere]"
                          >
                            <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
                            <span className="normal-case tracking-normal">
                              <span className="font-semibold text-slate-700 dark:text-slate-200">
                                {row.launchTitle}
                              </span>
                              {row.rootOverviewSuiteName ? (
                                <>
                                  <span className="mx-1.5 text-slate-400 dark:text-slate-500">/</span>
                                  <span className="text-slate-600 dark:text-slate-300">
                                    {row.rootOverviewSuiteName}
                                  </span>
                                </>
                              ) : null}
                            </span>
                            <span className="sr-only">{headerLabel}</span>
                          </button>
                        </td>
                      </tr>,
                    );
                  }

                  const rowKey = rowKeyFor(row);
                  const isFailed =
                    row.statusBand === 'failed' ||
                    row.statusLabel.toUpperCase().includes('FAIL');
                  const canDecide = isFailed && row.overviewTestId !== null;
                  const isSelected = row.overviewTestId !== null && selectedTestIds.has(row.overviewTestId);
                  const currentDefectSlug = resolveDefectSlug(row);
                  const resolvedDefect = currentDefectSlug != null && currentDefectSlug !== ''
                    ? defectTypeBySlug.get(currentDefectSlug) ?? null
                    : null;

                  output.push(
                    <tr
                      key={rowKey}
                      data-mipqa="overview-tests-row"
                      className={`transition-colors ${
                        isFailed
                          ? 'bg-red-100 dark:bg-red-900/40 hover:bg-red-200/70 dark:hover:bg-red-900/60'
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      {!hidePassedDecisions && (
                        <td className="py-3 pl-4 pr-2 align-top text-slate-400">
                          {canDecide ? (
                            <label
                              data-mipqa={`tests-row-checkbox-${row.overviewTestId}`}
                              className="relative inline-flex h-4 w-4 cursor-pointer select-none items-center justify-center"
                              onClick={e => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectItem(row.overviewTestId as number)}
                                className="sr-only"
                              />
                              <span className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                                isSelected
                                  ? 'border-cyan-500 bg-cyan-500'
                                  : 'border-slate-300 bg-white hover:border-slate-400 dark:border-slate-500 dark:bg-slate-700/60 dark:hover:border-slate-400'
                              }`}>
                                {isSelected && (
                                  <svg viewBox="0 0 10 8" className="h-2.5 w-2.5 fill-none stroke-white stroke-2">
                                    <polyline points="1,4 4,7 9,1" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                              </span>
                            </label>
                          ) : (
                            <span className="inline-flex p-1" aria-hidden="true" />
                          )}
                        </td>
                      )}
                      <td className="min-w-0 break-words py-3 pr-4 align-top">
                        {row.overviewTestId !== null ? (
                          <button
                            type="button"
                            onClick={() => openTestLog(row)}
                            data-mipqa="overview-tests-name-link"
                            className="block text-left font-semibold text-cyan-600 dark:text-cyan-400 hover:underline [overflow-wrap:anywhere]"
                          >
                            {row.name}
                          </button>
                        ) : (
                          <span className="block font-semibold text-slate-900 dark:text-slate-100 [overflow-wrap:anywhere]">
                            {row.name}
                          </span>
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-600 dark:text-slate-400">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3 shrink-0" />
                            {row.durationLabel}
                          </span>
                        </div>
                        {isFailed && row.errorMessages != null && row.errorMessages.length > 0 ? (
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              setExpandedErrorRows(prev => {
                                const next = new Set(prev);
                                if (next.has(rowKey)) {
                                  next.delete(rowKey);
                                } else {
                                  next.add(rowKey);
                                }
                                return next;
                              });
                            }}
                            className="mt-1.5 block w-full text-left"
                          >
                            {expandedErrorRows.has(rowKey) ? (
                              <div className="flex flex-col gap-0.5">
                                {row.errorMessages.map((msg, i) => (
                                  <p
                                    key={i}
                                    className="text-xs text-red-700 dark:text-red-300 font-mono [overflow-wrap:anywhere]"
                                  >
                                    {msg}
                                  </p>
                                ))}
                              </div>
                            ) : (
                              <p className="truncate text-xs text-red-700 dark:text-red-300 font-mono">
                                {row.errorMessages[0]}
                              </p>
                            )}
                          </button>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap py-3 px-2 align-top text-slate-700 dark:text-slate-300">
                        <span className="inline-flex items-center gap-1">
                          {row.statusLabel !== '—' ? row.statusLabel.toUpperCase() : '—'}
                          <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
                        </span>
                      </td>
                      <td
                        className="cursor-default whitespace-nowrap py-3 px-2 align-top text-slate-700 dark:text-slate-300"
                        onMouseEnter={() => {
                          if (
                            row.startTimeRelative !== '\u2014' &&
                            row.startTimeRelative !== '-'
                          ) {
                            setHoveredStartRowKey(rowKey);
                          }
                        }}
                        onMouseLeave={() => setHoveredStartRowKey(null)}
                        title={row.startTimeRaw ?? row.startTimeDisplay}
                      >
                        {hoveredStartRowKey === rowKey
                          ? (row.startTimeRaw ?? row.startTimeDisplay)
                          : row.startTimeRelative}
                      </td>
                      {!hidePassedDecisions && (
                        <td className="py-3 px-2 align-top text-slate-700 dark:text-slate-300">
                          {canDecide ? (
                            resolvedDefect !== null ? (
                              <button
                                type="button"
                                data-mipqa="defect-badge-btn"
                                onClick={() => openDefectModalForRow(row)}
                                className="inline-flex items-center gap-1.5 rounded-full border border-slate-600 bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-200 hover:border-slate-400 hover:bg-slate-700 transition-colors"
                              >
                                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: resolvedDefect.color }} />
                                {resolvedDefect.name}
                              </button>
                            ) : (
                              <button
                                type="button"
                                data-mipqa="defect-make-decision-btn"
                                onClick={() => openDefectModalForRow(row)}
                                className="inline-flex items-center gap-1 rounded-md border border-dashed border-slate-600 bg-transparent px-2.5 py-0.5 text-xs font-medium text-slate-400 hover:border-cyan-500 hover:text-cyan-400 transition-colors"
                              >
                                Make Decision
                              </button>
                            )
                          ) : (
                            currentDefectSlug === null || currentDefectSlug === '' ? (
                              <span className="text-slate-400 dark:text-slate-600">{'\u2014'}</span>
                            ) : resolvedDefect !== null ? (
                              <span className="inline-flex items-center gap-1.5 text-xs">
                                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: resolvedDefect.color }} />
                                {resolvedDefect.name}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs">
                                <span className="h-2 w-2 shrink-0 rounded-full bg-slate-400" />
                                {DEFECT_LABEL_BY_SLUG.get(currentDefectSlug) ?? currentDefectSlug}
                              </span>
                            )
                          )}
                        </td>
                      )}
                    </tr>,
                  );
                }
                return output;
              })()}
            </tbody>
          </table>
          <Pagination
            currentPage={meta.currentPage}
            totalPages={meta.lastPage}
            totalItems={meta.total}
            itemsPerPage={meta.perPage}
            onPageChange={setPage}
          />
        </div>
      </div>
      {defectModalTarget !== null && (
        <DefectSelectionModal
          targets={defectModalTarget}
          defectTypes={defectTypes}
          defectGroups={defectGroups}
          onClose={() => setDefectModalTarget(null)}
          onApplied={handleDefectApplied}
        />
      )}
    </>
  );
};

export default OverviewTestsTable;
