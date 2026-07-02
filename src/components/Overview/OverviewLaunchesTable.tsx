import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
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
  Search,
  User,
  X,
} from 'lucide-react';
import { endOfDay, format, isEqual, isSameDay, startOfDay } from 'date-fns';
import { convertUtcToLocalDisplay } from '../../utils/dateHelpers';
import {
  fetchAllOverviewLaunchesProjectOptions,
  fetchOverviewDefectTypes,
  fetchOverviewLaunchHistory,
  fetchOverviewLaunches,
  fetchOverviewLaunchSuiteItems,
  fetchOverviewSuiteKwLogItems,
  fetchOverviewTestLogItems,
  type OverviewDefectType,
  type OverviewLaunchesMeta,
  type OverviewLaunchApiRow,
  type OverviewLaunchesProjectOption,
  type OverviewLaunchSuiteItemApiRow,
  type OverviewLaunchesExecutionFilter,
  type OverviewLaunchesSortColumn,
  type OverviewTestDefect,
  type OverviewTestLogItemsResponse,
} from '../../services/overviewWidgetsApi';
import { OverviewLaunchStartTimeRangePicker } from './OverviewLaunchStartTimeRangePicker';
import {
  HistoryLaunchTooltip,
  type HistoryLaunchTooltipButtonModel,
} from './OverviewLaunchHistoryTooltip';
import OverviewTestLogView from './OverviewTestLogView';
import { DefectSelectionModal } from './DefectSelectionModal';

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
      statusBand?: string;
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
      statusBand?: string;
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
    createdByUserId: api.createdByUserId,
    source: api.source ?? null,
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
      statusBand: item.statusBand,
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
      statusBand: item.statusBand,
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

type OverviewLaunchesRouteState =
  | { kind: 'list' }
  | { kind: 'launch'; testRunExecutionId: number }
  | { kind: 'suite'; testRunExecutionId: number }
  | { kind: 'test'; testRunExecutionId: number; overviewTestId: number }
  | { kind: 'kw'; testRunExecutionId: number; overviewSuiteKwId: number };

