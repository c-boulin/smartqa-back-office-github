import React, { useState } from 'react';
import { Loader, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTestRunExecutionPolling } from '../../hooks/useTestRunExecutionPolling';

const ActiveExecutionsIndicator: React.FC = () => {
  const { activeExecutions, activeExecutionsCount, cancelPolling } = useTestRunExecutionPolling();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (activeExecutionsCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div
        className={`bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden transition-all duration-300 ${
          isCollapsed ? 'max-w-[48px]' : 'max-w-md'
        }`}
      >
        {/* Collapsed state - just the arrow */}
        {isCollapsed && (
          <button
            onClick={() => setIsCollapsed(false)}
            className="w-12 h-12 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            aria-label="Show running tests"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-gray-400" />
          </button>
        )}

        {/* Expanded state */}
        {!isCollapsed && (
          <>
            {/* Header */}
            <div className="flex items-center">
              {/* Collapse arrow */}
              <button
                onClick={() => setIsCollapsed(true)}
                className="px-2 py-3 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex-shrink-0"
                aria-label="Hide running tests"
              >
                <ChevronRight className="w-5 h-5 text-slate-600 dark:text-gray-400" />
              </button>

              {/* Main header content */}
              <div
                className="flex items-center justify-between flex-1 pr-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                <div className="flex items-center gap-3">
                  <Loader className="w-5 h-5 text-cyan-500 animate-spin" />
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white">
                      Running Tests
                    </div>
                    <div className="text-sm text-slate-600 dark:text-gray-400">
                      {activeExecutionsCount} suite{activeExecutionsCount !== 1 ? 's' : ''} in progress
                    </div>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-slate-600 dark:text-gray-400" />
                ) : (
                  <ChevronUp className="w-5 h-5 text-slate-600 dark:text-gray-400" />
                )}
              </div>
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
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
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
