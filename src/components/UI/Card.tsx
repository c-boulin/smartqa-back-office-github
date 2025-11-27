import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  gradient?: boolean;
  hover?: boolean;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({
  children,
  className = '',
  gradient = false,
  hover = false,
  onClick
}) => {
  const baseClasses = `rounded-xl shadow-lg border backdrop-blur-sm transition-all duration-300`;
  const gradientClasses = gradient
    ? 'bg-gradient-to-br from-slate-100/80 to-slate-200/80 dark:from-slate-800/80 dark:to-slate-900/80 border-purple-300/30 dark:border-purple-500/30'
    : 'bg-white/50 dark:bg-slate-800/50 border-slate-300/50 dark:border-slate-700/50';
  const hoverClasses = hover
    ? 'hover:shadow-2xl hover:shadow-cyan-500/10 hover:border-cyan-500/50 hover:-translate-y-1'
    : '';

  return (
    <div
      className={`${baseClasses} ${gradientClasses} ${hoverClasses} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default Card;