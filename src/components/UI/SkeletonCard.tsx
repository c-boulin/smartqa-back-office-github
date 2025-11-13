import React from 'react';

interface SkeletonCardProps {
  className?: string;
  height?: string;
}

const SkeletonCard: React.FC<SkeletonCardProps> = ({ className = '', height = 'h-64' }) => {
  return (
    <div className={`bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg p-6 ${className}`}>
      <div className="animate-pulse">
        <div className="h-6 bg-slate-700 rounded w-3/4 mb-4"></div>
        <div className={`${height} bg-slate-700/50 rounded flex items-center justify-center`}>
          <div className="w-12 h-12 border-4 border-slate-600 border-t-cyan-400 rounded-full animate-spin"></div>
        </div>
      </div>
    </div>
  );
};

export default SkeletonCard;
