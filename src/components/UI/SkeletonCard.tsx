import React from 'react';

interface SkeletonCardProps {
  className?: string;
  height?: string;
}

const SkeletonCard: React.FC<SkeletonCardProps> = ({ className = '', height = 'h-64' }) => {
  return (
    <div className={`bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-6 ${className}`}>
      <div className="animate-pulse">
        <div className="h-6 bg-slate-300 dark:bg-slate-700 rounded w-3/4 mb-4"></div>
        <div className={`${height} bg-slate-200/50 dark:bg-slate-700/50 rounded flex items-center justify-center`}>
          <div className="w-12 h-12 border-4 border-slate-400 dark:border-slate-600 border-t-cyan-500 dark:border-t-cyan-400 rounded-full animate-spin"></div>
        </div>
      </div>
    </div>
  );
};

export default SkeletonCard;
