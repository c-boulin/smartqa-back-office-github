import React from 'react';

interface StatusBadgeProps {
  status: string | number;
  type?: 'project' | 'test' | 'execution' | 'plan' | 'automation';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'test' }) => {
  const getStatusConfig = (status: string | number, type: string) => {
    const configs: Record<string, Record<string | number, { bg: string; text: string; label: string }>> = {
      project: {
        active: { bg: 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/50', text: 'text-green-400', label: 'Active' },
        inactive: { bg: 'bg-gradient-to-r from-gray-500/20 to-slate-500/20 border-gray-500/50', text: 'text-gray-400', label: 'Inactive' },
        archived: { bg: 'bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border-orange-500/50', text: 'text-orange-400', label: 'Archived' }
      },
      test: {
        draft: { bg: 'bg-gradient-to-r from-gray-500/20 to-slate-500/20 border-gray-500/50', text: 'text-gray-400', label: 'Draft' },
        active: { bg: 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/50', text: 'text-green-400', label: 'Active' },
        deprecated: { bg: 'bg-gradient-to-r from-red-500/20 to-pink-500/20 border-red-500/50', text: 'text-red-400', label: 'Deprecated' }
      },
      automation: {
        // Utilise les valeurs numériques de l'API
        1: { bg: 'bg-gradient-to-r from-gray-500/20 to-slate-500/20 border-gray-500/50', text: 'text-gray-400', label: 'Not automated' },
        2: { bg: 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/50', text: 'text-green-400', label: 'Automated' },
        3: { bg: 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-500/50', text: 'text-blue-400', label: 'Automation not required' },
        4: { bg: 'bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border-orange-500/50', text: 'text-orange-400', label: 'Cannot be automated' },
        5: { bg: 'bg-gradient-to-r from-red-500/20 to-pink-500/20 border-red-500/50', text: 'text-red-400', label: 'Obsolete' }
      },
      execution: {
        not_started: { bg: 'bg-gradient-to-r from-gray-500/20 to-slate-500/20 border-gray-500/50', text: 'text-gray-400', label: 'Not Started' },
        in_progress: { bg: 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-500/50', text: 'text-blue-400', label: 'In Progress' },
        passed: { bg: 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/50', text: 'text-green-400', label: 'Passed' },
        failed: { bg: 'bg-gradient-to-r from-red-500/20 to-pink-500/20 border-red-500/50', text: 'text-red-400', label: 'Failed' },
        blocked: { bg: 'bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border-orange-500/50', text: 'text-orange-400', label: 'Blocked' },
        skipped: { bg: 'bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border-purple-500/50', text: 'text-purple-400', label: 'Skipped' }
      },
      plan: {
        draft: { bg: 'bg-gradient-to-r from-gray-500/20 to-slate-500/20 border-gray-500/50', text: 'text-gray-400', label: 'Draft' },
        active: { bg: 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-500/50', text: 'text-blue-400', label: 'Active' },
        completed: { bg: 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/50', text: 'text-green-400', label: 'Completed' },
        cancelled: { bg: 'bg-gradient-to-r from-red-500/20 to-pink-500/20 border-red-500/50', text: 'text-red-400', label: 'Cancelled' }
      },
      priority: {
        low: { bg: 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/50', text: 'text-green-400', label: 'Low' },
        medium: { bg: 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/50', text: 'text-yellow-400', label: 'Medium' },
        high: { bg: 'bg-gradient-to-r from-orange-500/20 to-red-500/20 border-orange-500/50', text: 'text-orange-400', label: 'High' },
        critical: { bg: 'bg-gradient-to-r from-red-500/20 to-pink-500/20 border-red-500/50', text: 'text-red-400', label: 'Critical' }
      }
    };

    return configs[type]?.[status] || { bg: 'bg-gray-500/20 border-gray-500/50', text: 'text-gray-400', label: String(status) };
  };

  const config = getStatusConfig(status, type);

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

export default StatusBadge;