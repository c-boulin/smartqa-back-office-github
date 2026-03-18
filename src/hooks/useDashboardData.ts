import { useState, useEffect, useCallback, useRef } from 'react';
import { Project } from '../types';
import {
  dashboardApiService,
  DashboardSummary,
  DashboardTestRunsData,
} from '../services/dashboardApi';
import { AutomationFilter } from '../pages/Dashboard';

export interface DashboardDataPayload {
  summary: DashboardSummary & {
    totalProjects: number;
    activeProjects: number;
    totalTestRuns: number;
  };
  testRunsData: DashboardTestRunsData;
}

export const useDashboardData = (
  selectedProject: Project | null,
  projects: Project[],
  automationFilter: AutomationFilter = 'all',
) => {
  const [data, setData] = useState<DashboardDataPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (isFetchingRef.current) return;

    try {
      isFetchingRef.current = true;
      setLoading(true);
      setError(null);

      if (
        !selectedProject?.id ||
        selectedProject.id === '' ||
        selectedProject.id === 'undefined' ||
        selectedProject.id === 'null'
      ) {
        const totalTestCases = projects.reduce((sum, p) => sum + (p.testCasesCount || 0), 0);
        setData({
          summary: {
            totalProjects: projects.length,
            activeProjects: projects.filter(p => p.status === 'active').length,
            totalTestCases,
            totalTestRuns: projects.reduce((sum, p) => sum + (p.testRunsCount || 0), 0),
            automationDistribution: {
              notAutomated: 0,
              automated: 0,
              notRequired: 0,
              cannotAutomate: 0,
              obsolete: 0,
            },
            testTypeDistribution: {},
            statusDistribution: { draft: 0, active: 0, deprecated: 0 },
            priorityDistribution: { low: 0, medium: 0, high: 0, critical: 0 },
            automationCoverage: 0,
            automatedTestCases: 0,
            manualTestCases: 0,
            trendsData: [],
          },
          testRunsData: {
            activeTestRunsChart: {
              actualPassed: 0,
              actualFailed: 0,
              actualBlocked: 0,
              actualRetest: 0,
              actualSkipped: 0,
              actualUntested: 0,
              actualInProgress: 0,
              actualUnknown: 0,
              totalTestCasesInActiveRuns: 0,
            },
            closedTestRunsChart: [],
            closedTestRunsStackedChart: { chartData: [], resultLabels: [] },
          },
        });
        return;
      }

      const response = await dashboardApiService.getDashboardData(
        selectedProject.id,
        automationFilter,
      );

      setData({
        summary: {
          ...response.summary,
          totalProjects: projects.length,
          activeProjects: projects.filter(p => p.status === 'active').length,
          totalTestRuns:
            selectedProject.testRunsCount ||
            projects.reduce((sum, p) => sum + (p.testRunsCount || 0), 0),
        },
        testRunsData: response.testRunsData,
      });
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [selectedProject, projects, automationFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData, selectedProject?.name, automationFilter]);

  return { data, loading, error, refreshData: fetchData };
};
