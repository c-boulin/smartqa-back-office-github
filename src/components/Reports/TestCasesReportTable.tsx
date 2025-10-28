import React from 'react';
import { MoreHorizontal } from 'lucide-react';

interface TestCaseReportData {
  id: string;
  testRunId: string;
  testRunName: string;
  testRunDate: string;
  testRunStatus: string;
  testCaseId: string;
  testCaseTitle: string;
  latestStatus: string;
  priority: string;
  assignee: string;
}

interface TestCasesReportTableProps {
  testCases: TestCaseReportData[];
  totalCount: number;
}

const TestCasesReportTable: React.FC<TestCasesReportTableProps> = ({
  testCases,
  totalCount
}) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/50';
      case 'untested':
        return 'bg-gray-500/20 text-gray-400 border border-gray-500/50';
      case 'passed':
        return 'bg-green-500/20 text-green-400 border border-green-500/50';
      case 'failed':
        return 'bg-red-500/20 text-red-400 border border-red-500/50';
      case 'blocked':
        return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border border-gray-500/50';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical':
        return 'text-red-400';
      case 'high':
        return 'text-orange-400';
      case 'medium':
        return 'text-blue-400';
      case 'low':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-purple-500/30 rounded-lg backdrop-blur-sm">
      <div className="px-6 py-4 border-b border-slate-700">
        <h3 className="text-lg font-semibold text-white">
          {totalCount} Test cases included in this report
        </h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-800/50 border-b border-slate-700">
            <tr>
              <th className="text-left py-3 px-6 text-sm font-medium text-gray-400 uppercase tracking-wider">
                TEST RUN
              </th>
              <th className="text-left py-3 px-6 text-sm font-medium text-gray-400 uppercase tracking-wider">
                TEST CASE
              </th>
              <th className="text-left py-3 px-6 text-sm font-medium text-gray-400 uppercase tracking-wider">
                TEST RUN LATEST STATUS
              </th>
              <th className="text-left py-3 px-6 text-sm font-medium text-gray-400 uppercase tracking-wider">
                TEST CASE PRIORITY
              </th>
              <th className="text-left py-3 px-6 text-sm font-medium text-gray-400 uppercase tracking-wider">
                TEST CASE ASSIGNEE
              </th>
              <th className="text-left py-3 px-6 text-sm font-medium text-gray-400 uppercase tracking-wider">
                <MoreHorizontal className="w-4 h-4 text-gray-400" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {testCases.map((testCase) => (
              <tr key={testCase.id} className="hover:bg-slate-800/30 transition-colors">
                <td className="py-4 px-6">
                  <div>
                    <div className="text-sm font-medium text-white">{testCase.testRunId}</div>
                    <div className="text-sm text-gray-400">{testCase.testRunName}</div>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(testCase.testRunStatus)}`}>
                        {testCase.testRunStatus}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div>
                    <div className="text-sm font-medium text-white">{testCase.testCaseId}</div>
                    <div className="text-sm text-gray-400">{testCase.testCaseTitle}</div>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(testCase.latestStatus)}`}>
                    {testCase.latestStatus}
                  </span>
                </td>
                <td className="py-4 px-6">
                  <span className={`text-sm font-medium ${getPriorityColor(testCase.priority)}`}>
                    — {testCase.priority}
                  </span>
                </td>
                <td className="py-4 px-6">
                  <span className="text-sm text-white">{testCase.assignee}</span>
                </td>
                <td className="py-4 px-6">
                  <button className="p-1 text-gray-400 hover:text-cyan-400 transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TestCasesReportTable;