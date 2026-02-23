import React from 'react';

interface TestRunSummaryCardsProps {
  activeTestRuns: { current: number; total: number };
  closedTestRuns: { current: number; total: number };
  totalTestCases: number;
}

const TestRunSummaryCards: React.FC<TestRunSummaryCardsProps> = ({
  activeTestRuns,
  closedTestRuns,
  totalTestCases,
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
    </div>
  );
};

export default TestRunSummaryCards;