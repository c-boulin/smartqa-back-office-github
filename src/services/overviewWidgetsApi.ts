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
  /** Real SmartQA project ids backing this row (service, country, or country-under-service). */
  projectIds: number[];
}

export interface OverviewDefectSeriesRow {
  date: string;
  label: string;
  [tagKey: string]: string | number;
}

export interface OverviewDefectSeriesProject {
  /** Same value as `executionByService[].key` for the same service. */
  key: string;
  projectId: number;
  label: string;
  /** Total defect assignments in the window for this service. */
  totalIssues: number;
  /** Dominant defect category label; null when there are no issues. */
  topIssueCategory: string | null;
  topIssueCategoryCount: number;
  topIssueCategoryPercent: number | null;
  /** Real pass rate from Robot XML stats: pass / (pass + fail). null when no executions. */
  passRate: number | null;
  /** Executed tests in the window (pass + fail), not distinct test-case definitions. */
  testCases: number;
  /** Countries with failures; falls back to countries with any executions when none failed. */
  affectedCountries: string[];
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

export interface FetchOverviewWidgetsParams {
  projectIds?: number[];
  gitlabProjectNames?: string[];
}

/**
 * Fetches overview widget aggregates (SmartQA API).
 * Weekly pass/fail totals come from test case executions; defect mix from Robot XML mirror (overview_*).
 * `defectSeriesByProject` is one row per service (test suite) with server-generated stacked counts.
 */
export async function fetchOverviewWidgets(params?: FetchOverviewWidgetsParams): Promise<OverviewWidgetsResponse> {
  const search = new URLSearchParams();
  if (params?.projectIds != null && params.projectIds.length > 0) {
    search.set('project_ids', params.projectIds.join(','));
  }
  if (params?.gitlabProjectNames != null && params.gitlabProjectNames.length > 0) {
    search.set('gitlab_project_name', params.gitlabProjectNames.join(','));
  }
  const qs = search.toString();
  const path = qs ? `/widgets/overview?${qs}` : '/widgets/overview';

  return apiService.authenticatedRequest(path, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  }) as Promise<OverviewWidgetsResponse>;
}

