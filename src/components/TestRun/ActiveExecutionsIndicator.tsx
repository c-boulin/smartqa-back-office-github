import React, { useState } from 'react';
import { Loader, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useTestRunExecutionPolling } from '../../hooks/useTestRunExecutionPolling';

const ActiveExecutionsIndicator: React.FC = () => {
  const { activeExecutions, activeExecutionsCount, cancelPolling } = useTestRunExecutionPolling();
  const [isExpanded, setIsExpanded] = useState(false);

  if (activeExecutionsCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden max-w-md">
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <Loader className="w-5 h-5 text-cyan-500 animate-spin" />
            <div>
              <div className="font-semibold text-slate-900 dark:text-white">
                Running Tests
              </div>
              <div className="text-sm text-slate-600 dark:text-gray-400">
                {activeExecutionsCount} test{activeExecutionsCount !== 1 ? 's' : ''} in progress
              </div>
            </div>
          </div>
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-slate-600 dark:text-gray-400" />
          ) : (
            <ChevronUp className="w-5 h-5 text-slate-600 dark:text-gray-400" />
          )}
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="border-t border-slate-200 dark:border-slate-700">
            <div className="max-h-96 overflow-y-auto">
              {activeExecutions.map((execution) => (
                <div
                  key={execution.id}
                  className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-900 dark:text-white truncate">
                        {execution.testCaseCode}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-gray-400 truncate">
                        {execution.testCaseTitle}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-cyan-600 dark:text-cyan-400 font-medium">
                          {execution.stateLabel}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-gray-500">
                          Started {formatTimeSince(execution.startedAt)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Are you sure you want to cancel this test execution?')) {
                          cancelPolling(execution.id);
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                      title="Cancel execution"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function formatTimeSince(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export default ActiveExecutionsIndicator;
