/**
 * Widget defect tags are already `overview_defect_types.slug` values and the
 * Launches API accepts them verbatim (alongside the 4 legacy group aliases used
 * by the Launches table columns). Send the tag as-is; only strip the aggregate
 * "other" bucket which has no server-side counterpart.
 */
export function defectTagForLaunchesFilter(tag: string | undefined | null): string | undefined {
  if (tag == null || tag === '' || tag === 'other') return undefined;
  return tag;
}
