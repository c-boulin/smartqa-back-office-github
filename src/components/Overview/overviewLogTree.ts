import type { OverviewTestLogKeywordApiNode, OverviewTestLogTreeNode } from '../../services/overviewWidgetsApi';

export function normalizeStatusBand(
  statusBand: string | null | undefined,
  statusLabel: string | null | undefined,
): 'passed' | 'failed' | 'skipped' | 'unknown' {
  const normalizedBand = (statusBand ?? '').trim().toLowerCase();
  if (normalizedBand === 'passed' || normalizedBand === 'failed' || normalizedBand === 'skipped') {
    return normalizedBand;
  }

  const normalizedLabel = (statusLabel ?? '').trim().toLowerCase();
  if (normalizedLabel.startsWith('pass')) {
    return 'passed';
  }
  if (normalizedLabel.startsWith('fail')) {
    return 'failed';
  }
  if (normalizedLabel.startsWith('skip')) {
    return 'skipped';
  }

  return 'unknown';
}

export function keywordHasLoadedChildren(node: OverviewTestLogKeywordApiNode): boolean {
  return node.children.length > 0;
}

/** Legacy full-tree responses omit `hasChildren`; nested `children` then decide on their own. */
export function keywordIsExpandable(node: OverviewTestLogKeywordApiNode): boolean {
  return keywordHasLoadedChildren(node) || node.hasChildren === true;
}

const isFailedKeyword = (node: OverviewTestLogKeywordApiNode): boolean =>
  normalizeStatusBand(node.statusBand, node.statusLabel) === 'failed';

/**
 * Failed keywords whose children are still to fetch, at any depth of the open failed path
 * (only failed keywords auto-open, so non-failed branches are not walked).
 */
export function failedKeywordsToLoad(items: OverviewTestLogTreeNode[]): number[] {
  const ids: number[] = [];
  const walk = (nodes: OverviewTestLogTreeNode[]): void => {
    for (const node of nodes) {
      if (node.kind !== 'keyword' || !isFailedKeyword(node)) continue;
      if (keywordHasLoadedChildren(node)) walk(node.children);
      else if (node.hasChildren === true) ids.push(node.kwId);
    }
  };
  walk(items);
  return ids;
}

/** Immutable replace of `children` on the keyword `kwId`; untouched branches keep their identity. */
export function mergeKeywordChildren(
  items: OverviewTestLogTreeNode[],
  kwId: number,
  children: OverviewTestLogTreeNode[],
): OverviewTestLogTreeNode[] {
  let changed = false;
  const next = items.map(node => {
    if (node.kind !== 'keyword') return node;
    if (node.kwId === kwId) {
      changed = true;
      return { ...node, children };
    }
    if (node.children.length === 0) return node;
    const merged = mergeKeywordChildren(node.children, kwId, children);
    if (merged === node.children) return node;
    changed = true;
    return { ...node, children: merged };
  });
  return changed ? next : items;
}

export function mergeManyKeywordChildren(
  items: OverviewTestLogTreeNode[],
  entries: ReadonlyArray<readonly [number, OverviewTestLogTreeNode[]]>,
): OverviewTestLogTreeNode[] {
  return entries.reduce((acc, [kwId, children]) => mergeKeywordChildren(acc, kwId, children), items);
}
