import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Clock,
  Folder,
  Link2,
} from 'lucide-react';
import { DEFECT_CHART_TYPES } from '../../constants/defectChartTypes';
import type {
  OverviewDefectType,
  OverviewTestApiRow,
  OverviewTestsSortColumn,
} from '../../services/overviewWidgetsApi';
import { linkifyLogText } from './linkifyLogText';

const DEFECT_LABEL_BY_SLUG = new Map<string, string>(DEFECT_CHART_TYPES.map(d => [d.slug, d.label]));

export interface OverviewTestsGroup {
  key: string;
  testRunExecutionId: number;
  launchTitle: string;
  suiteName: string | null;
  rows: OverviewTestApiRow[];
}

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
        className={`inline-flex items-center gap-1 uppercase transition-colors ${
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

const CheckboxBox: React.FC<{ checked: boolean; indeterminate?: boolean }> = ({ checked, indeterminate = false }) => (
  <span className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
    checked
      ? 'border-cyan-500 bg-cyan-500'
      : indeterminate
        ? 'border-cyan-500 bg-cyan-500/20 dark:bg-cyan-500/30'
        : 'border-slate-300 bg-white hover:border-slate-400 dark:border-slate-500 dark:bg-slate-700/60 dark:hover:border-slate-400'
  }`}>
    {indeterminate && !checked ? (
      <span className="block h-0.5 w-2 rounded-full bg-cyan-400" />
    ) : checked ? (
      <svg viewBox="0 0 10 8" className="h-2.5 w-2.5 fill-none stroke-white stroke-2">
        <polyline points="1,4 4,7 9,1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ) : null}
  </span>
);

export const isFailedRow = (row: OverviewTestApiRow): boolean =>
  row.statusBand === 'failed' || row.statusLabel.toUpperCase().includes('FAIL');

interface TableHeadProps {
  hidePassedDecisions: boolean;
  sort: OverviewTestsSortColumn;
  direction: 'asc' | 'desc';
  onSort: (col: OverviewTestsSortColumn, dir: 'asc' | 'desc') => void;
  selectAll?: React.ReactNode;
}

export const OverviewTestsTableHead: React.FC<TableHeadProps> = ({
  hidePassedDecisions,
  sort,
  direction,
  onSort,
  selectAll,
}) => (
  <>
    <colgroup>
      <col style={{ width: '4%' }} />
      <col style={{ width: '13%' }} />
      <col style={{ width: hidePassedDecisions ? '55%' : '43%' }} />
      <col style={{ width: hidePassedDecisions ? '14%' : '12%' }} />
      <col style={{ width: hidePassedDecisions ? '14%' : '13%' }} />
      {!hidePassedDecisions && <col style={{ width: '15%' }} />}
    </colgroup>
    <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80">
      <tr className="text-left">
        <th className="py-3 pl-4 pr-2">
          {selectAll ?? <Link2 className="h-4 w-4 text-slate-400" aria-hidden />}
        </th>
        <th className="py-3 pr-2 text-xs font-semibold uppercase tracking-wide text-slate-600 align-bottom whitespace-nowrap dark:text-slate-400">
          Method type
        </th>
        <SortHeader column="name" label="Name" activeSort={sort} activeDirection={direction} onSort={onSort} thClassName="pr-4" />
        <SortHeader column="status" label={<span className="whitespace-nowrap">Status</span>} activeSort={sort} activeDirection={direction} onSort={onSort} thClassName="px-2 whitespace-nowrap" />
        <SortHeader column="start_time" label={<span className="whitespace-nowrap">Start time</span>} activeSort={sort} activeDirection={direction} onSort={onSort} thClassName="px-2 whitespace-nowrap" />
        {!hidePassedDecisions && (
          <th className="py-3 px-2 text-xs font-semibold uppercase tracking-wide text-slate-600 align-bottom dark:text-slate-400">
            Defect type
          </th>
        )}
      </tr>
    </thead>
  </>
);

interface OverviewTestsGroupTableProps {
  group: OverviewTestsGroup;
  hidePassedDecisions: boolean;
  sort: OverviewTestsSortColumn;
  direction: 'asc' | 'desc';
  onSort: (col: OverviewTestsSortColumn, dir: 'asc' | 'desc') => void;
  canEditDefects: boolean;
  selectedTestIds: Set<number>;
  onToggleItem: (id: number) => void;
  onSetGroupSelection: (ids: number[], selected: boolean) => void;
  resolveDefectSlug: (row: OverviewTestApiRow) => string | null;
  defectTypeBySlug: Map<string, OverviewDefectType>;
  onOpenDefectModal: (row: OverviewTestApiRow) => void;
  testLogPath: (row: OverviewTestApiRow) => string;
}

const OverviewTestsGroupTable: React.FC<OverviewTestsGroupTableProps> = ({
  group,
  hidePassedDecisions,
  sort,
  direction,
  onSort,
  canEditDefects,
  selectedTestIds,
  onToggleItem,
  onSetGroupSelection,
  resolveDefectSlug,
  defectTypeBySlug,
  onOpenDefectModal,
  testLogPath,
}) => {
  const navigate = useNavigate();
  const [hoveredStartRowKey, setHoveredStartRowKey] = useState<string | null>(null);

  const selectableIds = group.rows
    .filter(row => isFailedRow(row) && row.overviewTestId !== null)
    .map(row => row.overviewTestId as number);
  const allSelected = selectableIds.length > 0 && selectableIds.every(id => selectedTestIds.has(id));
  const someSelected = selectableIds.some(id => selectedTestIds.has(id));
  const showCheckboxes = canEditDefects && !hidePassedDecisions;

  const selectAll = showCheckboxes && selectableIds.length > 0 ? (
    <label
      data-mipqa="tests-select-all-checkbox"
      className="relative inline-flex h-4 w-4 cursor-pointer select-none items-center justify-center"
    >
      <input
        type="checkbox"
        checked={allSelected}
        ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
        onChange={() => onSetGroupSelection(selectableIds, !allSelected)}
        className="sr-only"
      />
      <CheckboxBox checked={allSelected} indeterminate={someSelected} />
    </label>
  ) : undefined;

  return (
    <section data-mipqa="overview-tests-group" className="space-y-3">
      <nav
        className="flex flex-wrap items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400"
        aria-label="Breadcrumb"
        data-mipqa="overview-tests-group-breadcrumb"
      >
        <Folder className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-500" aria-hidden />
        <button
          type="button"
          data-mipqa="overview-tests-breadcrumb-all-button"
          onClick={() => navigate('/overview/launches')}
          className="font-medium text-slate-800 hover:text-cyan-600 dark:text-slate-200 dark:hover:text-cyan-400"
        >
          All
        </button>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
        <button
          type="button"
          data-mipqa="overview-tests-group-link"
          onClick={() => navigate(`/overview/launches/${group.testRunExecutionId}?tab=launches`)}
          className="font-medium text-slate-800 hover:text-cyan-600 dark:text-slate-200 dark:hover:text-cyan-400 [overflow-wrap:anywhere]"
        >
          {group.launchTitle}
        </button>
        {group.suiteName ? (
          <>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            <span className="font-medium text-slate-800 dark:text-slate-200 [overflow-wrap:anywhere]">
              {group.suiteName}
            </span>
          </>
        ) : null}
      </nav>

      <div className="overflow-hidden rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <table data-mipqa="overview-tests-table" className="w-full table-fixed text-sm">
          <OverviewTestsTableHead
            hidePassedDecisions={hidePassedDecisions}
            sort={sort}
            direction={direction}
            onSort={onSort}
            selectAll={selectAll}
          />
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {group.rows.map(row => {
              const rowKey = `${row.testRunExecutionId}-${row.overviewTestId ?? row.name}`;
              const isFailed = isFailedRow(row);
              const canDecide = canEditDefects && isFailed && row.overviewTestId !== null;
              const isSelected = row.overviewTestId !== null && selectedTestIds.has(row.overviewTestId);
              const currentDefectSlug = resolveDefectSlug(row);
              const resolvedDefect = currentDefectSlug != null && currentDefectSlug !== ''
                ? defectTypeBySlug.get(currentDefectSlug) ?? null
                : null;

              return (
                <tr
                  key={rowKey}
                  data-mipqa="overview-tests-row"
                  className={`transition-colors ${
                    isFailed
                      ? 'bg-red-100 dark:bg-red-900/40 hover:bg-red-200/70 dark:hover:bg-red-900/60'
                      : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <td className="py-3 pl-4 pr-2 align-top text-slate-400">
                    {showCheckboxes && canDecide ? (
                      <label
                        data-mipqa={`tests-row-checkbox-${row.overviewTestId}`}
                        className="relative inline-flex h-4 w-4 cursor-pointer select-none items-center justify-center"
                        onClick={e => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggleItem(row.overviewTestId as number)}
                          className="sr-only"
                        />
                        <CheckboxBox checked={isSelected} />
                      </label>
                    ) : (
                      <span className="inline-flex p-1" aria-hidden="true" />
                    )}
                  </td>
                  <td className="py-3 pr-2 align-top text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {row.methodType && row.methodType.trim() !== '' ? row.methodType : 'Test'}
                  </td>
                  <td className="break-words py-3 pr-4 align-top">
                    {row.overviewTestId !== null ? (
                      <Link
                        to={testLogPath(row)}
                        data-mipqa="overview-tests-name-link"
                        className="block text-left font-semibold text-cyan-600 dark:text-cyan-400 hover:underline [overflow-wrap:anywhere]"
                      >
                        {row.name}
                      </Link>
                    ) : (
                      <span className="block font-semibold text-slate-900 dark:text-slate-100 [overflow-wrap:anywhere]">
                        {row.name}
                      </span>
                    )}
                    {row.description ? (
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 whitespace-pre-line [overflow-wrap:anywhere]">{row.description}</p>
                    ) : null}
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-600 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3 shrink-0" />
                        {row.durationLabel}
                      </span>
                    </div>
                    {isFailed && row.errorMessages != null && row.errorMessages.length > 0 ? (
                      <div className="mt-1.5 block w-full text-left" data-mipqa="overview-tests-error-link">
                        <p
                          className="truncate text-xs text-red-700 dark:text-red-300 font-mono cursor-pointer"
                          onClick={(e) => {
                            const target = e.target as HTMLElement;
                            if (target.tagName === 'A') return;
                            if (row.overviewTestId !== null) {
                              navigate(testLogPath(row));
                            }
                          }}
                        >
                          {linkifyLogText(row.errorMessages[0])}
                        </p>
                      </div>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap py-3 px-2 align-top text-slate-700 dark:text-slate-300">
                    <span className="inline-flex items-center gap-1">
                      {row.statusLabel !== '\u2014' ? row.statusLabel.toUpperCase() : '\u2014'}
                      <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
                    </span>
                  </td>
                  <td
                    className="cursor-default whitespace-nowrap py-3 px-2 align-top text-slate-700 dark:text-slate-300"
                    onMouseEnter={() => {
                      if (row.startTimeRelative !== '\u2014' && row.startTimeRelative !== '-') {
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
                            onClick={() => onOpenDefectModal(row)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-slate-600 bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-200 hover:border-slate-400 hover:bg-slate-700 transition-colors"
                          >
                            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: resolvedDefect.color }} />
                            {resolvedDefect.name}
                          </button>
                        ) : (
                          <button
                            type="button"
                            data-mipqa="defect-make-decision-btn"
                            onClick={() => onOpenDefectModal(row)}
                            className="inline-flex items-center gap-1 rounded-md border border-dashed border-slate-600 bg-transparent px-2.5 py-0.5 text-xs font-medium text-slate-400 hover:border-cyan-500 hover:text-cyan-400 transition-colors"
                          >
                            Make Decision
                          </button>
                        )
                      ) : currentDefectSlug === null || currentDefectSlug === '' ? (
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
                      )}
                      {row.defectComment && row.defectComment.trim() !== '' && (
                        <p
                          className="mt-1 max-w-[180px] truncate text-[11px] text-slate-500 dark:text-slate-400"
                          title={row.defectComment}
                          data-mipqa="defect-comment-text"
                        >
                          {row.defectComment}
                        </p>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default OverviewTestsGroupTable;
