import React from 'react';
import { FileText, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface OverviewSummaryCardsProps {
  totalTests: number;
  passRate: number | null;
  failedRate: number | null;
  totalIssues: number;
}

interface StatCardConfig {
  label: string;
  value: string;
  icon: React.ReactNode;
  accentClass: string;
}

const OverviewSummaryCards: React.FC<OverviewSummaryCardsProps> = ({
  totalTests,
  passRate,
  failedRate,
  totalIssues,
}) => {
  const formatNumber = (n: number): string => {
    if (n >= 1000) {
      return n.toLocaleString('en-US').replace(/,/g, '.');
    }
    return String(n);
  };

  const cards: StatCardConfig[] = [
    {
      label: 'Total tests',
      value: formatNumber(totalTests),
      icon: <FileText className="h-5 w-5" />,
      accentClass: 'bg-slate-700 text-slate-300',
    },
    {
      label: 'Pass rate',
      value: passRate != null ? `${passRate}%` : '--',
      icon: <CheckCircle className="h-5 w-5" />,
      accentClass: 'bg-emerald-900/60 text-emerald-400',
    },
    {
      label: 'Failed tests',
      value: failedRate != null ? `${failedRate}%` : '--',
      icon: <XCircle className="h-5 w-5" />,
      accentClass: 'bg-red-900/60 text-red-400',
    },
    {
      label: 'Total issue',
      value: formatNumber(totalIssues),
      icon: <AlertTriangle className="h-5 w-5" />,
      accentClass: 'bg-amber-900/60 text-amber-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          data-mipqa={`overview-stat-${card.label.toLowerCase().replace(/\s+/g, '-')}`}
          className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${card.accentClass}`}>
            {card.icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{card.label}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{card.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default OverviewSummaryCards;
