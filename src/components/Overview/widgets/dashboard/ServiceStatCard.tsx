import React from 'react';

interface ServiceStatCardProps {
  /** Service name, country name, or other row label. */
  serviceName: string;
  passingRate: string;
  /** Raw pass rate 0–100; used to pick the failing top-bar shade when `status` is failed. */
  passRateValue?: number | null;
  testCases: number;
  status: 'failed' | 'passed';
  /** When set, card is interactive (e.g. drill down from service list). */
  onClick?: () => void;
}

/**
 * Maps a failing pass rate to a top border colour (aligned with the overview legend: four reds, then green only at 100%).
 */
function failingPassRateTopBarClass(rate: number): string {
  const r = Number.isFinite(rate) ? rate : 0;
  if (r < 24) {
    return 'border-t-4 border-t-red-950';
  }
  if (r < 49) {
    return 'border-t-4 border-t-red-700';
  }
  if (r < 74) {
    return 'border-t-4 border-t-red-500';
  }
  if (r < 100) {
    return 'border-t-4 border-t-red-300';
  }
  return 'border-t-4 border-t-green-500';
}

/**
 * Resolves Tailwind top border classes for the card strip from status and optional numeric rate.
 */
function topBarClassName(status: 'failed' | 'passed', passRateValue?: number | null): string {
  if (status === 'passed') {
    return 'border-t-4 border-t-green-500';
  }
  return failingPassRateTopBarClass(passRateValue ?? 0);
}

/** Card frame: left/right/bottom only so `dark:border-slate-600` never paints over the accent top strip. */
const CARD_FRAME_CLASS =
  'rounded-lg border-x border-b border-slate-200 bg-white p-4 shadow-sm dark:border-x-slate-600 dark:border-b-slate-600 dark:bg-slate-800';

/**
 * Single service/country execution summary card (coloured top bar only).
 */
export const ServiceStatCard: React.FC<ServiceStatCardProps> = ({
  serviceName,
  passingRate,
  passRateValue,
  testCases,
  status,
  onClick,
}) => {
  const topBar = topBarClassName(status, passRateValue);
  const baseClass = `${CARD_FRAME_CLASS} ${topBar}`;

  const body = (
    <>
      <h4
        className="mb-4 truncate text-sm font-bold text-slate-900 dark:text-white"
        title={serviceName}
      >
        {serviceName}
      </h4>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Passing rate</div>
          <div className="text-lg font-bold text-slate-900 dark:text-white">{passingRate}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Test cases</div>
          <div className="text-lg font-bold text-slate-900 dark:text-white">{testCases}</div>
        </div>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${baseClass} w-full cursor-pointer text-left transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:focus-visible:ring-cyan-400`}
        aria-label={`View ${serviceName} breakdown by country`}
      >
        {body}
      </button>
    );
  }

  return <div className={baseClass}>{body}</div>;
};
