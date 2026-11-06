/**
 * Session-wide memory cache for Overview → Launches drill data (suite-items and log-items).
 * No TTL: entries live until evicted (LRU, 50 suites / 100 logs) or the page reloads.
 * The pinned (drilled) launch and in-flight requests are never evicted. Concurrent callers share one Promise.
 * After a defect is applied, callers patch suite items in place via `updateSuiteItems` instead of refetching.
 */
import {
  fetchOverviewLaunchSuiteItems,
  fetchOverviewSuiteKwLogChildrenBatch,
  fetchOverviewSuiteKwLogItems,
  fetchOverviewTestLogChildrenBatch,
  fetchOverviewTestLogItems,
  type OverviewLaunchSuiteItemApiRow,
  type OverviewLaunchSuiteItemsResponse,
  type OverviewTestLogItemsResponse,
  type OverviewTestLogTreeNode,
} from './overviewWidgetsApi';

const MAX_SUITE_ENTRIES = 50;
const MAX_LOG_ENTRIES = 100;

const suiteEntries = new Map<string, OverviewLaunchSuiteItemsResponse>();
const logEntries = new Map<string, OverviewTestLogItemsResponse>();
const inFlight = new Map<string, Promise<unknown>>();
let pinnedTre: number | null = null;

/** Which log endpoint a request targets: an `overview_tests` row or a top-level suite keyword. */
export type OverviewLogScope = { kind: 'test'; overviewTestId: number } | { kind: 'suite_kw'; overviewSuiteKwId: number };

const suiteKey = (tre: number): string => `${tre}`;
const logScopePrefix = (tre: number, scope: OverviewLogScope): string =>
  scope.kind === 'test' ? `${tre}:test:${scope.overviewTestId}:` : `${tre}:kw:${scope.overviewSuiteKwId}:`;
const logRootsKey = (tre: number, scope: OverviewLogScope): string => `${logScopePrefix(tre, scope)}roots`;
const logChildrenKey = (tre: number, scope: OverviewLogScope, parentKwId: number): string =>
  `${logScopePrefix(tre, scope)}p:${parentKwId}`;

const isPinned = (key: string): boolean =>
  pinnedTre !== null && (key === suiteKey(pinnedTre) || key.startsWith(`${pinnedTre}:`));

function touch<T>(store: Map<string, T>, key: string): T | undefined {
  const value = store.get(key);
  if (value !== undefined) {
    store.delete(key);
    store.set(key, value);
  }
  return value;
}

function storeWithEviction<T>(store: Map<string, T>, key: string, value: T, max: number): void {
  store.delete(key);
  store.set(key, value);
  if (store.size <= max) return;
  for (const candidate of store.keys()) {
    if (store.size <= max) break;
    if (isPinned(candidate)) continue;
    store.delete(candidate);
  }
}

function getOrFetch<T>(store: Map<string, T>, key: string, max: number, fetcher: () => Promise<T>): Promise<T> {
  const cached = touch(store, key);
  if (cached !== undefined) return Promise.resolve(cached);

  const pending = inFlight.get(key) as Promise<T> | undefined;
  if (pending !== undefined) return pending;

  const promise: Promise<T> = fetcher()
    .then(value => {
      // An invalidation during the request drops it from inFlight; do not resurrect stale data.
      if (inFlight.get(key) === promise) {
        storeWithEviction(store, key, value, max);
      }
      return value;
    })
    .finally(() => {
      if (inFlight.get(key) === promise) inFlight.delete(key);
    });
  inFlight.set(key, promise);
  return promise;
}

export function getOrFetchSuiteItems(tre: number): Promise<OverviewLaunchSuiteItemsResponse> {
  return getOrFetch(suiteEntries, suiteKey(tre), MAX_SUITE_ENTRIES, () => fetchOverviewLaunchSuiteItems(tre));
}

/** First level of the log tree (`depth=roots`). Legacy APIs may still answer with a nested full tree. */
export function getOrFetchLogRoots(tre: number, scope: OverviewLogScope): Promise<OverviewTestLogItemsResponse> {
  return getOrFetch(logEntries, logRootsKey(tre, scope), MAX_LOG_ENTRIES, () =>
    scope.kind === 'test'
      ? fetchOverviewTestLogItems(tre, scope.overviewTestId, { depth: 'roots' })
      : fetchOverviewSuiteKwLogItems(tre, scope.overviewSuiteKwId, { depth: 'roots' }),
  );
}

function fetchLogChildrenAlone(
  tre: number,
  scope: OverviewLogScope,
  parentKwId: number,
): Promise<OverviewTestLogItemsResponse> {
  const query = { depth: '1', parentKwId } as const;
  return scope.kind === 'test'
    ? fetchOverviewTestLogItems(tre, scope.overviewTestId, query)
    : fetchOverviewSuiteKwLogItems(tre, scope.overviewSuiteKwId, query);
}

