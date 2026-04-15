import React from 'react';

interface WidgetContentBodyProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * White content area below the grey header: charts, tabs, and cards.
 */
export const WidgetContentBody: React.FC<WidgetContentBodyProps> = ({ children, className = '' }) => {
  return <div className={`bg-white px-6 py-6 dark:bg-slate-800 ${className}`}>{children}</div>;
};
