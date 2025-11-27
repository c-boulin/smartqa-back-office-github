import React from 'react';
import { Download, Calendar, Share, MoreHorizontal, SquarePen } from 'lucide-react';
import Button from '../UI/Button';

interface ReportsHeaderProps {
  reportType: string;
  onDownload: () => void;
  onSchedule: () => void;
  onShare: () => void;
  onEdit: () => void;
  onBack?: () => void;
}

const ReportsHeader: React.FC<ReportsHeaderProps> = ({
  reportType,
  onDownload,
  onSchedule,
  onShare,
  onEdit,
  onBack
}) => {
  return (
    <div className="bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 border-b border-purple-500/20 shadow-2xl px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {onBack && (
            <Button
              variant="secondary"
              onClick={onBack}
              className="text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white"
            >
              ← Back to Reports
            </Button>
          )}
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{reportType}</h1>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="secondary"
            icon={Download}
            onClick={onDownload}
            className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600"
          >
            Download
          </Button>
          <Button
            variant="secondary"
            icon={Calendar}
            onClick={onSchedule}
            className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600"
          >
            Schedule
          </Button>
          <Button
            icon={Share}
            onClick={onShare}
            className="bg-blue-600 hover:bg-blue-700 text-slate-900 dark:text-white"
          >
            Share
          </Button>
          <Button
            variant="secondary"
            icon={MoreHorizontal}
            onClick={() => {}}
            className="p-2"
            title="More options"
          >
          </Button>
        </div>
      </div>
      
      {/* Report Info Bar */}
      <div className="flex items-center space-x-4 mt-4 text-sm text-slate-600 dark:text-gray-300">
        <div className="flex items-center space-x-2 text-slate-900 dark:text-white">
          <div className="w-6 h-6 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full flex items-center justify-center text-slate-900 dark:text-white text-xs font-bold">
            CB
          </div>
          <span>Camille Boulin</span>
        </div>
        <span>•</span>
        <span>{reportType}</span>
        <span>•</span>
        <button className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1">
          <span>View metadata</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      
      {/* Filters Bar */}
      <div className="flex items-center space-x-4 mt-4 py-2 border-t border-slate-200 dark:border-slate-700">
        <span className="text-sm text-slate-600 dark:text-gray-300">Created: Last 24 hours</span>
        <Button
          variant="secondary"
          icon={SquarePen}
          onClick={onEdit}
          size="sm"
          className="text-xs px-2 py-1"
        >
          Edit
        </Button>
      </div>
    </div>
  );
};

export default ReportsHeader;