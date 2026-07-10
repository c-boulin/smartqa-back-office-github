/**
 * Maps a defect tag (from OverviewDefectMixItem.tag or DEFECT_CHART_TYPES.slug)
 * to the corresponding Launches API sort column. Tags not listed here have no
 * dedicated sort column and should navigate without a sort param.
 */
export const DEFECT_TAG_TO_SORT_COLUMN: Record<string, string> = {
  'product-bug': 'product_bug',
  'automation-bug': 'auto_bug',
  'system-issue': 'system_issue',
  'to-investigate': 'to_investigate',
};
