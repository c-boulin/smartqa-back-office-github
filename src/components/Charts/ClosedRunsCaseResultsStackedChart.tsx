import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  Bar 
} from 'recharts';
import { Loader, BarChart as BarChartIcon } from 'lucide-react';
import { apiService } from '../../services/api';
import { TEST_RESULTS, TestResultId } from '../../types';

// Helper function to convert result ID to label
const getResultLabel = (resultId: number | string): string => {
  const id = typeof resultId === 'string' ? parseInt(resultId, 10) : resultId;
  
  if (isNaN(id)) {
    return 'Unknown';
  }
  
  const label = TEST_RESULTS[id as TestResultId];
  return label || `Result ${id}`;
};

// TypeScript types
interface ApiTestRun {
  id: string;
  type: string;
  attributes: {
    state: number;
    closedAt: string;
    executions: Array<{
      id: number;
      test_case_id: number;
      test_run_id: number;
      result: number;
      created_at: string;
      updated_at: string;
    }>;
  };
}

interface ApiResponse {
  data: ApiTestRun[];
  meta: {
    totalItems: number;
    itemsPerPage: number;
    currentPage: number;
  };
}

interface ChartRow {
  date: string;
  [resultLabel: string]: number | string;
  total: number;
}

interface ClosedRunsCaseResultsStackedChartProps {
  projectId?: string;
  fromDate?: string;
  toDate?: string;
  className?: string;
  closedTestRunsData?: Array<Record<string, unknown>>;
}

