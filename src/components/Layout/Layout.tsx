import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import ActiveExecutionsIndicator from '../TestRun/ActiveExecutionsIndicator';
import { useApp } from '../../context/AppContext';
import { useNotifications } from '../../context/NotificationsContext';

const Layout: React.FC = () => {
  const location = useLocation();
  const { state, getSelectedProject } = useApp();
  const { startPolling, stopPolling } = useNotifications();
  const selectedProject = getSelectedProject();
  const initialProjectIdRef = React.useRef(state.selectedProjectId);

  useEffect(() => {
    startPolling();

    return () => {
      stopPolling();
    };
  }, [startPolling, stopPolling]);
  
  const getPageTitle = (pathname: string) => {
    const titles: Record<string, string> = {
      '/dashboard': 'Dashboard',
      '/projects': 'Project Management',
      '/test-cases': 'Test Cases',
      '/shared-steps': 'Shared Steps',
      '/test-runs': 'Test Runs',
      '/test-plans': 'Test Plans',
      '/reports': 'Reports & Analytics',
      '/automated-configuration': 'Automated Configuration',
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
          <Outlet key={selectedProject?.id || initialProjectIdRef.current || 'no-project'} />
        </main>
      </div>
      <ActiveExecutionsIndicator />
    </div>
  );
};

export default Layout;