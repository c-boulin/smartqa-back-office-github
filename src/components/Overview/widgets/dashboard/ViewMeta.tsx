import React from 'react';

interface ViewMetaProps {
  label: string;
}

/**
 * Secondary hint next to toolbar filters (e.g. health-check context).
 */
export const ViewMeta: React.FC<ViewMetaProps> = ({ label }) => {
  return (
    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</span>
  );
};
