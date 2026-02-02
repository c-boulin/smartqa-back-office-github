import { useState, useEffect, useCallback, useRef } from 'react';
import { Project, TestCase } from '../types';
import { testCasesApiService } from '../services/testCasesApi';
import { AutomationFilter } from '../pages/Dashboard';

const isDevelopment = import.meta.env.MODE === 'development';
const devLog = (..._args: unknown[]) => {
  if (isDevelopment) {
    // Development logging disabled
  }
};

interface DashboardSummary {
  totalProjects: number;
  activeProjects: number;
  totalTestCases: number;
  totalTestRuns: number;

  automationDistribution: {
    notAutomated: number;
    automated: number;
    notRequired: number;
    cannotAutomate: number;
    obsolete: number;
  };

  testTypeDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
    6: number;
    7: number;
    8: number;
    9: number;
    10: number;
    11: number;
  };

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

export const useDashboardSummary = (selectedProject: Project | null, projects: Project[], automationFilter: AutomationFilter = 'all') => {
  const [summaryData, setSummaryData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  const fetchSummaryData = useCallback(async () => {
    if (isFetchingRef.current) {
      devLog('⏭️ Skipping duplicate fetch (already in progress)');
      return;
    }

    try {
      isFetchingRef.current = true;
      setLoading(true);
      setError(null);

      devLog('🔄 Dashboard summary fetch triggered at:', new Date().toISOString());
      devLog('📊 Selected project:', selectedProject?.name || 'All projects');
      devLog('📊 Automation filter:', automationFilter);

      let totalTestCases = 0;
      let testCases: TestCase[] = [];
      let trendsData: Array<Record<string, unknown>> = [];

      if (selectedProject) {
        devLog(`📊 Fetching data for project: ${selectedProject.name}`);

        if (!selectedProject.id || selectedProject.id === '' || selectedProject.id === 'undefined' || selectedProject.id === 'null') {
          console.error('❌ Invalid project ID, cannot make API calls:', selectedProject.id);
          throw new Error(`Invalid project ID: ${selectedProject.id}`);
        }

        const itemsPerPage = 500;
        const firstPageResponse = await testCasesApiService.getTestCases(1, itemsPerPage, selectedProject.id);
        const totalTestCasesFromAPI = firstPageResponse.meta.totalItems;
        const totalPages = Math.ceil(totalTestCasesFromAPI / itemsPerPage);

        let allTestCasesData = [...firstPageResponse.data];

        if (totalPages > 1) {
          const batchSize = 5;
          for (let i = 2; i <= totalPages; i += batchSize) {
            const endPage = Math.min(i + batchSize - 1, totalPages);
            const pagePromises = [];

            for (let page = i; page <= endPage; page++) {
              pagePromises.push(testCasesApiService.getTestCases(page, itemsPerPage, selectedProject.id));
            }

            const pageResponses = await Promise.all(pagePromises);
            pageResponses.forEach(response => {
              allTestCasesData = [...allTestCasesData, ...response.data];
            });
          }
        }

        testCases = allTestCasesData.map(apiTestCase =>
          testCasesApiService.transformApiTestCase(apiTestCase, firstPageResponse.included)
        );

        if (automationFilter === 'automated') {
          testCases = testCases.filter(tc => tc.automationStatus === 2 || tc.automationStatus === "2");
          devLog(`🤖 Filtered to automated test cases: ${testCases.length}`);
        } else if (automationFilter === 'not-automated') {
          testCases = testCases.filter(tc =>
            tc.automationStatus === 1 || tc.automationStatus === "1" ||
            tc.automationStatus === 3 || tc.automationStatus === "3" ||
            tc.automationStatus === 4 || tc.automationStatus === "4" ||
            tc.automationStatus === 5 || tc.automationStatus === "5"
          );
          devLog(`🤖 Filtered to non-automated test cases: ${testCases.length}`);
        }

        totalTestCases = testCases.length;
        devLog(`🧪 Final test cases count: ${totalTestCases}`);

        trendsData = generateTrendData(testCases);

      } else {
        devLog(`📊 All projects view - fetching data across all projects`);
        totalTestCases = projects.reduce((sum, p) => sum + (p.testCasesCount || 0), 0);
        testCases = [];
      }

      const automationDistribution = {
        notAutomated: testCases.filter(tc => tc.automationStatus === 1 || tc.automationStatus === "1").length,
        automated: testCases.filter(tc => tc.automationStatus === 2 || tc.automationStatus === "2").length,
        notRequired: testCases.filter(tc => tc.automationStatus === 3 || tc.automationStatus === "3").length,
        cannotAutomate: testCases.filter(tc => tc.automationStatus === 4 || tc.automationStatus === "4").length,
        obsolete: testCases.filter(tc => tc.automationStatus === 5 || tc.automationStatus === "5").length,
      };

      const automatedTestCases = automationDistribution.automated;
      const manualTestCases = automationDistribution.notAutomated +
                             automationDistribution.notRequired +
                             automationDistribution.cannotAutomate +
                             automationDistribution.obsolete;

      const totalTestCasesWithAutomationStatus = automatedTestCases + manualTestCases;
      const automationCoverage = totalTestCasesWithAutomationStatus > 0 ?
        Math.round((automatedTestCases / totalTestCasesWithAutomationStatus) * 100) : 0;

      const testTypeDistribution = {
        1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0
      };

      testCases.forEach(tc => {
        const typeToId: Record<string, number> = {
          'other': 1, 'acceptance': 2, 'accessibility': 3, 'compatibility': 4,
          'destructive': 5, 'functional': 6, 'performance': 7, 'regression': 8,
          'security': 9, 'smoke': 10, 'usability': 11
        };

        const typeId = typeToId[tc.type];
        if (typeId && testTypeDistribution[typeId as keyof typeof testTypeDistribution] !== undefined) {
          testTypeDistribution[typeId as keyof typeof testTypeDistribution]++;
        }
      });

      const statusDistribution = {
        draft: testCases.filter(tc => tc.status === 'draft').length,
        active: testCases.filter(tc => tc.status === 'active').length,
        deprecated: testCases.filter(tc => tc.status === 'deprecated').length,
      };

      const priorityDistribution = {
        low: testCases.filter(tc => tc.priority === 'low').length,
        medium: testCases.filter(tc => tc.priority === 'medium').length,
        high: testCases.filter(tc => tc.priority === 'high').length,
        critical: testCases.filter(tc => tc.priority === 'critical').length,
      };

      const data: DashboardSummary = {
        totalProjects: projects.length,
        activeProjects: projects.filter(p => p.status === 'active').length,
        totalTestCases,
        totalTestRuns: selectedProject?.testRunsCount || projects.reduce((sum, p) => sum + (p.testRunsCount || 0), 0),
        automationDistribution,
        automatedTestCases,
        manualTestCases,
        testTypeDistribution,
        statusDistribution,
        priorityDistribution,
        automationCoverage,
        trendsData
      };

      setSummaryData(data);

    } catch (err) {
      console.error('❌ CRITICAL ERROR in dashboard summary generation:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [selectedProject, projects, automationFilter]);

  useEffect(() => {
    devLog('📊 Dashboard summary useEffect triggered for project:', selectedProject?.name || 'All projects');
    fetchSummaryData();
  }, [fetchSummaryData, selectedProject?.name, automationFilter]);

  return { summaryData, loading, error, refreshData: fetchSummaryData };
};

function generateTrendData(testCases: TestCase[]) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentDate = new Date();

  const trendData = [];

  const uniqueTypes = [...new Set(testCases.map(tc => tc.type))];

  const getTypeLabel = (type: string): string => {
    const typeMap = {
      'other': 'Other',
      'acceptance': 'Acceptance',
      'accessibility': 'Accessibility',
      'compatibility': 'Compatibility',
      'destructive': 'Destructive',
      'functional': 'Functional',
      'performance': 'Performance',
      'regression': 'Regression',
      'security': 'Security',
      'smoke': 'Smoke & Sanity',
      'usability': 'Usability'
    };
    return typeMap[type as keyof typeof typeMap] || type;
  };

  for (let i = 11; i >= 0; i--) {
    const date = new Date(currentDate);
    date.setMonth(date.getMonth() - i);
    const monthKey = months[date.getMonth()];

    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

    const testCasesInThisMonth = testCases.filter(tc =>
      tc.createdAt >= monthStart && tc.createdAt <= monthEnd
    );

    const monthData: Record<string, unknown> = {
      month: monthKey,
      date: date.toISOString().split('T')[0]
    };

    uniqueTypes.forEach(type => {
      const typeLabel = getTypeLabel(type);
      const countForType = testCasesInThisMonth.filter(tc => tc.type === type).length;
      monthData[typeLabel] = countForType;
    });

    monthData.Total = testCasesInThisMonth.length;

    trendData.push(monthData);
  }

  return trendData;
}
