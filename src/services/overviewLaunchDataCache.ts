/**
 * Session-wide memory cache for Overview → Launches drill data (suite-items and log-items).
 * No TTL: entries live until evicted (LRU, 50 suites / 100 logs) or the page reloads.
 * The pinned (drilled) launch and in-flight requests are never evicted. Concurrent callers share one Promise.
 * After a defect is applied, callers patch suite items in place via `updateSuiteItems` instead of refetching.
 */
import {
  fetchOverviewLaunchSuiteItems,
  fetchOverviewSuiteKwLogItems,
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

/** Direct children (keywords + messages) of one keyword (`depth=1&parent_kw_id`). */
export async function getOrFetchLogChildren(
  tre: number,
  scope: OverviewLogScope,
  parentKwId: number,
): Promise<OverviewTestLogTreeNode[]> {
  const query = { depth: '1', parentKwId } as const;
  const res = await getOrFetch(logEntries, logChildrenKey(tre, scope, parentKwId), MAX_LOG_ENTRIES, () =>
    scope.kind === 'test'
      ? fetchOverviewTestLogItems(tre, scope.overviewTestId, query)
      : fetchOverviewSuiteKwLogItems(tre, scope.overviewSuiteKwId, query),
  );
  if (!Array.isArray(res?.items)) throw new Error('Unexpected log children response.');
  return res.items;
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
