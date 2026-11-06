import { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { projectsApiService } from '../services/projectsApi';
import type { TestRun } from '../services/testRunsApi';

export const useSyncProjectFromTestRun = (testRun: TestRun | null) => {
  const { state, dispatch } = useApp();
  const syncedTestRunIdRef = useRef<string | null>(null);

  const testRunId = testRun?.id != null ? String(testRun.id) : null;
  const projectId = testRun?.projectId != null && testRun.projectId !== '' ? String(testRun.projectId) : null;

  useEffect(() => {
    // Wait for the initial projects load so its fallback cannot override this selection.
    if (!testRunId || !projectId || state.isLoadingProjects) return;
    if (syncedTestRunIdRef.current === testRunId) return;
    syncedTestRunIdRef.current = testRunId;

    if (state.isTemplateMode) {
      dispatch({ type: 'SET_TEMPLATE_MODE', payload: false });
    }
    if (state.selectedProjectId !== projectId) {
      dispatch({ type: 'SET_SELECTED_PROJECT_ID', payload: projectId });
    }
    if (state.projects.some(p => p.id === projectId)) return;

    projectsApiService
      .getProject(projectId)
      .then(response => {
        dispatch({ type: 'UPDATE_PROJECT', payload: projectsApiService.transformApiProject(response.data) });
      })
      .catch(error => {
        console.error('Failed to load project for test run:', error);
      });
  }, [testRunId, projectId, state.isLoadingProjects, state.isTemplateMode, state.selectedProjectId, state.projects, dispatch]);
};
