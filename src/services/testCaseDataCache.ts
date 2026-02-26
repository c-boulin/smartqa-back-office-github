import { testCaseDataService, TestCaseCompleteData } from './testCaseDataService';
import { Tag } from './tagsApi';

const MAX_CACHE_SIZE = 5;

interface CacheEntry {
  data: TestCaseCompleteData;
  lastAccess: number;
}

/** LRU cache for test case update modal data. Enables instant display when reopening recently viewed test cases. */
class TestCaseDataCache {
  private cache = new Map<string, CacheEntry>();
  private accessOrder: string[] = [];
  private inFlight = new Map<string, Promise<TestCaseCompleteData | null>>();

  /**
   * Prefetch test case data in the background. Call on row hover or before opening modal.
   * Safe to call multiple times for the same ID - deduplicates in-flight requests.
   */
  async prefetch(testCaseId: string, availableTags: Tag[]): Promise<void> {
    if (this.cache.has(testCaseId)) return;

    let promise = this.inFlight.get(testCaseId);
    if (!promise) {
      promise = this.fetchAndStore(testCaseId, availableTags);
      this.inFlight.set(testCaseId, promise);
    }

    try {
      await promise;
    } finally {
      this.inFlight.delete(testCaseId);
    }
  }

  private async fetchAndStore(testCaseId: string, availableTags: Tag[]): Promise<TestCaseCompleteData | null> {
    const result = await testCaseDataService.fetchTestCaseDataForUpdate(testCaseId, availableTags);
    if (result.success && result.data) {
      this.set(testCaseId, result.data);
      return result.data;
    }
    return null;
  }

  private set(testCaseId: string, data: TestCaseCompleteData): void {
    this.evictIfNeeded(testCaseId);
    this.cache.set(testCaseId, { data, lastAccess: Date.now() });
    this.touch(testCaseId);
  }

  private touch(testCaseId: string): void {
    this.accessOrder = this.accessOrder.filter(id => id !== testCaseId);
    this.accessOrder.push(testCaseId);
  }

  private evictIfNeeded(excludeId?: string): void {
    while (this.cache.size >= MAX_CACHE_SIZE && this.accessOrder.length > 0) {
      const oldest = this.accessOrder[0];
      if (oldest === excludeId) break;
      this.cache.delete(oldest);
      this.accessOrder.shift();
    }
  }

  /**
   * Get cached data if available. Returns null if not in cache.
   */
  getCached(testCaseId: string): TestCaseCompleteData | null {
    const entry = this.cache.get(testCaseId);
    if (!entry) return null;
    this.touch(testCaseId);
    return entry.data;
  }

  /**
   * Check if data is cached (synchronous, for immediate UI decisions).
   */
  has(testCaseId: string): boolean {
    return this.cache.has(testCaseId);
  }

  /**
   * Check if a fetch is in progress for this test case.
   */
  isPrefetching(testCaseId: string): boolean {
    return this.inFlight.has(testCaseId);
  }

  /**
   * Invalidate cache for a test case. Call after successful update.
   */
  invalidate(testCaseId: string): void {
    this.cache.delete(testCaseId);
    this.accessOrder = this.accessOrder.filter(id => id !== testCaseId);
  }

  /**
   * Get data from cache or wait for in-flight prefetch. Returns null only if fetch fails.
   */
  async getOrWait(testCaseId: string, availableTags: Tag[]): Promise<TestCaseCompleteData | null> {
    const cached = this.getCached(testCaseId);
    if (cached) return cached;

    let promise = this.inFlight.get(testCaseId);
    if (!promise) {
      promise = this.fetchAndStore(testCaseId, availableTags);
      this.inFlight.set(testCaseId, promise);
    }

    try {
      return await promise;
    } finally {
      this.inFlight.delete(testCaseId);
    }
  }
}

export const testCaseDataCache = new TestCaseDataCache();
