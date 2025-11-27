import React from 'react';
import { Play } from 'lucide-react';

interface RunTestButtonProps {
  onClick: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

const RunTestButton: React.FC<RunTestButtonProps> = ({
  onClick,
  disabled = false,
  size = 'sm'
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        group
        relative
        inline-flex
        items-center
        ${size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-4 py-2 text-base'}
        font-medium
        text-slate-700 dark:text-gray-300
        bg-slate-50 dark:bg-slate-800
        border-2 border-slate-300 dark:border-slate-600
        rounded-full
        transition-all
        duration-200
        hover:text-cyan-600 dark:hover:text-cyan-400
        hover:border-cyan-400
        hover:shadow-[0_0_15px_rgba(6,182,212,0.5)]
        disabled:opacity-50
        disabled:cursor-not-allowed
        disabled:hover:text-slate-700 dark:disabled:hover:text-gray-300
        disabled:hover:border-slate-300 dark:disabled:hover:border-slate-600
        disabled:hover:shadow-none
      `}
    >
      <span className="mr-2">Run Test</span>
      <Play className={`${size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} fill-current`} />
    </button>
  );
};

export default RunTestButton;
