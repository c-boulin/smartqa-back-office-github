import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Project } from '../../types';
import { ChevronRight } from 'lucide-react';
import { automatedExecutionMockService } from '../../services/automatedExecutionMockService';

interface AutomatedExecutionLogsProps {
  projects: Project[];
}

const AutomatedExecutionLogs: React.FC<AutomatedExecutionLogsProps> = ({ projects }) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Automated Execution Logs
          </h2>
          <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
            Click on any execution to view detailed test case results
          </p>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500 dark:text-gray-400">No execution logs available</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 text-slate-600 dark:text-gray-400 font-medium uppercase text-xs">
                    Name
                  </th>
                  <th className="text-left py-3 px-4 text-slate-600 dark:text-gray-400 font-medium uppercase text-xs">
                    Start Time
                  </th>
                  <th className="text-center py-3 px-4 text-slate-600 dark:text-gray-400 font-medium uppercase text-xs">
                    Total
                  </th>
                  <th className="text-center py-3 px-4 text-slate-600 dark:text-gray-400 font-medium uppercase text-xs">
                    Passed
                  </th>
                  <th className="text-center py-3 px-4 text-slate-600 dark:text-gray-400 font-medium uppercase text-xs">
                    Failed
                  </th>
                  <th className="text-center py-3 px-4 text-slate-600 dark:text-gray-400 font-medium uppercase text-xs">
                    Skipped
                  </th>
                  <th className="text-center py-3 px-4 text-slate-600 dark:text-gray-400 font-medium uppercase text-xs">
                    Product Bug
                  </th>
                  <th className="text-center py-3 px-4 text-slate-600 dark:text-gray-400 font-medium uppercase text-xs">
                    Auto Bug
                  </th>
                  <th className="text-center py-3 px-4 text-slate-600 dark:text-gray-400 font-medium uppercase text-xs">
                    System Issue
                  </th>
                  <th className="text-center py-3 px-4 text-slate-600 dark:text-gray-400 font-medium uppercase text-xs">
                    To Investigate
                  </th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {projects.map(project => {
                  const execution = automatedExecutionMockService.generateExecutionData(project.id);
                  return (
                    <tr
                      key={project.id}
                      onClick={() => navigate(`/automated-execution/${project.id}`)}
                      className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-start gap-2">
                          <ChevronRight className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="font-medium text-cyan-600 dark:text-cyan-400">
                              {project.name} #{execution.runNumber}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-gray-400 mt-1 space-x-2">
                              <span>{execution.duration}</span>
                              <span>•</span>
                              <span>{execution.user}</span>
                              <span>•</span>
                              <span>browser:{execution.browser}</span>
                              <span>device:{execution.device}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-600 dark:text-gray-400">
                        {execution.startTime}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {execution.total}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="font-semibold text-green-600 dark:text-green-400">
                          {execution.passed}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="font-semibold text-red-600 dark:text-red-400">
                          {execution.failed}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="font-semibold text-slate-600 dark:text-gray-400">
                          {execution.skipped}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center text-slate-900 dark:text-white">
                        {execution.defects.productBug || '-'}
                      </td>
                      <td className="py-4 px-4 text-center text-slate-900 dark:text-white">
                        {execution.defects.autoBug || '-'}
                      </td>
                      <td className="py-4 px-4 text-center text-slate-900 dark:text-white">
                        {execution.defects.systemIssue || '-'}
                      </td>
                      <td className="py-4 px-4 text-center text-slate-900 dark:text-white">
                        {execution.defects.toInvestigate || '-'}
                      </td>
                      <td className="py-4 px-4">
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AutomatedExecutionLogs;
