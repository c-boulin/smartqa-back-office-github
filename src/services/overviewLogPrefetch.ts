/**
 * Background warm-up of the All logs lazy tree: fills the log cache only (never the rendered tree).
 * Bounded per log context (TRE + test / suite keyword); switching context drops whatever is still queued.
 */
import { ApiRequestError } from './api';
import {
  fetchLogChildrenBatch,
  getOrFetchLogChildren,
  isLogChildrenCachedOrPending,
  type OverviewLogScope,
} from './overviewLaunchDataCache';

const MAX_CONCURRENT = 3;
const MAX_NODES_PER_CONTEXT = 40;
const MAX_NODES_PER_EXPANSION = 25;
const BATCH_MAX_IDS = 25;
// API caps the raw `parent_kw_ids` CSV at 512 chars; keep a margin.
const BATCH_MAX_CSV_LENGTH = 500;

type PrefetchTask = { kind: 'one'; kwId: number } | { kind: 'batch'; kwIds: number[] };

type PrefetchContext = { tre: number; scope: OverviewLogScope; token: string };

export interface LogChildrenPrefetcher {
  /** Same token keeps the queue; a new one drops it and restarts the budget. */
  setContext: (tre: number, scope: OverviewLogScope) => void;
  reset: () => void;
  /** Hover: one `parent_kw_id` request for this keyword's own children. */
  prefetchOne: (kwId: number) => void;
  /** After an expansion: children of these keywords, batched through `parent_kw_ids` when supported. */
  prefetchMany: (kwIds: number[]) => void;
}

function chunkForBatch(ids: number[]): number[][] {
  const chunks: number[][] = [];
  let current: number[] = [];
  let csvLength = 0;
  for (const id of ids) {
    const idLength = String(id).length;
    if (current.length >= BATCH_MAX_IDS || csvLength + idLength + 1 > BATCH_MAX_CSV_LENGTH) {
      chunks.push(current);
      current = [];
      csvLength = 0;
    }
    csvLength += current.length > 0 ? idLength + 1 : idLength;
    current.push(id);
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

const isBatchUnsupported = (error: unknown): boolean =>
  error instanceof ApiRequestError && (error.status === 422 || error.status === 404);

export function createLogChildrenPrefetcher(): LogChildrenPrefetcher {
  let context: PrefetchContext | null = null;
  let queue: PrefetchTask[] = [];
  let running = 0;
  let budgetUsed = 0;
  let batchSupported = true;
  const queuedIds = new Set<number>();

  const accept = (kwId: number): boolean => {
    if (context === null || budgetUsed >= MAX_NODES_PER_CONTEXT) return false;
    if (!Number.isInteger(kwId) || kwId <= 0 || queuedIds.has(kwId)) return false;
    if (isLogChildrenCachedOrPending(context.tre, context.scope, kwId)) return false;
    budgetUsed += 1;
    queuedIds.add(kwId);
    return true;
  };

  // A failed batch already falls back to `parent_kw_id` per key inside the cache.
  const runTask = async (task: PrefetchTask, ctx: PrefetchContext): Promise<void> => {
    if (task.kind === 'one') {
      await getOrFetchLogChildren(ctx.tre, ctx.scope, task.kwId).catch(() => undefined);
      return;
    }
    try {
      await fetchLogChildrenBatch(ctx.tre, ctx.scope, task.kwIds);
    } catch (error) {
      if (isBatchUnsupported(error)) batchSupported = false;
    }
  };

  const pump = (): void => {
    while (running < MAX_CONCURRENT && queue.length > 0 && context !== null) {
      const task = queue.shift() as PrefetchTask;
      (task.kind === 'one' ? [task.kwId] : task.kwIds).forEach(id => queuedIds.delete(id));
      running += 1;
      void runTask(task, context).finally(() => {
        running -= 1;
        pump();
      });
    }
  };

  const clearQueue = (): void => {
    queue = [];
    queuedIds.clear();
    budgetUsed = 0;
  };

  return {
    setContext(tre, scope) {
      const token = `${tre}:${JSON.stringify(scope)}`;
      if (context?.token === token) return;
      clearQueue();
      context = { tre, scope, token };
    },
    reset() {
      clearQueue();
      context = null;
    },
    prefetchOne(kwId) {
      if (!accept(kwId)) return;
      queue.push({ kind: 'one', kwId });
      pump();
    },
    prefetchMany(kwIds) {
      const accepted: number[] = [];
      for (const kwId of kwIds) {
        if (accepted.length >= MAX_NODES_PER_EXPANSION) break;
        if (accept(kwId)) accepted.push(kwId);
      }
      if (accepted.length === 0) return;
      if (batchSupported && accepted.length > 1) {
        chunkForBatch(accepted).forEach(chunk => queue.push({ kind: 'batch', kwIds: chunk }));
      } else {
        accepted.forEach(kwId => queue.push({ kind: 'one', kwId }));
      }
      pump();
    },
  };
}
