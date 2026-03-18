import { apiService } from './api';
import { AutomationFilter } from '../pages/Dashboard';

export interface DashboardSummary {
  totalTestCases: number;
  automationDistribution: {
    notAutomated: number;
    automated: number;
    notRequired: number;
    cannotAutomate: number;
    obsolete: number;
  };
  testTypeDistribution: Record<string, number>;
  statusDistribution: {
    draft: number;
    active: number;
    deprecated: number;
  };
  priorityDistribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  automationCoverage: number;
  automatedTestCases: number;
  manualTestCases: number;
  trendsData: Array<Record<string, unknown>>;
}

export interface DashboardActiveRunsChart {
  actualPassed: number;
  actualFailed: number;
  actualBlocked: number;
  actualRetest: number;
  actualSkipped: number;
  actualUntested: number;
  actualInProgress: number;
  actualUnknown: number;
  totalTestCasesInActiveRuns: number;
}

export interface DashboardClosedRunsStackedChart {
  chartData: Array<Record<string, number | string>>;
  resultLabels: string[];
}

export interface DashboardTestRunsData {
  activeTestRunsChart: DashboardActiveRunsChart;
  closedTestRunsChart: Array<{ month: string; value: number }>;
  closedTestRunsStackedChart: DashboardClosedRunsStackedChart;
}

export interface DashboardResponse {
  summary: DashboardSummary;
  testRunsData: DashboardTestRunsData;
}

class DashboardApiService {
  async getDashboardData(
    projectId: string,
    automationFilter: AutomationFilter = 'all',
  ): Promise<DashboardResponse> {
    const params = new URLSearchParams();
    if (automationFilter !== 'all') {
      params.set('automationFilter', automationFilter);
    }

    const qs = params.toString();
    const url = `/projects/${projectId}/dashboard${qs ? `?${qs}` : ''}`;

    const response = await apiService.authenticatedRequest(url);
    if (!response?.summary || !response?.testRunsData) {
      throw new Error('Invalid dashboard response');
    }

    return response as DashboardResponse;
  }
}

export const dashboardApiService = new DashboardApiService();
