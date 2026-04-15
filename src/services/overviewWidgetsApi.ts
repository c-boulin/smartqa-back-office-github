import { apiService } from './api';
import { projectsApiService, type ApiProject } from './projectsApi';

export interface OverviewWidgetsWindow {
  from: string;
  to: string;
  /** Always 7 for the previous Monday–Sunday window. */
  days: number;
  preset: 'previous_calendar_week' | string;
}

export interface OverviewWeeklyTotals {
  pass: number;
  fail: number;
  passRate: number | null;
}

export interface OverviewDefectMixItem {
  tag: string;
  label: string;
  failCount: number;
  percent: number | null;
}

export interface OverviewExecutionRow {
  key: string;
  label: string;
  pass: number;
  fail: number;
  passRate: number | null;
  band: 'passed' | 'failed' | string;
}

export interface OverviewDefectSeriesRow {
  date: string;
  label: string;
  [tagKey: string]: string | number;
}

export interface OverviewDefectSeriesProject {
  projectId: number;
  label: string;
  series: OverviewDefectSeriesRow[];
}

export interface OverviewWidgetsResponse {
  window: OverviewWidgetsWindow;
  weeklyTotals: OverviewWeeklyTotals;
  defectMix: OverviewDefectMixItem[];
  executionByService: OverviewExecutionRow[];
  executionByCountry: OverviewExecutionRow[];
  /** Same `key` as `executionByService[].key` → rows grouped by `projects.country` for that suite. */
  executionByCountryByService: Record<string, OverviewExecutionRow[]>;
  defectSeriesByProject: OverviewDefectSeriesProject[];
}

/**
 * Fetches overview widget aggregates (SmartQA API).
 * Weekly pass/fail totals come from test case executions; defect mix from Robot XML mirror (overview_*).
 * `defectSeriesByProject` is one row per service (test suite) with server-generated placeholder stacked counts.
 */
export async function fetchOverviewWidgets(): Promise<OverviewWidgetsResponse> {
  return apiService.authenticatedRequest('/widgets/overview', {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  }) as Promise<OverviewWidgetsResponse>;
}

/** One Overview Launches tab row (joins test_run_executions with overview_* XML mirror). */
export interface OverviewLaunchApiRow {
  testRunExecutionId: number;
  displayName: string;
  /** Root suite row `overview_suites.name` (MIN suite_id where parent is null) for this robot. */
  rootOverviewSuiteName: string | null;
  durationLabel: string;
  /** Launch creator: `roles.slug` when set, else user login / email (API). */
  ownerLabel: string;
  /** Executor display name: `users.name` for `test_run_executions.created_by` when set. */
  runnedByLabel: string;
  /** `test_run_executions.created_by` when set. */
  createdByUserId: number | null;
  attributeLine: string;
  /** Default Start time column: relative phrase from `overview_statuses.start` (e.g. "5 minutes ago"). */
  startTimeRelative: string;
  /** Absolute time in app timezone (Y-m-d H:i:s), shown on cell hover. */
  startTimeDisplay: string;
  /** Trimmed DB value of `overview_statuses.start`; preferred for hover when set. */
  startTimeRaw: string | null;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  productBug: number;
  autoBug: number;
  systemIssue: number;
  toInvestigate: number;
}

export interface OverviewLaunchesMeta {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
}

export interface OverviewLaunchesResponse {
  launches: OverviewLaunchApiRow[];
  meta: OverviewLaunchesMeta;
}

/** Who created the test run execution: no filter, current user, or null creator (cron / automation). */
export type OverviewLaunchesExecutionFilter = 'all' | 'me' | 'cron';

/** Column ids for GET /widgets/overview/launches sorting (server-side). */
export type OverviewLaunchesSortColumn =
  | 'tre_id'
  | 'name'
  | 'start_time'
  | 'duration'
  | 'total'
  | 'passed'
  | 'failed'
  | 'skipped'
  | 'product_bug'
  | 'auto_bug'
  | 'system_issue'
  | 'to_investigate';