// Color utility for stable colors based on result labels
const getStableColor = (label: string): string => {
  // Ensure label is a string
  const labelStr = String(label);
  
  // Hash function to convert string to number
  let hash = 0;
  for (let i = 0; i < labelStr.length; i++) {
    const char = labelStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Predefined color palette for common result types
  const colorMap: Record<string, string> = {
    'passed': '#10B981',     // Green
    'failed': '#EF4444',     // Red
    'blocked': '#F59E0B',    // Amber
    'skipped': '#8B5CF6',    // Purple
    'retest': '#F97316',     // Orange
    'untested': '#6B7280',   // Gray
    'in progress': '#3B82F6', // Blue
    'unknown': '#4B5563'     // Dark gray
  };
  
  const normalizedLabel = labelStr.toLowerCase();
  if (colorMap[normalizedLabel]) {
    return colorMap[normalizedLabel];
  }
  
  // Generate color from hash for unknown labels
  const colors = [
    '#06B6D4', '#8B5CF6', '#F59E0B', '#EF4444', '#10B981', 
    '#F97316', '#EC4899', '#6366F1', '#14B8A6', '#84CC16'
  ];
  
  return colors[Math.abs(hash) % colors.length];
};

// Convert UTC timestamp to Europe/Paris date
const convertToParisDate = (utcTimestamp: string): string => {
  try {
    const date = new Date(utcTimestamp);
    
    // Convert to Europe/Paris timezone
    const parisDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Paris',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
    
    return parisDate; // Returns YYYY-MM-DD format
  } catch (error) {
    console.error('Failed to convert timestamp to Paris date:', utcTimestamp, error);
    return '';
  }
};

// Transform API data to chart data
const transformDataToChartFormat = (apiData: ApiTestRun[]): { 
  chartData: ChartRow[], 
  resultLabels: string[] 
} => {
  
  // Step 1: Group by date and collect result counts
  const dateGroups: Record<string, Record<string, number>> = {};
  const allResultLabels = new Set<string>();
  
  apiData.forEach((testRun) => {
    if (!testRun.attributes.closedAt) {
      return;
    }
    
    // Convert to Paris date
    const parisDate = convertToParisDate(testRun.attributes.closedAt);
    if (!parisDate) {
      return;
    }

    // Initialize date group if not exists
    if (!dateGroups[parisDate]) {
      dateGroups[parisDate] = {};
    }
    
    // Process executions
    if (testRun.attributes.executions && Array.isArray(testRun.attributes.executions)) {
      // Group executions by test case ID + configuration ID and get the last execution per combination
      const lastExecutionPerTestCaseConfig = new Map<string, Record<string, unknown>>();

      testRun.attributes.executions.forEach((execution: Record<string, unknown>) => {
        const testCaseId = execution.test_case_id.toString();
        const configId = execution.configuration_id ? execution.configuration_id.toString() : 'no-config';
        const key = `${testCaseId}-${configId}`;
        const executionDate = new Date(execution.created_at);

        // Keep only the latest execution for each test case + configuration combination
        const existing = lastExecutionPerTestCaseConfig.get(key);
        if (!existing || new Date(existing.created_at) < executionDate) {
          lastExecutionPerTestCaseConfig.set(key, execution);
        }
      });


      // Count each result type from the last execution per test case + configuration
      Array.from(lastExecutionPerTestCaseConfig.values()).forEach((execution: Record<string, unknown>) => {
        const resultLabel = getResultLabel(execution.result);
        
        if (resultLabel) {
          // Add to result labels set
          allResultLabels.add(resultLabel);
          
          // Initialize count if not exists
          if (!dateGroups[parisDate][resultLabel]) {
            dateGroups[parisDate][resultLabel] = 0;
          }
          
          // Increment count
          dateGroups[parisDate][resultLabel]++;

        }
      });
    }
  });
  
  
  // Step 2: Convert to chart format
  const resultLabels = Array.from(allResultLabels).sort();
  const chartData: ChartRow[] = Object.entries(dateGroups)
    .map(([date, resultCounts]) => {
      const row: ChartRow = { date, total: 0 };
      
      // Add all result labels (0 if not present)
      resultLabels.forEach(label => {
        row[label] = resultCounts[label] || 0;
        row.total += row[label] as number;
      });
      
      return row;
    })
    .sort((a, b) => a.date.localeCompare(b.date)); // Sort by date ascending
  
  
  return { chartData, resultLabels };
};

// Custom tooltip component
const CustomTooltip: React.FC<{ active?: boolean; payload?: Array<{ name?: string; value?: number; color?: string }>; label?: string }> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum: number, entry: { value?: number }) => sum + (entry.value || 0), 0);
    
    return (
      <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg p-3 shadow-lg">
        <p className="text-cyan-600 dark:text-cyan-400 font-medium mb-2">{label}</p>
        <div className="space-y-1">
          {payload
            .filter((entry: { value?: number }) => entry.value && entry.value > 0)
            .sort((a: { value?: number }, b: { value?: number }) => (b.value || 0) - (a.value || 0))
            .map((entry: { name?: string; value?: number; color?: string }, index: number) => (
              <div key={index} className="flex items-center justify-between min-w-[120px]">
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded mr-2" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-slate-700 dark:text-gray-300 text-sm">{entry.dataKey}:</span>
                </div>
                <span className="text-slate-900 dark:text-white font-medium ml-2">{entry.value}</span>
              </div>
            ))}
          <div className="border-t border-slate-200 dark:border-slate-600 pt-1 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-700 dark:text-gray-300 text-sm font-medium">Total:</span>
              <span className="text-cyan-600 dark:text-cyan-400 font-bold">{total}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const ClosedRunsCaseResultsStackedChart: React.FC<ClosedRunsCaseResultsStackedChartProps> = ({
  projectId,
  fromDate,
  toDate,
  className = '',
  closedTestRunsData: propsClosedTestRunsData
}) => {
  const [data, setData] = useState<ChartRow[]>([]);
  const [resultLabels, setResultLabels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPercentage, setShowPercentage] = useState(false);
  const isFetchingRef = useRef(false);

  // Memoized data transformation to avoid recomputing on every render
  const { chartData, percentageData } = useMemo(() => {
    if (data.length === 0) {
      return { chartData: [], percentageData: [] };
    }
    
    const percentageData = data.map(row => {
      const newRow: ChartRow = { date: row.date, total: row.total };
      
      resultLabels.forEach(label => {
        const count = row[label] as number || 0;
        newRow[label] = row.total > 0 ? Math.round((count / row.total) * 100) : 0;
      });
      
      return newRow;
    });
    
    return { chartData: data, percentageData };
  }, [data, resultLabels]);

  const displayData = showPercentage ? percentageData : chartData;

  const fetchClosedTestRuns = async () => {
    if (isFetchingRef.current) {
      return;
    }

    try {
      isFetchingRef.current = true;
      setLoading(true);
      setError(null);
      
      
      // Build API URL with filters
      let url = '/test_runs?state=6&order[closedAt]=asc';
      
      if (projectId) {
        url += `&project=${projectId}`;
      }
      
      if (fromDate) {
        url += `&closedAt[gte]=${fromDate}`;
      }
      
      if (toDate) {
        url += `&closedAt[lte]=${toDate}`;
      }
      
      // Fetch all pages to get complete dataset
      let allTestRuns: ApiTestRun[] = [];
      let currentPage = 1;
      let hasMorePages = true;
      
      while (hasMorePages) {
        const pageUrl = `${url}&page=${currentPage}&itemsPerPage=100`;
        
        const response: ApiResponse = await apiService.authenticatedRequest(pageUrl);
        
        if (!response || !response.data) {
          break;
        }
        
        allTestRuns = [...allTestRuns, ...response.data];
        
        const totalPages = Math.ceil(response.meta.totalItems / response.meta.itemsPerPage);
        hasMorePages = currentPage < totalPages;
        currentPage++;
        
      }
      
      
      // Transform data
      const { chartData, resultLabels: labels } = transformDataToChartFormat(allTestRuns);
      
      setData(chartData);
      setResultLabels(labels);

    } catch (err) {
      console.error('Failed to fetch closed test runs:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    if (propsClosedTestRunsData !== undefined) {
      try {
        setLoading(true);
        const { chartData, resultLabels: labels } = transformDataToChartFormat(propsClosedTestRunsData as ApiTestRun[]);
        setData(chartData);
        setResultLabels(labels);
        setError(null);
      } catch (err) {
        console.error('Failed to transform provided data:', err);
        setError(err instanceof Error ? err.message : 'Failed to transform data');
      } finally {
        setLoading(false);
      }
    } else if (projectId || fromDate || toDate) {
      fetchClosedTestRuns();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchClosedTestRuns is stable
  }, [projectId, fromDate, toDate, propsClosedTestRunsData]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-80 ${className}`}>
        <div className="text-center">
          <Loader className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-gray-400">Loading closed test runs data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-80 ${className}`}>
        <div className="text-center text-red-400">
          <BarChartIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Failed to load data</p>
          <p className="text-sm text-slate-600 dark:text-gray-400 mt-2">{error}</p>
          <button
            onClick={fetchClosedTestRuns}
            className="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-900 dark:text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`flex items-center justify-center h-80 ${className}`}>
        <div className="text-center text-slate-600 dark:text-gray-400">
          <BarChartIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No closed test runs yet</p>
          <p className="text-sm">Complete and close test runs to see results breakdown</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Chart Controls */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <button
            onClick={() => setShowPercentage(!showPercentage)}
            className="text-sm text-slate-600 dark:text-gray-400 hover:text-cyan-400 transition-colors"
          >
            {showPercentage ? 'Show Counts' : 'Show Percentages'}
          </button>
        </div>
      </div>

      {/* Chart */}
      <div 
        className="h-64"
        aria-label={`Stacked bar chart showing test case results from closed test runs over time. ${data.length} data points from ${data[0]?.date} to ${data[data.length - 1]?.date}.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={displayData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            maxBarSize={60}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-slate-300 dark:stroke-slate-700" />
            <XAxis 
              dataKey="date" 
              className="stroke-slate-600 dark:stroke-slate-400" tick={{ fill: 'currentColor' }} style={{ color: 'inherit' }} 
              fontSize={12}
              angle={-45}
              textAnchor="end"
              height={80}
              interval={0}
            />
            <YAxis 
              className="stroke-slate-600 dark:stroke-slate-400" tick={{ fill: 'currentColor' }} style={{ color: 'inherit' }} 
              fontSize={12}
              allowDecimals={false}
              label={{ 
                value: showPercentage ? 'Percentage (%)' : 'Count', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle' }, className: 'fill-slate-600 dark:fill-gray-400'
              }}
              domain={showPercentage ? [0, 100] : [0, 'dataMax']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ 
                paddingTop: '10px',
                fontSize: '12px'
              }}
              iconType="rect"
              align="center"
              verticalAlign="bottom"
            />
            
            {/* Dynamic bars for each result label */}
            {resultLabels.map((label) => (
              <Bar
                key={label}
                dataKey={label}
                stackId="a"
                fill={getStableColor(label)}
                name={label}
                title={`${label} test case results`}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Summary */}
      <div className="mt-4 text-sm text-slate-600 dark:text-gray-400">
        <div className="flex items-center justify-between">
          <span></span>
          <span>
            {data.reduce((sum, row) => sum + row.total, 0)} total test cases
          </span>
        </div>
      </div>
    </div>
  );
};

export default ClosedRunsCaseResultsStackedChart;