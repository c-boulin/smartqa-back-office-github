import { useAuth } from '../context/AuthContext';

export const usePermissions = () => {
  const { state, hasPermission, hasAnyPermission, hasAllPermissions } = useAuth();

  return {
    permissions: state.user?.permissions || [],
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isAuthenticated: state.isAuthenticated,
  };
};
