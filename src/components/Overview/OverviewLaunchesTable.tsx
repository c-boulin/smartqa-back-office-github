import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  Folder,
  Link2,
  Loader2,
  Menu,
  User,
} from 'lucide-react';
import { endOfDay, format, isEqual, isSameDay, startOfDay } from 'date-fns';
import {
  fetchAllOverviewLaunchesProjectOptions,
  fetchOverviewLaunches,
  fetchOverviewLaunchSuiteItems,
  fetchOverviewSuiteKwLogItems,
  fetchOverviewTestLogItems,
  type OverviewLaunchesMeta,
  type OverviewLaunchApiRow,
  type OverviewLaunchesProjectOption,
  type OverviewLaunchSuiteItemApiRow,
  type OverviewLaunchesExecutionFilter,
  type OverviewLaunchesSortColumn,
  type OverviewTestLogItemsResponse,
} from '../../services/overviewWidgetsApi';
import { OverviewLaunchStartTimeRangePicker } from './OverviewLaunchStartTimeRangePicker';
import OverviewTestLogView from './OverviewTestLogView';

/**
 * Suite list row opens either test log or suite-keyword log (ReportPortal: every name is a link).
 */
export type OverviewSuiteListLogTarget =
  | {
      kind: 'test';
      overviewTestId: number;
      displayName: string;
      methodType: string;
      statusLabel: string;
      startTimeRelative: string;
      startTimeDisplay: string;
      startTimeRaw: string | null;
      durationLabel: string;
      suiteSourceRelative: string | null;
      overviewTestLine: number | null;
    }
  | {
      kind: 'suite_kw';
      overviewSuiteKwId: number;
      displayName: string;
      methodType: string;
      statusLabel: string;
      startTimeRelative: string;
      startTimeDisplay: string;
      startTimeRaw: string | null;
      durationLabel: string;
      suiteSourceRelative: string | null;
      overviewTestLine: number | null;
    };

/**
 * Maps the API launch row into table row props.
 */
function mapApiRowToRow(api: OverviewLaunchApiRow): OverviewLaunchRow {
  const byLabel = api.runnedByLabel ?? api.ownerLabel;
  return {
    id: String(api.testRunExecutionId),
    title: api.displayName,
    rootOverviewSuiteName: api.rootOverviewSuiteName,
    durationLabel: api.durationLabel,
    launchedBy: byLabel,
    runnedByLabel: byLabel,
    attributeText: api.attributeLine,
    startTimeRelative: api.startTimeRelative,
    startTimeDisplay: api.startTimeDisplay,
    startTimeRaw: api.startTimeRaw,
    total: api.total,
    passed: api.passed,
    failed: api.failed,
    skipped: api.skipped,
    productBug: api.productBug,
    autoBug: api.autoBug,
    systemIssue: api.systemIssue,
    toInvestigate: api.toInvestigate,
  };
}

/**
 * Finds a suite list row from URL deep-link params (`overviewTest` id or Robot test `testName`).
 */
function pickSuiteItemForDeepLink(
  items: OverviewLaunchSuiteItemApiRow[],
  overviewTestId: number | null,
  testName: string | null,
): OverviewLaunchSuiteItemApiRow | null {
  if (overviewTestId !== null) {
    const byTest = items.find(i => i.overviewTestId === overviewTestId);
    if (byTest !== undefined) {
      return byTest;
    }
  }
  if (testName !== null && testName.trim() !== '') {
    const decoded = testName.trim();
    const preferTest = items.filter(i => i.name === decoded && i.methodType === 'Test');
    if (preferTest.length > 0) {
      return preferTest[0];
    }
    return items.find(i => i.name === decoded) ?? null;
  }

  return null;
}

/**
 * Maps a suite list API row to the log target used by {@link OverviewTestLogView}.
 */
function suiteItemToLogTarget(item: OverviewLaunchSuiteItemApiRow): OverviewSuiteListLogTarget | null {
  if (item.overviewTestId !== null) {
    return {
      kind: 'test',
      overviewTestId: item.overviewTestId,
      displayName: item.name,
      methodType: item.methodType,
      statusLabel: item.statusLabel,
      startTimeRelative: item.startTimeRelative,
      startTimeDisplay: item.startTimeDisplay,
      startTimeRaw: item.startTimeRaw,
      durationLabel: item.durationLabel,
      suiteSourceRelative: item.suiteSourceRelative ?? null,
      overviewTestLine: item.overviewTestLine ?? null,
    };
  }
  if (item.overviewSuiteKwId !== null) {
    return {
      kind: 'suite_kw',
      overviewSuiteKwId: item.overviewSuiteKwId,
      displayName: item.name,
      methodType: item.methodType,
      statusLabel: item.statusLabel,
      startTimeRelative: item.startTimeRelative,
      startTimeDisplay: item.startTimeDisplay,
      startTimeRaw: item.startTimeRaw,
      durationLabel: item.durationLabel,
      suiteSourceRelative: item.suiteSourceRelative ?? null,
      overviewTestLine: item.overviewTestLine ?? null,
    };
  }

  return null;
}

/**
 * Table shape for the Launches tab (populated from the API).
 */
export interface OverviewLaunchRow {
  id: string;
  title: string;
  rootOverviewSuiteName: string | null;
  durationLabel: string;
  launchedBy: string;
  /** Display for Runned By column (from `runnedByLabel` / owner). */
  runnedByLabel: string;
  attributeText: string;
  description?: string;
  testCasesLine?: string;
  startTimeRelative: string;
  startTimeDisplay: string;
  startTimeRaw: string | null;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  productBug?: number;
  autoBug?: number;
  systemIssue?: number;
  toInvestigate?: number;
  /** Drill-down row: root suite name as title, duration only under name. */
  suiteDrillDown?: boolean;
}

/**
 * Single table row for suite-level view: same metrics as the parent launch, name from `overview_suites.name`.
 */
function buildDrillDownSuiteRow(parent: OverviewLaunchRow): OverviewLaunchRow {
  const suiteTitle =
    parent.rootOverviewSuiteName !== null && parent.rootOverviewSuiteName.trim() !== ''
      ? parent.rootOverviewSuiteName.trim()
      : '\u2014';

  return {
    ...parent,
    id: `${parent.id}-suite-detail`,
    title: suiteTitle,
    launchedBy: '',
    runnedByLabel: '',
    attributeText: '',
    description: undefined,
    testCasesLine: undefined,
    suiteDrillDown: true,
  };
}

/**
 * Original `overview_statuses.start` for hover (raw DB string, else formatted absolute).
 */
function startTimeHoverLabel(row: OverviewLaunchRow): string {
  if (row.startTimeRaw !== null && row.startTimeRaw !== '') {
    return row.startTimeRaw;
  }
  return row.startTimeDisplay;
}

/**
 * Hover title for suite list row start time (raw DB string when present, else formatted).
 */
function suiteItemStartHoverLabel(item: OverviewLaunchSuiteItemApiRow): string {
  if (item.startTimeRaw !== null && item.startTimeRaw !== '') {
    return item.startTimeRaw;
  }
  return item.startTimeDisplay;
}

/**
 * Pass rate percentage string for the launch summary strip (two decimal places).
 */
function passRatePercentFromLaunch(row: OverviewLaunchRow): string {
  if (row.total <= 0) {
    return '0.00';
  }
  return ((100 * row.passed) / row.total).toFixed(2);
}

/**
 * Renders a count cell; leaves the cell visually empty for zero or missing values.
 */
function renderCountCell(value: number | undefined): React.ReactNode {
  if (value === undefined || value === 0) {
    return <span className="text-slate-400 dark:text-slate-600">{'\u2014'}</span>;
  }
  return value;
}

const PER_PAGE_OPTIONS = [15, 25, 50, 100] as const;

type StartTimePreset = 'any' | 'today' | '2d' | '7d' | '30d' | 'custom';

/**
 * Same calendar day with both bounds at 00:00 (typical when picking one day twice in the range UI)
 * is treated as "whole day": the API end becomes last moment of that day.
 */
function customRangeEndForApi(start: Date, end: Date): Date {
  if (!isSameDay(start, end)) {
    return end;
  }
  if (!isEqual(startOfDay(end), end)) {
    return end;
  }

  return endOfDay(end);
}

