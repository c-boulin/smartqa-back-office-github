import React from 'react';
import { CalendarRange } from 'lucide-react';

interface DateFilterProps {
  /** Shown label (e.g. "Last week trend"). */
  value: string;
}

/**
 * Read-only period label styled like a dashboard date filter.
 */
export const DateFilter: React.FC<DateFilterProps> = ({ value }) => {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
      <CalendarRange className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
      {value}
    </span>
  );
};
