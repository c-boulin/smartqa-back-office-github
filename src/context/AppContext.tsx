import React, { createContext, useContext, useReducer, ReactNode, useEffect, useRef, useCallback } from 'react';
import { Project, TestCase, TestExecution, TestPlan, SharedStep } from '../types';
import { mockTestCases, mockTestExecutions, mockSharedSteps } from '../data/mockData';
import { projectsApiService } from '../services/projectsApi';
import { tagsApiService, Tag } from '../services/tagsApi';
import { configurationsApiService, Configuration } from '../services/configurationsApi';
import { useAuth } from './AuthContext';

interface AppState {
  projects: Project[];
  tags: Tag[];
  configurations: Configuration[];
  testCases: TestCase[];
  testExecutions: TestExecution[];
  testPlans: TestPlan[];
  sharedSteps: SharedStep[];
  currentProject: Project | null;
  selectedProjectId: string | null; // Pour le filtrage
  isLoadingProjects: boolean;
  isLoadingTags: boolean;
  isLoadingConfigurations: boolean;
  isNavigatingToProject: boolean;
}

type AppAction =
  | { type: 'SET_PROJECTS'; payload: Project[] }
  | { type: 'SET_LOADING_PROJECTS'; payload: boolean }
  | { type: 'SET_TAGS'; payload: Tag[] }
  | { type: 'SET_LOADING_TAGS'; payload: boolean }
  | { type: 'SET_CONFIGURATIONS'; payload: Configuration[] }
  | { type: 'SET_LOADING_CONFIGURATIONS'; payload: boolean }
  | { type: 'ADD_PROJECT'; payload: Project }
  | { type: 'UPDATE_PROJECT'; payload: Project }
  | { type: 'DELETE_PROJECT'; payload: string }
  | { type: 'SET_CURRENT_PROJECT'; payload: Project | null }
  | { type: 'SET_SELECTED_PROJECT_ID'; payload: string | null }
  | { type: 'SET_NAVIGATING_TO_PROJECT'; payload: boolean }
  | { type: 'ADD_TAG'; payload: Tag }
  | { type: 'ADD_CONFIGURATION'; payload: Configuration }
  | { type: 'ADD_TEST_CASE'; payload: TestCase }
  | { type: 'UPDATE_TEST_CASE'; payload: TestCase }
  | { type: 'DELETE_TEST_CASE'; payload: string }
  | { type: 'ADD_TEST_EXECUTION'; payload: TestExecution }
  | { type: 'UPDATE_TEST_EXECUTION'; payload: TestExecution }
  | { type: 'ADD_TEST_PLAN'; payload: TestPlan }
  | { type: 'UPDATE_TEST_PLAN'; payload: TestPlan }
  | { type: 'ADD_SHARED_STEP'; payload: SharedStep }
  | { type: 'UPDATE_SHARED_STEP'; payload: SharedStep }
  | { type: 'CLEAR_DATA' };

const SELECTED_PROJECT_KEY = 'smartqa_selected_project_id';
const LAST_SELECTED_PROJECT_KEY = 'smartqa_last_selected_project_id';

const getStoredSelectedProjectId = (): string | null => {
  try {
    return localStorage.getItem(SELECTED_PROJECT_KEY);
  } catch {
    return null;
  }
};

const getStoredLastSelectedProjectId = (): string | null => {
  try {
    return localStorage.getItem(LAST_SELECTED_PROJECT_KEY);
  } catch {
    return null;
  }
};

const setStoredSelectedProjectId = (projectId: string | null): void => {
  try {
    if (projectId) {
      localStorage.setItem(SELECTED_PROJECT_KEY, projectId);
      localStorage.setItem(LAST_SELECTED_PROJECT_KEY, projectId);
    } else {
      localStorage.removeItem(SELECTED_PROJECT_KEY);
    }
  } catch {
    // Ignore localStorage errors
  }
};

