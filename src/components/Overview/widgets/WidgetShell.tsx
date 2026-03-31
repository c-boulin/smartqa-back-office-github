import React from 'react';
import { Database } from 'lucide-react';

interface WidgetShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Optional tailwind classes for the title bar (e.g. navy header for execution overview). */
  titleBarClassName?: string;
  /** Section icon in the title bar; defaults to database glyph. */
  icon?: React.ReactNode;
}

/**
 * Dark stats tile (title + description) then child content: use WidgetContentHeader + WidgetContentBody
 * for the grey toolbar strip and white body per design.
 */
const WidgetShell: React.FC<WidgetShellProps> = ({
  title,
  subtitle,
  children,
  titleBarClassName,
  icon,
}) => {
  const titleBarStyles = titleBarClassName ?? 'bg-slate-800 dark:bg-slate-900';
  const leadingIcon =
    icon ?? <Database className="w-5 h-5 shrink-0 text-cyan-400" aria-hidden />;

  return (
    <div className="rounded-lg shadow-lg overflow-hidden border border-slate-200 dark:border-slate-700">
      <div className={`flex items-center gap-2 px-4 py-3 text-white ${titleBarStyles}`}>
        {leadingIcon}
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-tight">{title}</h2>
          {subtitle ? (
            <p className="text-xs text-slate-300 dark:text-slate-400 mt-0.5">{subtitle}</p>
          ) : null}
        </div>
      </div>
      <div className="flex min-h-0 flex-col">{children}</div>
    </div>
  );
};

export default WidgetShell;
