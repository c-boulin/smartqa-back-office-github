/**
 * Loads the failed path of an All logs lazy tree: each round batches every failed keyword still missing its
 * children (any depth), then merges the answers in one update. Ids that came back empty are not retried here;
 * their row falls back to its own load / Retry.
 */
import { failedKeywordsToLoad, mergeManyKeywordChildren } from '../components/Overview/overviewLogTree';
import { fetchLogChildrenBatch, peekLogChildren, type OverviewLogScope } from './overviewLaunchDataCache';
import type { OverviewTestLogTreeNode } from './overviewWidgetsApi';

const MAX_ROUNDS = 15;

export interface FailedPathResolveOptions {
  tre: number;
  scope: OverviewLogScope;
  roots: OverviewTestLogTreeNode[];
  /** False once the user left this log (other test / TRE / pill, refresh). */
  isActive: () => boolean;
  onMerge: (entries: ReadonlyArray<readonly [number, OverviewTestLogTreeNode[]]>) => void;
}

/** The first round's requests are registered synchronously, before this returns its promise. */
export async function resolveFailedPath({ tre, scope, roots, isActive, onMerge }: FailedPathResolveOptions): Promise<void> {
  let items = roots;
  const attempted = new Set<number>();
  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    const pending = failedKeywordsToLoad(items).filter(id => !attempted.has(id));
    if (pending.length === 0) return;
    pending.forEach(id => attempted.add(id));

    await fetchLogChildrenBatch(tre, scope, pending);
    if (!isActive()) return;

    const loaded = pending.flatMap(id => {
      const children = peekLogChildren(tre, scope, id);
      return children === undefined ? [] : [[id, children] as const];
    });
    if (loaded.length === 0) return;
    items = mergeManyKeywordChildren(items, loaded);
    onMerge(loaded);
  }
}
