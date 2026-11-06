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
} from './overviewWidgetsApi';

const MAX_SUITE_ENTRIES = 50;
const MAX_LOG_ENTRIES = 100;

const suiteEntries = new Map<string, OverviewLaunchSuiteItemsResponse>();
const logEntries = new Map<string, OverviewTestLogItemsResponse>();
const inFlight = new Map<string, Promise<unknown>>();
let pinnedTre: number | null = null;

const suiteKey = (tre: number): string => `${tre}`;
const testLogKey = (tre: number, overviewTestId: number): string => `${tre}:test:${overviewTestId}`;
const kwLogKey = (tre: number, overviewSuiteKwId: number): string => `${tre}:kw:${overviewSuiteKwId}`;

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

export function getOrFetchTestLogItems(tre: number, overviewTestId: number): Promise<OverviewTestLogItemsResponse> {
  return getOrFetch(logEntries, testLogKey(tre, overviewTestId), MAX_LOG_ENTRIES, () =>
    fetchOverviewTestLogItems(tre, overviewTestId),
  );
}

export function getOrFetchSuiteKwLogItems(tre: number, overviewSuiteKwId: number): Promise<OverviewTestLogItemsResponse> {
  return getOrFetch(logEntries, kwLogKey(tre, overviewSuiteKwId), MAX_LOG_ENTRIES, () =>
    fetchOverviewSuiteKwLogItems(tre, overviewSuiteKwId),
  );
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
