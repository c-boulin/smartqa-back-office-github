import React from 'react';

interface DonutChartCardProps {
  title: string;
  children: React.ReactNode;
}

/**
 * Titled container for a donut / pie chart column.
 */
export const DonutChartCard: React.FC<DonutChartCardProps> = ({ title, children }) => {
  return (
    <div className="min-w-0">
      <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
      {children}
    </div>
  );
};