/**
 * Formats a local calendar date as Y-m-d for overview launch API filters.
 */
function formatLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${y}-${m}-${day}`;
}

/**
 * Returns today at local midnight (date-only semantics for presets).
 */
function localToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);

  return d;
}

/**
 * Adds calendar days to a date (local).
 */
function addCalendarDays(d: Date, delta: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + delta);

  return x;
}

/**
 * Maps start-time preset (and optional custom range) to API `start_from` / `start_to`.
 * Presets use date-only `Y-m-d` (full calendar days). Custom sends `Y-m-d HH:mm:ss` for exact bounds.
 */
function resolveStartTimeRange(
  preset: StartTimePreset,
  customFrom: string,
  customTo: string,
): { startFrom: string | null; startTo: string | null } {
  const t = localToday();
  if (preset === 'any') {
    return { startFrom: null, startTo: null };
  }
  if (preset === 'custom') {
    const a = customFrom.trim();
    const b = customTo.trim();
    if (a === '' && b === '') {
      return { startFrom: null, startTo: null };
    }

    return { startFrom: a !== '' ? a : null, startTo: b !== '' ? b : null };
  }
  if (preset === 'today') {
    const y = formatLocalYmd(t);

    return { startFrom: y, startTo: y };
  }
  if (preset === '2d') {
    return { startFrom: formatLocalYmd(addCalendarDays(t, -1)), startTo: formatLocalYmd(t) };
  }
  if (preset === '7d') {
    return { startFrom: formatLocalYmd(addCalendarDays(t, -6)), startTo: formatLocalYmd(t) };
  }

  return { startFrom: formatLocalYmd(addCalendarDays(t, -29)), startTo: formatLocalYmd(t) };
}

/**
 * Page numbers for « 1 … 4 5 6 … 20 » style control (window of up to 10 around current).
 */
function buildPageList(current: number, last: number): Array<number | 'ellipsis'> {
  if (last <= 1) {
    return [1];
  }
  if (last <= 10) {
    return Array.from({ length: last }, (_, i) => i + 1);
  }
  const windowStart = Math.max(1, Math.min(current - 4, last - 9));
  const windowEnd = Math.min(last, windowStart + 9);
  const out: Array<number | 'ellipsis'> = [];
  if (windowStart > 1) {
    out.push(1);
    if (windowStart > 2) {
      out.push('ellipsis');
    }
  }
  for (let i = windowStart; i <= windowEnd; i++) {
    out.push(i);
  }
  if (windowEnd < last) {
    if (windowEnd < last - 1) {
      out.push('ellipsis');
    }
    out.push(last);
  }
  return out;
}

interface IconNavButtonProps {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

/**
 * Compact chevron control for first/prev/next/last page.
 */
function IconNavButton({ label, disabled, onClick, children }: IconNavButtonProps): React.ReactElement {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={
        disabled
          ? 'cursor-not-allowed rounded p-1.5 text-slate-300 dark:text-slate-600'
          : 'rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white'
      }
    >
      {children}
    </button>
  );
}

interface LaunchSortableThProps {
  column: OverviewLaunchesSortColumn;
  label: React.ReactNode;
  activeColumn: OverviewLaunchesSortColumn;
  direction: 'asc' | 'desc';
  onSort: (c: OverviewLaunchesSortColumn) => void;
  align?: 'left' | 'right';
  thClassName?: string;
}

/**
 * Clickable header for the main launches table; toggles server-side sort via query params.
 */
function LaunchSortableTh({
  column,
  label,
  activeColumn,
  direction,
  onSort,
  align = 'left',
  thClassName = '',
}: LaunchSortableThProps): React.ReactElement {
  const active = activeColumn === column;
  const SortIcon = active && direction === 'asc' ? ArrowUp : ArrowDown;

  return (
    <th
      scope="col"
      className={`py-3 font-medium align-bottom ${thClassName}`}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={`group inline-flex max-w-full items-center gap-1 select-none text-xs font-semibold uppercase tracking-wide hover:text-cyan-600 dark:hover:text-cyan-400 ${
          align === 'right' ? 'ml-auto w-full justify-end text-right' : 'text-left'
        } ${active ? 'text-teal-600 dark:text-teal-400' : 'text-slate-600 dark:text-slate-400'}`}
        aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        <span className={`min-w-0 ${active ? 'font-semibold' : ''}`}>{label}</span>
        <SortIcon
          className={`h-3.5 w-3.5 shrink-0 ${active ? 'opacity-90' : 'opacity-40 group-hover:opacity-70'}`}
          aria-hidden
        />
      </button>
    </th>
  );
}

/** Sortable columns for the suite List view (client-side; full list from API). */
type SuiteListSortColumn = 'method_type' | 'name' | 'status' | 'start_time';

/**
 * Parses start time to epoch ms; missing/invalid values become +Infinity for nulls-last handling.
 */
function suiteListItemStartEpochMs(item: OverviewLaunchSuiteItemApiRow): number {
  if (item.startTimeRaw !== null && item.startTimeRaw.trim() !== '') {
    const raw = item.startTimeRaw.trim();
    const isoish = raw.includes('T') ? raw : raw.replace(' ', 'T');
    const t = Date.parse(isoish);
    if (!Number.isNaN(t)) {
      return t;
    }
  }
  const t2 = Date.parse(item.startTimeDisplay);
  if (!Number.isNaN(t2)) {
    return t2;
  }
  return Number.POSITIVE_INFINITY;
}

/**
 * Stable identity for tie-breaking after the primary sort key.
 */
function suiteListItemTieTuple(item: OverviewLaunchSuiteItemApiRow): [number, number] {
  if (item.overviewTestId !== null) {
    return [0, item.overviewTestId];
  }
  if (item.overviewSuiteKwId !== null) {
    return [1, item.overviewSuiteKwId];
  }
  return [2, 0];
}

/**
 * Stable row id for suite list selection keys and React keys.
 */
function suiteListItemRowKey(item: OverviewLaunchSuiteItemApiRow): string {
  if (item.overviewTestId !== null) {
    return `suite-test-${item.overviewTestId}`;
  }
  if (item.overviewSuiteKwId !== null) {
    return `suite-kw-${item.overviewSuiteKwId}`;
  }
  return `suite-${item.methodType}-${item.name}`;
}

/**
 * Orders suite list rows by the active column (defect type is not a sort key).
 */
function sortSuiteListItems(
  items: OverviewLaunchSuiteItemApiRow[],
  column: SuiteListSortColumn,
  direction: 'asc' | 'desc',
): OverviewLaunchSuiteItemApiRow[] {
  const mul = direction === 'asc' ? 1 : -1;
  const out = [...items];
  out.sort((a, b) => {
    let primary = 0;
    switch (column) {
      case 'method_type':
        primary = mul * a.methodType.localeCompare(b.methodType, undefined, { sensitivity: 'base' });
        break;
      case 'name':
        primary = mul * a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        break;
      case 'status':
        primary = mul * a.statusLabel.localeCompare(b.statusLabel, undefined, { sensitivity: 'base' });
        break;
      case 'start_time': {
        const aMiss = suiteListItemStartEpochMs(a) === Number.POSITIVE_INFINITY;
        const bMiss = suiteListItemStartEpochMs(b) === Number.POSITIVE_INFINITY;
        if (aMiss && bMiss) {
          primary = 0;
        } else if (aMiss) {
          primary = 1;
        } else if (bMiss) {
          primary = -1;
        } else {
          const ta = suiteListItemStartEpochMs(a);
          const tb = suiteListItemStartEpochMs(b);
          primary = mul * (ta === tb ? 0 : ta < tb ? -1 : 1);
        }
        break;
      }
      default:
        primary = 0;
    }
    if (primary !== 0) {
      return primary;
    }
    const [ka, va] = suiteListItemTieTuple(a);
    const [kb, vb] = suiteListItemTieTuple(b);
    if (ka !== kb) {
      return ka - kb;
    }
    if (va !== vb) {
      return va - vb;
    }
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });

  return out;
}

interface SuiteListSortableThProps {
  column: SuiteListSortColumn;
  label: React.ReactNode;
  activeColumn: SuiteListSortColumn;
  direction: 'asc' | 'desc';
  onSort: (c: SuiteListSortColumn) => void;
  align?: 'left' | 'right';
  thClassName?: string;
}

/**
 * Clickable suite List view header; toggles client-side sort for that column.
 */
function SuiteListSortableTh({
  column,
  label,
  activeColumn,
  direction,
  onSort,
  align = 'left',
  thClassName = '',
}: SuiteListSortableThProps): React.ReactElement {
  const active = activeColumn === column;
  const SortIcon = active && direction === 'asc' ? ArrowUp : ArrowDown;

  return (
    <th
      scope="col"
      className={`py-3 font-medium align-bottom ${thClassName}`}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={`group inline-flex max-w-full items-center gap-1 select-none text-xs font-semibold uppercase tracking-wide hover:text-cyan-600 dark:hover:text-cyan-400 ${
          align === 'right' ? 'ml-auto w-full justify-end text-right' : 'text-left'
        } ${active ? 'text-teal-600 dark:text-teal-400' : 'text-slate-600 dark:text-slate-400'}`}
        aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        <span className={`min-w-0 ${active ? 'font-semibold' : ''}`}>{label}</span>
        <SortIcon
          className={`h-3.5 w-3.5 shrink-0 ${active ? 'opacity-90' : 'opacity-40 group-hover:opacity-70'}`}
          aria-hidden
        />
      </button>
    </th>
  );
}

const OverviewLaunchesTable: React.FC = () => {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [launchSort, setLaunchSort] = useState<{
    column: OverviewLaunchesSortColumn;
    direction: 'asc' | 'desc';
  }>({ column: 'tre_id', direction: 'desc' });
  const [rows, setRows] = useState<OverviewLaunchRow[]>([]);
  const [meta, setMeta] = useState<OverviewLaunchesMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredStartRowId, setHoveredStartRowId] = useState<string | null>(null);
  const [hoveredSuiteItemRowKey, setHoveredSuiteItemRowKey] = useState<string | null>(null);
  const [drillLaunch, setDrillLaunch] = useState<OverviewLaunchRow | null>(null);
  const [suiteListItems, setSuiteListItems] = useState<OverviewLaunchSuiteItemApiRow[] | null>(null);
  const [suiteItemsLoading, setSuiteItemsLoading] = useState(false);
  const [suiteItemsError, setSuiteItemsError] = useState<string | null>(null);
  const [suiteSort, setSuiteSort] = useState<{
    column: SuiteListSortColumn;
    direction: 'asc' | 'desc';
  }>({ column: 'start_time', direction: 'asc' });
  const [testLogTarget, setTestLogTarget] = useState<OverviewSuiteListLogTarget | null>(null);
  const [testLogPayload, setTestLogPayload] = useState<OverviewTestLogItemsResponse | null>(null);
  const [testLogLoading, setTestLogLoading] = useState(false);
  const [testLogError, setTestLogError] = useState<string | null>(null);
  const [hoveredLogTimeRowKey, setHoveredLogTimeRowKey] = useState<string | null>(null);
  const [selectedLaunchRowIds, setSelectedLaunchRowIds] = useState<Set<string>>(() => new Set());
  const [selectedSuiteRowKeys, setSelectedSuiteRowKeys] = useState<Set<string>>(() => new Set());
  const launchSelectAllCheckboxRef = useRef<HTMLInputElement>(null);
  const suiteSelectAllCheckboxRef = useRef<HTMLInputElement>(null);
  /** Skips resetting suite/log state when applying URL deep-link state in the same commit. */
  const applyingDeepLinkFromUrlRef = useRef(false);

  const [searchParams, setSearchParams] = useSearchParams();

  const [projectOptions, setProjectOptions] = useState<OverviewLaunchesProjectOption[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [selectedProjectIds, setSelectedProjectIds] = useState<number[]>([]);
  const [projectsDropdownOpen, setProjectsDropdownOpen] = useState(false);
  const projectsFilterDropdownRef = useRef<HTMLDivElement>(null);
  const [startTimePreset, setStartTimePreset] = useState<StartTimePreset>('any');
  const [customRangeStart, setCustomRangeStart] = useState<Date | null>(null);
  const [customRangeEnd, setCustomRangeEnd] = useState<Date | null>(null);
  const [executionFilter, setExecutionFilter] = useState<OverviewLaunchesExecutionFilter>('all');
  const prevStartTimePresetRef = useRef<StartTimePreset>(startTimePreset);

  const customFromApi = useMemo(() => {
    if (startTimePreset !== 'custom' || customRangeStart === null || customRangeEnd === null) {
      return '';
    }

    return format(customRangeStart, 'yyyy-MM-dd HH:mm:ss');
  }, [startTimePreset, customRangeStart, customRangeEnd]);

  const customToApi = useMemo(() => {
    if (startTimePreset !== 'custom' || customRangeStart === null || customRangeEnd === null) {
      return '';
    }

    return format(customRangeEndForApi(customRangeStart, customRangeEnd), 'yyyy-MM-dd HH:mm:ss');
  }, [startTimePreset, customRangeStart, customRangeEnd]);

  const { startFrom: resolvedStartFrom, startTo: resolvedStartTo } = useMemo(
    () => resolveStartTimeRange(startTimePreset, customFromApi, customToApi),
    [startTimePreset, customFromApi, customToApi],
  );

  /**
   * Entering Custom range clears previous bounds so the list is not filtered until start and end are chosen.
   */
  useEffect(() => {
    const prev = prevStartTimePresetRef.current;
    if (startTimePreset === 'custom' && prev !== 'custom') {
      setCustomRangeStart(null);
      setCustomRangeEnd(null);
    }
    prevStartTimePresetRef.current = startTimePreset;
  }, [startTimePreset]);

  const projectIdsFilterKey = useMemo(
    () =>
      selectedProjectIds
        .slice()
        .sort((a, b) => a - b)
        .join(','),
    [selectedProjectIds],
  );

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setProjectsLoading(true);
      try {
        const opts = await fetchAllOverviewLaunchesProjectOptions();
        if (!cancelled) {
          setProjectOptions(opts);
        }
      } catch {
        if (!cancelled) {
          setProjectOptions([]);
        }
      } finally {
        if (!cancelled) {
          setProjectsLoading(false);
        }
      }
    };
    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [projectIdsFilterKey, startTimePreset, customFromApi, customToApi, executionFilter]);

  /**
   * Closes the Projects dropdown on outside click or Escape (unlike native details).
   */
  useEffect(() => {
    if (!projectsDropdownOpen) {
      return;
    }
    const closeOnOutsidePointer = (e: PointerEvent) => {
      const root = projectsFilterDropdownRef.current;
      if (root === null || root.contains(e.target as Node)) {
        return;
      }
      setProjectsDropdownOpen(false);
    };
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setProjectsDropdownOpen(false);
      }
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer, true);
    document.addEventListener('keydown', closeOnEscape, true);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer, true);
      document.removeEventListener('keydown', closeOnEscape, true);
    };
  }, [projectsDropdownOpen]);

  /**
   * Toggles a project id in the multi-select filter list.
   */
  const toggleProjectFilter = useCallback((projectId: number) => {
    setSelectedProjectIds(prev =>
      prev.includes(projectId) ? prev.filter(id => id !== projectId) : [...prev, projectId].sort((a, b) => a - b),
    );
  }, []);

  const load = useCallback(
    async (p: number, size: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchOverviewLaunches({
          page: p,
          perPage: size,
          sort: launchSort.column,
          direction: launchSort.direction,
          projectIds: selectedProjectIds.length > 0 ? selectedProjectIds : undefined,
          startFrom: resolvedStartFrom ?? undefined,
          startTo: resolvedStartTo ?? undefined,
          executionFilter: executionFilter === 'all' ? undefined : executionFilter,
        });
        setRows(res.launches.map(mapApiRowToRow));
        setMeta(res.meta);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load launches.');
        setRows([]);
        setMeta(null);
      } finally {
        setLoading(false);
      }
    },
    [
      launchSort.column,
      launchSort.direction,
      selectedProjectIds,
      resolvedStartFrom,
      resolvedStartTo,
      executionFilter,
    ],
  );

  /**
   * Cycles sort direction for the active column or sets a new column (name defaults to A→Z).
   */
  const toggleLaunchSort = useCallback((column: OverviewLaunchesSortColumn) => {
    setPage(1);
    setLaunchSort(prev => {
      if (prev.column === column) {
        return { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { column, direction: column === 'name' ? 'asc' : 'desc' };
    });
  }, []);

  /**
   * Reloads suite list rows for the current drill-down launch (breadcrumb return / open list).
   */
  const loadSuiteItems = useCallback(async () => {
    if (drillLaunch === null) {
      return;
    }
    setSuiteItemsLoading(true);
    setSuiteItemsError(null);
    try {
      const res = await fetchOverviewLaunchSuiteItems(Number(drillLaunch.id));
      setSuiteListItems(res.items);
    } catch (e) {
      setSuiteItemsError(e instanceof Error ? e.message : 'Could not load suite items.');
      setSuiteListItems(null);
    } finally {
      setSuiteItemsLoading(false);
    }
  }, [drillLaunch]);

  /**
   * Re-syncs launch list state and the drilled row (when still on that launch) from the API.
   */
  const refreshDrillLaunchRow = useCallback(async (launchId: string) => {
    try {
      const res = await fetchOverviewLaunches({
        page,
        perPage,
        sort: launchSort.column,
        direction: launchSort.direction,
        projectIds: selectedProjectIds.length > 0 ? selectedProjectIds : undefined,
        startFrom: resolvedStartFrom ?? undefined,
        startTo: resolvedStartTo ?? undefined,
        executionFilter: executionFilter === 'all' ? undefined : executionFilter,
      });
      setRows(res.launches.map(mapApiRowToRow));
      setMeta(res.meta);
      const found = res.launches.find(l => String(l.testRunExecutionId) === launchId);
      if (found !== undefined) {
        setDrillLaunch(prev =>
          prev !== null && prev.id === launchId ? mapApiRowToRow(found) : prev,
        );
      }
    } catch {
      /* keep existing drill row on failure */
    }
  }, [
    page,
    perPage,
    launchSort.column,
    launchSort.direction,
    selectedProjectIds,
    resolvedStartFrom,
    resolvedStartTo,
    executionFilter,
  ]);

  useEffect(() => {
    void load(page, perPage);
  }, [load, page, perPage]);

  useEffect(() => {
    setDrillLaunch(null);
    setSuiteListItems(null);
    setSuiteItemsError(null);
    setTestLogTarget(null);
    setTestLogPayload(null);
    setTestLogError(null);
  }, [page, perPage]);

  useEffect(() => {
    setHoveredStartRowId(null);
  }, [rows]);

  useEffect(() => {
    setSelectedLaunchRowIds(new Set());
  }, [page, perPage, drillLaunch?.id]);

  useEffect(() => {
    setSelectedSuiteRowKeys(new Set());
  }, [suiteListItems]);

  useEffect(() => {
    if (applyingDeepLinkFromUrlRef.current) {
      applyingDeepLinkFromUrlRef.current = false;

      return;
    }
    setSuiteListItems(null);
    setSuiteItemsError(null);
    setSuiteSort({ column: 'start_time', direction: 'asc' });
    setTestLogTarget(null);
    setTestLogPayload(null);
    setTestLogError(null);
  }, [drillLaunch?.id]);

  const stripOverviewDeepLinkParams = useCallback(() => {
    setSearchParams(
      prev => {
        const next = new URLSearchParams(prev);
        next.delete('tre');
        next.delete('overviewTest');
        next.delete('testName');

        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  /**
   * Opens the test log view when the URL contains `tre` (and `overviewTest` and/or `testName` from the test run page).
   */
  useEffect(() => {
    const treRaw = searchParams.get('tre');
    if (treRaw === null || treRaw === '') {
      return;
    }
    const tre = Number(treRaw);
    if (Number.isNaN(tre) || tre <= 0) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const overviewTestRaw = searchParams.get('overviewTest');
      const testNameRaw = searchParams.get('testName');
      const parsedOt = overviewTestRaw !== null && overviewTestRaw !== '' ? Number(overviewTestRaw) : NaN;
      const overviewTestId = !Number.isNaN(parsedOt) && parsedOt > 0 ? parsedOt : null;

      try {
        const launchRes = await fetchOverviewLaunches({ testRunExecutionId: tre, perPage: 1 });
        if (cancelled) {
          return;
        }
        const mappedRows = launchRes.launches.map(mapApiRowToRow);
        if (mappedRows.length === 0) {
          toast.error('Could not open overview log: launch not found.');
          stripOverviewDeepLinkParams();

          return;
        }

        const suiteRes = await fetchOverviewLaunchSuiteItems(tre);
        if (cancelled) {
          return;
        }

        const picked = pickSuiteItemForDeepLink(suiteRes.items, overviewTestId, testNameRaw);
        if (picked === null) {
          toast.error('Could not open overview log: test not found in suite list.');
          applyingDeepLinkFromUrlRef.current = true;
          setDrillLaunch(mappedRows[0]);
          stripOverviewDeepLinkParams();

          return;
        }

        const logTarget = suiteItemToLogTarget(picked);
        if (logTarget === null) {
          toast.error('Could not open overview log: row has no log data.');
          applyingDeepLinkFromUrlRef.current = true;
          setDrillLaunch(mappedRows[0]);
          stripOverviewDeepLinkParams();

          return;
        }

        applyingDeepLinkFromUrlRef.current = true;
        setDrillLaunch(mappedRows[0]);
        setSuiteListItems(suiteRes.items);
        setSuiteItemsError(null);
        setTestLogTarget(logTarget);
        stripOverviewDeepLinkParams();
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : 'Could not open overview log.');
          stripOverviewDeepLinkParams();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, stripOverviewDeepLinkParams]);

  const inTestLogView = testLogTarget !== null;

  const loadTestLog = useCallback(async () => {
    if (drillLaunch === null || testLogTarget === null) {
      return;
    }
    setTestLogLoading(true);
    setTestLogError(null);
    try {
      const execId = Number(drillLaunch.id);
      const res =
        testLogTarget.kind === 'test'
          ? await fetchOverviewTestLogItems(execId, testLogTarget.overviewTestId)
          : await fetchOverviewSuiteKwLogItems(execId, testLogTarget.overviewSuiteKwId);
      setTestLogPayload(res);
    } catch (e) {
      setTestLogError(e instanceof Error ? e.message : 'Could not load log.');
      setTestLogPayload(null);
    } finally {
      setTestLogLoading(false);
    }
  }, [drillLaunch, testLogTarget]);

  useEffect(() => {
    void loadTestLog();
  }, [loadTestLog]);

  /**
   * Returns from test log to the suite list (third level).
   */
  const clearTestLogOnly = useCallback(() => {
    setTestLogTarget(null);
    setTestLogPayload(null);
    setTestLogError(null);
    setHoveredLogTimeRowKey(null);
    void loadSuiteItems();
  }, [loadSuiteItems]);

  /**
   * Returns from test log to the single root-suite row (second level).
   */
  const exitTestLogToLaunchLevel = useCallback(() => {
    if (drillLaunch === null) {
      return;
    }
    const launchId = drillLaunch.id;
    setTestLogTarget(null);
    setTestLogPayload(null);
    setTestLogError(null);
    setHoveredLogTimeRowKey(null);
    setSuiteListItems(null);
    setSuiteItemsError(null);
    void refreshDrillLaunchRow(launchId);
  }, [drillLaunch, refreshDrillLaunchRow]);

  const displayRows = useMemo(
    () => (drillLaunch !== null ? [buildDrillDownSuiteRow(drillLaunch)] : rows),
    [drillLaunch, rows],
  );

  const launchRowIdsOnPage = useMemo(() => displayRows.map(r => r.id), [displayRows]);

  const allLaunchRowsSelected =
    launchRowIdsOnPage.length > 0 && launchRowIdsOnPage.every(id => selectedLaunchRowIds.has(id));
  const someLaunchRowsSelected =
    launchRowIdsOnPage.length > 0 && launchRowIdsOnPage.some(id => selectedLaunchRowIds.has(id));

  useEffect(() => {
    const el = launchSelectAllCheckboxRef.current;
    if (el !== null) {
      el.indeterminate = someLaunchRowsSelected && !allLaunchRowsSelected;
    }
  }, [someLaunchRowsSelected, allLaunchRowsSelected]);

  const toggleSelectAllLaunchRows = useCallback(() => {
    setSelectedLaunchRowIds(prev => {
      const allSelected =
        launchRowIdsOnPage.length > 0 && launchRowIdsOnPage.every(id => prev.has(id));
      const next = new Set(prev);
      if (allSelected) {
        for (const id of launchRowIdsOnPage) {
          next.delete(id);
        }
      } else {
        for (const id of launchRowIdsOnPage) {
          next.add(id);
        }
      }
      return next;
    });
  }, [launchRowIdsOnPage]);

  const inSuiteListView = suiteListItems !== null;

  /**
   * Suite list rows in user-selected column order (all columns sort except defect type).
   */
  const filteredSuiteItems = useMemo(() => {
    if (suiteListItems === null) {
      return [];
    }
    return sortSuiteListItems(suiteListItems, suiteSort.column, suiteSort.direction);
  }, [suiteListItems, suiteSort.column, suiteSort.direction]);

  const suiteRowKeysOnPage = useMemo(
    () => filteredSuiteItems.map(suiteListItemRowKey),
    [filteredSuiteItems],
  );

  const allSuiteRowsSelected =
    suiteRowKeysOnPage.length > 0 && suiteRowKeysOnPage.every(k => selectedSuiteRowKeys.has(k));
  const someSuiteRowsSelected =
    suiteRowKeysOnPage.length > 0 && suiteRowKeysOnPage.some(k => selectedSuiteRowKeys.has(k));

  useEffect(() => {
    const el = suiteSelectAllCheckboxRef.current;
    if (el !== null) {
      el.indeterminate = someSuiteRowsSelected && !allSuiteRowsSelected;
    }
  }, [someSuiteRowsSelected, allSuiteRowsSelected]);

  const toggleSelectAllSuiteRows = useCallback(() => {
    setSelectedSuiteRowKeys(prev => {
      const allSelected =
        suiteRowKeysOnPage.length > 0 && suiteRowKeysOnPage.every(k => prev.has(k));
      const next = new Set(prev);
      if (allSelected) {
        for (const k of suiteRowKeysOnPage) {
          next.delete(k);
        }
      } else {
        for (const k of suiteRowKeysOnPage) {
          next.add(k);
        }
      }
      return next;
    });
  }, [suiteRowKeysOnPage]);

  /**
   * Toggles suite List view sort (client-side); new text columns default A→Z, start time chronological.
   */
  const toggleSuiteSort = useCallback((column: SuiteListSortColumn) => {
    setSuiteSort(prev => {
      if (prev.column === column) {
        return { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { column, direction: 'asc' };
    });
  }, []);

  /**
   * Opens the root-suite list view (tests + suite keywords) for the current drilled launch.
   */
  const openSuiteListView = useCallback(() => {
    void loadSuiteItems();
  }, [loadSuiteItems]);

  const clearToAllLaunches = useCallback(() => {
    setDrillLaunch(null);
    setSuiteListItems(null);
    setSuiteItemsError(null);
    setTestLogTarget(null);
    setTestLogPayload(null);
    setTestLogError(null);
    setHoveredLogTimeRowKey(null);
    void load(page, perPage);
  }, [load, page, perPage]);

  const clearSuiteListOnly = useCallback(() => {
    if (drillLaunch === null) {
      return;
    }
    const launchId = drillLaunch.id;
    setSuiteListItems(null);
    setSuiteItemsError(null);
    void refreshDrillLaunchRow(launchId);
  }, [drillLaunch, refreshDrillLaunchRow]);

  const suiteRowTitle = drillLaunch
    ? buildDrillDownSuiteRow(drillLaunch).title
    : '';

  const hasLaunchFilters =
    selectedProjectIds.length > 0 ||
    startTimePreset !== 'any' ||
    executionFilter !== 'all';

  /** Text shown on the closed Projects dropdown (matches native select-style controls). */
  const projectsDropdownSummary = useMemo(() => {
    if (projectsLoading) {
      return 'Loading…';
    }
    if (projectOptions.length === 0) {
      return 'No projects';
    }
    if (selectedProjectIds.length === 0) {
      return 'All';
    }
    if (selectedProjectIds.length === 1) {
      return projectOptions.find(o => o.id === selectedProjectIds[0])?.name ?? '1 project';
    }
    return `${selectedProjectIds.length} projects`;
  }, [projectsLoading, projectOptions, selectedProjectIds]);

  return (
    <div>
      {error ? (
        <p className="mb-3 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {suiteItemsError ? (
        <p className="mb-3 text-sm text-red-600 dark:text-red-400" role="alert">
          {suiteItemsError}
        </p>
      ) : null}
      {drillLaunch === null ? (
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-900/40">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
            <div className="flex min-w-0 flex-1 flex-wrap items-end gap-x-3 gap-y-3 lg:gap-4">
          <div className="flex w-full min-w-[12rem] max-w-[18rem] flex-col gap-1 sm:w-auto">
            <span
              id="ov-projects-filter-label"
              className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400"
            >
              Projects
            </span>
            <div ref={projectsFilterDropdownRef} className="relative">
              <button
                type="button"
                id="ov-projects-filter-trigger"
                aria-expanded={projectsDropdownOpen}
                aria-haspopup="listbox"
                aria-labelledby="ov-projects-filter-label ov-projects-filter-trigger"
                onClick={() => setProjectsDropdownOpen(o => !o)}
                className="flex w-full min-w-0 items-center justify-between gap-2 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-left text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              >
                <span className="min-w-0 truncate">{projectsDropdownSummary}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${projectsDropdownOpen ? 'rotate-180' : ''}`}
                  aria-hidden
                />
              </button>
              {projectsDropdownOpen ? (
                <div
                  role="listbox"
                  aria-labelledby="ov-projects-filter-label"
                  className="absolute left-0 right-0 z-30 mt-1 max-h-48 space-y-1.5 overflow-y-auto rounded-md border border-slate-300 bg-white p-2 text-sm shadow-lg dark:border-slate-600 dark:bg-slate-800"
                >
                  {projectsLoading ? (
                    <p className="text-slate-500 dark:text-slate-400">Loading projects…</p>
                  ) : projectOptions.length === 0 ? (
                    <p className="text-slate-500 dark:text-slate-400">No projects available.</p>
                  ) : (
                    projectOptions.map(opt => (
                      <label key={opt.id} className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedProjectIds.includes(opt.id)}
                          onChange={() => toggleProjectFilter(opt.id)}
                          className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 dark:border-slate-600"
                        />
                        <span className="text-slate-800 dark:text-slate-200">{opt.name}</span>
                      </label>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          </div>
          <div className="flex w-full min-w-[12rem] max-w-[18rem] flex-col gap-1 sm:w-auto">
            <span
              id="ov-start-preset-label"
              className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400"
            >
              Start time
            </span>
            <select
              id="ov-start-preset"
              aria-labelledby="ov-start-preset-label"
              value={startTimePreset}
              onChange={e => setStartTimePreset(e.target.value as StartTimePreset)}
              className="w-full min-w-0 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="any">Any</option>
              <option value="today">Today</option>
              <option value="2d">Last 2 days</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="custom">Custom range</option>
            </select>
          </div>
          <div className="flex w-full min-w-[10rem] max-w-[14rem] flex-col gap-1 sm:w-auto">
            <label
              htmlFor="ov-execution-filter"
              className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400"
            >
              Run by
            </label>
            <select
              id="ov-execution-filter"
              value={executionFilter}
              onChange={e => setExecutionFilter(e.target.value as OverviewLaunchesExecutionFilter)}
              className="w-full min-w-0 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            >
              <option value="all">All</option>
              <option value="me">Me</option>
              <option value="cron">Cron</option>
            </select>
          </div>
            </div>
          {hasLaunchFilters ? (
            <button
              type="button"
              onClick={() => {
                setSelectedProjectIds([]);
                setStartTimePreset('any');
                setCustomRangeStart(null);
                setCustomRangeEnd(null);
                setExecutionFilter('all');
              }}
              className="shrink-0 self-start text-sm text-slate-600 underline decoration-slate-400 underline-offset-2 hover:text-cyan-600 sm:self-end dark:text-slate-400 dark:hover:text-cyan-400"
            >
              Clear filters
            </button>
          ) : null}
          </div>
          {startTimePreset === 'custom' ? (
            <div className="w-full min-w-0 max-w-xl lg:max-w-lg">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                Custom range
              </span>
              <OverviewLaunchStartTimeRangePicker
                startDate={customRangeStart}
                endDate={customRangeEnd}
                onRangeChange={(s, e) => {
                  setCustomRangeStart(s);
                  setCustomRangeEnd(e);
                }}
              />
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="relative min-h-[10rem]">
        {loading && !inSuiteListView ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 dark:bg-slate-800/60">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-500" aria-hidden />
          </div>
        ) : null}
        {suiteItemsLoading ? (
          <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center bg-white/40 dark:bg-slate-800/40">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-500" aria-hidden />
          </div>
        ) : null}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <nav
          className="flex flex-wrap items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400"
          aria-label="Breadcrumb"
        >
          <Folder className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-500" aria-hidden />
          <button
            type="button"
            onClick={clearToAllLaunches}
            className="font-medium text-slate-800 hover:text-cyan-600 dark:text-slate-200 dark:hover:text-cyan-400"
          >
            All
          </button>
          {drillLaunch !== null ? (
            <>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              {inSuiteListView || inTestLogView ? (
                <button
                  type="button"
                  onClick={() => {
                    if (inTestLogView) {
                      exitTestLogToLaunchLevel();
                    } else {
                      clearSuiteListOnly();
                    }
                  }}
                  className="font-medium text-slate-800 hover:text-cyan-600 dark:text-slate-200 dark:hover:text-cyan-400"
                >
                  {drillLaunch.title}
                </button>
              ) : (
                <span className="font-medium text-slate-800 dark:text-slate-200">{drillLaunch.title}</span>
              )}
            </>
          ) : null}
          {drillLaunch !== null && inSuiteListView ? (
            <>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              {inTestLogView ? (
                <button
                  type="button"
                  onClick={clearTestLogOnly}
                  className="font-medium text-slate-800 hover:text-cyan-600 dark:text-slate-200 dark:hover:text-cyan-400"
                >
                  {suiteRowTitle}
                </button>
              ) : (
                <span className="font-medium text-slate-800 dark:text-slate-200">{suiteRowTitle}</span>
              )}
            </>
          ) : null}
          {inTestLogView && testLogTarget !== null ? (
            <>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {testLogTarget.displayName}
              </span>
            </>
          ) : null}
        </nav>
        {drillLaunch !== null && !inTestLogView ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <span className="font-medium text-teal-600 dark:text-teal-400">
              Passed {passRatePercentFromLaunch(drillLaunch)}%
            </span>
            <span className="text-slate-400">|</span>
            <span>Total: {drillLaunch.total}</span>
          </div>
        ) : null}
      </div>
      {inSuiteListView && !inTestLogView ? (
        <div className="mb-3 border-b border-slate-200 dark:border-slate-700">
          <div className="flex flex-wrap gap-4 text-xs font-semibold uppercase tracking-wide">
            <span className="border-b-2 border-teal-500 pb-1.5 text-teal-600 dark:text-teal-400">
              List view
            </span>
            <span className="cursor-not-allowed pb-1.5 text-slate-400">Unique errors</span>
            <span className="cursor-not-allowed pb-1.5 text-slate-400">Log view</span>
            <span className="cursor-not-allowed pb-1.5 text-slate-400">History</span>
          </div>
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        {inTestLogView && drillLaunch !== null && testLogTarget !== null ? (
          <OverviewTestLogView
            launchTitle={drillLaunch.title}
            testDisplayName={testLogPayload?.testName ?? testLogTarget.displayName}
            items={testLogPayload?.items ?? []}
            testStatusLabel={testLogPayload?.testStatusLabel ?? '—'}
            suiteSourceRelative={
              testLogPayload?.suiteSourceRelative ?? testLogTarget.suiteSourceRelative ?? null
            }
            testLine={
              testLogTarget.kind === 'test'
                ? (testLogPayload?.testLine ?? testLogTarget.overviewTestLine ?? null)
                : (testLogPayload?.testLine ?? null)
            }
            suiteListMethodType={testLogTarget.methodType}
            suiteListStatusLabel={testLogTarget.statusLabel}
            suiteListStartTimeRelative={testLogTarget.startTimeRelative}
            suiteListStartTimeDisplay={testLogTarget.startTimeDisplay}
            suiteListStartTimeRaw={testLogTarget.startTimeRaw}
            suiteListDurationLabel={testLogTarget.durationLabel}
            loading={testLogLoading}
            error={testLogError}
            onRefresh={() => void loadTestLog()}
            hoveredTimeRowKey={hoveredLogTimeRowKey}
            onHoverTimeRow={setHoveredLogTimeRowKey}
          />
        ) : inSuiteListView ? (
          <table className="w-full min-w-[900px] table-fixed text-sm">
            <colgroup>
              <col className="w-10" />
              <col className="w-[11%]" />
              <col style={{ width: '34%' }} />
              <col className="w-[13%]" />
              <col className="w-[14%]" />
              <col className="w-[12%]" />
              <col className="w-10" />
            </colgroup>
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80">
              <tr className="text-left">
                <th className="py-3 pl-4 pr-2">
                  <Link2 className="h-4 w-4 text-slate-400" aria-hidden />
                </th>
                <SuiteListSortableTh
                  column="method_type"
                  label="Method type"
                  activeColumn={suiteSort.column}
                  direction={suiteSort.direction}
                  onSort={toggleSuiteSort}
                  align="left"
                  thClassName="pr-2"
                />
                <SuiteListSortableTh
                  column="name"
                  label="Name"
                  activeColumn={suiteSort.column}
                  direction={suiteSort.direction}
                  onSort={toggleSuiteSort}
                  align="left"
                  thClassName="pr-4"
                />
                <SuiteListSortableTh
                  column="status"
                  label={<span className="whitespace-nowrap">Status</span>}
                  activeColumn={suiteSort.column}
                  direction={suiteSort.direction}
                  onSort={toggleSuiteSort}
                  align="left"
                  thClassName="px-2 whitespace-nowrap"
                />
                <SuiteListSortableTh
                  column="start_time"
                  label={<span className="whitespace-nowrap">Start time</span>}
                  activeColumn={suiteSort.column}
                  direction={suiteSort.direction}
                  onSort={toggleSuiteSort}
                  align="left"
                  thClassName="px-2 whitespace-nowrap"
                />
                <th className="py-3 px-2 text-xs font-semibold uppercase tracking-wide text-slate-600 align-bottom dark:text-slate-400">
                  Defect type
                </th>
                <th className="py-3 pl-2 pr-4 align-top" scope="col">
                  <input
                    ref={suiteSelectAllCheckboxRef}
                    type="checkbox"
                    checked={allSuiteRowsSelected}
                    onChange={toggleSelectAllSuiteRows}
                    disabled={suiteRowKeysOnPage.length === 0}
                    className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 disabled:opacity-40"
                    aria-label="Select all suite list rows on this page"
                  />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {!suiteItemsLoading && filteredSuiteItems.length === 0 && !suiteItemsError ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 dark:text-slate-400">
                    {suiteListItems !== null && suiteListItems.length === 0
                      ? 'No tests or keywords for this suite yet.'
                      : 'No rows match the filter.'}
                  </td>
                </tr>
              ) : null}
              {filteredSuiteItems.map(item => {
                const rowKey = suiteListItemRowKey(item);
                return (
                  <tr
                    key={rowKey}
                    className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                  >
                    <td className="py-3 pl-4 pr-2 align-top text-slate-400">
                      <span className="inline-flex p-1" aria-hidden="true" />
                    </td>
                    <td className="py-3 pr-2 align-top text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {item.methodType}
                    </td>
                    <td className="min-w-0 break-words py-3 pr-4 align-top">
                      {item.overviewTestId !== null ? (
                        <button
                          type="button"
                          onClick={() =>
                            setTestLogTarget({
                              kind: 'test',
                              overviewTestId: item.overviewTestId,
                              displayName: item.name,
                              methodType: item.methodType,
                              statusLabel: item.statusLabel,
                              startTimeRelative: item.startTimeRelative,
                              startTimeDisplay: item.startTimeDisplay,
                              startTimeRaw: item.startTimeRaw,
                              durationLabel: item.durationLabel,
                              suiteSourceRelative: item.suiteSourceRelative ?? null,
                              overviewTestLine: item.overviewTestLine ?? null,
                            })
                          }
                          className="block text-left font-semibold text-cyan-600 dark:text-cyan-400 hover:underline [overflow-wrap:anywhere]"
                        >
                          {item.name}
                        </button>
                      ) : item.overviewSuiteKwId !== null ? (
                        <button
                          type="button"
                          onClick={() =>
                            setTestLogTarget({
                              kind: 'suite_kw',
                              overviewSuiteKwId: item.overviewSuiteKwId,
                              displayName: item.name,
                              methodType: item.methodType,
                              statusLabel: item.statusLabel,
                              startTimeRelative: item.startTimeRelative,
                              startTimeDisplay: item.startTimeDisplay,
                              startTimeRaw: item.startTimeRaw,
                              durationLabel: item.durationLabel,
                              suiteSourceRelative: item.suiteSourceRelative ?? null,
                              overviewTestLine: item.overviewTestLine ?? null,
                            })
                          }
                          className="block text-left font-semibold text-cyan-600 dark:text-cyan-400 hover:underline [overflow-wrap:anywhere]"
                        >
                          {item.name}
                        </button>
                      ) : (
                        <span className="block font-semibold text-slate-900 dark:text-slate-100 [overflow-wrap:anywhere]">
                          {item.name}
                        </span>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-600 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3 shrink-0" />
                          {item.durationLabel}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap py-3 px-2 align-top text-slate-700 dark:text-slate-300">
                      <span className="inline-flex items-center gap-1">
                        {item.statusLabel}
                        <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
                      </span>
                    </td>
                    <td
                      className="cursor-default whitespace-nowrap py-3 px-2 align-top text-slate-700 dark:text-slate-300"
                      onMouseEnter={() => {
                        if (
                          item.startTimeRelative !== '\u2014' &&
                          item.startTimeRelative !== '-'
                        ) {
                          setHoveredSuiteItemRowKey(rowKey);
                        }
                      }}
                      onMouseLeave={() => setHoveredSuiteItemRowKey(null)}
                    >
                      {hoveredSuiteItemRowKey === rowKey
                        ? suiteItemStartHoverLabel(item)
                        : item.startTimeRelative}
                    </td>
                    <td className="py-3 px-2 align-top text-slate-700 dark:text-slate-300">
                      {item.defectType === null ||
                      item.defectType === '' ? (
                        <span className="text-slate-400 dark:text-slate-600">{'\u2014'}</span>
                      ) : (
                        item.defectType
                      )}
                    </td>
                    <td className="py-3 pl-2 pr-4 align-top">
                      <input
                        type="checkbox"
                        checked={selectedSuiteRowKeys.has(rowKey)}
                        onChange={() => {
                          setSelectedSuiteRowKeys(prev => {
                            const next = new Set(prev);
                            if (next.has(rowKey)) {
                              next.delete(rowKey);
                            } else {
                              next.add(rowKey);
                            }
                            return next;
                          });
                        }}
                        className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                        aria-label={`Select ${item.name}`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-[1080px] table-fixed text-sm">
            {/*
              NAME column width (~half of previous 46% share); other columns absorb the rest.
            */}
            <colgroup>
              <col className="w-10" />
              <col style={{ width: '20%' }} />
              <col style={{ width: '9.25rem' }} />
              <col style={{ width: '9rem' }} />
              <col className="w-14" />
              <col className="w-14" />
              <col className="w-14" />
              <col className="w-14" />
              <col className="w-[4.5rem]" />
              <col className="w-[4.5rem]" />
              <col className="w-[4.5rem]" />
              <col className="w-24" />
              <col className="w-10" />
            </colgroup>
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80">
              <tr className="text-left">
                <th className="py-3 pl-4 pr-2" aria-hidden="true" />
                <LaunchSortableTh
                  column="name"
                  label="Name"
                  activeColumn={launchSort.column}
                  direction={launchSort.direction}
                  onSort={toggleLaunchSort}
                  align="left"
                  thClassName="pr-4"
                />
                <LaunchSortableTh
                  column="start_time"
                  label={<span className="whitespace-nowrap">Start time</span>}
                  activeColumn={launchSort.column}
                  direction={launchSort.direction}
                  onSort={toggleLaunchSort}
                  align="left"
                  thClassName="px-2 whitespace-nowrap"
                />
                <th
                  className="py-3 px-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400"
                  scope="col"
                >
                  Runned By
                </th>
                <LaunchSortableTh
                  column="total"
                  label="Total"
                  activeColumn={launchSort.column}
                  direction={launchSort.direction}
                  onSort={toggleLaunchSort}
                  align="right"
                  thClassName="px-2 text-right tabular-nums"
                />
                <LaunchSortableTh
                  column="passed"
                  label="Passed"
                  activeColumn={launchSort.column}
                  direction={launchSort.direction}
                  onSort={toggleLaunchSort}
                  align="right"
                  thClassName="px-2 text-right tabular-nums"
                />
                <LaunchSortableTh
                  column="failed"
                  label="Failed"
                  activeColumn={launchSort.column}
                  direction={launchSort.direction}
                  onSort={toggleLaunchSort}
                  align="right"
                  thClassName="px-2 text-right tabular-nums"
                />
                <LaunchSortableTh
                  column="skipped"
                  label="Skipped"
                  activeColumn={launchSort.column}
                  direction={launchSort.direction}
                  onSort={toggleLaunchSort}
                  align="right"
                  thClassName="px-2 text-right tabular-nums"
                />
                <LaunchSortableTh
                  column="product_bug"
                  label={
                    <span className="block text-right leading-tight">
                      Product
                      <br />
                      bug
                    </span>
                  }
                  activeColumn={launchSort.column}
                  direction={launchSort.direction}
                  onSort={toggleLaunchSort}
                  align="right"
                  thClassName="px-1 text-right"
                />
                <LaunchSortableTh
                  column="auto_bug"
                  label={
                    <span className="block text-right leading-tight">
                      Auto
                      <br />
                      bug
                    </span>
                  }
                  activeColumn={launchSort.column}
                  direction={launchSort.direction}
                  onSort={toggleLaunchSort}
                  align="right"
                  thClassName="px-1 text-right"
                />
                <LaunchSortableTh
                  column="system_issue"
                  label={
                    <span className="block text-right leading-tight">
                      System
                      <br />
                      issue
                    </span>
                  }
                  activeColumn={launchSort.column}
                  direction={launchSort.direction}
                  onSort={toggleLaunchSort}
                  align="right"
                  thClassName="px-1 text-right"
                />
                <LaunchSortableTh
                  column="to_investigate"
                  label={
                    <span className="block text-right leading-tight">
                      To
                      <br />
                      investigate
                    </span>
                  }
                  activeColumn={launchSort.column}
                  direction={launchSort.direction}
                  onSort={toggleLaunchSort}
                  align="right"
                  thClassName="px-1 pl-2 text-right"
                />
                <th className="py-3 pl-2 pr-4 align-top" scope="col">
                  <input
                    ref={launchSelectAllCheckboxRef}
                    type="checkbox"
                    checked={allLaunchRowsSelected}
                    onChange={toggleSelectAllLaunchRows}
                    disabled={launchRowIdsOnPage.length === 0}
                    className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 disabled:opacity-40"
                    aria-label="Select all launches on this page"
                  />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {!loading && rows.length === 0 && !error && drillLaunch === null ? (
                <tr>
                  <td colSpan={13} className="py-8 text-center text-slate-500 dark:text-slate-400">
                    No launches with overview data yet.
                  </td>
                </tr>
              ) : null}
              {displayRows.map(row => (
                <tr
                  key={row.id}
                  className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                >
                  <td className="py-3 pl-4 pr-2 align-top text-slate-400">
                    <span className="inline-flex p-1" aria-hidden="true">
                      <Menu className="h-4 w-4" />
                    </span>
                  </td>
                  <td className="min-w-0 break-words py-3 pr-4 align-top">
                    {row.suiteDrillDown === true ? (
                      <button
                        type="button"
                        onClick={() => {
                          void openSuiteListView();
                        }}
                        className="text-left font-semibold text-cyan-600 dark:text-cyan-400 hover:underline [overflow-wrap:anywhere]"
                      >
                        {row.title}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDrillLaunch(row)}
                        className="text-left font-semibold text-cyan-600 dark:text-cyan-400 hover:underline [overflow-wrap:anywhere]"
                      >
                        {row.title}
                      </button>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-600 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3 shrink-0" />
                        {row.durationLabel}
                      </span>
                      {row.suiteDrillDown !== true ? (
                        <Link2 className="h-3 w-3 shrink-0 text-slate-400" aria-hidden />
                      ) : null}
                    </div>
                    {row.attributeText !== '' ? (
                      <p className="mt-1 font-mono text-xs leading-relaxed text-slate-500 dark:text-slate-500 [overflow-wrap:anywhere]">
                        {row.attributeText}
                      </p>
                    ) : null}
                    {row.description ? (
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                        {row.description}
                      </p>
                    ) : null}
                    {row.testCasesLine ? (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                        {row.testCasesLine}
                      </p>
                    ) : null}
                  </td>
                  <td
                    className="cursor-default whitespace-nowrap py-3 px-2 align-top text-slate-700 dark:text-slate-300"
                    onMouseEnter={() => {
                      if (row.startTimeRelative !== '\u2014' && row.startTimeRelative !== '-') {
                        setHoveredStartRowId(row.id);
                      }
                    }}
                    onMouseLeave={() => setHoveredStartRowId(null)}
                  >
                    {hoveredStartRowId === row.id
                      ? startTimeHoverLabel(row)
                      : row.startTimeRelative}
                  </td>
                  <td className="py-3 px-2 align-top text-slate-700 dark:text-slate-300">
                    {row.suiteDrillDown === true ? (
                      <span className="text-slate-400 dark:text-slate-600">{'\u2014'}</span>
                    ) : row.runnedByLabel !== '' ? (
                      <span className="inline-flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 shrink-0 text-teal-600 dark:text-teal-400" aria-hidden />
                        <span className="break-words [overflow-wrap:anywhere]">{row.runnedByLabel}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-600">{'\u2014'}</span>
                    )}
                  </td>
                  <td className="py-3 px-2 align-top text-right tabular-nums text-slate-900 dark:text-white">
                    {row.total}
                  </td>
                  <td className="py-3 px-2 align-top text-right tabular-nums text-teal-600 dark:text-teal-400">
                    {row.passed}
                  </td>
                  <td className="py-3 px-2 align-top text-right tabular-nums text-slate-900 dark:text-white">
                    {row.failed}
                  </td>
                  <td className="py-3 px-2 align-top text-right tabular-nums text-slate-900 dark:text-white">
                    {row.skipped}
                  </td>
                  <td className="py-3 px-2 align-top text-right tabular-nums text-slate-900 dark:text-white">
                    {renderCountCell(row.productBug)}
                  </td>
                  <td className="py-3 px-2 align-top text-right tabular-nums text-slate-900 dark:text-white">
                    {renderCountCell(row.autoBug)}
                  </td>
                  <td className="py-3 px-2 align-top text-right tabular-nums text-slate-900 dark:text-white">
                    {renderCountCell(row.systemIssue)}
                  </td>
                  <td className="py-3 px-2 pl-3 align-top text-right tabular-nums text-slate-900 dark:text-white">
                    {renderCountCell(row.toInvestigate)}
                  </td>
                  <td className="py-3 pl-2 pr-4 align-top">
                    <input
                      type="checkbox"
                      checked={selectedLaunchRowIds.has(row.id)}
                      onChange={() => {
                        setSelectedLaunchRowIds(prev => {
                          const next = new Set(prev);
                          if (next.has(row.id)) {
                            next.delete(row.id);
                          } else {
                            next.add(row.id);
                          }
                          return next;
                        });
                      }}
                      className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                      aria-label={`Select ${row.title}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {meta && !error && drillLaunch === null ? (
        <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 bg-white pt-4 text-sm dark:border-slate-700 dark:bg-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <p className="shrink-0 text-slate-500 dark:text-slate-400">
            {meta.total === 0
              ? '0 of 0'
              : `${(meta.currentPage - 1) * meta.perPage + 1} – ${Math.min(meta.currentPage * meta.perPage, meta.total)} of ${meta.total}`}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-1 sm:flex-1">
            <IconNavButton
              label="First page"
              disabled={loading || meta.currentPage <= 1}
              onClick={() => setPage(1)}
            >
              <ChevronsLeft className="h-4 w-4" />
            </IconNavButton>
            <span className="px-1 text-slate-300 dark:text-slate-600" aria-hidden>
              |
            </span>
            <IconNavButton
              label="Previous page"
              disabled={loading || meta.currentPage <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </IconNavButton>
            <nav className="mx-2 flex flex-wrap items-center justify-center gap-x-1" aria-label="Pagination">
              {buildPageList(meta.currentPage, meta.lastPage).map((entry, idx) =>
                entry === 'ellipsis' ? (
                  <span
                    key={`e-${idx}`}
                    className="px-1.5 text-slate-500 dark:text-slate-400"
                    aria-hidden
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={entry}
                    type="button"
                    disabled={loading}
                    onClick={() => setPage(entry)}
                    className={
                      entry === meta.currentPage
                        ? 'min-w-[2rem] border-b-2 border-teal-500 px-2.5 py-1 font-medium text-teal-600 dark:text-teal-400'
                        : 'min-w-[2rem] px-2.5 py-1 font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50 dark:text-slate-400 dark:hover:text-white'
                    }
                  >
                    {entry}
                  </button>
                ),
              )}
            </nav>
            <IconNavButton
              label="Next page"
              disabled={loading || meta.currentPage >= meta.lastPage}
              onClick={() => setPage(p => Math.min(meta.lastPage, p + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </IconNavButton>
            <span className="px-1 text-slate-300 dark:text-slate-600" aria-hidden>
              |
            </span>
            <IconNavButton
              label="Last page"
              disabled={loading || meta.currentPage >= meta.lastPage}
              onClick={() => setPage(meta.lastPage)}
            >
              <ChevronsRight className="h-4 w-4" />
            </IconNavButton>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 text-slate-500 dark:text-slate-400">
            {PER_PAGE_OPTIONS.map(n => (
              <button
                key={n}
                type="button"
                disabled={loading}
                onClick={() => {
                  setPerPage(n);
                  setPage(1);
                }}
                className={
                  n === perPage
                    ? 'font-semibold text-teal-600 dark:text-teal-400'
                    : 'text-slate-500 hover:text-slate-800 disabled:opacity-50 dark:text-slate-400 dark:hover:text-slate-200'
                }
              >
                {n}
              </button>
            ))}
            <span className="text-slate-500 dark:text-slate-400">per page</span>
          </div>
        </div>
      ) : null}
      {drillLaunch !== null && !inSuiteListView ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
          <p>1 – 1 of 1</p>
          <p>
            <span className="font-semibold text-teal-600 dark:text-teal-400">{perPage}</span>{' '}
            per page
          </p>
        </div>
      ) : null}
      {inSuiteListView && !suiteItemsError && !inTestLogView ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
          <p>
            {(() => {
              const total = suiteListItems?.length ?? 0;
              const shown = filteredSuiteItems.length;
              if (shown === 0) {
                return '0 – 0 of 0';
              }
              return `1 – ${shown} of ${total}`;
            })()}
          </p>
          <p>
            <span className="font-semibold text-teal-600 dark:text-teal-400">{perPage}</span> per
            page
          </p>
        </div>
      ) : null}
      </div>
    </div>
  );
};

export default OverviewLaunchesTable;
