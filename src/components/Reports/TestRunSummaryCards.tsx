import React from 'react';

interface TestRunSummaryCardsProps {
  activeTestRuns: { current: number; total: number };
  closedTestRuns: { current: number; total: number };
  totalTestCases: number;
  totalLinkedIssues: number;
}

const TestRunSummaryCards: React.FC<TestRunSummaryCardsProps> = ({
  activeTestRuns,
  closedTestRuns,
  totalTestCases,
  totalLinkedIssues
}) => {
  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Active Test Runs */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-purple-500/30 rounded-lg p-6 backdrop-blur-sm">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Active Test Runs</h3>
        <div className="text-4xl font-bold text-cyan-400">
          {activeTestRuns.current} / {activeTestRuns.total}
        </div>
      </div>

      {/* Closed Test Runs */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-purple-500/30 rounded-lg p-6 backdrop-blur-sm">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Closed Test Runs</h3>
        <div className="text-4xl font-bold text-purple-400">
          {closedTestRuns.current} / {closedTestRuns.total}
        </div>
      </div>

      {/* Total Test Cases */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-purple-500/30 rounded-lg p-6 backdrop-blur-sm">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Total Test Cases</h3>
        <div className="text-4xl font-bold text-green-400">{totalTestCases}</div>
      </div>

      {/* Total Linked Issues */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-purple-500/30 rounded-lg p-6 backdrop-blur-sm">
        <div className="flex items-center space-x-2 mb-2">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Total Linked Issues</h3>
          <div className="w-4 h-4 bg-gray-500 rounded-full flex items-center justify-center">
            <span className="text-slate-900 dark:text-white text-xs">i</span>
          </div>
        </div>
        <div className="text-4xl font-bold text-orange-400">{totalLinkedIssues}</div>
      </div>
    </div>
  );
};

export default TestRunSummaryCards;