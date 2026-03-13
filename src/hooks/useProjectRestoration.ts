import { useEffect, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { testRunsApiService } from '../services/testRunsApi';
import { testPlansApiService } from '../services/testPlansApi';

export const useProjectRestoration = () => {
  const { state, dispatch } = useApp();
  const params = useParams();
  const location = useLocation();
  const hasAttemptedRestoration = useRef(false);
  const isRestoringProject = useRef(false);

  useEffect(() => {
    const restoreProjectFromResource = async () => {
      if (state.selectedProjectId || hasAttemptedRestoration.current || isRestoringProject.current) {
        return;
      }

      if (state.isLoadingProjects || state.projects.length === 0) {
        return;
      }

      const pathname = location.pathname;
      let resourceId: string | undefined;
      let resourceType: 'test-run' | 'test-plan' | null = null;

      if (pathname.startsWith('/test-runs/') && params.id) {
        resourceId = params.id;
        resourceType = 'test-run';
      } else if (pathname.startsWith('/test-plans/') && params.id) {
        resourceId = params.id;
        resourceType = 'test-plan';
      }

      if (!resourceId || !resourceType) {
        return;
      }

      hasAttemptedRestoration.current = true;
      isRestoringProject.current = true;

      try {
        let projectId: string | null = null;

        if (resourceType === 'test-run') {
          const response = await testRunsApiService.getTestRun(resourceId);
          const extractedProjectId = response.data.relationships.project.data.id.split('/').pop();
          projectId = extractedProjectId || null;
        } else if (resourceType === 'test-plan') {
          const response = await testPlansApiService.getTestPlan(resourceId);
          const extractedProjectId = response.data.relationships?.project?.data?.id?.split('/').pop();
          projectId = extractedProjectId || null;
        }

        if (projectId && state.projects.some(p => p.id === projectId)) {
          dispatch({ type: 'SET_SELECTED_PROJECT_ID', payload: projectId });
        }
      } catch (error) {
        console.error(`Failed to restore project from ${resourceType}:`, error);
      } finally {
        isRestoringProject.current = false;
      }
    };

    restoreProjectFromResource();
  }, [state.selectedProjectId, state.isLoadingProjects, state.projects, params.id, location.pathname, dispatch]);
};
