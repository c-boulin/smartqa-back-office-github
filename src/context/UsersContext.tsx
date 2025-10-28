import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { usersApiService, User } from '../services/usersApi';
import { useAuth } from './AuthContext';

interface UsersState {
  users: User[];
  loading: boolean;
  error: string | null;
}

type UsersAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USERS'; payload: User[] }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_DATA' };

const initialState: UsersState = {
  users: [],
  loading: false,
  error: null
};

const usersReducer = (state: UsersState, action: UsersAction): UsersState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_USERS':
      return { ...state, users: action.payload, loading: false, error: null };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'CLEAR_DATA':
      return initialState;
    default:
      return state;
  }
};

const UsersContext = createContext<{
  state: UsersState;
  fetchUsers: () => Promise<void>;
} | null>(null);

export const UsersProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(usersReducer, initialState);
  const { state: authState } = useAuth();

  const fetchUsers = async () => {
    // Don't fetch if already loading or if we already have users
    if (state.loading || state.users.length > 0) {
      return;
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const response = await usersApiService.getUsers();
      const transformedUsers = response.data.map(apiUser => 
        usersApiService.transformApiUser(apiUser)
      );
      
      dispatch({ type: 'SET_USERS', payload: transformedUsers });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch users';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      console.error('Error fetching users:', err);
    }
  };

  // Load users when authenticated
  useEffect(() => {
    if (authState.isAuthenticated && state.users.length === 0 && !state.loading) {
      fetchUsers();
    } else if (!authState.isAuthenticated) {
      dispatch({ type: 'CLEAR_DATA' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchUsers, state.loading, state.users.length are complex dependencies
  }, [authState.isAuthenticated]);

  return (
    <UsersContext.Provider value={{ state, fetchUsers }}>
      {children}
    </UsersContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components -- useUsers hook needs to be exported alongside provider
export const useUsers = () => {
  const context = useContext(UsersContext);
  if (!context) {
    throw new Error('useUsers must be used within UsersProvider');
  }
  
  return {
    users: context.state.users,
    loading: context.state.loading,
    error: context.state.error,
    fetchUsers: context.fetchUsers
  };
};