import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, ChevronDown, ChevronRight, Paperclip } from 'lucide-react';
import { projectsApiService } from '../services/projectsApi';
import { Project } from '../types';
import { automatedExecutionMockService } from '../services/automatedExecutionMockService';

interface LogEntry {
  message: string;
  timestamp: string;
}

interface ExecutionStep {
  id: string;
  type: 'SETUP' | 'KEYWORD' | 'TEARDOWN';
  message: string;
  status: 'PASSED' | 'FAILED';
  duration: string;
  attachments?: number;
  logs: LogEntry[];
  isExpanded: boolean;
}

const AutomatedExecutionSteps: React.FC = () => {
  const { projectId, testCaseId } = useParams<{ projectId: string; testCaseId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [steps, setSteps] = useState<ExecutionStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PASSED' | 'FAILED'>('ALL');

  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId || !testCaseId) return;

      try {
        setLoading(true);
        const response = await projectsApiService.getProjects(1);
        const foundProject = response.data
          .map(p => projectsApiService.transformApiProject(p))
          .find(p => p.id === projectId);

        if (foundProject) {
          setProject(foundProject);
          setSteps(automatedExecutionMockService.generateExecutionSteps(projectId, testCaseId));
        }
      } catch (error) {
        console.error('Failed to fetch project:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId, testCaseId]);

  const toggleStep = (stepId: string) => {
    setSteps(prevSteps =>
      prevSteps.map(step =>
        step.id === stepId ? { ...step, isExpanded: !step.isExpanded } : step
      )
    );
  };

  const filteredSteps = steps.filter(step => {
    if (statusFilter === 'ALL') return true;
    return step.status === statusFilter;
  });

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
          onClick={() => navigate(`/automated-execution/${projectId}`)}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-gray-400" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            {project.name} - Execution Steps
          </h1>
          <p className="text-slate-600 dark:text-gray-400 mt-2">
            Detailed execution log for Sign In Page Unlogged
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-600 dark:text-gray-400">
              Log Message
            </label>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-600 dark:text-gray-400">All Statuses</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'PASSED' | 'FAILED')}
                className="text-sm bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-3 py-1 text-slate-900 dark:text-white"
              >
                <option value="ALL">All Statuses</option>
                <option value="PASSED">Passed</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>
            <div className="text-xs text-slate-600 dark:text-gray-400">Time</div>
          </div>
        </div>

        <div>
          {filteredSteps.map((step) => (
            <div key={step.id} className="border-b border-slate-100 dark:border-slate-700/50">
              <div
                onClick={() => toggleStep(step.id)}
                className="flex items-center justify-between py-4 px-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  {step.isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  )}
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded ${
                      step.type === 'SETUP'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        : step.type === 'TEARDOWN'
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                        : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                    }`}
                  >
                    {step.type}
                  </span>
                  <span className="text-sm text-slate-900 dark:text-white font-mono">
                    {step.message}
                  </span>
                </div>

                <div className="flex items-center gap-6">
                  {step.attachments && (
                    <div className="flex items-center gap-1 text-slate-600 dark:text-gray-400">
                      <Paperclip className="w-4 h-4" />
                      <span className="text-sm">{step.attachments}</span>
                    </div>
                  )}
                  <div
                    className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                      step.status === 'PASSED'
                        ? 'bg-green-100 dark:bg-green-900/30'
                        : 'bg-red-100 dark:bg-red-900/30'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        step.status === 'PASSED' ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    />
                    <span
                      className={`text-xs font-medium ${
                        step.status === 'PASSED'
                          ? 'text-green-700 dark:text-green-400'
                          : 'text-red-700 dark:text-red-400'
                      }`}
                    >
                      {step.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-gray-400 min-w-[60px] justify-end">
                    <Clock className="w-3 h-3" />
                    {step.duration}
                  </div>
                </div>
              </div>

              {step.isExpanded && (
                <div className="bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700">
                  <div className="pl-12 pr-4">
                    {step.logs.map((log, index) => (
                      <div
                        key={index}
                        className="py-2 border-b border-slate-200 dark:border-slate-700/50 last:border-b-0 flex items-start justify-between"
                      >
                        <div className="flex-1 pr-4">
                          <span className="text-sm text-slate-700 dark:text-gray-300 font-mono">
                            {log.message}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-gray-400 whitespace-nowrap">
                          {log.timestamp}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-600 dark:text-gray-400">
            1 - {filteredSteps.length} of {steps.length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AutomatedExecutionSteps;
