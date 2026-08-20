import React from 'react';

interface ServiceStatCardProps {
  serviceName: string;
  passingRate: string;
  testCases: number;
  status: 'failed' | 'passed';
}

export const ServiceStatCard: React.FC<ServiceStatCardProps> = ({
  serviceName,
  passingRate,
  testCases,
  status,
}) => {
  const gradientFrom =
    status === 'failed'
      ? 'from-red-500 dark:from-red-400'
      : 'from-green-500 dark:from-green-400';

  const gradientTo =
    status === 'failed'
      ? 'to-red-300 dark:to-red-900'
      : 'to-green-300 dark:to-green-900';

  const hoverClass =
    status === 'failed'
      ? 'hover:-translate-y-0.5 hover:shadow-md hover:shadow-red-200/60 dark:hover:shadow-red-500/20'
      : 'hover:-translate-y-0.5 hover:shadow-md hover:shadow-green-200/60 dark:hover:shadow-green-500/20';

  return (
    <div
      className={`relative rounded-xl pt-[4px] px-[1px] pb-[1px] bg-gradient-to-b ${gradientFrom} ${gradientTo} transition-all duration-200 ${hoverClass}`}
    >
      <div className="rounded-t-[8px] rounded-b-[11px] bg-white p-4 dark:bg-slate-800">
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
      </div>
    </div>
  );
};