function positiveIntFromSegment(value: string | undefined): number | null {
  if (value === undefined || value.trim() === '') {
    return null;
  }
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function positiveIntFromSearchParam(value: string | null): number | null {
  return positiveIntFromSegment(value ?? undefined);
}

function parseOverviewLaunchesRoute(pathname: string): OverviewLaunchesRouteState {
  const normalized = pathname.replace(/\/+$/, '');
  if (normalized === '/overview/launches') {
    return { kind: 'list' };
  }

  const parts = normalized.split('/').filter(Boolean);
  if (parts[0] !== 'overview' || parts[1] !== 'launches') {
    return { kind: 'list' };
  }

  const testRunExecutionId = positiveIntFromSegment(parts[2]);
  if (testRunExecutionId === null) {
    return { kind: 'list' };
  }

  if (parts.length === 3) {
    return { kind: 'launch', testRunExecutionId };
  }

  if (parts[3] === 'suite' && parts.length === 4) {
    return { kind: 'suite', testRunExecutionId };
  }

  if (parts[3] === 'test' && parts.length === 5) {
    const overviewTestId = positiveIntFromSegment(parts[4]);
    if (overviewTestId !== null) {
      return { kind: 'test', testRunExecutionId, overviewTestId };
    }
  }

  if (parts[3] === 'kw' && parts.length === 5) {
    const overviewSuiteKwId = positiveIntFromSegment(parts[4]);
    if (overviewSuiteKwId !== null) {
      return { kind: 'kw', testRunExecutionId, overviewSuiteKwId };
    }
  }

  return { kind: 'list' };
}

function parseProjectIdsSearchParam(value: string | null): number[] {
  if (value === null || value.trim() === '') {
    return [];
  }

  return Array.from(
    new Set(
      value
        .split(',')
        .map(part => Number(part.trim()))
        .filter(id => Number.isInteger(id) && id > 0),
    ),
  ).sort((a, b) => a - b);
}

function arraysEqual(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function parseSearchDateValue(raw: string | null): Date | null {
  if (raw === null || raw.trim() === '') {
    return null;
  }

  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split('-').map(Number);
    if ([year, month, day].some(Number.isNaN)) {
      return null;
    }

    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  const normalized = trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T');
  const parsed = new Date(normalized);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function detectStartTimePresetFromSearch(startFrom: string | null, startTo: string | null): {
  preset: StartTimePreset;
  customRangeStart: Date | null;
  customRangeEnd: Date | null;
} {
  if ((startFrom === null || startFrom.trim() === '') && (startTo === null || startTo.trim() === '')) {
    return { preset: 'any', customRangeStart: null, customRangeEnd: null };
  }

  const today = localToday();
  const sameAs = (fromDelta: number, toDelta: number): boolean =>
    startFrom === formatLocalYmd(addCalendarDays(today, fromDelta)) &&
    startTo === formatLocalYmd(addCalendarDays(today, toDelta));

  if (sameAs(0, 0)) {
    return { preset: 'today', customRangeStart: null, customRangeEnd: null };
  }
  if (sameAs(-1, 0)) {
    return { preset: '2d', customRangeStart: null, customRangeEnd: null };
  }
  if (sameAs(-6, 0)) {
    return { preset: '7d', customRangeStart: null, customRangeEnd: null };
  }
  if (sameAs(-29, 0)) {
    return { preset: '30d', customRangeStart: null, customRangeEnd: null };
  }

  return {
    preset: 'custom',
    customRangeStart: parseSearchDateValue(startFrom),
    customRangeEnd: parseSearchDateValue(startTo),
  };
}


function launchHistoryButtonLabel(row: OverviewLaunchRow): string {
  const match = row.title.match(/#(\d+)/);

  return match !== null ? `#${match[1]}` : row.title;
}

function pickMatchingSuiteItemForHistory(
  items: OverviewLaunchSuiteItemApiRow[],
  target: OverviewSuiteListLogTarget,
): OverviewLaunchSuiteItemApiRow | null {
  const sameName = items.filter(item => item.name === target.displayName);
  if (sameName.length === 0) {
    return null;
  }

  const sameKind = sameName.filter(item =>
    target.kind === 'test' ? item.overviewTestId !== null : item.overviewSuiteKwId !== null,
  );
  const sameMethodType = (sameKind.length > 0 ? sameKind : sameName).filter(
    item => item.methodType === target.methodType,
  );
  const candidates = sameMethodType.length > 0 ? sameMethodType : (sameKind.length > 0 ? sameKind : sameName);

  if (target.kind === 'test' && (target.suiteSourceRelative !== null || target.overviewTestLine !== null)) {
    const exact = candidates.find(
      item =>
        (item.suiteSourceRelative ?? null) === target.suiteSourceRelative &&
        (item.overviewTestLine ?? null) === target.overviewTestLine,
    );
    if (exact !== undefined) {
      return exact;
    }
  }

  if (target.kind === 'suite_kw' && target.suiteSourceRelative !== null) {
    const exact = candidates.find(item => (item.suiteSourceRelative ?? null) === target.suiteSourceRelative);
    if (exact !== undefined) {
      return exact;
    }
  }

  return candidates[0] ?? null;
}

function sameLogTarget(a: OverviewSuiteListLogTarget | null, b: OverviewSuiteListLogTarget | null): boolean {
  if (a === b) {
    return true;
  }
  if (a === null || b === null || a.kind !== b.kind) {
    return false;
  }

  if (a.kind === 'test') {
    return b.kind === 'test' && a.overviewTestId === b.overviewTestId;
  }

  return b.kind === 'suite_kw' && a.overviewSuiteKwId === b.overviewSuiteKwId;
}


const HISTORY_BUTTON_BATCH_SIZE = 10;
const HISTORY_BUTTON_MAX_VISIBLE = 30;

type HistoryLaunchEntry = {
  row: OverviewLaunchRow;
  target: OverviewSuiteListLogTarget | null;
};

function launchHistoryStatus(row: OverviewLaunchRow): { label: string; band: 'passed' | 'failed' | 'skipped' | 'unknown' } {
  if (row.failed > 0) {
    return { label: 'Failed', band: 'failed' };
  }
  if (row.passed > 0) {
    return { label: 'Passed', band: 'passed' };
  }
  if (row.skipped > 0) {
    return { label: 'Skipped', band: 'skipped' };
  }

  return { label: 'Unknown', band: 'unknown' };
}

function launchHistoryAttributeLines(attributeText: string): string[] {
  return attributeText
    .split(/\s*\|\s*|\n+/)
    .map(part => part.trim())
    .filter(part => part.length > 0);
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
  /** Display for Ran By column (from `runnedByLabel` / owner). */
  runnedByLabel: string;
  /** null means the launch was triggered by cron / automation (no human creator). */
  createdByUserId: number | null;
  /** "cron" when triggered by automation/scheduler, "app" when triggered by a user. */
  source: string | null;
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
    createdByUserId: null,
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
    return convertUtcToLocalDisplay(row.startTimeRaw);
  }
  return convertUtcToLocalDisplay(row.startTimeDisplay);
}

/**
 * Hover title for suite list row start time (raw DB string when present, else formatted).
 */
function suiteItemStartHoverLabel(item: OverviewLaunchSuiteItemApiRow): string {
  if (item.startTimeRaw !== null && item.startTimeRaw !== '') {
    return convertUtcToLocalDisplay(item.startTimeRaw);
  }
  return convertUtcToLocalDisplay(item.startTimeDisplay);
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
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const routeState = useMemo(
    () => parseOverviewLaunchesRoute(location.pathname),
    [location.pathname],
  );
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
  /** Suite list "View": same launch summary tooltip as the green history pills in the test log. */
  const [suiteListLaunchTooltip, setSuiteListLaunchTooltip] = useState<{
    anchorKey: string;
    top: number;
    left: number;
  } | null>(null);
  const [drillLaunch, setDrillLaunch] = useState<OverviewLaunchRow | null>(null);
  const [suiteListItems, setSuiteListItems] = useState<OverviewLaunchSuiteItemApiRow[] | null>(null);
  const [suiteItemsLoading] = useState(false);
  const [suiteItemsError, setSuiteItemsError] = useState<string | null>(null);
  const [suiteSort, setSuiteSort] = useState<{
    column: SuiteListSortColumn;
    direction: 'asc' | 'desc';
  }>({ column: 'start_time', direction: 'asc' });
  const [testLogLaunch, setTestLogLaunch] = useState<OverviewLaunchRow | null>(null);
  const [testLogTarget, setTestLogTarget] = useState<OverviewSuiteListLogTarget | null>(null);
  const [testLogPayload, setTestLogPayload] = useState<OverviewTestLogItemsResponse | null>(null);
  const [testLogLoading, setTestLogLoading] = useState(false);
  const [testLogError, setTestLogError] = useState<string | null>(null);
  const [expandedErrorRows, setExpandedErrorRows] = useState<Set<string>>(new Set());
  const [historyAnchorLaunch, setHistoryAnchorLaunch] = useState<OverviewLaunchRow | null>(null);
  const [historyAnchorTarget, setHistoryAnchorTarget] = useState<OverviewSuiteListLogTarget | null>(null);
  const [historyLaunches, setHistoryLaunches] = useState<HistoryLaunchEntry[]>([]);
  const [historyLaunchesLoading, setHistoryLaunchesLoading] = useState(false);
  const [historyLaunchesHiddenCount, setHistoryLaunchesHiddenCount] = useState(0);
  const [historyLaunchesNextBeforeId, setHistoryLaunchesNextBeforeId] = useState<number | null>(null);
  const [hoveredLogTimeRowKey, setHoveredLogTimeRowKey] = useState<string | null>(null);
  const historyLaunchTargetCacheRef = useRef<Map<string, OverviewSuiteListLogTarget | null>>(new Map());
  const skipNextLaunchesSearchSyncRef = useRef(false);

  const [projectOptions, setProjectOptions] = useState<OverviewLaunchesProjectOption[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [selectedProjectIds, setSelectedProjectIds] = useState<number[]>([]);
  const [projectsDropdownOpen, setProjectsDropdownOpen] = useState(false);
  const [projectsSearchTerm, setProjectsSearchTerm] = useState('');
  const projectsFilterDropdownRef = useRef<HTMLDivElement>(null);
  const [startTimePreset, setStartTimePreset] = useState<StartTimePreset>('any');
  const [customRangeStart, setCustomRangeStart] = useState<Date | null>(null);
  const [customRangeEnd, setCustomRangeEnd] = useState<Date | null>(null);
  const [executionFilter, setExecutionFilter] = useState<OverviewLaunchesExecutionFilter>('all');
  const prevStartTimePresetRef = useRef<StartTimePreset>(startTimePreset);

  // Defect types (cached once)
  const [defectTypes, setDefectTypes] = useState<OverviewDefectType[]>([]);
  // Map slug → defect type for fast look-up in the suite items table
  const defectTypeBySlug = useMemo<Map<string, OverviewDefectType>>(
    () => new Map(defectTypes.map(d => [d.slug, d])),
    [defectTypes],
  );
  // Suite item row selection (multi-select for bulk Make Decision)
  const [selectedTestIds, setSelectedTestIds] = useState<Set<number>>(new Set());
  // Modal state — array of targets (single or bulk)
  const [defectModalTarget, setDefectModalTarget] = useState<Array<{
    overviewTestId: number;
    testName: string;
  }> | null>(null);

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
    const hasUrlBounds =
      (searchParams.get('start_from') ?? '').trim() !== '' || (searchParams.get('start_to') ?? '').trim() !== '';
    if (startTimePreset === 'custom' && prev !== 'custom' && !hasUrlBounds) {
      setCustomRangeStart(null);
      setCustomRangeEnd(null);
    }
    prevStartTimePresetRef.current = startTimePreset;
  }, [searchParams, startTimePreset]);

  // Fetch defect types once on mount
  useEffect(() => {
    fetchOverviewDefectTypes()
      .then(data => setDefectTypes(data))
      .catch(() => { /* non-critical — table still works without colors */ });
  }, []);

  const historySelectedLaunchIdFromSearch = useMemo(
    () => positiveIntFromSearchParam(searchParams.get('history_selected_tre')),
    [searchParams],
  );

  const buildNextLaunchesSearchParams = useCallback(
    (
      mutate?: (next: URLSearchParams) => void,
      historyAnchorTestRunExecutionId?: number | null,
    ): URLSearchParams => {
      const next = new URLSearchParams(searchParams);
      if (mutate !== undefined) {
        mutate(next);
      }
      if (historyAnchorTestRunExecutionId === null) {
        next.delete('history_selected_tre');
      } else if (
        historyAnchorTestRunExecutionId !== undefined &&
        Number.isInteger(historyAnchorTestRunExecutionId) &&
        historyAnchorTestRunExecutionId > 0
      ) {
        next.set('history_selected_tre', String(historyAnchorTestRunExecutionId));
      }

      return next;
    },
    [searchParams],
  );

  const replaceLaunchesSearchParams = useCallback(
    (
      mutate: (next: URLSearchParams) => void,
      historyAnchorTestRunExecutionId?: number | null,
    ) => {
      const next = buildNextLaunchesSearchParams(mutate, historyAnchorTestRunExecutionId);
      const current = searchParams.toString();
      const updated = next.toString();
      if (current === updated) {
        return;
      }
      setSearchParams(next, { replace: true });
    },
    [buildNextLaunchesSearchParams, searchParams, setSearchParams],
  );

  const navigateToLaunchesRoute = useCallback(
    (
      nextRoute: OverviewLaunchesRouteState,
      replace = false,
      historyAnchorTestRunExecutionId?: number | null,
    ) => {
      let pathname = '/overview/launches';
      if (nextRoute.kind !== 'list') {
        pathname = `/overview/launches/${nextRoute.testRunExecutionId}`;
        if (nextRoute.kind === 'suite') {
          pathname += '/suite';
        } else if (nextRoute.kind === 'test') {
          pathname += `/test/${nextRoute.overviewTestId}`;
        } else if (nextRoute.kind === 'kw') {
          pathname += `/kw/${nextRoute.overviewSuiteKwId}`;
        }
      }

      const nextSearchParams = buildNextLaunchesSearchParams(undefined, historyAnchorTestRunExecutionId);
      const nextSearch = nextSearchParams.toString();
      const target = `${pathname}${nextSearch !== '' ? `?${nextSearch}` : ''}`;
      const current = `${location.pathname}${location.search}`;
      if (target === current) {
        return;
      }

      navigate(target, { replace });
    },
    [buildNextLaunchesSearchParams, location.pathname, location.search, navigate],
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
    skipNextLaunchesSearchSyncRef.current = true;

    const parsedPage = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
    const parsedPerPageRaw = Number(searchParams.get('per_page') ?? `${PER_PAGE_OPTIONS[0]}`) || PER_PAGE_OPTIONS[0];
    const parsedPerPage = PER_PAGE_OPTIONS.includes(parsedPerPageRaw as typeof PER_PAGE_OPTIONS[number])
      ? parsedPerPageRaw
      : PER_PAGE_OPTIONS[0];

    const rawSort = searchParams.get('sort');
    const allowedSorts: OverviewLaunchesSortColumn[] = [
      'tre_id',
      'name',
      'start_time',
      'duration',
      'total',
      'passed',
      'failed',
      'skipped',
      'product_bug',
      'auto_bug',
      'system_issue',
      'to_investigate',
    ];
    const parsedSort: OverviewLaunchesSortColumn =
      rawSort !== null && allowedSorts.includes(rawSort as OverviewLaunchesSortColumn)
        ? (rawSort as OverviewLaunchesSortColumn)
        : 'tre_id';
    const parsedDirection: 'asc' | 'desc' = searchParams.get('direction') === 'asc' ? 'asc' : 'desc';
    const parsedProjectIds = parseProjectIdsSearchParam(searchParams.get('project_ids'));
    const parsedExecutionFilter: OverviewLaunchesExecutionFilter =
      searchParams.get('executed_by') === 'me'
        ? 'me'
        : searchParams.get('executed_by') === 'cron'
          ? 'cron'
          : 'all';
    const parsedPreset = detectStartTimePresetFromSearch(
      searchParams.get('start_from'),
      searchParams.get('start_to'),
    );

    setPage(prev => (prev === parsedPage ? prev : parsedPage));
    setPerPage(prev => (prev === parsedPerPage ? prev : parsedPerPage));
    setLaunchSort(prev =>
      prev.column === parsedSort && prev.direction === parsedDirection
        ? prev
        : { column: parsedSort, direction: parsedDirection },
    );
    setSelectedProjectIds(prev => (arraysEqual(prev, parsedProjectIds) ? prev : parsedProjectIds));
    setExecutionFilter(prev => (prev === parsedExecutionFilter ? prev : parsedExecutionFilter));
    setStartTimePreset(prev => (prev === parsedPreset.preset ? prev : parsedPreset.preset));
    setCustomRangeStart(prev => {
      const next = parsedPreset.customRangeStart;
      if (prev?.getTime() === next?.getTime()) {
        return prev;
      }
      return next;
    });
    setCustomRangeEnd(prev => {
      const next = parsedPreset.customRangeEnd;
      if (prev?.getTime() === next?.getTime()) {
        return prev;
      }
      return next;
    });
  }, [searchParams]);

  useEffect(() => {
    if (skipNextLaunchesSearchSyncRef.current) {
      skipNextLaunchesSearchSyncRef.current = false;
      return;
    }

    replaceLaunchesSearchParams(next => {
      next.set('page', String(page));
      next.set('per_page', String(perPage));
      next.set('sort', launchSort.column);
      next.set('direction', launchSort.direction);
      if (selectedProjectIds.length > 0) {
        next.set('project_ids', selectedProjectIds.join(','));
      } else {
        next.delete('project_ids');
      }
      if (resolvedStartFrom !== null && resolvedStartFrom !== '') {
        next.set('start_from', resolvedStartFrom);
      } else {
        next.delete('start_from');
      }
      if (resolvedStartTo !== null && resolvedStartTo !== '') {
        next.set('start_to', resolvedStartTo);
      } else {
        next.delete('start_to');
      }
      if (executionFilter !== 'all') {
        next.set('executed_by', executionFilter);
      } else {
        next.delete('executed_by');
      }
      next.set('tab', 'launches');
    });
  }, [
    page,
    perPage,
    launchSort.column,
    launchSort.direction,
    selectedProjectIds,
    resolvedStartFrom,
    resolvedStartTo,
    executionFilter,
    replaceLaunchesSearchParams,
  ]);

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
      setProjectsSearchTerm('');
    };
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setProjectsDropdownOpen(false);
        setProjectsSearchTerm('');
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
    setPage(1);
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

  const fetchLaunchRowById = useCallback(
    async (launchId: number): Promise<OverviewLaunchRow | null> => {
      const res = await fetchOverviewLaunches({
        testRunExecutionId: launchId,
        perPage: 1,
        projectIds: selectedProjectIds.length > 0 ? selectedProjectIds : undefined,
        startFrom: resolvedStartFrom ?? undefined,
        startTo: resolvedStartTo ?? undefined,
        executionFilter: executionFilter === 'all' ? undefined : executionFilter,
      });

      const row = res.launches[0];

      return row !== undefined ? mapApiRowToRow(row) : null;
    },
    [selectedProjectIds, resolvedStartFrom, resolvedStartTo, executionFilter],
  );

  useEffect(() => {
    void load(page, perPage);
  }, [load, page, perPage]);

  useEffect(() => {
    let cancelled = false;

    const clearLocalSelection = (): void => {
      setDrillLaunch(null);
      setSuiteListItems(null);
      setSuiteItemsError(null);
      setHistoryAnchorLaunch(null);
      setHistoryAnchorTarget(null);
      setTestLogLaunch(null);
      setTestLogTarget(null);
      setTestLogPayload(null);
      setTestLogError(null);
      setHoveredLogTimeRowKey(null);
      setExpandedErrorRows(new Set());
      setSelectedTestIds(new Set());
      historyLaunchTargetCacheRef.current = new Map();
    };

    const run = async (): Promise<void> => {
      if (routeState.kind === 'list') {
        clearLocalSelection();
        return;
      }

      try {
        const launchRow = await fetchLaunchRowById(routeState.testRunExecutionId);
        if (cancelled) {
          return;
        }
        if (launchRow === null) {
          toast.error('Could not open overview launch: launch not found.');
          navigateToLaunchesRoute({ kind: 'list' }, true);
          return;
        }

        setDrillLaunch(launchRow);

        if (routeState.kind === 'launch') {
          setSuiteListItems(null);
          setSuiteItemsError(null);
          setTestLogLaunch(null);
          setTestLogTarget(null);
          setTestLogPayload(null);
          setTestLogError(null);
          setHoveredLogTimeRowKey(null);
          historyLaunchTargetCacheRef.current = new Map();
          return;
        }

        const suiteRes = await fetchOverviewLaunchSuiteItems(routeState.testRunExecutionId);
        if (cancelled) {
          return;
        }

        setSuiteListItems(suiteRes.items);
        setSuiteItemsError(null);

        if (routeState.kind === 'suite') {
          setTestLogLaunch(null);
          setTestLogTarget(null);
          setTestLogPayload(null);
          setTestLogError(null);
          setHoveredLogTimeRowKey(null);
          historyLaunchTargetCacheRef.current = new Map();
          return;
        }

        const matchedItem =
          routeState.kind === 'test'
            ? suiteRes.items.find(item => item.overviewTestId === routeState.overviewTestId) ?? null
            : suiteRes.items.find(item => item.overviewSuiteKwId === routeState.overviewSuiteKwId) ?? null;
        const anchorTarget = matchedItem !== null ? suiteItemToLogTarget(matchedItem) : null;
        if (anchorTarget === null) {
          toast.error('Could not open overview log: row not found in suite list.');
          navigateToLaunchesRoute({ kind: 'suite', testRunExecutionId: routeState.testRunExecutionId }, true);
          return;
        }

        let selectedLaunchRow = launchRow;
        let selectedLogTarget = anchorTarget;
        const selectedLaunchId = historySelectedLaunchIdFromSearch;

        if (selectedLaunchId !== null && selectedLaunchId !== routeState.testRunExecutionId) {
          const selectedRow = await fetchLaunchRowById(selectedLaunchId);
          if (cancelled) {
            return;
          }
          if (selectedRow === null) {
            toast.error('Could not open overview log: selected launch not found.');
            navigateToLaunchesRoute(routeState, true, null);
            return;
          }

          const selectedSuiteRes = await fetchOverviewLaunchSuiteItems(selectedLaunchId);
          if (cancelled) {
            return;
          }
          const selectedMatchedItem = pickMatchingSuiteItemForHistory(selectedSuiteRes.items, anchorTarget);
          const selectedTarget = selectedMatchedItem !== null ? suiteItemToLogTarget(selectedMatchedItem) : null;
          if (selectedTarget === null) {
            toast.error(`Could not find element "${anchorTarget.displayName}" in selected launch.`);
            navigateToLaunchesRoute(routeState, true, null);
            return;
          }

          selectedLaunchRow = selectedRow;
          selectedLogTarget = selectedTarget;
          historyLaunchTargetCacheRef.current = new Map([
            [launchRow.id, anchorTarget],
            [selectedRow.id, selectedTarget],
          ]);
        } else {
          historyLaunchTargetCacheRef.current = new Map([[launchRow.id, anchorTarget]]);
        }

        setHistoryAnchorLaunch(prev => (prev?.id === launchRow.id ? prev : launchRow));
        setHistoryAnchorTarget(prev => (sameLogTarget(prev, anchorTarget) ? prev : anchorTarget));
        setTestLogLaunch(selectedLaunchRow);
        setTestLogTarget(selectedLogTarget);
        setTestLogPayload(null);
        setTestLogError(null);
        setHoveredLogTimeRowKey(null);
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : 'Could not open overview launch.');
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [fetchLaunchRowById, historySelectedLaunchIdFromSearch, navigateToLaunchesRoute, routeState]);

  useEffect(() => {
    setDrillLaunch(null);
    setSuiteListItems(null);
    setSuiteItemsError(null);
    setHistoryAnchorLaunch(null);
    setHistoryAnchorTarget(null);
    setTestLogLaunch(null);
    setTestLogTarget(null);
    setTestLogPayload(null);
    setTestLogError(null);
    setSelectedTestIds(new Set());
    historyLaunchTargetCacheRef.current = new Map();
  }, [page, perPage]);

  useEffect(() => {
    setHoveredStartRowId(null);
  }, [rows]);

  useEffect(() => {
    setSuiteListItems(null);
    setSuiteItemsError(null);
    setSuiteSort({ column: 'start_time', direction: 'asc' });
    setTestLogLaunch(null);
    setTestLogTarget(null);
    setTestLogPayload(null);
    setTestLogError(null);
    setSelectedTestIds(new Set());
    historyLaunchTargetCacheRef.current = new Map();
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
        if (launchRes.launches.length === 0) {
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
          navigateToLaunchesRoute({ kind: 'launch', testRunExecutionId: tre }, true);
          stripOverviewDeepLinkParams();

          return;
        }

        const logTarget = suiteItemToLogTarget(picked);
        if (logTarget === null) {
          toast.error('Could not open overview log: row has no log data.');
          navigateToLaunchesRoute({ kind: 'launch', testRunExecutionId: tre }, true);
          stripOverviewDeepLinkParams();

          return;
        }

        navigateToLaunchesRoute(
          logTarget.kind === 'test'
            ? {
                kind: 'test',
                testRunExecutionId: tre,
                overviewTestId: logTarget.overviewTestId,
              }
            : {
                kind: 'kw',
                testRunExecutionId: tre,
                overviewSuiteKwId: logTarget.overviewSuiteKwId,
              },
          true,
          null,
        );
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
  }, [navigateToLaunchesRoute, searchParams, stripOverviewDeepLinkParams]);


  const inTestLogView = testLogTarget !== null;

  const buildHistoryLaunchEntry = useCallback(
    async (row: OverviewLaunchRow, target: OverviewSuiteListLogTarget): Promise<HistoryLaunchEntry> => {
      const cachedTarget = historyLaunchTargetCacheRef.current.get(row.id);
      if (cachedTarget !== undefined) {
        return { row, target: cachedTarget };
      }

      let matchedTarget: OverviewSuiteListLogTarget | null = null;
      try {
        const suiteRes = await fetchOverviewLaunchSuiteItems(Number(row.id));
        const matchedItem = pickMatchingSuiteItemForHistory(suiteRes.items, target);
        matchedTarget = matchedItem !== null ? suiteItemToLogTarget(matchedItem) : null;
      } catch {
        matchedTarget = null;
      }
      historyLaunchTargetCacheRef.current.set(row.id, matchedTarget);

      return { row, target: matchedTarget };
    },
    [],
  );

  const loadHistoryLaunches = useCallback(async () => {
    if (historyAnchorLaunch === null || historyAnchorTarget === null) {
      setHistoryLaunches([]);
      setHistoryLaunchesHiddenCount(0);
      setHistoryLaunchesNextBeforeId(null);
      return;
    }
    setHistoryLaunchesLoading(true);
    try {
      const res = await fetchOverviewLaunchHistory({
        testRunExecutionId: Number(historyAnchorLaunch.id),
        perPage: HISTORY_BUTTON_BATCH_SIZE,
        projectIds: selectedProjectIds.length > 0 ? selectedProjectIds : undefined,
        startFrom: resolvedStartFrom ?? undefined,
        startTo: resolvedStartTo ?? undefined,
        executionFilter: executionFilter === 'all' ? undefined : executionFilter,
      });
      const rowsForHistory = res.launches.map(mapApiRowToRow).reverse();
      const entries = await Promise.all(
        rowsForHistory.map(row => buildHistoryLaunchEntry(row, historyAnchorTarget)),
      );

      setHistoryLaunches(entries);
      setHistoryLaunchesHiddenCount(res.meta.hiddenCount);
      setHistoryLaunchesNextBeforeId(res.meta.nextBeforeTestRunExecutionId);
    } catch {
      setHistoryLaunches([]);
      setHistoryLaunchesHiddenCount(0);
      setHistoryLaunchesNextBeforeId(null);
    } finally {
      setHistoryLaunchesLoading(false);
    }
  }, [
    historyAnchorLaunch,
    historyAnchorTarget,
    selectedProjectIds,
    resolvedStartFrom,
    resolvedStartTo,
    executionFilter,
    buildHistoryLaunchEntry,
  ]);

  useEffect(() => {
    if (!inTestLogView) {
      setHistoryAnchorLaunch(null);
      setHistoryAnchorTarget(null);
      setHistoryLaunches([]);
      setHistoryLaunchesHiddenCount(0);
      setHistoryLaunchesNextBeforeId(null);
      setHistoryLaunchesLoading(false);
      return;
    }
  }, [inTestLogView]);

  useEffect(() => {
    if (!inTestLogView || historyAnchorLaunch === null || historyAnchorTarget === null) {
      return;
    }

    void loadHistoryLaunches();
  }, [inTestLogView, historyAnchorLaunch, historyAnchorTarget, loadHistoryLaunches]);

  const openHistoryLaunch = useCallback(async (launchId: string) => {
    if (historyAnchorLaunch === null || historyAnchorTarget === null) {
      return;
    }

    if (launchId === testLogLaunch?.id) {
      return;
    }

    const selectedLaunch =
      launchId === historyAnchorLaunch.id
        ? { row: historyAnchorLaunch }
        : historyLaunches.find(entry => entry.row.id === launchId);
    if (selectedLaunch === undefined) {
      return;
    }

    try {
      let matchedTarget: OverviewSuiteListLogTarget | null | undefined =
        historyLaunchTargetCacheRef.current.get(selectedLaunch.row.id);

      if (matchedTarget === undefined) {
        const suiteRes = await fetchOverviewLaunchSuiteItems(Number(selectedLaunch.row.id));
        const matchedItem = pickMatchingSuiteItemForHistory(suiteRes.items, historyAnchorTarget);
        matchedTarget = matchedItem !== null ? suiteItemToLogTarget(matchedItem) : null;
        historyLaunchTargetCacheRef.current.set(selectedLaunch.row.id, matchedTarget);
      }

      if (matchedTarget === null) {
        toast.error(`Could not find element "${historyAnchorTarget.displayName}" in selected launch.`);
        return;
      }

      navigateToLaunchesRoute(
        historyAnchorTarget.kind === 'test'
          ? {
              kind: 'test',
              testRunExecutionId: Number(historyAnchorLaunch.id),
              overviewTestId: historyAnchorTarget.overviewTestId,
            }
          : {
              kind: 'kw',
              testRunExecutionId: Number(historyAnchorLaunch.id),
              overviewSuiteKwId: historyAnchorTarget.overviewSuiteKwId,
            },
        false,
        launchId === historyAnchorLaunch.id ? null : Number(selectedLaunch.row.id),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not switch launch.');
    }
  }, [historyAnchorLaunch, historyAnchorTarget, historyLaunches, navigateToLaunchesRoute, testLogLaunch?.id]);

  const loadMoreHistoryLaunches = useCallback(async () => {
    if (
      historyAnchorLaunch === null ||
      historyAnchorTarget === null ||
      historyLaunchesLoading ||
      historyLaunchesHiddenCount <= 0 ||
      historyLaunchesNextBeforeId === null ||
      historyLaunches.length >= HISTORY_BUTTON_MAX_VISIBLE
    ) {
      return;
    }

    setHistoryLaunchesLoading(true);
    try {
      const remainingSlots = HISTORY_BUTTON_MAX_VISIBLE - historyLaunches.length;
      const res = await fetchOverviewLaunchHistory({
        testRunExecutionId: Number(historyAnchorLaunch.id),
        perPage: Math.min(HISTORY_BUTTON_BATCH_SIZE, remainingSlots),
        projectIds: selectedProjectIds.length > 0 ? selectedProjectIds : undefined,
        startFrom: resolvedStartFrom ?? undefined,
        startTo: resolvedStartTo ?? undefined,
        executionFilter: executionFilter === 'all' ? undefined : executionFilter,
        beforeTestRunExecutionId: historyLaunchesNextBeforeId,
      });
      const rowsForHistory = res.launches.map(mapApiRowToRow).reverse();
      const entries = await Promise.all(
        rowsForHistory.map(row => buildHistoryLaunchEntry(row, historyAnchorTarget)),
      );

      setHistoryLaunches(prev => [
        ...entries,
        ...prev,
      ]);
      if (remainingSlots <= HISTORY_BUTTON_BATCH_SIZE) {
        setHistoryLaunchesHiddenCount(0);
        setHistoryLaunchesNextBeforeId(null);
      } else {
        setHistoryLaunchesHiddenCount(res.meta.hiddenCount);
        setHistoryLaunchesNextBeforeId(res.meta.nextBeforeTestRunExecutionId);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not load older launches.');
    } finally {
      setHistoryLaunchesLoading(false);
    }
  }, [
    historyAnchorLaunch,
    historyAnchorTarget,
    historyLaunchesLoading,
    historyLaunchesHiddenCount,
    historyLaunchesNextBeforeId,
    historyLaunches.length,
    selectedProjectIds,
    resolvedStartFrom,
    resolvedStartTo,
    executionFilter,
    buildHistoryLaunchEntry,
  ]);

  const loadTestLog = useCallback(async () => {
    if (testLogLaunch === null || testLogTarget === null) {
      return;
    }
    setTestLogLoading(true);
    setTestLogError(null);
    try {
      const execId = Number(testLogLaunch.id);
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
  }, [testLogLaunch, testLogTarget]);

  const visibleHistoryLaunchEntries = useMemo(() => {
    if (historyLaunches.length > 0) {
      return historyLaunches;
    }

    if (testLogLaunch !== null) {
      return [{ row: testLogLaunch, target: testLogTarget } satisfies HistoryLaunchEntry];
    }

    return [];
  }, [historyLaunches, testLogLaunch, testLogTarget]);

  useEffect(() => {
    void loadTestLog();
  }, [loadTestLog]);

  /**
   * Returns from test log to the suite list (third level).
   */
  const clearTestLogOnly = useCallback(() => {
    if (drillLaunch === null) {
      return;
    }
    navigateToLaunchesRoute({ kind: 'suite', testRunExecutionId: Number(drillLaunch.id) }, false, null);
  }, [drillLaunch, navigateToLaunchesRoute]);

  /**
   * Returns from test log to the single root-suite row (second level).
   */
  const exitTestLogToLaunchLevel = useCallback(() => {
    if (drillLaunch === null) {
      return;
    }
    navigateToLaunchesRoute({ kind: 'launch', testRunExecutionId: Number(drillLaunch.id) }, false, null);
  }, [drillLaunch, navigateToLaunchesRoute]);

  const displayRows = useMemo(
    () => (drillLaunch !== null ? [buildDrillDownSuiteRow(drillLaunch)] : rows),
    [drillLaunch, rows],
  );

  const launchRowIdsOnPage = useMemo(() => displayRows.map(r => r.id), [displayRows]);

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

  // A launch is a cron launch if the filter is set to 'cron' OR if the specific
  // drilled-into launch has no human creator (createdByUserId === null means cron/automation).
  const isCronContext = executionFilter === 'cron' || drillLaunch?.source === 'cron';

  // Items eligible for checkbox selection: failed cron rows with an overviewTestId
  const selectableItems = useMemo(
    () => filteredSuiteItems.filter(
      item => isCronContext && item.statusBand === 'failed' && item.overviewTestId !== null,
    ),
    [filteredSuiteItems, isCronContext],
  );
  const allSelectableSelected = selectableItems.length > 0 && selectableItems.every(item => selectedTestIds.has(item.overviewTestId!));
  const someSelectableSelected = selectableItems.some(item => selectedTestIds.has(item.overviewTestId!));

  const toggleSelectAll = useCallback(() => {
    if (allSelectableSelected) {
      setSelectedTestIds(new Set());
    } else {
      setSelectedTestIds(new Set(selectableItems.map(item => item.overviewTestId!)));
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

  /** Updates the defectType slug on suite items after the modal applies. */
  const handleDefectApplied = useCallback((results: Array<{ overviewTestId: number; defect: OverviewTestDefect | null }>) => {
    setSuiteListItems(prev => {
      if (prev === null) return prev;
      const map = new Map(results.map(r => [r.overviewTestId, r.defect]));
      return prev.map(item =>
        item.overviewTestId !== null && map.has(item.overviewTestId)
          ? { ...item, defectType: map.get(item.overviewTestId)?.defectType.slug ?? null }
          : item,
      );
    });
    setSelectedTestIds(new Set());
  }, []);

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
    if (drillLaunch === null) {
      return;
    }
    navigateToLaunchesRoute({ kind: 'suite', testRunExecutionId: Number(drillLaunch.id) });
  }, [drillLaunch, navigateToLaunchesRoute]);

  const clearToAllLaunches = useCallback(() => {
    navigateToLaunchesRoute({ kind: 'list' }, false, null);
  }, [navigateToLaunchesRoute]);

  const clearSuiteListOnly = useCallback(() => {
    if (drillLaunch === null) {
      return;
    }
    navigateToLaunchesRoute({ kind: 'launch', testRunExecutionId: Number(drillLaunch.id) }, false, null);
  }, [drillLaunch, navigateToLaunchesRoute]);

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
      return 'All projects';
    }
    if (selectedProjectIds.length === 1) {
      return projectOptions.find(o => o.id === selectedProjectIds[0])?.name ?? '1 project';
    }
    return `${selectedProjectIds.length} projects`;
  }, [projectsLoading, projectOptions, selectedProjectIds]);

  const filteredProjectOptions = useMemo(() => {
    if (!projectsSearchTerm) return projectOptions;
    const lower = projectsSearchTerm.toLowerCase();
    return projectOptions.filter(o =>
      o.name.toLowerCase().includes(lower) ||
      (o.country ?? '').toLowerCase().includes(lower) ||
      (o.project_type ?? '').toLowerCase().includes(lower),
    );
  }, [projectOptions, projectsSearchTerm]);

  /**
   * Payload for {@link HistoryLaunchTooltip}: current drilled launch (suite list parent execution).
   */
  const drillLaunchHistoryTooltipButton = useMemo((): HistoryLaunchTooltipButtonModel | null => {
    if (drillLaunch === null) {
      return null;
    }
    const st = launchHistoryStatus(drillLaunch);
    return {
      id: drillLaunch.id,
      label: launchHistoryButtonLabel(drillLaunch),
      active: true,
      title: drillLaunch.title,
      statusLabel: st.label,
      statusBand: st.band,
      attributeLines: launchHistoryAttributeLines(drillLaunch.attributeText),
      durationLabel: drillLaunch.durationLabel,
    };
  }, [drillLaunch]);

  useEffect(() => {
    setSuiteListLaunchTooltip(null);
  }, [testLogTarget, drillLaunch?.id, suiteListItems]);

  useEffect(() => {
    if (suiteListLaunchTooltip === null) {
      return;
    }

    const clear = (): void => {
      setSuiteListLaunchTooltip(null);
    };

    const onDocMouseDown = (e: MouseEvent): void => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) {
        return;
      }
      if (t.closest('[data-overview-suite-launch-view]')) {
        return;
      }
      clear();
    };

    window.addEventListener('scroll', clear, true);
    window.addEventListener('resize', clear);
    document.addEventListener('mousedown', onDocMouseDown, true);

    return () => {
      window.removeEventListener('scroll', clear, true);
      window.removeEventListener('resize', clear);
      document.removeEventListener('mousedown', onDocMouseDown, true);
    };
  }, [suiteListLaunchTooltip]);

  useEffect(() => {
    if (suiteListLaunchTooltip === null) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setSuiteListLaunchTooltip(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [suiteListLaunchTooltip]);

  return (
    <>
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
              {/* Closed state: summary button; open state: search input */}
              {projectsDropdownOpen ? (
                <div className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-cyan-500 dark:border-cyan-500/70 rounded-md flex items-center gap-2">
                  <Search className="w-4 h-4 text-slate-400 dark:text-gray-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Search projects"
                    value={projectsSearchTerm}
                    onChange={e => setProjectsSearchTerm(e.target.value)}
                    className="flex-1 min-w-0 bg-transparent text-slate-900 dark:text-white text-sm placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none"
                    autoFocus
                    data-mipqa="ov-projects-search-input"
                  />
                  {projectsSearchTerm && (
                    <button
                      onClick={() => setProjectsSearchTerm('')}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <ChevronDown
                    className="w-4 h-4 text-slate-400 rotate-180 shrink-0 cursor-pointer"
                    onClick={() => { setProjectsDropdownOpen(false); setProjectsSearchTerm(''); }}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  id="ov-projects-filter-trigger"
                  aria-expanded={projectsDropdownOpen}
                  aria-haspopup="listbox"
                  aria-labelledby="ov-projects-filter-label ov-projects-filter-trigger"
                  onClick={() => setProjectsDropdownOpen(true)}
                  className={`w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 focus:border-transparent hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors text-left flex items-center justify-between ${
                    selectedProjectIds.length > 0 ? 'border-cyan-500/50 dark:border-cyan-500/40' : ''
                  }`}
                  data-mipqa="ov-projects-filter-trigger"
                >
                  <span className={`min-w-0 truncate text-sm font-medium ${selectedProjectIds.length > 0 ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-700 dark:text-gray-300'}`}>
                    {projectsDropdownSummary}
                  </span>
                  {projectsLoading ? (
                    <Loader2 className="w-4 h-4 text-slate-400 dark:text-gray-400 animate-spin shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 dark:text-gray-400 shrink-0" />
                  )}
                </button>
              )}

              {/* Dropdown Menu */}
              {projectsDropdownOpen && (
                <div
                  role="listbox"
                  aria-labelledby="ov-projects-filter-label"
                  className="absolute left-0 right-0 z-30 mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-xl flex flex-col"
                  style={{ maxHeight: '15rem' }}
                >
                  <div className="overflow-y-auto flex-1 sidebar-project-scrollbar" style={{ maxHeight: '12rem' }}>
                    {projectsLoading ? (
                      <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading projects…
                      </div>
                    ) : filteredProjectOptions.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                        {projectsSearchTerm ? `No projects found for "${projectsSearchTerm}"` : 'No projects available.'}
                      </div>
                    ) : (
                      <>
                        {filteredProjectOptions.length > 0 && (
                          <div className="px-4 pt-2 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-gray-500">
                            {projectsSearchTerm ? `${filteredProjectOptions.length} result${filteredProjectOptions.length !== 1 ? 's' : ''}` : 'Projects'}
                          </div>
                        )}
                        {filteredProjectOptions.map(opt => {
                          const isSelected = selectedProjectIds.includes(opt.id);
                          return (
                            <button
                              key={opt.id}
                              role="option"
                              aria-selected={isSelected}
                              onClick={() => toggleProjectFilter(opt.id)}
                              className={`w-full px-3 py-2 text-left transition-all duration-150 flex items-center gap-2 overflow-hidden ${
                                isSelected
                                  ? 'bg-cyan-500/10 dark:bg-cyan-500/15 border-l-[3px] border-cyan-500 dark:border-cyan-400'
                                  : 'border-l-[3px] border-transparent hover:bg-slate-100 dark:hover:bg-slate-700/60'
                              }`}
                              title={[opt.country, opt.name, opt.project_type].filter(Boolean).join(' - ')}
                              data-mipqa={`ov-project-option-${opt.id}`}
                            >
                              {isSelected && (
                                <span className="text-cyan-500 dark:text-cyan-400 font-bold text-xs shrink-0">✓</span>
                              )}
                              <span className="min-w-0 flex-1 flex items-center gap-1.5 overflow-hidden">
                                {opt.country && (
                                  <span className="shrink-0 text-xs font-semibold text-slate-400 dark:text-slate-500">
                                    {opt.country}
                                  </span>
                                )}
                                <span className={`text-sm font-medium leading-tight truncate min-w-0 ${isSelected ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-800 dark:text-gray-200'}`}>
                                  {opt.name}
                                </span>
                                {opt.project_type && (
                                  <span className="shrink-0 text-xs font-semibold text-slate-400 dark:text-slate-500">
                                    {opt.project_type}
                                  </span>
                                )}
                              </span>
                            </button>
                          );
                        })}
                      </>
                    )}
                  </div>

                  {/* Footer: clear selection */}
                  {selectedProjectIds.length > 0 && (
                    <div className="shrink-0 border-t border-slate-200 dark:border-slate-700">
                      <button
                        onClick={() => { setSelectedProjectIds([]); setPage(1); }}
                        className="w-full px-4 py-2.5 text-left text-sm font-medium transition-colors flex items-center gap-2 rounded-b-lg text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 hover:text-cyan-600 dark:hover:text-cyan-400"
                        data-mipqa="ov-projects-clear-filter"
                      >
                        Show all projects
                      </button>
                    </div>
                  )}
                </div>
              )}
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
              onChange={e => {
                setPage(1);
                setStartTimePreset(e.target.value as StartTimePreset);
              }}
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
              onChange={e => {
                setPage(1);
                setExecutionFilter(e.target.value as OverviewLaunchesExecutionFilter);
              }}
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
                setPage(1);
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
                  setPage(1);
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <span className="font-medium text-teal-600 dark:text-teal-400">
                Passed {passRatePercentFromLaunch(drillLaunch)}%
              </span>
              <span className="text-slate-400">|</span>
              <span>Total: {drillLaunch.total}</span>
            </div>
            {isCronContext && selectedTestIds.size > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 dark:text-slate-500"
                  data-mipqa="suite-selected-count">
                  {selectedTestIds.size} selected
                </span>
                <button
                  type="button"
                  data-mipqa="suite-make-decision-btn"
                  onClick={() => {
                    const targets = selectableItems
                      .filter(item => selectedTestIds.has(item.overviewTestId!))
                      .map(item => ({ overviewTestId: item.overviewTestId!, testName: item.name }));
                    if (targets.length > 0) setDefectModalTarget(targets);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500 transition-colors"
                >
                  Make Decision
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      {inSuiteListView && !inTestLogView ? (
        <div className="mb-3 border-b border-slate-200 dark:border-slate-700">
          <div className="flex flex-wrap gap-4 text-xs font-semibold uppercase tracking-wide">
            <span className="border-b-2 border-teal-500 pb-1.5 text-teal-600 dark:text-teal-400">
              List view
            </span>
          </div>
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        {inTestLogView && drillLaunch !== null && testLogTarget !== null ? (
          <OverviewTestLogView
            testDisplayName={testLogPayload?.testName ?? testLogTarget.displayName}
            items={testLogPayload?.items ?? []}
            testStatusLabel={testLogPayload?.testStatusLabel ?? '—'}
            historyButtons={visibleHistoryLaunchEntries.map(entry => ({
              id: entry.row.id,
              label: launchHistoryButtonLabel(entry.row),
              active: testLogLaunch?.id === entry.row.id,
              title: entry.row.title,
              statusLabel: entry.target?.statusLabel ?? 'Unknown',
              statusBand: entry.target?.statusBand,
              attributeLines: launchHistoryAttributeLines(entry.row.attributeText),
              durationLabel: entry.target?.durationLabel ?? historyAnchorTarget?.durationLabel ?? testLogTarget.durationLabel,
            }))}
            hiddenHistoryButtonsCount={
              historyLaunches.length >= HISTORY_BUTTON_MAX_VISIBLE || historyLaunchesHiddenCount <= 0
                ? 0
                : HISTORY_BUTTON_BATCH_SIZE
            }
            onShowMoreHistoryButtons={() => {
              void loadMoreHistoryLaunches();
            }}
            historyButtonsLoading={historyLaunchesLoading}
            onSelectHistoryButton={launchId => {
              void openHistoryLaunch(launchId);
            }}
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
            suiteListStatusBand={testLogTarget.statusBand}
            suiteListStartTimeRelative={testLogTarget.startTimeRelative}
            suiteListStartTimeDisplay={testLogTarget.startTimeDisplay}
            suiteListStartTimeRaw={testLogTarget.startTimeRaw}
            suiteListDurationLabel={testLogTarget.durationLabel}
            loading={testLogLoading}
            error={testLogError}
            onRefresh={() => void loadTestLog()}
            hoveredTimeRowKey={hoveredLogTimeRowKey}
            onHoverTimeRow={setHoveredLogTimeRowKey}
            isCronContext={isCronContext}
            overviewTestId={testLogTarget.kind === 'test' ? testLogTarget.overviewTestId : null}
            defectTypes={defectTypes}
            onDefectApplied={(overviewTestId, applied) => handleDefectApplied([{ overviewTestId, defect: applied }])}
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
            </colgroup>
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80">
              <tr className="text-left">
                <th className="py-3 pl-4 pr-2">
                  {isCronContext && selectableItems.length > 0 ? (
                    <label data-mipqa="suite-select-all-checkbox" className="relative inline-flex h-4 w-4 cursor-pointer select-none items-center justify-center">
                      <input
                        type="checkbox"
                        checked={allSelectableSelected}
                        ref={el => { if (el) el.indeterminate = someSelectableSelected && !allSelectableSelected; }}
                        onChange={toggleSelectAll}
                        className="sr-only"
                      />
                      <span className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${allSelectableSelected ? 'border-cyan-500 bg-cyan-500' : someSelectableSelected ? 'border-cyan-500 bg-cyan-500/30' : 'border-slate-500 bg-slate-700/60 hover:border-slate-400'}`}>
                        {someSelectableSelected && !allSelectableSelected ? (
                          <span className="block h-0.5 w-2 rounded-full bg-cyan-400" />
                        ) : allSelectableSelected ? (
                          <svg viewBox="0 0 10 8" className="h-2.5 w-2.5 fill-none stroke-white stroke-2"><polyline points="1,4 4,7 9,1" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        ) : null}
                      </span>
                    </label>
                  ) : (
                    <Link2 className="h-4 w-4 text-slate-400" aria-hidden />
                  )}
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
                const isFailed =
                  item.statusBand === 'failed' ||
                  item.statusLabel.toUpperCase().includes('FAIL');
                return (
                  <tr
                    key={rowKey}
                    className={`transition-colors ${isFailed ? 'bg-red-100 dark:bg-red-900/40 hover:bg-red-200/70 dark:hover:bg-red-900/60' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'}`}
                  >
                    <td className="py-3 pl-4 pr-2 align-top text-slate-400">
                      {isCronContext && item.statusBand === 'failed' && item.overviewTestId !== null ? (
                        <label
                          data-mipqa={`suite-row-checkbox-${item.overviewTestId}`}
                          className="relative inline-flex h-4 w-4 cursor-pointer select-none items-center justify-center"
                          onClick={e => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={selectedTestIds.has(item.overviewTestId)}
                            onChange={() => toggleSelectItem(item.overviewTestId!)}
                            className="sr-only"
                          />
                          <span className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${selectedTestIds.has(item.overviewTestId) ? 'border-cyan-500 bg-cyan-500' : 'border-slate-500 bg-slate-700/60 hover:border-slate-400'}`}>
                            {selectedTestIds.has(item.overviewTestId) && (
                              <svg viewBox="0 0 10 8" className="h-2.5 w-2.5 fill-none stroke-white stroke-2"><polyline points="1,4 4,7 9,1" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            )}
                          </span>
                        </label>
                      ) : (
                        <span className="inline-flex p-1" aria-hidden="true" />
                      )}
                    </td>
                    <td className="py-3 pr-2 align-top text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {item.methodType}
                    </td>
                    <td className="min-w-0 break-words py-3 pr-4 align-top">
                      {item.overviewTestId !== null ? (
                        <button
                          type="button"
                          onClick={() => {
                            const overviewTestId = item.overviewTestId;
                            if (overviewTestId === null || drillLaunch === null) {
                              return;
                            }
                            const nextTarget: OverviewSuiteListLogTarget = {
                              kind: 'test',
                              overviewTestId,
                              displayName: item.name,
                              methodType: item.methodType,
                              statusLabel: item.statusLabel,
                              statusBand: item.statusBand,
                              startTimeRelative: item.startTimeRelative,
                              startTimeDisplay: item.startTimeDisplay,
                              startTimeRaw: item.startTimeRaw,
                              durationLabel: item.durationLabel,
                              suiteSourceRelative: item.suiteSourceRelative ?? null,
                              overviewTestLine: item.overviewTestLine ?? null,
                            };
                            historyLaunchTargetCacheRef.current = new Map([[drillLaunch.id, nextTarget]]);
                            navigateToLaunchesRoute({
                              kind: 'test',
                              testRunExecutionId: Number(drillLaunch.id),
                              overviewTestId,
                            }, false, null);
                          }}
                          className="block text-left font-semibold text-cyan-600 dark:text-cyan-400 hover:underline [overflow-wrap:anywhere]"
                        >
                          {item.name}
                        </button>
                      ) : item.overviewSuiteKwId !== null ? (
                        <button
                          type="button"
                          onClick={() => {
                            const overviewSuiteKwId = item.overviewSuiteKwId;
                            if (overviewSuiteKwId === null || drillLaunch === null) {
                              return;
                            }
                            const nextTarget: OverviewSuiteListLogTarget = {
                              kind: 'suite_kw',
                              overviewSuiteKwId,
                              displayName: item.name,
                              methodType: item.methodType,
                              statusLabel: item.statusLabel,
                              statusBand: item.statusBand,
                              startTimeRelative: item.startTimeRelative,
                              startTimeDisplay: item.startTimeDisplay,
                              startTimeRaw: item.startTimeRaw,
                              durationLabel: item.durationLabel,
                              suiteSourceRelative: item.suiteSourceRelative ?? null,
                              overviewTestLine: item.overviewTestLine ?? null,
                            };
                            historyLaunchTargetCacheRef.current = new Map([[drillLaunch.id, nextTarget]]);
                            navigateToLaunchesRoute({
                              kind: 'kw',
                              testRunExecutionId: Number(drillLaunch.id),
                              overviewSuiteKwId,
                            }, false, null);
                          }}
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
                      {isFailed && item.errorMessages != null && item.errorMessages.length > 0 ? (
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
                              {item.errorMessages.map((msg, i) => (
                                <p key={i} className="text-xs text-red-700 dark:text-red-300 font-mono [overflow-wrap:anywhere]">
                                  {msg}
                                </p>
                              ))}
                            </div>
                          ) : (
                            <p className="truncate text-xs text-red-700 dark:text-red-300 font-mono">
                              {item.errorMessages[0]}
                            </p>
                          )}
                        </button>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap py-3 px-2 align-top text-slate-700 dark:text-slate-300">
                      <span className="inline-flex items-center gap-1">
                        {item.statusLabel !== '—' ? item.statusLabel.toUpperCase() : '—'}
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
                      {isCronContext && item.statusBand === 'failed' && item.overviewTestId !== null ? (
                        (() => {
                          const resolved = item.defectType ? defectTypeBySlug.get(item.defectType) : null;
                          return resolved != null ? (
                            <button
                              type="button"
                              data-mipqa="defect-badge-btn"
                              onClick={() => setDefectModalTarget([{ overviewTestId: item.overviewTestId!, testName: item.name }])}
                              className="inline-flex items-center gap-1.5 rounded-full border border-slate-600 bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-200 hover:border-slate-400 hover:bg-slate-700 transition-colors"
                            >
                              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: resolved.color }} />
                              {resolved.name}
                            </button>
                          ) : (
                            <button
                              type="button"
                              data-mipqa="defect-make-decision-btn"
                              onClick={() => setDefectModalTarget([{ overviewTestId: item.overviewTestId!, testName: item.name }])}
                              className="inline-flex items-center gap-1 rounded-md border border-dashed border-slate-600 bg-transparent px-2.5 py-0.5 text-xs font-medium text-slate-400 hover:border-cyan-500 hover:text-cyan-400 transition-colors"
                            >
                              Make Decision
                            </button>
                          );
                        })()
                      ) : (
                        item.defectType === null || item.defectType === '' ? (
                          <span className="text-slate-400 dark:text-slate-600">{'\u2014'}</span>
                        ) : (
                          (() => {
                            const dt = defectTypeBySlug.get(item.defectType!);
                            return dt != null ? (
                              <span className="inline-flex items-center gap-1.5 text-xs">
                                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: dt.color }} />
                                {dt.name}
                              </span>
                            ) : (
                              <span>{item.defectType}</span>
                            );
                          })()
                        )
                      )}
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
                  Ran By
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
                        onClick={() =>
                          navigateToLaunchesRoute({
                            kind: 'launch',
                            testRunExecutionId: Number(row.id),
                          })
                        }
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
                    ) : row.createdByUserId === null ? (
                      <span className="inline-flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 shrink-0 text-teal-600 dark:text-teal-400" aria-hidden />
                        <span className="break-words [overflow-wrap:anywhere]">Cron</span>
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
      {suiteListLaunchTooltip !== null && drillLaunchHistoryTooltipButton !== null ? (
        <HistoryLaunchTooltip
          button={drillLaunchHistoryTooltipButton}
          top={suiteListLaunchTooltip.top}
          left={suiteListLaunchTooltip.left}
        />
      ) : null}
    </div>
    {defectModalTarget !== null && (
      <DefectSelectionModal
        targets={defectModalTarget}
        defectTypes={defectTypes}
        onClose={() => setDefectModalTarget(null)}
        onApplied={results => handleDefectApplied(results)}
      />
    )}
    </>
  );
};

export default OverviewLaunchesTable;
