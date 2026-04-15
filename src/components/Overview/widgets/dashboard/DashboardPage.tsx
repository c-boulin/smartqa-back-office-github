import React from 'react';

interface DashboardPageProps {
  /** Page heading inside the widgets tab (e.g. "Widgets Tab"). */
  title: string;
  children: React.ReactNode;
}

/**
 * Top-level layout for the overview widgets tab content.
 */
export const DashboardPage: React.FC<DashboardPageProps> = ({ title, children }) => {
  return (
    <div className="space-y-8">
      <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h2>
      <div className="space-y-8">{children}</div>
    </div>
  );
};
