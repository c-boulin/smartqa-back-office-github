import React from 'react';

interface WidgetContentHeaderProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Light grey strip below the dark stats tile: filters, titles, and meta (matches design capture).
 */
export const WidgetContentHeader: React.FC<WidgetContentHeaderProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`border-b border-slate-200 bg-slate-100 px-6 py-4 dark:border-slate-700 dark:bg-slate-800/90 ${className}`}
    >
      {children}
    </div>
  );
};
