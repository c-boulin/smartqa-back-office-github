import React from 'react';
import {
  Activity,
  CheckCircle,
  Loader,
  TestTube,
  Database,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Card from '../components/UI/Card';
import SkeletonCard from '../components/UI/SkeletonCard';
import ClosedRunsCaseResultsStackedChart from '../components/Charts/ClosedRunsCaseResultsStackedChart';
import { useApp } from '../context/AppContext';
import { useDashboardSummary } from '../hooks/useDashboardSummary';
import { useTestRunsData } from '../hooks/useTestRunsData';
import { useRestoreLastProject } from '../hooks/useRestoreLastProject';
import { TEST_CASE_TYPES } from '../types';

export default function Dashboard() {
  const navigate = useNavigate();
  const { getSelectedProject, state } = useApp();
  const selectedProject = getSelectedProject();

  useRestoreLastProject();

  const { summaryData, loading: summaryLoading } = useDashboardSummary(selectedProject, state.projects);
  const { data: testRunsData, loading: testRunsLoading } = useTestRunsData(selectedProject?.id);

  const activeTestRunsChartData = testRunsData?.activeTestRunsChart;
  const closedTestRunsChartData = testRunsData?.closedTestRunsChart;
  const closedTestRunsResultsData = testRunsData?.closedTestRunsRawData;

  const getTypeColor = (typeId: number): string => {
    const colors = {
      1: '#10B981',
      2: '#10B981',
      3: '#8B5CF6',
      4: '#F59E0B',
      5: '#EF4444',
      6: '#06B6D4',
      7: '#F97316',
      8: '#84CC16',
      9: '#EC4899',
      10: '#6366F1',
      11: '#14B8A6',
    };
    return colors[typeId as keyof typeof colors] || '#6B7280';
  };

  const calculatePercentages = (values: number[], total: number): number[] => {
    if (total === 0) return values.map(() => 0);
    return values.map(value => Math.round((value / total) * 100));
  };

  const handleActiveTestRunsClick = (data: { name: string; value: number }) => {
    if (!selectedProject) {
      console.warn('No project selected, cannot navigate to test runs overview');
      return;
    }

    const resultFilter = data.name.toLowerCase();
    navigate('/test-runs-overview', {
      state: {
        projectId: selectedProject.id,
        resultFilter: resultFilter
      },
      search: `?result=${resultFilter}`
    });
  };

  const handleTypeOfTestCasesClick = (data: { name: string; value: number }) => {
    if (!selectedProject) {
      console.warn('No project selected, cannot navigate to test cases');
      return;
    }

    const typeNameToId: Record<string, number> = {};
    Object.entries(TEST_CASE_TYPES).forEach(([id, name]) => {
      typeNameToId[name] = parseInt(id);
    });

    const typeId = typeNameToId[data.name];
    if (!typeId) {
      console.warn('Could not find type ID for:', data.name);
      return;
    }

    navigate('/test-cases', {
      state: {
        applyFilter: {
          type: 'type',
          value: typeId,
          label: data.name
        }
      }
    });
  };

  const activeTestRunsData = activeTestRunsChartData ? [
    { name: 'Passed', value: activeTestRunsChartData.actualPassed, color: '#10B981' },
    { name: 'Failed', value: activeTestRunsChartData.actualFailed, color: '#EF4444' },
    { name: 'Blocked', value: activeTestRunsChartData.actualBlocked, color: '#F59E0B' },
    { name: 'Retest', value: activeTestRunsChartData.actualRetest, color: '#F97316' },
    { name: 'Skipped', value: activeTestRunsChartData.actualSkipped, color: '#8B5CF6' },
    { name: 'Untested', value: activeTestRunsChartData.actualUntested, color: '#6B7280' },
    { name: 'In Progress', value: activeTestRunsChartData.actualInProgress, color: '#3B82F6' },
    { name: 'Unknown', value: activeTestRunsChartData.actualUnknown, color: '#4B5563' }
  ] : [];

  const totalActiveTestCases = activeTestRunsChartData?.totalTestCasesInActiveRuns || 0;

  const activeTestRunsPercentages = calculatePercentages(
    activeTestRunsData.map(item => item.value),
    totalActiveTestCases || 1
  );

  const typeOfTestCasesData = summaryData ? Object.entries(summaryData.testTypeDistribution || {})
    .map(([typeId, count]) => {
      const typeKey = parseInt(typeId) as keyof typeof TEST_CASE_TYPES;
      return {
        name: TEST_CASE_TYPES[typeKey] || `Type ${typeId}`,
        value: count,
        color: getTypeColor(parseInt(typeId))
      };
    })
    .filter(item => item.value > 0) : [];

  const typeOfTestCasesPercentages = calculatePercentages(
    typeOfTestCasesData.map(item => item.value),
    summaryData?.totalTestCases || 0
  );

  const trendOfTestCasesData = summaryData?.trendsData || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
      </div>

      {selectedProject && (
        <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center">
                <Database className="w-5 h-5 mr-2 text-green-400" />
                📁 {selectedProject.name}
              </h3>
              <p className="text-sm text-slate-600 dark:text-gray-400">{selectedProject.description}</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-600 dark:text-gray-400">Total Test Cases</div>
              <div className="text-2xl font-bold text-cyan-400">
                {summaryLoading ? <Loader className="w-6 h-6 animate-spin inline" /> : summaryData?.totalTestCases || 0}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {testRunsLoading ? (
          <SkeletonCard />
        ) : (
          <Card gradient className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Test Cases in Active Test Runs</h3>
            </div>

            <div className="h-64 flex items-center justify-center relative">
              {totalActiveTestCases > 0 ? (
              <div className="h-full w-full flex items-center">
                <ResponsiveContainer width="60%" height="100%">
                  <PieChart>
                    <Pie
                      data={activeTestRunsData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      dataKey="value"
                      startAngle={90}
                      endAngle={450}
                      onClick={handleActiveTestRunsClick}
                    >
                      {activeTestRunsData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          style={{ cursor: 'pointer' }}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgb(241 245 249)', border: '1px solid rgb(203 213 225)',
                        borderRadius: '8px',
                        color: 'rgb(15 23 42)'
                      }}
                      labelStyle={{ color: 'rgb(15 23 42)' }}
                      itemStyle={{ color: 'rgb(15 23 42)' }}
                    />
                    <text
                      x="50%"
                      y="45%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-slate-900 dark:fill-white text-2xl font-bold"
                    >
                      {totalActiveTestCases}
                    </text>
                    <text
                      x="50%"
                      y="55%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-slate-600 dark:fill-gray-400 text-sm"
                    >
                      Total Test Cases
                    </text>
                  </PieChart>
                </ResponsiveContainer>

                <div className="ml-6 space-y-3 flex-1">
                  {activeTestRunsData.filter(entry => entry.value > 0).map((entry, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: entry.color }}></div>
                        <span className="text-sm text-slate-700 dark:text-gray-300">{entry.name}</span>
                      </div>
                      <span className="text-sm text-slate-700 dark:text-gray-300">
                        {entry.value} ({activeTestRunsPercentages[activeTestRunsData.indexOf(entry)]}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-500 dark:text-gray-400">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No active test runs</p>
                <p className="text-sm">Start executing tests to see the distribution</p>
              </div>
              )}
            </div>
          </Card>
        )}

        {testRunsLoading ? (
          <SkeletonCard />
        ) : (
          <Card gradient className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Closed Test Runs</h3>
            </div>

            <div className="h-64 flex items-center justify-center relative">
              {closedTestRunsChartData && closedTestRunsChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={closedTestRunsChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-300 dark:stroke-slate-700" />
                  <XAxis
                    dataKey="month"
                    className="stroke-slate-600 dark:stroke-slate-400" tick={{ fill: 'currentColor' }} style={{ color: 'inherit' }}
                    fontSize={12}
                  />
                  <YAxis
                    className="stroke-slate-600 dark:stroke-slate-400" tick={{ fill: 'currentColor' }} style={{ color: 'inherit' }}
                    fontSize={12}
                   allowDecimals={false}
                    domain={[0, 'dataMax']}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgb(241 245 249)', border: '1px solid rgb(203 213 225)',
                      borderRadius: '8px',
                      color: 'rgb(15 23 42)'
                    }}
                    formatter={(value) => [`${value} test run${value !== 1 ? 's' : ''}`, 'Closed']}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#06B6D4"
                    strokeWidth={3}
                    dot={{ fill: '#06B6D4', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: '#06B6D4' }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-slate-500 dark:text-gray-400">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No closed test runs</p>
                <p className="text-sm">Complete test runs to see historical data</p>
              </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {testRunsLoading ? (
        <SkeletonCard height="h-80" />
      ) : (
        <Card gradient className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Results from Closed Test Runs</h3>
          </div>

          <div className="h-80 flex items-center justify-center relative">
            <div className="w-full h-full">
              <ClosedRunsCaseResultsStackedChart
                projectId={selectedProject?.id}
                closedTestRunsData={closedTestRunsResultsData}
                className="h-80"
              />
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card gradient className="p-6 text-center">
          <h3 className="text-sm font-medium text-slate-600 dark:text-gray-400 mb-2">Automation Coverage</h3>
          <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
            {summaryLoading ? <Loader className="w-6 h-6 animate-spin inline" /> : `${summaryData?.automationCoverage || 0}%`}
          </div>
        </Card>

        <Card gradient className="p-6 text-center">
          <div className="flex items-center justify-center mb-2">
            <h3 className="text-sm font-medium text-slate-600 dark:text-gray-400 mr-1">Automated Test Cases</h3>
          </div>
          <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
            {summaryLoading ? <Loader className="w-6 h-6 animate-spin inline" /> : summaryData?.automatedTestCases || 0}
          </div>
        </Card>

        <Card gradient className="p-6 text-center">
          <div className="flex items-center justify-center mb-2">
            <h3 className="text-sm font-medium text-slate-600 dark:text-gray-400 mr-1">Manual Test Cases</h3>
          </div>
          <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
            {summaryLoading ? <Loader className="w-6 h-6 animate-spin inline" /> : summaryData?.manualTestCases || 0}
          </div>
        </Card>

        <Card gradient className="p-6 text-center">
          <h3 className="text-sm font-medium text-slate-600 dark:text-gray-400 mb-2">Total Test Cases</h3>
          <div className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
            {summaryLoading ? <Loader className="w-6 h-6 animate-spin inline" /> : summaryData?.totalTestCases || 0}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {summaryLoading ? (
          <SkeletonCard />
        ) : (
          <Card gradient className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Type of Test Cases</h3>
            </div>

            <div className="h-64 flex items-center justify-center relative">
              {summaryData && summaryData.totalTestCases > 0 ? (
              <div className="h-full w-full flex items-center">
                <ResponsiveContainer width="60%" height="100%">
                  <PieChart>
                    <Pie
                      data={typeOfTestCasesData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      dataKey="value"
                      startAngle={90}
                      endAngle={450}
                      onClick={handleTypeOfTestCasesClick}
                    >
                      {typeOfTestCasesData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          style={{ cursor: 'pointer' }}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgb(241 245 249)', border: '1px solid rgb(203 213 225)',
                        borderRadius: '8px',
                        color: 'rgb(15 23 42)'
                      }}
                      labelStyle={{ color: 'rgb(15 23 42)' }}
                      itemStyle={{ color: 'rgb(15 23 42)' }}
                    />
                    <text
                      x="50%"
                      y="45%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-slate-900 dark:fill-white text-2xl font-bold"
                    >
                      {summaryData.totalTestCases}
                    </text>
                    <text
                      x="50%"
                      y="55%"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-slate-600 dark:fill-gray-400 text-sm"
                    >
                      Total Test Cases
                    </text>
                  </PieChart>
                </ResponsiveContainer>

                <div className="ml-6 space-y-3 flex-1">
                  {typeOfTestCasesData.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: entry.color }}></div>
                        <span className="text-sm text-slate-700 dark:text-gray-300">{entry.name}</span>
                      </div>
                      <span className="text-sm text-slate-700 dark:text-gray-300">
                        {entry.value} ({typeOfTestCasesPercentages[index]}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-500 dark:text-gray-400">
                <TestTube className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No test cases found</p>
                <p className="text-sm">Create test cases to see type distribution</p>
              </div>
              )}
            </div>
          </Card>
        )}

        {summaryLoading ? (
          <SkeletonCard />
        ) : (
          <Card gradient className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Trend of Test Cases</h3>
            </div>

            <div className="h-64 flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendOfTestCasesData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-300 dark:stroke-slate-700" />
                  <XAxis
                    dataKey="month"
                    className="stroke-slate-600 dark:stroke-slate-400" tick={{ fill: 'currentColor' }} style={{ color: 'inherit' }}
                    fontSize={12}
                  />
                  <YAxis
                    className="stroke-slate-600 dark:stroke-slate-400" tick={{ fill: 'currentColor' }} style={{ color: 'inherit' }}
                    fontSize={12}
                    domain={[0, 'dataMax + 1']}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgb(241 245 249)', border: '1px solid rgb(203 213 225)',
                      borderRadius: '8px',
                      color: 'rgb(15 23 42)'
                    }}
                  />
                  {trendOfTestCasesData.length > 0 && Object.keys(trendOfTestCasesData[0])
                    .filter(key => key !== 'month' && key !== 'date' && key !== 'Total')
                    .map((typeKey) => {
                      const typeNameToId: Record<string, number> = {};
                      Object.entries(TEST_CASE_TYPES).forEach(([id, name]) => {
                        typeNameToId[name] = parseInt(id);
                      });

                      const typeId = typeNameToId[typeKey];
                      const color = typeId ? getTypeColor(typeId) : '#6B7280';

                      return (
                        <Line
                          key={typeKey}
                          type="monotone"
                          dataKey={typeKey}
                          stroke={color}
                          strokeWidth={2}
                          dot={{ fill: color, strokeWidth: 2, r: 3 }}
                          name={typeKey}
                        />
                      );
                    })}
                  <Line
                    type="monotone"
                    dataKey="Total"
                    stroke="rgb(15 23 42)" className="dark:[&>path]:!stroke-white"
                    strokeWidth={3}
                    dot={{ fill: 'rgb(15 23 42)', className: 'dark:!fill-white', strokeWidth: 2, r: 4 }}
                    name="Total"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
