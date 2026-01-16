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
      const [projectsResponse, testRunsResponse] = await Promise.all([
        projectsApiService.getProjects(1, 1000),
        testRunsApiService.getAllTestRuns(1, 10000)
      ]);

      console.log('Projects:', projectsResponse.data.length);
      console.log('Test Runs:', testRunsResponse.data.length);

      if (testRunsResponse.data.length > 0) {
        console.log('First test run sample:', testRunsResponse.data[0]);
        console.log('First test run executions:', testRunsResponse.data[0]?.attributes?.executions);
      }

      const cutoffDate = new Date();
      if (timeRange === 'week') {
        cutoffDate.setDate(cutoffDate.getDate() - 7);
      } else if (timeRange === 'month') {
        cutoffDate.setMonth(cutoffDate.getMonth() - 1);
      }

      const projectStatsMap = new Map<string, {
        projectId: string;
        projectName: string;
        testCaseExecutions: Map<string, { date: string; result: string }>;
      }>();

      projectsResponse.data.forEach(apiProject => {
        const project = projectsApiService.transformApiProject(apiProject);
        projectStatsMap.set(project.id, {
          projectId: project.id,
          projectName: project.name,
          testCaseExecutions: new Map<string, { date: string; result: string }>()
        });
      });

      let totalExecutionsProcessed = 0;
      let executionsFiltered = 0;

      testRunsResponse.data.forEach(apiTestRun => {
        const projectIdFromApi = apiTestRun.relationships.project.data.id;
        const projectId = projectIdFromApi.split('/').pop() || projectIdFromApi;
        const projectData = projectStatsMap.get(projectId);

        if (!projectData) {
          console.log('Project not found in map. Looking for:', projectId, 'Available keys:', Array.from(projectStatsMap.keys()));
          return;
        }

        if (apiTestRun.attributes.executions && Array.isArray(apiTestRun.attributes.executions)) {
          apiTestRun.attributes.executions.forEach((execution: Record<string, unknown>) => {
            totalExecutionsProcessed++;
            const executionDate = new Date(execution.created_at);
            if (timeRange !== 'all' && executionDate < cutoffDate) {
              executionsFiltered++;
              return;
            }

            const testCaseId = execution.test_case_id.toString();
            const configId = execution.configuration_id ? execution.configuration_id.toString() : 'no-config';
            const key = `${testCaseId}-${configId}`;

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

            const existing = projectData.testCaseExecutions.get(key);
            if (!existing || new Date(existing.date) < executionDate) {
              projectData.testCaseExecutions.set(key, {
                date: execution.created_at as string,
                result: resultLabel
              });
            }
          });
        }
      });

      console.log('Total executions processed:', totalExecutionsProcessed);
      console.log('Executions filtered by date:', executionsFiltered);

      const stats: ProjectStats[] = [];
      projectStatsMap.forEach((projectData) => {
        const totalTestCases = projectData.testCaseExecutions.size;
        console.log(`Project ${projectData.projectName}: ${totalTestCases} test cases`);

        if (totalTestCases > 0) {
          let passedCount = 0;
          let failedCount = 0;

          projectData.testCaseExecutions.forEach((execution) => {
            if (execution.result === 'passed') {
              passedCount++;
            } else if (execution.result === 'failed') {
              failedCount++;
            }
          });

          console.log(`  - Passed: ${passedCount}, Failed: ${failedCount}`);

          const passingRate = Math.round((passedCount / totalTestCases) * 100);
          stats.push({
            projectId: projectData.projectId,
            projectName: projectData.projectName,
            passingRate,
            totalTestCases,
            passedCount,
            failedCount
          });
        }
      });

      console.log('Final stats array length:', stats.length);
      console.log('Stats:', stats);

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
