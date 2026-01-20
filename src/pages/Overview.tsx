import React, { useEffect, useState } from 'react';
import { projectsApiService } from '../services/projectsApi';
import { Project } from '../types';
import { Loader, Activity, AlertTriangle, FileText } from 'lucide-react';
import TestExecutionOverview from '../components/Overview/TestExecutionOverview';
import DefectBreakdown from '../components/Overview/DefectBreakdown';
import AutomatedExecutionLogs from '../components/Overview/AutomatedExecutionLogs';

type TabType = 'execution' | 'defects' | 'logs';

const Overview: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('execution');

  useEffect(() => {
    const fetchAllProjects = async () => {
      try {
        setLoading(true);
        const response = await projectsApiService.getProjects(1);
        const transformedProjects = response.data.map(apiProject =>
          projectsApiService.transformApiProject(apiProject)
        );
        setProjects(transformedProjects);
      } catch (error) {
        console.error('Failed to fetch projects:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllProjects();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Overview</h1>
        <p className="text-slate-600 dark:text-gray-400 mt-2">Test execution and defect analysis across all projects</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg">
        <div className="border-b border-slate-200 dark:border-slate-700">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('execution')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'execution'
                  ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                  : 'border-transparent text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-300 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <Activity className="w-4 h-4" />
              Test Execution Overview
            </button>
            <button
              onClick={() => setActiveTab('defects')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'defects'
                  ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                  : 'border-transparent text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-300 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              Defect Breakdown
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'logs'
                  ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                  : 'border-transparent text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-300 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <FileText className="w-4 h-4" />
              Automated Execution Logs
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'execution' && <TestExecutionOverview projects={projects} />}
          {activeTab === 'defects' && <DefectBreakdown projects={projects} />}
          {activeTab === 'logs' && <AutomatedExecutionLogs projects={projects} />}
        </div>
      </div>
    </div>
  );
};

export default Overview;
