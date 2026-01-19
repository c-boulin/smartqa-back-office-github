import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Project } from '../../types';
import { List, BarChart3 } from 'lucide-react';

interface DefectsChartProps {
  project: Project;
}

const DEFECT_TYPES = [
  { key: 'productBug', label: 'Product Bug', color: '#EF4444' },
  { key: 'productMaintenance', label: 'Product Maintenance', color: '#F97316' },
  { key: 'internalComponentsBug', label: 'Internal Components Bug', color: '#8B5CF6' },
  { key: 'automationBug', label: 'Automation Bug', color: '#EAB308' },
  { key: 'updateForNewFeature', label: 'Update for new feature', color: '#EC4899' },
  { key: 'missingSpecifications', label: 'Missing specifications', color: '#A855F7' },
  { key: 'systemIssue', label: 'System Issue', color: '#3B82F6' },
  { key: 'network', label: 'Network', color: '#06B6D4' },
  { key: 'gitlabIssue', label: 'GitLab Issue', color: '#14B8A6' },
  { key: 'noDefect', label: 'No Defect', color: '#6B7280' },
  { key: 'toInvestigate', label: 'To investigate', color: '#F59E0B' },
  { key: 'login', label: 'Login', color: '#FBBF24' }
];

const generateMockDefectsData = () => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dates = days.map((day, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return {
      day,
      date: date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })
    };
  });

  return dates.map(({ day, date }) => {
    const hasDefects = Math.random() > 0.3;

    if (!hasDefects) {
      return {
        name: day,
        date,
        productBug: 0,
        productMaintenance: 0,
        internalComponentsBug: 0,
        automationBug: 0,
        updateForNewFeature: 0,
        missingSpecifications: 0,
        systemIssue: 0,
        network: 0,
        gitlabIssue: 0,
        noDefect: 0,
        toInvestigate: 0,
        login: 0
      };
    }

    const activeDefects = DEFECT_TYPES.filter(() => Math.random() > 0.5);
    const data: any = {
      name: day,
      date,
      productBug: 0,
      productMaintenance: 0,
      internalComponentsBug: 0,
      automationBug: 0,
      updateForNewFeature: 0,
      missingSpecifications: 0,
      systemIssue: 0,
      network: 0,
      gitlabIssue: 0,
      noDefect: 0,
      toInvestigate: 0,
      login: 0
    };

    activeDefects.forEach(defectType => {
      data[defectType.key] = Math.floor(Math.random() * 5) + 1;
    });

    return data;
  });
};

const DefectsChart: React.FC<DefectsChartProps> = ({ project }) => {
  const [viewMode, setViewMode] = useState<'bar' | 'table'>('bar');
  const mockData = useMemo(() => generateMockDefectsData(), [project.id]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, entry: any) => sum + entry.value, 0);

      return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
          <p className="font-semibold text-slate-900 dark:text-white mb-2">
            {label} - {payload[0]?.payload?.date}
          </p>
          <p className="text-sm text-slate-600 dark:text-gray-400 mb-2">Total: {total}</p>
          {payload
            .filter((entry: any) => entry.value > 0)
            .map((entry: any, index: number) => (
              <p key={index} className="text-sm" style={{ color: entry.color }}>
                {entry.name}: {entry.value}
              </p>
            ))}
        </div>
      );
    }
    return null;
  };

  const renderLegend = () => {
    return (
      <div className="flex flex-wrap gap-3 justify-center mt-4">
        {DEFECT_TYPES.map(defect => (
          <div key={defect.key} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: defect.color }}
            />
            <span className="text-xs text-slate-600 dark:text-gray-400">
              {defect.label}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            {project.name}
          </h3>
          <p className="text-sm text-slate-500 dark:text-gray-400">Last week defects</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('bar')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'bar'
                ? 'bg-cyan-500 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
            title="Bar view"
          >
            <BarChart3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'table'
                ? 'bg-cyan-500 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
            title="Table view"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {viewMode === 'bar' ? (
        <>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mockData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis
                dataKey="name"
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
              />
              <YAxis
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              {DEFECT_TYPES.map(defect => (
                <Bar
                  key={defect.key}
                  dataKey={defect.key}
                  stackId="a"
                  fill={defect.color}
                  name={defect.label}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
          {renderLegend()}
        </>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-2 px-3 text-slate-600 dark:text-gray-400 font-medium">Day</th>
                <th className="text-left py-2 px-3 text-slate-600 dark:text-gray-400 font-medium">Date</th>
                {DEFECT_TYPES.map(defect => (
                  <th
                    key={defect.key}
                    className="text-right py-2 px-3 text-slate-600 dark:text-gray-400 font-medium"
                    title={defect.label}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <div
                        className="w-2 h-2 rounded"
                        style={{ backgroundColor: defect.color }}
                      />
                      <span className="truncate max-w-[80px]">{defect.label}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockData.map((row, index) => {
                const total = DEFECT_TYPES.reduce((sum, defect) => sum + (row[defect.key] || 0), 0);
                return (
                  <tr
                    key={index}
                    className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30"
                  >
                    <td className="py-2 px-3 text-slate-900 dark:text-white font-medium">
                      {row.name}
                    </td>
                    <td className="py-2 px-3 text-slate-600 dark:text-gray-400">
                      {row.date}
                    </td>
                    {DEFECT_TYPES.map(defect => (
                      <td
                        key={defect.key}
                        className="py-2 px-3 text-right text-slate-900 dark:text-white"
                      >
                        {row[defect.key] || '-'}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DefectsChart;