export interface FetchOverviewLaunchesParams {
  page?: number;
  perPage?: number;
  sort?: OverviewLaunchesSortColumn;
  direction?: 'asc' | 'desc';
  /** Restrict to these SmartQA project ids; omit or empty = all projects. */
  projectIds?: number[];
  /**
   * Lower bound for launch `start` time. Pass `Y-m-d` for a calendar day or `Y-m-d H:i:s` / ISO-like
   * strings for an exact bound (server parses in app timezone unless offset is present).
   */
  startFrom?: string;
  /** Upper bound; same formats as {@link FetchOverviewLaunchesParams.startFrom}. */
  startTo?: string;
  /**
   * `me` → `executed_by=me` (created_by = current user); `cron` → `executed_by=cron` (created_by IS NULL).
   * Omit or `all` → no execution filter.
   */
  executionFilter?: OverviewLaunchesExecutionFilter;
  /** Restrict to a single launch row (`test_run_executions.id`) for deep links. */
  testRunExecutionId?: number;
}

/** Label + id for overview launch project filter (non-template projects). */
export interface OverviewLaunchesProjectOption {
  id: number;
  name: string;
}

/** Session cache so revisiting the Launches tab does not re-fetch every project page. */
let overviewLaunchesProjectOptionsCache: OverviewLaunchesProjectOption[] | null = null;
/** Single in-flight load so concurrent callers share one network round-trip set. */
let overviewLaunchesProjectOptionsInflight: Promise<OverviewLaunchesProjectOption[]> | null = null;

/**
 * Maps `/projects` rows to Launches filter options (id + title).
 */
function mapApiProjectsToOverviewOptions(data: ApiProject[]): OverviewLaunchesProjectOption[] {
  return data.map((p: ApiProject) => ({
    id: p.attributes.id,
    name: p.attributes.title ?? '',
  }));
}

/**
 * Fetches every page of non-template projects (paginated server-side) for the Launches tab filter.
 * Pages after the first are requested in parallel to reduce total wait time.
 */
async function loadAllOverviewLaunchesProjectOptions(): Promise<OverviewLaunchesProjectOption[]> {
  const perPage = 100;
  const first = await projectsApiService.getProjectsWithSort(1, perPage);
  const options: OverviewLaunchesProjectOption[] = mapApiProjectsToOverviewOptions(first.data);
  const totalPages = Math.max(1, Math.ceil(first.meta.totalItems / first.meta.itemsPerPage));

  if (totalPages > 1) {
    const restPages = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) =>
        projectsApiService.getProjectsWithSort(i + 2, perPage),
      ),
    );
    for (const res of restPages) {
      options.push(...mapApiProjectsToOverviewOptions(res.data));
    }
  }

  options.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  return options;
}

/**
 * Loads all non-template projects for the Launches tab filter (cached for the SPA session).
 */
export async function fetchAllOverviewLaunchesProjectOptions(): Promise<OverviewLaunchesProjectOption[]> {
  if (overviewLaunchesProjectOptionsCache !== null) {
    return overviewLaunchesProjectOptionsCache;
  }
  if (overviewLaunchesProjectOptionsInflight === null) {
    overviewLaunchesProjectOptionsInflight = loadAllOverviewLaunchesProjectOptions()
      .then(data => {
        overviewLaunchesProjectOptionsCache = data;
        return data;
      })
      .finally(() => {
        overviewLaunchesProjectOptionsInflight = null;
      });
  }

  return overviewLaunchesProjectOptionsInflight;
}

/**
 * Fetches execution rows for the Overview Launches tab (Robot XML mirror joined to executions).
 */
export async function fetchOverviewLaunches(
  params: FetchOverviewLaunchesParams = {},
): Promise<OverviewLaunchesResponse> {
  const search = new URLSearchParams();
  if (params.page != null) {
    search.set('page', String(params.page));
  }
  if (params.perPage != null) {
    search.set('per_page', String(params.perPage));
  }
  if (params.sort != null && params.sort !== '') {
    search.set('sort', params.sort);
  }
  if (params.direction != null) {
    search.set('direction', params.direction);
  }
  if (params.projectIds != null && params.projectIds.length > 0) {
    search.set('project_ids', params.projectIds.join(','));
  }
  if (params.startFrom != null && params.startFrom !== '') {
    search.set('start_from', params.startFrom);
  }
  if (params.startTo != null && params.startTo !== '') {
    search.set('start_to', params.startTo);
  }
  if (params.executionFilter === 'me') {
    search.set('executed_by', 'me');
  } else if (params.executionFilter === 'cron') {
    search.set('executed_by', 'cron');
  }
  if (params.testRunExecutionId != null && params.testRunExecutionId > 0) {
    search.set('test_run_execution_id', String(params.testRunExecutionId));
  }
  const qs = search.toString();
  const path = qs ? `/widgets/overview/launches?${qs}` : '/widgets/overview/launches';

  return apiService.authenticatedRequest(path, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  }) as Promise<OverviewLaunchesResponse>;
}

