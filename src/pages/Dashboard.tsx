import React from 'react';
import { 
  Activity, 
  CheckCircle, 
  // XCircle, 
  // Clock,
  Loader,
  TestTube,
  // Layers,
  // FolderOpen,
  Database,
  // Share,
  // Filter,
  // MoreHorizontal,
  // Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Card from '../components/UI/Card';
// import Button from '../components/UI/Button';
import ClosedRunsCaseResultsStackedChart from '../components/Charts/ClosedRunsCaseResultsStackedChart';
import { useApp } from '../context/AppContext';
import { useDashboardData } from '../hooks/useDashboardData';
import { TEST_CASE_TYPES } from '../types';

// Only use dashboard data hook on Dashboard page
export default function Dashboard() {
  const navigate = useNavigate();
  const { getSelectedProject, state } = useApp();
  const selectedProject = getSelectedProject();
  
  console.log('📊 Dashboard render:', {
    selectedProject: selectedProject?.name,
    selectedProjectId: selectedProject?.id,
    totalProjects: state.projects.length,
    timestamp: new Date().toISOString()
  });
  
  const { dashboardData, loading, error } = useDashboardData(selectedProject, state.projects);

  // Helper function to get colors for different test case types
  const getTypeColor = (typeId: number): string => {
    const colors = {
      1: '#10B981', // Other - Green
      2: '#10B981', // Acceptance - Emerald
      3: '#8B5CF6', // Accessibility - Purple
      4: '#F59E0B', // Compatibility - Amber
      5: '#EF4444', // Destructive - Red
      6: '#06B6D4', // Functional - Cyan
      7: '#F97316', // Performance - Orange
      8: '#84CC16', // Regression - Lime
      9: '#EC4899', // Security - Pink
      10: '#6366F1', // Smoke & Sanity - Indigo
      11: '#14B8A6', // Usability - Teal
    };
    return colors[typeId as keyof typeof colors] || '#6B7280';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Card className="p-8 text-center">
          <div className="text-red-400 mb-4">
            <p className="text-lg font-medium">Failed to load dashboard data</p>
            <p className="text-sm text-gray-400 mt-2">{error}</p>
          </div>
        </Card>
      </div>
    );
  }

  // Prepare data for Active Test Runs (pie chart)
  // Show all result types in pie chart
  const activeTestRunsData = [
    { name: 'Passed', value: dashboardData.actualPassed, color: '#10B981' },
    { name: 'Failed', value: dashboardData.actualFailed, color: '#EF4444' },
    { name: 'Blocked', value: dashboardData.actualBlocked, color: '#F59E0B' },
    { name: 'Retest', value: dashboardData.actualRetest, color: '#F97316' },
    { name: 'Skipped', value: dashboardData.actualSkipped, color: '#8B5CF6' },
    { name: 'Untested', value: dashboardData.actualUntested, color: '#6B7280' },
    { name: 'In Progress', value: dashboardData.actualInProgress, color: '#3B82F6' },
    { name: 'Unknown', value: dashboardData.actualUnknown, color: '#4B5563' }
  ]; // Don't filter out zero values - show all result types
  
  // Total test cases = all test cases in active test runs (regardless of result)
  const totalActiveTestCases = dashboardData.totalTestCasesInActiveRuns || 0;
  
  console.log('📊 🎯 DASHBOARD PIE CHART DEBUG:');
  console.log('📊 🎯 Raw dashboard data values:');
  console.log('📊 🎯   - actualPassed:', dashboardData.actualPassed, 'type:', typeof dashboardData.actualPassed);
  console.log('📊 🎯   - actualFailed:', dashboardData.actualFailed, 'type:', typeof dashboardData.actualFailed);
  console.log('📊 🎯   - actualBlocked:', dashboardData.actualBlocked, 'type:', typeof dashboardData.actualBlocked);
  console.log('📊 🎯 Calculated totalActiveTestCases:', totalActiveTestCases);
  console.log('📊 🎯 Pie chart data after filtering:', activeTestRunsData);
  console.log('📊 🎯 Should show pie chart?', totalActiveTestCases > 0);
  console.log('📊 🎯 Pie chart condition check:', {
    totalActiveTestCases,
    isGreaterThanZero: totalActiveTestCases > 0,
    hasDataItems: activeTestRunsData.length > 0
  });

  // Helper function to calculate percentages that always add up to 100%
  const calculatePercentages = (values: number[], total: number): number[] => {
    if (total === 0) return values.map(() => 0);
    
    // Calculate exact percentages and round to nearest integer
    return values.map(value => Math.round((value / total) * 100));
  };

  // Calculate corrected percentages for active test runs
  const activeTestRunsPercentages = calculatePercentages(
    activeTestRunsData.map(item => item.value),
    totalActiveTestCases || 1 // Prevent division by zero
  );

  // Prepare data for Closed Test Runs (line chart)
  const closedTestRunsLineData = dashboardData.closedTestRunsLineData || [];

  // Prepare data for Type of Test Cases (pie chart)
  const typeOfTestCasesData = Object.entries(dashboardData.testTypeDistribution || {})
    .map(([typeId, count]) => {
      const typeKey = parseInt(typeId) as keyof typeof TEST_CASE_TYPES;
      return {
        name: TEST_CASE_TYPES[typeKey] || `Type ${typeId}`,
        value: count,
        color: getTypeColor(parseInt(typeId))
      };
    })
    .filter(item => item.value > 0);

  // Calculate corrected percentages for type of test cases
  const typeOfTestCasesPercentages = calculatePercentages(
    typeOfTestCasesData.map(item => item.value),
    dashboardData.totalTestCases
  );

  // Handler for pie chart click navigation
  const handleActiveTestRunsClick = (data: { name: string; value: number }) => {
    if (!selectedProject) {
      console.warn('No project selected, cannot navigate to test runs overview');
      return;
    }

    console.log('🎯 Navigating to test runs overview with result filter:', data.name);
    
    // Navigate to test runs overview page with result filter
    const resultFilter = data.name.toLowerCase(); // 'passed' or 'failed'
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

    // Map the clicked segment name back to the type ID
    const typeNameToId: Record<string, number> = {};
    Object.entries(TEST_CASE_TYPES).forEach(([id, name]) => {
      typeNameToId[name] = parseInt(id);
    });

    const typeId = typeNameToId[data.name];
    if (!typeId) {
      console.warn('Could not find type ID for:', data.name);
      return;
    }

    console.log('🎯 Navigating to test cases with type filter:', data.name, 'ID:', typeId);
    
    // Navigate to test cases page with type filter
    // We'll pass the filter via URL state so the TestCases page can apply it
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

  // Use real trend data from dashboard hook
  const trendOfTestCasesData = dashboardData.trendsData || [];
  
  console.log('📈 Using real trend data from dashboard hook:', trendOfTestCasesData);


  return (
    <div className="space-y-6">
      {/* Header with time filters */}
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
      </div>

      {/* Project Context */}
      {selectedProject && (
        <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center">
                <Database className="w-5 h-5 mr-2 text-green-400" />
                📁 {selectedProject.name}
              </h3>
              <p className="text-sm text-gray-400">{selectedProject.description}</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">Total Test Cases</div>
              <div className="text-2xl font-bold text-cyan-400">{dashboardData.totalTestCases}</div>
            </div>
          </div>
        </div>
      )}

      {/* Top Row - Active Test Runs and Closed Test Runs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Test Runs */}
        <Card gradient className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Test Cases in Active Test Runs</h3>
          </div>
          
          {totalActiveTestCases > 0 ? (
            <div className="h-64 flex items-center">
              {console.log('📊 Rendering pie chart with data:', activeTestRunsData, 'Total:', totalActiveTestCases)}
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
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#06B6D4' 
                    }}
                    labelStyle={{ color: '#06B6D4' }}
                    itemStyle={{ color: '#06B6D4' }}
                  />
                  {/* Center text */}
                  <text 
                    x="50%" 
                    y="45%" 
                    textAnchor="middle" 
                    dominantBaseline="middle" 
                    className="fill-white text-2xl font-bold"
                  >
                    {totalActiveTestCases}
                  </text>
                  <text 
                    x="50%" 
                    y="55%" 
                    textAnchor="middle" 
                    dominantBaseline="middle" 
                    className="fill-gray-400 text-sm"
                  >
                    Total Test Cases
                  </text>
                </PieChart>
              </ResponsiveContainer>
              
              {/* Legend */}
              <div className="ml-6 space-y-3 flex-1">
                {activeTestRunsData.filter(entry => entry.value > 0).map((entry, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: entry.color }}></div>
                      <span className="text-sm text-gray-300">{entry.name}</span>
                    </div>
                    <span className="text-sm text-gray-300">
                      {entry.value} ({activeTestRunsPercentages[activeTestRunsData.indexOf(entry)]}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center text-gray-400">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No active test runs</p>
                <p className="text-sm">Start executing tests to see the distribution</p>
              </div>
            </div>
          )}
        </Card>

        {/* Closed Test Runs */}
        <Card gradient className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Closed Test Runs</h3>
          </div>
          
          <div className="h-64">
            {closedTestRunsLineData.length > 0 ? (
              <>
                {console.log('🔍 BAR_CHART_DEBUG: Rendering bar chart with data:', dashboardData.closedTestRunsData)}
                {console.log('🔍 BAR_CHART_DEBUG: Data has', dashboardData.closedTestRunsData.length, 'items')}
                {console.log('🔍 BAR_CHART_DEBUG: First data item:', dashboardData.closedTestRunsData[0])}
              <>
                {console.log('🔍 CHART_RENDER_DEBUG: About to render bar chart')}
                {console.log('🔍 CHART_RENDER_DEBUG: Data length:', dashboardData.closedTestRunsData.length)}
                {console.log('🔍 CHART_RENDER_DEBUG: Data content:', dashboardData.closedTestRunsData)}
                {console.log('🔍 CHART_RENDER_DEBUG: First data item:', dashboardData.closedTestRunsData[0])}
                {console.log('🔍 CHART_RENDER_DEBUG: Data structure check:', {
                  hasMonth: !!dashboardData.closedTestRunsData[0]?.month,
                  hasPassed: typeof dashboardData.closedTestRunsData[0]?.passed === 'number',
                  hasFailed: typeof dashboardData.closedTestRunsData[0]?.failed === 'number',
                  hasBlocked: typeof dashboardData.closedTestRunsData[0]?.blocked === 'number'
                })}
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={closedTestRunsLineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#6B7280" 
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#6B7280" 
                    fontSize={12}
                   allowDecimals={false}
                    domain={[0, 'dataMax']}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#06B6D4' 
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
              </>
              </>
            ) : (
              <>
                {console.log('🔍 BAR_CHART_DEBUG: No data to display - showing empty state')}
                {console.log('🔍 BAR_CHART_DEBUG: dashboardData.closedTestRunsData:', dashboardData.closedTestRunsData)}
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-400">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No closed test runs</p>
                  <p className="text-sm">Complete test runs to see historical data</p>
                </div>
              </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* Results from Closed Test Runs */}
      <Card gradient className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Results from Closed Test Runs</h3>
        </div>
        
        <ClosedRunsCaseResultsStackedChart 
          projectId={selectedProject?.id}
          className="h-80"
        />
      </Card>

      {/* Automation Coverage Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card gradient className="p-6 text-center">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Automation Coverage</h3>
          <div className="text-3xl font-bold text-white mb-1">{dashboardData.automationCoverage || 0}%</div>
        </Card>
        
        <Card gradient className="p-6 text-center">
          <div className="flex items-center justify-center mb-2">
            <h3 className="text-sm font-medium text-gray-400 mr-1">Automated Test Cases</h3>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{dashboardData.automatedTestCases || 0}</div>
        </Card>
        
        <Card gradient className="p-6 text-center">
          <div className="flex items-center justify-center mb-2">
            <h3 className="text-sm font-medium text-gray-400 mr-1">Manual Test Cases</h3>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{dashboardData.manualTestCases || 0}</div>
        </Card>
        
        <Card gradient className="p-6 text-center">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Total Test Cases</h3>
          <div className="text-3xl font-bold text-white mb-1">{dashboardData.totalTestCases}</div>
        </Card>
      </div>

      {/* Bottom Row - Type of Test Cases and Trend of Test Cases */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Type of Test Cases */}
        <Card gradient className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Type of Test Cases</h3>
          </div>
          
          {dashboardData.totalTestCases > 0 ? (
            <div className="h-64 flex items-center">
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
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#06B6D4' 
                    }}
                    labelStyle={{ color: '#06B6D4' }}
                    itemStyle={{ color: '#06B6D4' }}
                  />
                  {/* Center text */}
                  <text 
                    x="50%" 
                    y="45%" 
                    textAnchor="middle" 
                    dominantBaseline="middle" 
                    className="fill-white text-2xl font-bold"
                  >
                    {dashboardData.totalTestCases}
                  </text>
                  <text 
                    x="50%" 
                    y="55%" 
                    textAnchor="middle" 
                    dominantBaseline="middle" 
                    className="fill-gray-400 text-sm"
                  >
                    Total Test Cases
                  </text>
                </PieChart>
              </ResponsiveContainer>
              
              {/* Legend */}
              <div className="ml-6 space-y-3 flex-1">
                {typeOfTestCasesData.map((entry, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: entry.color }}></div>
                      <span className="text-sm text-gray-300">{entry.name}</span>
                    </div>
                    <span className="text-sm text-gray-300">
                      {entry.value} ({typeOfTestCasesPercentages[index]}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center text-gray-400">
                <TestTube className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No test cases found</p>
                <p className="text-sm">Create test cases to see type distribution</p>
              </div>
            </div>
          )}
        </Card>

        {/* Trend of Test Cases */}
        <Card gradient className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Trend of Test Cases</h3>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendOfTestCasesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="month" 
                  stroke="#6B7280" 
                  fontSize={12}
                />
                <YAxis 
                  stroke="#6B7280" 
                  fontSize={12}
                  domain={[0, 'dataMax + 1']}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#06B6D4' 
                  }} 
                />
                {/* Dynamically render lines for all test case types that exist in the data */}
                {trendOfTestCasesData.length > 0 && Object.keys(trendOfTestCasesData[0])
                  .filter(key => key !== 'month' && key !== 'date' && key !== 'Total')
                  .map((typeKey) => {
                    // Map type name back to ID to get consistent color
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
                  stroke="#FFFFFF" 
                  strokeWidth={3}
                  dot={{ fill: '#FFFFFF', strokeWidth: 2, r: 4 }}
                  name="Total"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}