import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, ChevronRight } from 'lucide-react';
import { projectsApiService } from '../services/projectsApi';
import { Project } from '../types';
import { automatedExecutionMockService } from '../services/automatedExecutionMockService';

interface TestCase {
  id: string;
  methodType: string;
  name: string;
  status: 'Passed' | 'Failed';
  startTime: string;
  defectType?: string;
  duration: string;
}

const AutomatedExecutionTestCases: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) return;

      try {
        setLoading(true);
        const response = await projectsApiService.getProjects(1);
        const foundProject = response.data
          .map(p => projectsApiService.transformApiProject(p))
          .find(p => p.id === projectId);

        if (foundProject) {
          setProject(foundProject);
          setTestCases(automatedExecutionMockService.generateTestCases(foundProject.id));
        }
      } catch (error) {
        console.error('Failed to fetch project:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-500 dark:text-gray-400">Project not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/overview')}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-gray-400" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            {project.name} - Test Cases
          </h1>
          <p className="text-slate-600 dark:text-gray-400 mt-2">
            Automated execution test case results
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                <th className="text-left py-3 px-4 text-slate-600 dark:text-gray-400 font-medium uppercase text-xs">
                  Method Type
                </th>
                <th className="text-left py-3 px-4 text-slate-600 dark:text-gray-400 font-medium uppercase text-xs">
                  Name
                </th>
                <th className="text-left py-3 px-4 text-slate-600 dark:text-gray-400 font-medium uppercase text-xs">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-slate-600 dark:text-gray-400 font-medium uppercase text-xs">
                  Start Time
                </th>
                <th className="text-left py-3 px-4 text-slate-600 dark:text-gray-400 font-medium uppercase text-xs">
                  Defect Type
                </th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {testCases.map((testCase) => (
                <tr
                  key={testCase.id}
                  onClick={() => navigate(`/automated-execution/${projectId}/test-case/${testCase.id}`)}
                  className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors"
                >
                  <td className="py-4 px-4">
                    <span className="text-slate-600 dark:text-gray-400">
                      {testCase.methodType}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-cyan-600 dark:text-cyan-400">
                        {testCase.name}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-gray-400">
                        <Clock className="w-3 h-3" />
                        {testCase.duration}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                        testCase.status === 'Passed'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${
                        testCase.status === 'Passed' ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      {testCase.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-slate-600 dark:text-gray-400">
                    {testCase.startTime}
                  </td>
                  <td className="py-4 px-4 text-slate-600 dark:text-gray-400">
                    {testCase.defectType || '-'}
                  </td>
                  <td className="py-4 px-4">
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-600 dark:text-gray-400">
            1 - {testCases.length} of {testCases.length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AutomatedExecutionTestCases;
