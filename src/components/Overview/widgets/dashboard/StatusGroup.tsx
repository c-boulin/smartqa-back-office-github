import React from 'react';

interface StatusGroupProps {
  title: string;
  count: number;
  /** Presentational only; styles headings consistently with design. */
  status: 'failed' | 'passed';
  children: React.ReactNode;
}

/**
 * One band of cards (Failed or Passed) with a titled header and count.
 */
export const StatusGroup: React.FC<StatusGroupProps> = ({ title, count, status, children }) => {
  const caseWord = count === 1 ? 'case' : 'cases';

  return (
    <section aria-label={`${title} execution group (${status})`}>
      <h3 className="mb-4 text-base font-bold text-slate-900 dark:text-white">
        {title} ({count} {caseWord})
      </h3>
      {children}
    </section>
  );
};
