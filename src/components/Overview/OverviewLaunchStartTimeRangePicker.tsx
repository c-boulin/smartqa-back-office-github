import React from 'react';
import DatePicker from 'react-datepicker';

export interface OverviewLaunchStartTimeRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onRangeChange: (start: Date | null, end: Date | null) => void;
  className?: string;
}

/**
 * Start/end bounds with date and time via {@link https://github.com/Hacker0x01/react-datepicker | react-datepicker}
 * (range + time; no custom calendar logic in-app).
 */
export function OverviewLaunchStartTimeRangePicker({
  startDate,
  endDate,
  onRangeChange,
  className = '',
}: OverviewLaunchStartTimeRangePickerProps): React.ReactElement {
  return (
    <div className={className}>
      <DatePicker
        selectsRange
        startDate={startDate}
        endDate={endDate}
        onChange={update => {
          if (update === null) {
            onRangeChange(null, null);
            return;
          }
          const [s, e] = update;
          onRangeChange(s, e);
        }}
        showTimeSelect
        timeIntervals={15}
        timeFormat="HH:mm"
        dateFormat="yyyy-MM-dd HH:mm"
        placeholderText="Select start and end (24h time)"
        isClearable
        shouldCloseOnSelect={false}
        popperPlacement="bottom-start"
        wrapperClassName="w-full max-w-md"
        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        calendarClassName="overview-launch-start-datepicker-calendar font-sans"
      />
    </div>
  );
}
