import React from 'react';

interface DocSectionProps {
  title: string;
  children: React.ReactNode;
}

export const DocSectionBlock: React.FC<DocSectionProps> = ({ title, children }) => (
  <section className="mb-8">
    <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-3 pb-2 border-b border-slate-200 dark:border-slate-700">
      {title}
    </h3>
    {children}
  </section>
);

interface DocListProps {
  items: string[];
  ordered?: boolean;
}

export const DocList: React.FC<DocListProps> = ({ items, ordered = false }) => {
  const Tag = ordered ? 'ol' : 'ul';
  return (
    <Tag className={`space-y-2 ${ordered ? 'list-decimal list-inside' : 'list-none'}`}>
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {!ordered && (
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" />
          )}
          {ordered && (
            <span className="text-cyan-600 dark:text-cyan-400 font-semibold mr-1">{i + 1}.</span>
          )}
          <span>{item}</span>
        </li>
      ))}
    </Tag>
  );
};

interface DocTipProps {
  children: React.ReactNode;
  variant?: 'tip' | 'info' | 'warning';
}

export const DocTip: React.FC<DocTipProps> = ({ children, variant = 'tip' }) => {
  const styles = {
    tip:     'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-300 dark:border-cyan-700 text-cyan-800 dark:text-cyan-200',
    info:    'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200',
    warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200',
  };
  const labels = { tip: 'Pro Tip', info: 'Note', warning: 'Warning' };

  return (
    <div className={`rounded-xl border-l-4 px-4 py-3 text-sm ${styles[variant]}`}>
      <span className="font-semibold mr-1">{labels[variant]}:</span>
      {children}
    </div>
  );
};

interface DocStatusBadgeProps {
  label: string;
  color: 'green' | 'red' | 'amber' | 'blue' | 'slate' | 'orange' | 'gray';
}

export const DocStatusBadge: React.FC<DocStatusBadgeProps> = ({ label, color }) => {
  const colors = {
    green:  'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    red:    'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    amber:  'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    blue:   'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    slate:  'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
    gray:   'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
      {label}
    </span>
  );
};

interface DocTagProps {
  label: string;
  variant?: 'good' | 'bad' | 'neutral';
}

export const DocTag: React.FC<DocTagProps> = ({ label, variant = 'neutral' }) => {
  const styles = {
    good:    'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800',
    bad:     'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800',
    neutral: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600',
  };

  return (
    <code className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-medium ${styles[variant]}`}>
      {label}
    </code>
  );
};

interface DocChecklistProps {
  items: string[];
}

export const DocChecklist: React.FC<DocChecklistProps> = ({ items }) => (
  <ul className="space-y-2.5">
    {items.map((item, i) => (
      <li key={i} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
        <span className="mt-0.5 w-5 h-5 rounded-full bg-cyan-500/15 dark:bg-cyan-500/20 flex items-center justify-center shrink-0">
          <svg className="w-3 h-3 text-cyan-600 dark:text-cyan-400" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
          </svg>
        </span>
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

interface DocMetricCardProps {
  label: string;
  description: string;
}

export const DocMetricCard: React.FC<DocMetricCardProps> = ({ label, description }) => (
  <div className="rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 p-4">
    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">{label}</p>
    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>
  </div>
);
