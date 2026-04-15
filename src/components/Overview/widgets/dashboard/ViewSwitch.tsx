import React from 'react';

interface ViewSwitchProps {
  /** Display labels for the current view mode (informational; not interactive in v1). */
  options: string[];
}

/**
 * Inline labels for alternate summary presentations (e.g. overall vs donut).
 */
export const ViewSwitch: React.FC<ViewSwitchProps> = ({ options }) => {
  if (options.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
      {options.map((option, index) => (
        <React.Fragment key={option}>
          {index > 0 ? (
            <span className="text-slate-400 dark:text-slate-500" aria-hidden>
              ·
            </span>
          ) : null}
          <span>{option}</span>
        </React.Fragment>
      ))}
    </div>
  );
};
