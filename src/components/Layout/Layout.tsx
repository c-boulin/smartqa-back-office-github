import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import { useApp } from '../../context/AppContext';

const Layout: React.FC = () => {
  const location = useLocation();
  const { getSelectedProject } = useApp();
  const selectedProject = getSelectedProject();
  
  const getPageTitle = (pathname: string) => {
    const titles: Record<string, string> = {
      '/dashboard': 'Dashboard',
      '/projects': 'Project Management',
      '/test-cases': 'Test Cases',
      '/shared-steps': 'Shared Steps',
      '/test-runs': 'Test Runs',
      '/test-plans': 'Test Plans',
      '/reports': 'Reports & Analytics',
      '/settings': 'Settings'
    };
    return titles[pathname] || 'SMARTQA';
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Header title={getPageTitle(location.pathname)} />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 overflow-y-auto bg-slate-50 dark:bg-transparent">
          <Outlet key={selectedProject?.id || 'no-project'} />
        </main>
      </div>
    </div>
  );
};

export default Layout;