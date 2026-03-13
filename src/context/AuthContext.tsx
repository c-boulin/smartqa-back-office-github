import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { User } from '../services/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: User }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'LOGOUT' };

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null
      };
    case 'UPDATE_USER':
      localStorage.setItem('user_data', JSON.stringify(action.payload));
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        error: null
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };
    case 'LOGOUT':
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      localStorage.removeItem('smartqa_selected_project_id');
      localStorage.removeItem('smartqa_last_selected_project_id');
      return {
        ...initialState
      };
    default:
      return state;
  }
};

const AuthContext = createContext<{
  state: AuthState;
  dispatch: React.Dispatch<AuthAction>;
  login: (user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
} | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    // Check for existing authentication on app load
    const token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('user_data');

    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        dispatch({ type: 'SET_USER', payload: user }); // SET_USER sets isLoading: false
      } catch {
        // Clear invalid data
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    } else {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const login = (user: User) => {
    localStorage.setItem('auth_token', user.token);
    localStorage.setItem('user_data', JSON.stringify(user));
    dispatch({ type: 'SET_USER', payload: user });
  };

  const logout = () => {
    dispatch({ type: 'LOGOUT' });
  };

  const updateUser = (user: User) => {
    dispatch({ type: 'UPDATE_USER', payload: user });
  };

  const hasPermission = (permission: string): boolean => {
    if (!state.user) return false;
    if (!state.user.permissions || !Array.isArray(state.user.permissions)) {
      console.warn('User has no permissions array. This may indicate an old session. Please log out and log in again.');
      return false;
    }
    return state.user.permissions.includes(permission);
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!state.user) return false;
    if (!state.user.permissions || !Array.isArray(state.user.permissions)) {
      console.warn('User has no permissions array. This may indicate an old session. Please log out and log in again.');
      return false;
    }
    if (permissions.length === 0) return true;
    return permissions.some(permission => state.user.permissions!.includes(permission));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    if (!state.user) return false;
    if (!state.user.permissions || !Array.isArray(state.user.permissions)) {
      console.warn('User has no permissions array. This may indicate an old session. Please log out and log in again.');
      return false;
    }
    if (permissions.length === 0) return true;
    return permissions.every(permission => state.user.permissions!.includes(permission));
  };

  return (
    <AuthContext.Provider value={{ state, dispatch, login, logout, updateUser, hasPermission, hasAnyPermission, hasAllPermissions }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components -- useAuth hook needs to be exported alongside provider
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};