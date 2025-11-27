import { useEffect } from 'react';
import { useApp } from '../context/AppContext';

export const useRestoreLastProject = () => {
  const { getSelectedProject, getLastSelectedProjectId, state, dispatch } = useApp();
  const selectedProject = getSelectedProject();

  useEffect(() => {
    if (!selectedProject && state.projects.length > 0) {
      const lastProjectId = getLastSelectedProjectId();
      if (lastProjectId && state.projects.some(p => p.id === lastProjectId)) {
        dispatch({ type: 'SET_SELECTED_PROJECT_ID', payload: lastProjectId });
      }
    }
  }, [selectedProject, state.projects, getLastSelectedProjectId, dispatch]);
};
