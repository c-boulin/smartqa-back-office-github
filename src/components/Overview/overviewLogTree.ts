import type { OverviewTestLogKeywordApiNode, OverviewTestLogTreeNode } from '../../services/overviewWidgetsApi';

export function keywordHasLoadedChildren(node: OverviewTestLogKeywordApiNode): boolean {
  return node.children.length > 0;
}

/** Legacy full-tree responses omit `hasChildren`; nested `children` then decide on their own. */
export function keywordIsExpandable(node: OverviewTestLogKeywordApiNode): boolean {
  return keywordHasLoadedChildren(node) || node.hasChildren === true;
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
