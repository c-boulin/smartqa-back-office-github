import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useOverviewTests } from '../../hooks/useOverviewTests';
import { DEFECT_CHART_TYPES } from '../../constants/defectChartTypes';
import {
  fetchOverviewDefectTypes,
  type OverviewDefectType,
  type OverviewTestApiRow,
} from '../../services/overviewWidgetsApi';
import { fetchDefectGroups, type DefectGroupData } from '../../services/defectGroupsApi';
import Pagination from '../UI/Pagination';
import { DefectSelectionModal } from './DefectSelectionModal';
import OverviewTestsGroupTable, {
  CheckboxBox,
  OverviewTestsTableHead,
  isFailedRow,
  type OverviewTestsGroup,
} from './OverviewTestsGroupTable';
import { useAuth } from '../../context/AuthContext';
import { PERMISSIONS } from '../../utils/permissions';

interface OverviewTestsTableProps {
  gitlabProjectNames?: string[];
  /** TEMP(bolt-overview) — sidebar allowlist. TODO(remove): replace with real Bolt gitlab repoNames when the QATE Bolt repo exists */
  projectIds?: number[];
}

const DEFECT_LABEL_BY_SLUG = new Map<string, string>(DEFECT_CHART_TYPES.map(d => [d.slug, d.label]));
const LAUNCHES_PER_PAGE = 5;

const groupRowsByLaunch = (rows: OverviewTestApiRow[]): OverviewTestsGroup[] => {
  const byLaunch = new Map<number, OverviewTestsGroup>();
  for (const row of rows) {
    const existing = byLaunch.get(row.testRunExecutionId);
    if (existing !== undefined) {
      existing.rows.push(row);
    } else {
      byLaunch.set(row.testRunExecutionId, {
        key: `launch-${row.testRunExecutionId}`,
        testRunExecutionId: row.testRunExecutionId,
        launchTitle: row.launchTitle,
        suiteName: row.rootOverviewSuiteName,
        rows: [row],
      });
    }
  }
  return Array.from(byLaunch.values());
};

const groupRows = (rows: OverviewTestApiRow[]): OverviewTestsGroup[] => {
  const groups: OverviewTestsGroup[] = [];
  for (const row of rows) {
    const last = groups[groups.length - 1];
    if (last !== undefined && last.testRunExecutionId === row.testRunExecutionId) {
      last.rows.push(row);
    } else {
      groups.push({
        key: `group-${row.testRunExecutionId}-${groups.length}`,
        testRunExecutionId: row.testRunExecutionId,
        launchTitle: row.launchTitle,
        suiteName: row.rootOverviewSuiteName,
        rows: [row],
      });
    }
  }
  return groups;
};

