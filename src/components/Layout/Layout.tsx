import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import GlobalHeader from './GlobalHeader';
import Sidebar from './Sidebar';
import ActiveExecutionsIndicator from '../TestRun/ActiveExecutionsIndicator';
import { useApp } from '../../context/AppContext';
import { useNotifications } from '../../context/NotificationsContext';

const PROJECT_ROUTES = [
  '/dashboard',
  '/test-cases',
  '/shared-steps',
  '/test-runs',
  '/test-plans',
  '/reports',
  '/automated-execution',
];

function isProjectRoute(pathname: string): boolean {
  return PROJECT_ROUTES.some((route) => pathname.startsWith(route));
}

const Layout: React.FC = () => {
  const location = useLocation();
  const { state, getSelectedProject } = useApp();
  const { startPolling, stopPolling } = useNotifications();
  const selectedProject = getSelectedProject();
  const initialProjectIdRef = React.useRef(selectedProject?.id ?? state.selectedProjectId);

  useEffect(() => {
    startPolling();
    return () => {
      stopPolling();
    };
  }, [startPolling, stopPolling]);

  const showSidebar = isProjectRoute(location.pathname);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <GlobalHeader />
      <div className="flex">
        {showSidebar && <Sidebar />}
        <main className="flex-1 p-6 overflow-y-auto bg-slate-50 dark:bg-transparent">
          <Outlet key={initialProjectIdRef.current || 'no-project'} />
        </main>
      </div>
      <ActiveExecutionsIndicator />
    </div>
  );
};

export default Layout;