/**
 * Maps a defect tag (from OverviewDefectMixItem.tag or DEFECT_CHART_TYPES.slug)
 * to the corresponding Launches API `defect_tag` filter value. Tags not listed
 * here have no dedicated filter and should navigate without one.
 */
export const DEFECT_TAG_TO_FILTER_VALUE: Record<string, 'product_bug' | 'auto_bug' | 'system_issue' | 'to_investigate'> = {
  'product-bug': 'product_bug',
  'automation-bug': 'auto_bug',
  'system-issue': 'system_issue',
  'to-investigate': 'to_investigate',
};