const OverviewTestsTable: React.FC<OverviewTestsTableProps> = ({ gitlabProjectNames, projectIds }) => {
  const { hasPermission } = useAuth();
  const canEditDefects = hasPermission(PERMISSIONS.ADMIN_PANEL.READ);
  const {
    rows,
    meta,
    loading,
    error,
    page,
    sort,
    direction,
    setPage,
    setSort,
    filters,
    reload,
  } = useOverviewTests({ gitlabProjectNames, projectIds });

  const [defectTypes, setDefectTypes] = useState<OverviewDefectType[]>([]);
  const [defectGroups, setDefectGroups] = useState<DefectGroupData[]>([]);
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

  const listTopRef = useRef<HTMLDivElement>(null);
  const groupByLaunch = filters.groupByLaunch;

  useEffect(() => {
    setSelectedTestIds(new Set());
    setDefectSlugOverrides(new Map());
  }, [meta.currentPage, page, sort, direction, filters]);

  const defectTypeBySlug = useMemo<Map<string, OverviewDefectType>>(
    () => new Map(defectTypes.map(d => [d.slug, d])),
    [defectTypes],
  );

  const allGroups = useMemo(
    () => (groupByLaunch ? groupRowsByLaunch(rows) : groupRows(rows)),
    [rows, groupByLaunch],
  );
  const launchPageCount = Math.max(1, Math.ceil(allGroups.length / LAUNCHES_PER_PAGE));
  const launchPage = Math.min(Math.max(page, 1), launchPageCount);
  const groups = useMemo(
    () => (groupByLaunch
      ? allGroups.slice((launchPage - 1) * LAUNCHES_PER_PAGE, launchPage * LAUNCHES_PER_PAGE)
      : allGroups),
    [allGroups, groupByLaunch, launchPage],
  );
  const visibleRows = useMemo(() => groups.flatMap(g => g.rows), [groups]);

  const handlePageChange = useCallback((next: number) => {
    setPage(next);
    if (groupByLaunch) listTopRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [groupByLaunch, setPage]);

  const resolveDefectSlug = useCallback((row: OverviewTestApiRow): string | null => {
    if (row.overviewTestId != null && defectSlugOverrides.has(row.overviewTestId)) {
      return defectSlugOverrides.get(row.overviewTestId) ?? null;
    }
    return row.defectType ?? null;
  }, [defectSlugOverrides]);

  const selectableItems = useMemo(
    () => visibleRows.filter(row => isFailedRow(row) && row.overviewTestId !== null),
    [visibleRows],
  );

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

  const allSelected = selectableItems.length > 0
    && selectableItems.every(item => selectedTestIds.has(item.overviewTestId as number));
  const someSelected = !allSelected
    && selectableItems.some(item => selectedTestIds.has(item.overviewTestId as number));

  const toggleSelectAll = useCallback(() => {
    setSelectedTestIds(allSelected
      ? new Set()
      : new Set(selectableItems.map(item => item.overviewTestId as number)));
  }, [allSelected, selectableItems]);

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

  const testLogPath = useCallback((row: OverviewTestApiRow): string => {
    if (row.overviewTestId == null) return '#';
    const params = new URLSearchParams();
    params.set('history_selected_tre', String(row.testRunExecutionId));
    return `/overview/launches/${row.testRunExecutionId}/test/${row.overviewTestId}?${params.toString()}`;
  }, []);

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

  const hidePassedDecisions = filters.status === 'passed'
    || (groupByLaunch && !loading && !rows.some(isFailedRow));
  const columnCount = hidePassedDecisions ? 5 : 6;
  const showGroups = !loading && error === null && groups.length > 0;

  const renderStatusTable = (content: React.ReactNode): React.ReactNode => (
    <div className="overflow-hidden rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
      <table data-mipqa="overview-tests-table" className="w-full table-fixed text-sm">
        <OverviewTestsTableHead
          hidePassedDecisions={hidePassedDecisions}
          sort={sort}
          direction={direction}
          onSort={setSort}
        />
        <tbody>
          <tr>
            <td colSpan={columnCount} className="px-4 py-12">{content}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <div ref={listTopRef} className="space-y-4 scroll-mt-4">
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

        {canEditDefects && !hidePassedDecisions && selectableItems.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label
              data-mipqa="tests-select-all-checkbox"
              className="inline-flex cursor-pointer select-none items-center gap-2 pl-[17px] text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              <input
                type="checkbox"
                checked={allSelected}
                ref={el => { if (el) el.indeterminate = someSelected; }}
                onChange={toggleSelectAll}
                className="sr-only"
              />
              <CheckboxBox checked={allSelected} indeterminate={someSelected} />
              Select all
            </label>
            <div className="flex items-center gap-2">
              {selectedTestIds.size > 0 && (
                <span data-mipqa="tests-selected-count" className="text-xs text-slate-500 dark:text-slate-400">
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
          </div>
        )}

        {loading && renderStatusTable(
          <div className="flex flex-col items-center gap-2 text-slate-500 dark:text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
            <span className="text-sm">Loading tests…</span>
          </div>,
        )}
        {!loading && error !== null && renderStatusTable(
          <div className="flex flex-col items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="h-6 w-6" />
            <span className="text-sm font-medium">Could not load tests</span>
            <span className="text-xs text-red-500 dark:text-red-400/80">{error}</span>
          </div>,
        )}
        {!loading && error === null && groups.length === 0 && renderStatusTable(
          <p className="text-center text-slate-500 dark:text-slate-400">No tests match the current filters.</p>,
        )}

        {showGroups && (
          <div className="space-y-6">
            {groups.map(group => (
              <OverviewTestsGroupTable
                key={group.key}
                group={group}
                hidePassedDecisions={hidePassedDecisions}
                sort={sort}
                direction={direction}
                onSort={setSort}
                canEditDefects={canEditDefects}
                selectedTestIds={selectedTestIds}
                onToggleItem={toggleSelectItem}
                resolveDefectSlug={resolveDefectSlug}
                defectTypeBySlug={defectTypeBySlug}
                onOpenDefectModal={openDefectModalForRow}
                testLogPath={testLogPath}
              />
            ))}
          </div>
        )}

        <div className="overflow-hidden rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          {groupByLaunch ? (
            <Pagination
              currentPage={launchPage}
              totalPages={launchPageCount}
              totalItems={allGroups.length}
              itemsPerPage={LAUNCHES_PER_PAGE}
              itemLabel="launches"
              onPageChange={handlePageChange}
            />
          ) : (
            <Pagination
              currentPage={meta.currentPage}
              totalPages={meta.lastPage}
              totalItems={meta.total}
              itemsPerPage={meta.perPage}
              itemLabel="tests"
              onPageChange={handlePageChange}
            />
          )}
        </div>
      </div>
      {canEditDefects && defectModalTarget !== null && (
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
