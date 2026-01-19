import React, { useEffect, useState } from 'react';
import { projectsApiService } from '../services/projectsApi';
import { Project } from '../types';
import DefectsChart from '../components/Charts/DefectsChart';
import { Loader } from 'lucide-react';

const Overview: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

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
        <p className="text-slate-600 dark:text-gray-400 mt-2">Last week defects across all projects</p>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-8 text-center">
          <p className="text-slate-500 dark:text-gray-400">No projects available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {projects.map(project => (
            <DefectsChart key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Overview;
