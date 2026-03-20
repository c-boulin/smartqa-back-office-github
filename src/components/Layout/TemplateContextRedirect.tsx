import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { usePermissions } from '../../hooks/usePermissions';
import { PERMISSIONS } from '../../utils/permissions';

const PROJECT_ONLY_EXACT = new Set(['/dashboard', '/reports', '/test-runs-overview']);

function isProjectOnlyPath(pathname: string): boolean {
  if (PROJECT_ONLY_EXACT.has(pathname)) {
    return true;
  }
  if (pathname.startsWith('/test-runs/') || pathname === '/test-runs') {
    return true;
  }
  if (pathname.startsWith('/test-plans/') || pathname === '/test-plans') {
    return true;
  }
  if (pathname.startsWith('/automated-execution')) {
    return true;
  }
  return false;
}

/**
 * When the selected entity is a template (data), block project-only routes.
 * Sidebar tab mode does not change this — only the actual project/template record does.
 */
const TemplateContextRedirect: React.FC = () => {
  const { getSelectedProject } = useApp();
  const { hasAnyPermission } = usePermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = hasAnyPermission([PERMISSIONS.ADMIN_PANEL.READ]);

  const selected = getSelectedProject();
  const selectedIsTemplate = selected?.isTemplate === true;

  useEffect(() => {
    if (!selectedIsTemplate) {
      return;
    }

    const path = location.pathname;

    if (path === '/overview' || path === '/settings') {
      if (!isAdmin) {
        navigate('/test-cases', { replace: true });
      }
      return;
    }

    if (isProjectOnlyPath(path)) {
      navigate('/test-cases', { replace: true });
    }
  }, [selectedIsTemplate, location.pathname, isAdmin, navigate]);

  return null;
};

export default TemplateContextRedirect;
