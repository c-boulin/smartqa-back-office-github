import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { MoreHorizontal } from 'lucide-react';

interface TestRunPerformanceChartProps {
  data: Array<{
    date: string;
    value: number;
  }>;
  timeRange: string;
}

const TestRunPerformanceChart: React.FC<TestRunPerformanceChartProps> = ({
  data,
  timeRange
}) => {
  return (
    <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-purple-500/30 rounded-lg p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Test run performance</h3>
          <p className="text-sm text-slate-600 dark:text-gray-400">1 Test Cases trend over {timeRange}</p>
        </div>
        <button className="p-2 text-slate-600 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="date" 
              stroke="#9CA3AF" 
              fontSize={12}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              stroke="#9CA3AF" 
              fontSize={12}
              axisLine={false}
              tickLine={false}
              domain={[0, 'dataMax + 1']}
            />
            <Line 
              type="monotone" 
              dataKey="value"
              stroke="#06B6D4" 
              strokeWidth={2}
              dot={{ fill: '#06B6D4', strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, fill: '#06B6D4' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TestRunPerformanceChart;