/** One row in the suite list view (`overview_tests` + suite-level `overview_kws`). */
export interface OverviewLaunchSuiteItemApiRow {
  methodType: string;
  name: string;
  durationLabel: string;
  statusLabel: string;
  startTimeRelative: string;
  startTimeDisplay: string;
  startTimeRaw: string | null;
  defectType: string | null;
  /** `overview_tests.test_id` when this row is a test; otherwise null. */
  overviewTestId: number | null;
  /** Suite-level `overview_kws.kw_id` when this row is a suite keyword; otherwise null. */
  overviewSuiteKwId: number | null;
  /** Path from `Suites/` onward from `overview_suites.source`; null if not present. */
  suiteSourceRelative: string | null;
  /** `overview_tests.line` for test rows; always null for suite-keyword rows. */
  overviewTestLine: number | null;
}

export interface OverviewLaunchSuiteItemsResponse {
  items: OverviewLaunchSuiteItemApiRow[];
}

/**
 * Fetches direct child tests and suite keywords under the root suite for a launch (XML mirror).
 */
export async function fetchOverviewLaunchSuiteItems(
  testRunExecutionId: number,
): Promise<OverviewLaunchSuiteItemsResponse> {
  return apiService.authenticatedRequest(
    `/widgets/overview/launches/${testRunExecutionId}/suite-items`,
    {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    },
  ) as Promise<OverviewLaunchSuiteItemsResponse>;
}

/** Shared time/status fields on log rows (keyword accordion header or `overview_msgs` leaf). */
export interface OverviewTestLogItemApiRow {
  logMessage: string;
  statusLabel: string;
  durationLabel: string;
  startTimeRelative: string;
  startTimeDisplay: string;
  startTimeRaw: string | null;
}

/** One `overview_kws` node: expand to show child keywords and/or `overview_msgs` (seq order). */
export interface OverviewTestLogKeywordApiNode extends OverviewTestLogItemApiRow {
  kind: 'keyword';
  kwId: number;
  /** Raw Robot keyword type from `overview_kws.type` (e.g. SETUP, TEARDOWN); empty when null in DB. */
  kwType: string;
  /** Rows in `overview_msgs` with a non-empty `screenshot_object_key` for this keyword. */
  screenshotAttachmentCount: number;
  children: OverviewTestLogTreeNode[];
}

/** One `overview_msgs` row (shown when a keyword is expanded). */
export interface OverviewTestLogMessageApiNode extends OverviewTestLogItemApiRow {
  kind: 'message';
  msgId: number;
  /** CDN object key when present; thumbnail is shown in the All logs table. */
  screenshotObjectKey: string | null;
}

export type OverviewTestLogTreeNode = OverviewTestLogKeywordApiNode | OverviewTestLogMessageApiNode;

export interface OverviewTestLogItemsResponse {
  testName: string;
  testStatusLabel: string;
  /** Path from `Suites/` onward from `overview_suites.source`; null if missing. */
  suiteSourceRelative: string | null;
  /** `overview_tests.line` for test logs; null for suite-keyword logs. */
  testLine: number | null;
  /** Accordion roots: keywords with nested `children` (keywords + messages). */
  items: OverviewTestLogTreeNode[];
}

/**
 * Fetches log-style rows (SETUP / KEYWORD / TEARDOWN) for one `overview_tests` row.
 */
export async function fetchOverviewTestLogItems(
  testRunExecutionId: number,
  overviewTestId: number,
): Promise<OverviewTestLogItemsResponse> {
  return apiService.authenticatedRequest(
    `/widgets/overview/launches/${testRunExecutionId}/overview-tests/${overviewTestId}/log-items`,
    {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    },
  ) as Promise<OverviewTestLogItemsResponse>;
}

/**
 * Same JSON shape as test log: direct child `overview_kws` under a top-level suite-scoped keyword.
 */
export async function fetchOverviewSuiteKwLogItems(
  testRunExecutionId: number,
  overviewSuiteKwId: number,
): Promise<OverviewTestLogItemsResponse> {
  return apiService.authenticatedRequest(
    `/widgets/overview/launches/${testRunExecutionId}/overview-suite-kws/${overviewSuiteKwId}/log-items`,
    {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    },
  ) as Promise<OverviewTestLogItemsResponse>;
}
