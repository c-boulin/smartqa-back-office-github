import React from 'react';
import { Project } from '../../types';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface TestExecutionOverviewProps {
  projects: Project[];
}

const generateMockExecutionData = (projectName: string) => {
  const passed = Math.floor(Math.random() * 80) + 70;
  const failed = Math.floor(Math.random() * 20) + 5;
  const total = passed + failed;
  const passRate = ((passed / total) * 100).toFixed(1);

  const runningAvgPassed = Math.floor(Math.random() * 80) + 70;
  const runningAvgTotal = Math.floor(Math.random() * 30) + 80;
  const runningAvg = ((runningAvgPassed / runningAvgTotal) * 100).toFixed(1);

  const trend = Math.random() > 0.5 ? 'up' : 'down';
  const trendValue = (Math.random() * 10).toFixed(1);

  return {
    passed,
    failed,
    total,
    passRate,
    runningAvgPassed,
    runningAvgTotal,
    runningAvg,
    trend,
    trendValue
  };
};

const TestExecutionOverview: React.FC<TestExecutionOverviewProps> = ({ projects }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Service & Country Test Execution Overview
          </h2>
          <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
            This widget displays a Test Execution from the past week grouped by services and countries
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-slate-600 dark:text-gray-400 mb-3 uppercase">
              Passed (7 runs)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {projects.slice(0, 4).map(project => {
                const data = generateMockExecutionData(project.name);
                return (
                  <div
                    key={`passed-${project.id}`}
                    className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-t-4 border-green-500 rounded-lg p-4"
                  >
                    <h4 className="font-semibold text-slate-900 dark:text-white text-sm mb-3">
                      {project.name}
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-slate-500 dark:text-gray-400">Pass Rate</div>
                        <div className="text-lg font-bold text-green-600 dark:text-green-400">
                          {data.passRate}%
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 dark:text-gray-400">Test cases</div>
                        <div className="text-lg font-bold text-slate-900 dark:text-white">
                          {data.total}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800/50">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-slate-500 dark:text-gray-400">Running avg</div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-white">
                            {data.runningAvg}%
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 dark:text-gray-400">Test cases</div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-white">
                            {data.runningAvgTotal}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-slate-600 dark:text-gray-400 mb-3 uppercase">
              Failed (2 runs)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {projects.slice(0, 2).map(project => {
                const data = generateMockExecutionData(project.name);
                const failedData = {
                  ...data,
                  passRate: (Math.random() * 30 + 40).toFixed(1),
                  passed: Math.floor(Math.random() * 50) + 40,
                  failed: Math.floor(Math.random() * 40) + 30
                };
                return (
                  <div
                    key={`failed-${project.id}`}
                    className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-t-4 border-red-500 rounded-lg p-4"
                  >
                    <h4 className="font-semibold text-slate-900 dark:text-white text-sm mb-3">
                      {project.name}
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-slate-500 dark:text-gray-400">Pass Rate</div>
                        <div className="text-lg font-bold text-red-600 dark:text-red-400">
                          {failedData.passRate}%
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 dark:text-gray-400">Test cases</div>
                        <div className="text-lg font-bold text-slate-900 dark:text-white">
                          {failedData.passed + failedData.failed}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800/50">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-slate-500 dark:text-gray-400">Running avg</div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-white">
                            {failedData.runningAvg}%
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 dark:text-gray-400">Test cases</div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-white">
                            {failedData.runningAvgTotal}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestExecutionOverview;
