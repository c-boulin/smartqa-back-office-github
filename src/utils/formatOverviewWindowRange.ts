import { format, isSameMonth, isSameYear, parse } from 'date-fns';

/**
 * Parses API window bounds as calendar dates (YYYY-MM-DD prefix of ISO string).
 * Avoids `parseISO` shifting the day when the instant is interpreted in the browser TZ.
 */
function overviewCalendarDay(iso: string): Date {
  const ymd = iso.length >= 10 ? iso.slice(0, 10) : iso;

  return parse(ymd, 'yyyy-MM-dd', new Date());
}

/**
 * Compact range for toolbar chips (shared with Weekly Test Execution & Defects Overview).
 */
export function formatOverviewWindowRangeShort(fromIso: string, toIso: string): string {
  const from = overviewCalendarDay(fromIso);
  const to = overviewCalendarDay(toIso);

  if (isSameMonth(from, to) && isSameYear(from, to)) {
    return `${format(from, 'MMM d')}–${format(to, 'd, yyyy')}`;
  }
  if (isSameYear(from, to)) {
    return `${format(from, 'MMM d')} – ${format(to, 'MMM d, yyyy')}`;
  }

  return `${format(from, 'MMM d, yyyy')} – ${format(to, 'MMM d, yyyy')}`;
}

/**
 * DateFilter label used by weekly execution and defect breakdown (one source of truth).
 */
export function overviewWidgetsLastWeekTrendLabel(window: { from: string; to: string }): string {
  return `Last week trend (${formatOverviewWindowRangeShort(window.from, window.to)})`;
}
