import React from 'react';

export interface DashboardTabItem {
  id: string;
  label: string;
}

interface TabGroupProps {
  tabs: DashboardTabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  /** Optional content on the right (e.g. pass-rate legend). */
  trailing?: React.ReactNode;
  ariaLabel?: string;
}

/**
 * Breadcrumb-style tab switcher (e.g. service &gt; country).
 */
export const TabGroup: React.FC<TabGroupProps> = ({
  tabs,
  activeTab,
  onChange,
  trailing,
  ariaLabel = 'Switch grouping',
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <nav className="flex flex-wrap items-center gap-1 text-sm" aria-label={ariaLabel}>
        {tabs.map((tab, index) => (
          <React.Fragment key={tab.id}>
            {index > 0 ? (
              <span className="select-none text-slate-400 dark:text-slate-500" aria-hidden>
                &gt;
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => onChange(tab.id)}
              className={`rounded px-0 py-0.5 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-cyan-600 dark:text-cyan-400'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          </React.Fragment>
        ))}
      </nav>
      {trailing ? <div className="flex flex-wrap items-center justify-end gap-4">{trailing}</div> : null}
    </div>
  );
};