/** One Overview Launches tab row (joins test_run_executions with overview_* XML mirror). */
export interface OverviewLaunchApiRow {
  testRunExecutionId: number;
  projectId: number;
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
  /** "cron" when the launch was triggered by automation/scheduler, "app" when triggered by a user. */
  source: string | null;
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

export interface OverviewLaunchHistoryMeta {
  perPage: number;
  hiddenCount: number;
  nextBeforeTestRunExecutionId: number | null;
}

export interface OverviewLaunchHistoryResponse {
  launches: OverviewLaunchApiRow[];
  meta: OverviewLaunchHistoryMeta;
}

export interface FetchOverviewLaunchHistoryParams {
  testRunExecutionId: number;
  perPage?: number;
  projectIds?: number[];
  gitlabProjectNames?: string[];
  startFrom?: string;
  startTo?: string;
  executionFilter?: OverviewLaunchesExecutionFilter;
  beforeTestRunExecutionId?: number;
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
  /** Filter by GitLab repository names (exact match on project.gitlab_project_name); joined as CSV. */
  gitlabProjectNames?: string[];
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
  /** Content filter: keep only launches whose overall status matches (server-side). */
  status?: 'passed' | 'failed';
  /** Content filter: keep only launches with at least one test of this defect tag.
   *  Accepts any `overview_defect_types.slug` (e.g. `no-defect`, `network`, `product-bug`)
   *  or a legacy group alias (`product_bug`, `auto_bug`, `system_issue`, `to_investigate`). */
  defectTag?: string;
  /** Content filter: keep only launches that have any triaged defect. */
  hasIssues?: boolean;
}

/** Label + id for overview launch project filter (projects that have at least one launch). */
export interface OverviewLaunchesProjectOption {
  id: number;
  name: string;
  country?: string;
  project_type?: string;
  gitlab_project_name?: string;
}

const PER_PAGE = 200;

/**
 * Fetches projects from /api/projects-list that have at least one launch.
 * When `gitlabProjectNames` is supplied, only projects belonging to those repos are returned.
 */
export async function fetchAllOverviewLaunchesProjectOptions(
  gitlabProjectNames?: string[],
): Promise<OverviewLaunchesProjectOption[]> {
  const first = await fetchOverviewLaunches({
    page: 1,
    perPage: PER_PAGE,
    gitlabProjectNames: gitlabProjectNames && gitlabProjectNames.length > 0 ? gitlabProjectNames : undefined,
  });
  const projectIds = new Set<number>(first.launches.map(l => l.projectId));

  if (first.meta.lastPage > 1) {
    const rest = await Promise.all(
      Array.from({ length: first.meta.lastPage - 1 }, (_, i) =>
        fetchOverviewLaunches({
          page: i + 2,
          perPage: PER_PAGE,
          gitlabProjectNames: gitlabProjectNames && gitlabProjectNames.length > 0 ? gitlabProjectNames : undefined,
        }),
      ),
    );
    for (const page of rest) {
      for (const l of page.launches) projectIds.add(l.projectId);
    }
  }

  if (projectIds.size === 0) return [];

  // Resolve names via /api/projects-list, scoped to the repo filter when provided.
  const firstProjects = await projectsApiService.getProjectsList(
    1,
    100,
    undefined,
    undefined,
    gitlabProjectNames && gitlabProjectNames.length > 0 ? gitlabProjectNames : undefined,
  );
  const allProjectListItems = [...firstProjects.data];
  const totalProjectPages = Math.max(1, Math.ceil(firstProjects.meta.totalItems / firstProjects.meta.itemsPerPage));
  if (totalProjectPages > 1) {
    const restProjects = await Promise.all(
      Array.from({ length: totalProjectPages - 1 }, (_, i) =>
        projectsApiService.getProjectsList(
          i + 2,
          100,
          undefined,
          undefined,
          gitlabProjectNames && gitlabProjectNames.length > 0 ? gitlabProjectNames : undefined,
        ),
      ),
    );
    for (const res of restProjects) allProjectListItems.push(...res.data);
  }

  const options: OverviewLaunchesProjectOption[] = allProjectListItems
    .filter(p => projectIds.has(p.attributes.id))
    .map(p => {
      const t = projectsApiService.transformApiProject(p);
      return {
        id: p.attributes.id,
        name: t.name ?? '',
        country: t.country ?? undefined,
        project_type: t.project_type ?? undefined,
        gitlab_project_name: t.gitlab_project_name ?? undefined,
      };
    });

  options.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  return options;
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
  if (params.gitlabProjectNames != null && params.gitlabProjectNames.length > 0) {
    search.set('gitlab_project_name', params.gitlabProjectNames.join(','));
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
  if (params.status != null) {
    search.set('status', params.status);
  }
  if (params.defectTag != null) {
    search.set('defect_tag', params.defectTag);
  }
  if (params.hasIssues === true) {
    search.set('has_issues', '1');
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

export async function fetchOverviewLaunchHistory(
  params: FetchOverviewLaunchHistoryParams,
): Promise<OverviewLaunchHistoryResponse> {
  const search = new URLSearchParams();
  if (params.perPage != null) {
    search.set('per_page', String(params.perPage));
  }
  if (params.projectIds != null && params.projectIds.length > 0) {
    search.set('project_ids', params.projectIds.join(','));
  }
  if (params.gitlabProjectNames != null && params.gitlabProjectNames.length > 0) {
    search.set('gitlab_project_name', params.gitlabProjectNames.join(','));
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
  if (params.beforeTestRunExecutionId != null && params.beforeTestRunExecutionId > 0) {
    search.set('before_test_run_execution_id', String(params.beforeTestRunExecutionId));
  }

  const qs = search.toString();
  const basePath = `/widgets/overview/launches/${params.testRunExecutionId}/history`;
  const path = qs ? `${basePath}?${qs}` : basePath;

  return apiService.authenticatedRequest(path, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  }) as Promise<OverviewLaunchHistoryResponse>;
}

/** One row in the suite list view (`overview_tests` + suite-level `overview_kws`). */
export interface OverviewLaunchSuiteItemApiRow {
  methodType: string;
  name: string;
  durationLabel: string;
  statusLabel: string;
  statusBand?: string;
  startTimeRelative: string;
  startTimeDisplay: string;
  startTimeRaw: string | null;
  defectType: string | null;
  /** Error messages from failed log entries; null when not applicable. */
  errorMessages: string[] | null;
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
  statusBand?: string;
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

// ---------------------------------------------------------------------------
// Defect types
// ---------------------------------------------------------------------------

export interface OverviewDefectType {
  id: number;
  name: string;
  slug: string;
  color: string;
  isDefault: boolean;
}

export interface OverviewDefectTypesResponse {
  data: OverviewDefectType[];
}

export async function fetchOverviewDefectTypes(): Promise<OverviewDefectType[]> {
  const res = await apiService.authenticatedRequest('/overview-defect-types', {
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  }) as OverviewDefectTypesResponse;
  return res.data;
}

// ---------------------------------------------------------------------------
// Test defect assignment
// ---------------------------------------------------------------------------

export interface OverviewTestDefect {
  id: number;
  overviewTestId: number;
  defectType: { id: number; name: string; slug: string; color: string };
  comment: string;
  ignoreInAutoAnalysis: boolean;
  assignedBy: number | null;
  updatedAt: string;
}

export interface OverviewTestDefectResponse {
  data: OverviewTestDefect | null;
}

export async function fetchOverviewTestDefect(overviewTestId: number): Promise<OverviewTestDefect | null> {
  const res = await apiService.authenticatedRequest(`/overview-tests/${overviewTestId}/defect`, {
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  }) as OverviewTestDefectResponse;
  return res.data;
}

export async function putOverviewTestDefect(
  overviewTestId: number,
  payload: { defect_type_id: number; comment: string; ignore_in_auto_analysis: boolean },
): Promise<OverviewTestDefect> {
  const res = await apiService.authenticatedRequest(`/overview-tests/${overviewTestId}/defect`, {
    method: 'PUT',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }) as OverviewTestDefectResponse;
  return res.data!;
}

export async function deleteOverviewTestDefect(overviewTestId: number): Promise<void> {
  await apiService.authenticatedRequest(`/overview-tests/${overviewTestId}/defect`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  });
}

// ---------------------------------------------------------------------------
// Overview individual tests list (Widget → tests deep-link target)
// ---------------------------------------------------------------------------

/** One row of GET /widgets/overview/tests (individual failed/passed tests, RP style). */
export interface OverviewTestApiRow {
  methodType: string;
  name: string;
  durationLabel: string;
  statusLabel: string;
  statusBand?: string;
  startTimeRelative: string;
  startTimeDisplay: string;
  startTimeRaw: string | null;
  defectType: string | null;
  errorMessages: string[] | null;
  overviewTestId: number | null;
  /** Always null for individual test rows; kept for parity with suite-items. */
  overviewSuiteKwId: number | null;
  suiteSourceRelative: string | null;
  overviewTestLine: number | null;
  testRunExecutionId: number;
  projectId: number;
  launchTitle: string;
  projectName: string;
  rootOverviewSuiteName: string | null;
  serviceKey: string | null;
  countryKey: string | null;
}

/** Server-side sortable columns for GET /widgets/overview/tests. */
export type OverviewTestsSortColumn = 'start_time' | 'name' | 'duration' | 'status';

export interface FetchOverviewTestsParams {
  page?: number;
  perPage?: number;
  sort?: OverviewTestsSortColumn;
  direction?: 'asc' | 'desc';
  projectIds?: number[];
  gitlabProjectNames?: string[];
  startFrom?: string;
  startTo?: string;
  status?: 'passed' | 'failed';
  defectTag?: string;
  hasIssues?: boolean;
}

export interface OverviewTestsResponse {
  tests: OverviewTestApiRow[];
  meta: OverviewLaunchesMeta;
}

/**
 * Fetches individual test rows (pass/fail) that back the Overview widget aggregates.
 * `executed_by` is always forced to `cron` since widgets only aggregate scheduled runs.
 */
export async function fetchOverviewTests(
  params: FetchOverviewTestsParams = {},
): Promise<OverviewTestsResponse> {
  const search = new URLSearchParams();
  search.set('executed_by', 'cron');
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
  if (params.gitlabProjectNames != null && params.gitlabProjectNames.length > 0) {
    search.set('gitlab_project_name', params.gitlabProjectNames.join(','));
  }
  if (params.startFrom != null && params.startFrom !== '') {
    search.set('start_from', params.startFrom);
  }
  if (params.startTo != null && params.startTo !== '') {
    search.set('start_to', params.startTo);
  }
  if (params.status != null) {
    search.set('status', params.status);
  }
  if (params.defectTag != null && params.defectTag !== '') {
    search.set('defect_tag', params.defectTag);
  }
  if (params.hasIssues === true) {
    search.set('has_issues', '1');
  }
  const qs = search.toString();
  const path = qs ? `/widgets/overview/tests?${qs}` : '/widgets/overview/tests';

  return apiService.authenticatedRequest(path, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  }) as Promise<OverviewTestsResponse>;
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
