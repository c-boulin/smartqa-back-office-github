import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireTeam?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireTeam = false }) => {
  const { state } = useAuth();
  const location = useLocation();

  if (!state.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const hasValidTeamId = state.user?.team_id &&
                          state.user.team_id !== 'null' &&
                          state.user.team_id !== '';

  const isSuperAdmin = state.user?.role?.slug === 'superadmin';

  if (requireTeam && !hasValidTeamId && !isSuperAdmin && location.pathname !== '/team-selection') {
    return <Navigate to="/team-selection" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;