const initialState: AppState = {
  projects: [],
  tags: [],
  configurations: [],
  testCases: mockTestCases,
  testExecutions: mockTestExecutions,
  testPlans: [],
  sharedSteps: mockSharedSteps,
  currentProject: null,
  selectedProjectId: getStoredSelectedProjectId(),
  isNavigatingToProject: false,
  isLoadingProjects: false,
  isLoadingTags: false,
  isLoadingConfigurations: false
};

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_PROJECTS':
      return { ...state, projects: action.payload };
    case 'SET_LOADING_PROJECTS':
      return { ...state, isLoadingProjects: action.payload };
    case 'SET_TAGS':
      return { ...state, tags: action.payload };
    case 'SET_LOADING_TAGS':
      return { ...state, isLoadingTags: action.payload };
    case 'SET_CONFIGURATIONS':
      return { ...state, configurations: action.payload };
    case 'SET_LOADING_CONFIGURATIONS':
      return { ...state, isLoadingConfigurations: action.payload };
    case 'ADD_PROJECT': {
      // When adding a project, also auto-select it if no project is currently selected
      const shouldAutoSelect = state.projects.length === 0 || !state.selectedProjectId;
      const newState = { 
        ...state, 
        projects: [...state.projects, action.payload]
      };
      
      if (shouldAutoSelect) {
        setStoredSelectedProjectId(action.payload.id);
        return {
          ...newState,
          selectedProjectId: action.payload.id
        };
      }
      
      return newState;
    }
    case 'ADD_TAG':
      return { ...state, tags: [...state.tags, action.payload] };
    case 'ADD_CONFIGURATION':
      return { ...state, configurations: [...state.configurations, action.payload] };
    case 'UPDATE_PROJECT':
      return {
        ...state,
        projects: state.projects.some(p => p.id === action.payload.id)
          ? state.projects.map(p => p.id === action.payload.id ? action.payload : p)
          : [...state.projects, action.payload]
      };
    case 'DELETE_PROJECT': {
      const newSelectedProjectId = state.selectedProjectId === action.payload ? null : state.selectedProjectId;
      if (newSelectedProjectId !== state.selectedProjectId) {
        setStoredSelectedProjectId(newSelectedProjectId);
      }
      return {
        ...state,
        projects: state.projects.filter(p => p.id !== action.payload),
        selectedProjectId: newSelectedProjectId
      };
    }
    case 'SET_CURRENT_PROJECT':
      return { ...state, currentProject: action.payload };
    case 'SET_SELECTED_PROJECT_ID':
      setStoredSelectedProjectId(action.payload);
      return { ...state, selectedProjectId: action.payload };
    case 'SET_NAVIGATING_TO_PROJECT':
      return { ...state, isNavigatingToProject: action.payload };
    case 'ADD_TEST_CASE':
      return { ...state, testCases: [...state.testCases, action.payload] };
    case 'UPDATE_TEST_CASE':
      return {
        ...state,
        testCases: state.testCases.map(tc => tc.id === action.payload.id ? action.payload : tc)
      };
    case 'DELETE_TEST_CASE':
      return {
        ...state,
        testCases: state.testCases.filter(tc => tc.id !== action.payload)
      };
    case 'ADD_TEST_EXECUTION':
      return { ...state, testExecutions: [...state.testExecutions, action.payload] };
    case 'UPDATE_TEST_EXECUTION':
      return {
        ...state,
        testExecutions: state.testExecutions.map(te => te.id === action.payload.id ? action.payload : te)
      };
    case 'ADD_TEST_PLAN':
      return { ...state, testPlans: [...state.testPlans, action.payload] };
    case 'UPDATE_TEST_PLAN':
      return {
        ...state,
        testPlans: state.testPlans.map(tp => tp.id === action.payload.id ? action.payload : tp)
      };
    case 'ADD_SHARED_STEP':
      return { ...state, sharedSteps: [...state.sharedSteps, action.payload] };
    case 'UPDATE_SHARED_STEP':
      return {
        ...state,
        sharedSteps: state.sharedSteps.map(ss => ss.id === action.payload.id ? action.payload : ss)
      };
    case 'CLEAR_DATA':
      setStoredSelectedProjectId(null);
      return {
        ...state,
        projects: [],
        tags: [],
        configurations: [],
        selectedProjectId: null,
        currentProject: null,
        isLoadingProjects: false,
        isLoadingTags: false,
        isLoadingConfigurations: false
      };
    default:
      return state;
  }
};

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  getFilteredTestCases: () => TestCase[];
  getFilteredTestExecutions: () => TestExecution[];
  getFilteredTestPlans: () => TestPlan[];
  getSelectedProject: () => Project | null;
  getLastSelectedProjectId: () => string | null;
  loadProjects: () => Promise<void>;
  loadTags: () => Promise<void>;
  loadConfigurations: () => Promise<void>;
  createTag: (label: string) => Promise<Tag>;
  createConfiguration: (label: string) => Promise<Configuration>;
} | null>(null);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { state: authState } = useAuth();
  const loadingRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const isInitializing = useRef(false);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Load tags from API
  const loadTags = useCallback(async () => {
    if (!authState.isAuthenticated || stateRef.current.isLoadingTags) {
      return;
    }

    try {
      dispatch({ type: 'SET_LOADING_TAGS', payload: true });
      
      const response = await tagsApiService.getTags();
      const transformedTags = response.data.map(apiTag => 
        tagsApiService.transformApiTag(apiTag)
      );
      
      dispatch({ type: 'SET_TAGS', payload: transformedTags });
      
    } catch (error) {
      console.error('Failed to load tags:', error);
    } finally {
      dispatch({ type: 'SET_LOADING_TAGS', payload: false });
    }
  }, [authState.isAuthenticated, state.isLoadingTags]);

  // Load configurations from API
  const loadConfigurations = async () => {
    if (!authState.isAuthenticated || state.isLoadingConfigurations) {
      return;
    }

    try {
      dispatch({ type: 'SET_LOADING_CONFIGURATIONS', payload: true });
      
      const response = await configurationsApiService.getConfigurations();
      const transformedConfigurations = response.data.map(apiConfig => 
        configurationsApiService.transformApiConfiguration(apiConfig)
      );
      
      dispatch({ type: 'SET_CONFIGURATIONS', payload: transformedConfigurations });
      
    } catch (error) {
      console.error('Failed to load configurations:', error);
    } finally {
      dispatch({ type: 'SET_LOADING_CONFIGURATIONS', payload: false });
    }
  };

  // Create tag and add to context
  const createTag = async (label: string): Promise<Tag> => {
    const response = await tagsApiService.createTag(label);
    const newTag = tagsApiService.transformApiTag(response.data);
    dispatch({ type: 'ADD_TAG', payload: newTag });
    return newTag;
  };

  // Create configuration and add to context
  const createConfiguration = async (label: string): Promise<Configuration> => {
    const response = await configurationsApiService.createConfiguration({ label });
    const newConfiguration = configurationsApiService.transformApiConfiguration(response.data);
    dispatch({ type: 'ADD_CONFIGURATION', payload: newConfiguration });
    return newConfiguration;
  };

  // Load projects from API
  const loadProjects = useCallback(async (force: boolean = false) => {

    // Only load projects if user is authenticated
    if (!authState.isAuthenticated) {
      return;
    }

    // Prevent multiple simultaneous requests and check if already loaded
    if (loadingRef.current || (hasLoadedRef.current && !force)) {
      return;
    }

    try {
      loadingRef.current = true;
      dispatch({ type: 'SET_LOADING_PROJECTS', payload: true });

      // Load projects for sidebar using dedicated method (no filters)
      const { projects: allProjects } = await projectsApiService.getProjectsForSidebar();

      dispatch({ type: 'SET_PROJECTS', payload: allProjects });
      hasLoadedRef.current = true;

      // Only auto-select if no project is currently selected AND projects exist
      const currentSelectedProjectId = stateRef.current.selectedProjectId;
      if (!currentSelectedProjectId && allProjects.length > 0) {
        const storedProjectId = getStoredSelectedProjectId();
        if (storedProjectId && allProjects.some(p => p.id === storedProjectId)) {
          dispatch({ type: 'SET_SELECTED_PROJECT_ID', payload: storedProjectId });
        } else {
          // Auto-select the first project (most recently created since we order by createdAt desc)
          dispatch({ type: 'SET_SELECTED_PROJECT_ID', payload: allProjects[0].id });
        }
      } else if (allProjects.length === 0) {
        // No projects exist, clear any selected project
        dispatch({ type: 'SET_SELECTED_PROJECT_ID', payload: null });
      }

    } catch (error) {
      console.error('Failed to load projects:', error);
      // On error, mark as loaded to prevent infinite retries
      hasLoadedRef.current = true;
      dispatch({ type: 'SET_PROJECTS', payload: [] });
      dispatch({ type: 'SET_SELECTED_PROJECT_ID', payload: null });
    } finally {
      loadingRef.current = false;
      dispatch({ type: 'SET_LOADING_PROJECTS', payload: false });
    }
  }, [authState.isAuthenticated]);

  // Helper functions for filtered data
  const getFilteredTestCases = useCallback(() => {
    if (!state.selectedProjectId) return state.testCases;
    return state.testCases.filter(tc => tc.projectId === state.selectedProjectId);
  }, [state.selectedProjectId, state.testCases]);

  const getFilteredTestExecutions = useCallback(() => {
    if (!state.selectedProjectId) return state.testExecutions;
    return state.testExecutions.filter(te => te.projectId === state.selectedProjectId);
  }, [state.selectedProjectId, state.testExecutions]);

  const getFilteredTestPlans = useCallback(() => {
    if (!state.selectedProjectId) return state.testPlans;
    return state.testPlans.filter(tp => tp.projectId === state.selectedProjectId);
  }, [state.selectedProjectId, state.testPlans]);

  const getSelectedProject = useCallback(() => {
    if (!state.selectedProjectId) return null;
    return state.projects.find(p => p.id === state.selectedProjectId) || null;
  }, [state.selectedProjectId, state.projects]);

  const getLastSelectedProjectId = useCallback(() => {
    return getStoredLastSelectedProjectId();
  }, []);

  // Effect to handle authentication state changes
  useEffect(() => {
    // Prevent multiple initializations
    if (isInitializing.current) {
      return;
    }

    if (authState.isAuthenticated) {
      // Load data for any authenticated user
      if (!hasLoadedRef.current && !loadingRef.current) {
        isInitializing.current = true;
        loadProjects();
        loadTags();
        loadConfigurations();
        // Reset initialization flag after a delay
        setTimeout(() => {
          isInitializing.current = false;
        }, 1000);
      }
    } else {
      // User is not authenticated, clear data
      hasLoadedRef.current = false;
      loadingRef.current = false;
      isInitializing.current = false;
      dispatch({ type: 'CLEAR_DATA' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadConfigurations, loadProjects, loadTags are stable
  }, [authState.isAuthenticated]);

  return (
    <AppContext.Provider value={{
      state,
      dispatch,
      getFilteredTestCases,
      getFilteredTestExecutions,
      getFilteredTestPlans,
      getSelectedProject,
      getLastSelectedProjectId,
      loadProjects,
      loadTags,
      loadConfigurations,
      createTag,
      createConfiguration
    }}>
      {children}
    </AppContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components -- useApp hook needs to be exported alongside provider
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};