/** Direct children (keywords + messages) of one keyword (`depth=1&parent_kw_id`). */
export async function getOrFetchLogChildren(
  tre: number,
  scope: OverviewLogScope,
  parentKwId: number,
): Promise<OverviewTestLogTreeNode[]> {
  const res = await getOrFetch(logEntries, logChildrenKey(tre, scope, parentKwId), MAX_LOG_ENTRIES, () =>
    fetchLogChildrenAlone(tre, scope, parentKwId),
  );
  if (!Array.isArray(res?.items)) throw new Error('Unexpected log children response.');
  return res.items;
}

/** Synchronous cache hit for a keyword's children; `undefined` when not loaded yet. */
export function peekLogChildren(
  tre: number,
  scope: OverviewLogScope,
  parentKwId: number,
): OverviewTestLogTreeNode[] | undefined {
  const items = touch(logEntries, logChildrenKey(tre, scope, parentKwId))?.items;
  return Array.isArray(items) ? items : undefined;
}

export function isLogChildrenCachedOrPending(tre: number, scope: OverviewLogScope, parentKwId: number): boolean {
  const key = logChildrenKey(tre, scope, parentKwId);
  return logEntries.has(key) || inFlight.has(key);
}

/**
 * One `parent_kw_ids` request filling each child key as if fetched alone. Every key is registered in flight
 * so a click during the batch awaits it; an id missing from the answer falls back to `parent_kw_id`.
 * Rejects (with the API error) when the batch request itself fails.
 */
export async function fetchLogChildrenBatch(
  tre: number,
  scope: OverviewLogScope,
  parentKwIds: number[],
): Promise<void> {
  const ids = parentKwIds.filter(id => !isLogChildrenCachedOrPending(tre, scope, id));
  if (ids.length === 0) return;

  const batch =
    scope.kind === 'test'
      ? fetchOverviewTestLogChildrenBatch(tre, scope.overviewTestId, ids)
      : fetchOverviewSuiteKwLogChildrenBatch(tre, scope.overviewSuiteKwId, ids);

  const perKey = ids.map(id => {
    const key = logChildrenKey(tre, scope, id);
    const promise: Promise<OverviewTestLogItemsResponse> = batch
      .then(
        res => res,
        () => undefined,
      )
      .then(async res => {
        const items = res?.parents?.[String(id)]?.items;
        const value: OverviewTestLogItemsResponse = Array.isArray(items)
          ? { testName: '', testStatusLabel: '', suiteSourceRelative: null, testLine: null, items }
          : await fetchLogChildrenAlone(tre, scope, id);
        if (inFlight.get(key) === promise) storeWithEviction(logEntries, key, value, MAX_LOG_ENTRIES);
        return value;
      })
      .finally(() => {
        if (inFlight.get(key) === promise) inFlight.delete(key);
      });
    inFlight.set(key, promise);
    return promise;
  });

  await Promise.allSettled(perKey);
  await batch;
}

/** Writes the merged (partially expanded) tree back so re-opening this log does not refetch branches. */
export function updateLogRoots(
  tre: number,
  scope: OverviewLogScope,
  updater: (items: OverviewTestLogTreeNode[]) => OverviewTestLogTreeNode[],
): void {
  const key = logRootsKey(tre, scope);
  const current = logEntries.get(key);
  if (current === undefined) return;
  logEntries.set(key, { ...current, items: updater(current.items) });
}

export function invalidateLogScope(tre: number, scope: OverviewLogScope): void {
  const prefix = logScopePrefix(tre, scope);
  for (const key of [...logEntries.keys()]) {
    if (key.startsWith(prefix)) logEntries.delete(key);
  }
  for (const key of [...inFlight.keys()]) {
    if (key.startsWith(prefix)) inFlight.delete(key);
  }
}

export function peekSuiteItems(tre: number): OverviewLaunchSuiteItemsResponse | undefined {
  return touch(suiteEntries, suiteKey(tre));
}

export function updateSuiteItems(
  tre: number,
  updater: (items: OverviewLaunchSuiteItemApiRow[]) => OverviewLaunchSuiteItemApiRow[],
): void {
  const key = suiteKey(tre);
  const current = suiteEntries.get(key);
  if (current === undefined) return;
  suiteEntries.set(key, { ...current, items: updater(current.items) });
}

export function setPinnedTre(tre: number | null): void {
  pinnedTre = tre;
}

export function invalidateSuiteItems(tre: number): void {
  const prefix = `${tre}:`;
  suiteEntries.delete(suiteKey(tre));
  inFlight.delete(suiteKey(tre));
  for (const key of [...logEntries.keys()]) {
    if (key.startsWith(prefix)) logEntries.delete(key);
  }
  for (const key of [...inFlight.keys()]) {
    if (key.startsWith(prefix)) inFlight.delete(key);
  }
}

export function invalidateAll(): void {
  suiteEntries.clear();
  logEntries.clear();
  inFlight.clear();
  pinnedTre = null;
}
