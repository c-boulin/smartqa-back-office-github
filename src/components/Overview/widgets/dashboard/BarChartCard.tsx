import React from 'react';
import { FileText, Globe, RefreshCw } from 'lucide-react';

interface BarChartCardProps {
  title: string;
  subtitle?: string;
  viewLabel?: string;
  /** Second card in the design includes a refresh affordance. */
  showRefresh?: boolean;
  children: React.ReactNode;
}

/**
 * White card with title row, list/globe/(optional refresh) icons, subtitle + view pill, then chart body.
 */
export const BarChartCard: React.FC<BarChartCardProps> = ({
  title,
  subtitle,
  viewLabel,
  showRefresh = false,
  children,
}) => {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-600 dark:bg-slate-800/90">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
          {subtitle || viewLabel ? (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {subtitle ?? ''}
              {subtitle && viewLabel ? ' ' : null}
              {viewLabel ? (
                <span className="ml-1 inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                  {viewLabel}
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2 text-slate-500 dark:text-slate-400">
          <FileText className="h-4 w-4" aria-hidden />
          <Globe className="h-4 w-4" aria-hidden />
          {showRefresh ? <RefreshCw className="h-4 w-4" aria-hidden /> : null}
        </div>
      </div>
      {children}
    </div>
  );
};
