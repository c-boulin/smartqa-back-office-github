import React, { useState, useEffect } from 'react';
import { Loader } from 'lucide-react';
import Card from '../components/UI/Card';
import { projectsApiService } from '../services/projectsApi';
import { testRunsApiService } from '../services/testRunsApi';
import { TEST_RESULTS } from '../types';

type TestResultId = keyof typeof TEST_RESULTS;

interface ProjectStats {
  projectId: string;
  projectName: string;
  passingRate: number;
  totalTestCases: number;
  passedCount: number;
  failedCount: number;
}

export default function Overview() {
  const [loading, setLoading] = useState(true);
  const [projectStats, setProjectStats] = useState<ProjectStats[]>([]);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('week');

  useEffect(() => {
    fetchOverviewData();
  }, [timeRange]);

  const fetchOverviewData = async () => {
    setLoading(true);
    try {
      const projectsResponse = await projectsApiService.getProjects(1, 1000);
      const stats: ProjectStats[] = [];

      for (const apiProject of projectsResponse.data) {
        const project = projectsApiService.transformApiProject(apiProject);
          const testRunsResponse = await testRunsApiService.getTestRuns(project.id, 1, 1000);

          const cutoffDate = new Date();
          if (timeRange === 'week') {
            cutoffDate.setDate(cutoffDate.getDate() - 7);
          } else if (timeRange === 'month') {
            cutoffDate.setMonth(cutoffDate.getMonth() - 1);
          }

          let passedCount = 0;
          let failedCount = 0;
          const testCaseExecutions = new Map<string, string>();

          testRunsResponse.data.forEach(apiTestRun => {
            if (apiTestRun.attributes.executions && Array.isArray(apiTestRun.attributes.executions)) {
              apiTestRun.attributes.executions.forEach((execution: Record<string, unknown>) => {
                const executionDate = new Date(execution.created_at);
                if (timeRange !== 'all' && executionDate < cutoffDate) {
                  return;
                }

                const testCaseId = execution.test_case_id.toString();
                const configId = execution.configuration_id ? execution.configuration_id.toString() : 'no-config';
                const key = `${testCaseId}-${configId}`;

                const existingDate = testCaseExecutions.get(key);
                if (!existingDate || new Date(existingDate) < executionDate) {
                  testCaseExecutions.set(key, execution.created_at as string);

                  const rawResult = execution.result;
                  let resultLabel: string;

                  if (typeof rawResult === 'number') {
                    resultLabel = TEST_RESULTS[rawResult as TestResultId]?.toLowerCase() || 'unknown';
                  } else if (typeof rawResult === 'string') {
                    const numericResult = parseInt(rawResult);
                    if (!isNaN(numericResult) && TEST_RESULTS[numericResult as TestResultId]) {
                      resultLabel = TEST_RESULTS[numericResult as TestResultId]?.toLowerCase() || 'unknown';
                    } else {
                      resultLabel = rawResult.toLowerCase();
                    }
                  } else {
                    resultLabel = 'unknown';
                  }

                  if (resultLabel === 'passed') {
                    passedCount++;
                  } else if (resultLabel === 'failed') {
                    failedCount++;
                  }
                }
              });
            }
          });

          const totalTestCases = testCaseExecutions.size;
          const passingRate = totalTestCases > 0 ? Math.round((passedCount / totalTestCases) * 100) : 0;

        if (totalTestCases > 0) {
          stats.push({
            projectId: project.id,
            projectName: project.name,
            passingRate,
            totalTestCases,
            passedCount,
            failedCount
          });
        }
      }

      stats.sort((a, b) => a.passingRate - b.passingRate);
      setProjectStats(stats);
    } catch (error) {
      console.error('Failed to fetch overview data:', error);
    } finally {
      setLoading(false);
    }
  };

  const passedProjects = projectStats.filter(p => p.passingRate === 100);
  const failedProjects = projectStats.filter(p => p.passingRate < 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Overview</h1>
          <p className="text-sm text-slate-600 dark:text-gray-400 mt-1">
            Test execution health check across all projects
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setTimeRange('week')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              timeRange === 'week'
                ? 'bg-cyan-500 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-gray-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            Last Week
          </button>
          <button
            onClick={() => setTimeRange('month')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              timeRange === 'month'
                ? 'bg-cyan-500 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-gray-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            Last Month
          </button>
          <button
            onClick={() => setTimeRange('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              timeRange === 'all'
                ? 'bg-cyan-500 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-gray-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      {!loading && projectStats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm text-slate-600 dark:text-gray-400">Total Projects</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {projectStats.length}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-slate-600 dark:text-gray-400">Projects Passing</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
              {passedProjects.length}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-slate-600 dark:text-gray-400">Projects Failing</div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
              {failedProjects.length}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-slate-600 dark:text-gray-400">Overall Pass Rate</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {projectStats.length > 0
                ? Math.round(
                    (projectStats.reduce((sum, p) => sum + p.passedCount, 0) /
                      projectStats.reduce((sum, p) => sum + p.totalTestCases, 0)) *
                      100
                  )
                : 0}%
            </div>
          </Card>
        </div>
      )}

      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span className="text-slate-700 dark:text-gray-300">Less than 100%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-slate-700 dark:text-gray-300">100% passed</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader className="w-8 h-8 animate-spin text-cyan-500" />
        </div>
      ) : (
        <div className="space-y-8">
          {failedProjects.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                Failed ({failedProjects.length} {failedProjects.length === 1 ? 'case' : 'cases'})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {failedProjects.map((project) => (
                  <Card key={project.projectId} className="border-t-4 border-t-red-500">
                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                        {project.projectName}
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-slate-600 dark:text-gray-400">Passing rate</div>
                          <div className="text-2xl font-bold text-slate-900 dark:text-white">
                            {project.passingRate} %
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-slate-600 dark:text-gray-400">Test cases</div>
                          <div className="text-2xl font-bold text-slate-900 dark:text-white">
                            {project.totalTestCases}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {passedProjects.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                Passed ({passedProjects.length} {passedProjects.length === 1 ? 'case' : 'cases'})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {passedProjects.map((project) => (
                  <Card key={project.projectId} className="border-t-4 border-t-green-500">
                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                        {project.projectName}
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-slate-600 dark:text-gray-400">Passing rate</div>
                          <div className="text-2xl font-bold text-slate-900 dark:text-white">
                            {project.passingRate} %
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-slate-600 dark:text-gray-400">Test cases</div>
                          <div className="text-2xl font-bold text-slate-900 dark:text-white">
                            {project.totalTestCases}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {projectStats.length === 0 && (
            <div className="text-center py-20">
              <p className="text-slate-500 dark:text-gray-400 text-lg">
                No test execution data available for the selected time range
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
