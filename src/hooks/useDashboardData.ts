import { useState, useEffect, useCallback, useRef } from 'react';
import { Project, TestCase, TEST_RESULTS } from '../types';
import { testCasesApiService } from '../services/testCasesApi';
import { testRunsApiService } from '../services/testRunsApi';

const isDevelopment = import.meta.env.MODE === 'development';
const devLog = (..._args: unknown[]) => {
  if (isDevelopment) {
    // Development logging disabled
  }
};

interface DashboardData {
  // Real API Data
  totalProjects: number;
  activeProjects: number;
  totalTestCases: number;
  totalTestCasesInActiveRuns: number;
  totalTestRuns: number;
  
  // Real API Analysis
  automationDistribution: {
    notAutomated: number;
    automated: number;
    notRequired: number;
    cannotAutomate: number;
    obsolete: number;
  };
  
  testTypeDistribution: {
    1: number; // Other
    2: number; // Acceptance
    3: number; // Accessibility
    4: number; // Compatibility
    5: number; // Destructive
    6: number; // Functional
    7: number; // Performance
    8: number; // Regression
    9: number; // Security
    10: number; // Smoke & Sanity
    11: number; // Usability
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
  
  // Real execution data from test runs
  passRate: number;
  failRate: number;
  executionRate: number;
  actualPassed: number;
  actualFailed: number;
  actualBlocked: number;
  actualRetest: number;
  actualSkipped: number;
  actualUntested: number;
  actualInProgress: number;
  actualUnknown: number;
  trendsData: Array<{
    date: string;
    passed: number;
    failed: number;
    blocked: number;
  }>;
  recentExecutions: Array<{
    id: string;
    testCaseId: string;
    testCaseTitle: string;
    status: 'passed' | 'failed' | 'blocked';
    executedBy: string;
    executedAt: Date;
    duration: number;
  }>;
  closedTestRuns: Array<Record<string, unknown>>;
  closedTestRunsData: Array<{
    month: string;
    total: number;
  }>;
  closedTestRunsLineData: Array<{
    month: string;
    value: number;
  }>;
  closedTestRunsRawData: Array<Record<string, unknown>>;
}

// State mapping for test runs
// const TEST_RUN_STATES = {
//   1: 'New',
//   2: 'In progress', 
//   3: 'Under review',
//   4: 'Rejected',
//   5: 'Done',
//   6: 'Closed'
// } as const;

export const useDashboardData = (selectedProject: Project | null, projects: Project[]) => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  // Helper function to get test type number from string type
  // const getTestTypeNumber = (type: 'functional' | 'regression' | 'smoke' | 'integration' | 'performance'): number => {
  //   const typeMap = { 'functional': 6, 'regression': 8, 'smoke': 10, 'integration': 4, 'performance': 7 };
  //   return typeMap[type];
  // };

  const fetchDashboardData = useCallback(async () => {
    if (isFetchingRef.current) {
      devLog('⏭️ Skipping duplicate fetch (already in progress)');
      return;
    }

    try {
      isFetchingRef.current = true;
      setLoading(true);
      setError(null);
      setDashboardData(null);

      devLog('🔄 Dashboard data fetch triggered at:', new Date().toISOString());
      devLog('📊 Selected project:', selectedProject?.name || 'All projects');
      devLog('📊 Project ID:', selectedProject?.id || 'none');
      devLog('📊 Project ID type:', typeof selectedProject?.id);
      devLog('📊 Project ID value check:', selectedProject?.id ? 'HAS ID' : 'NO ID');
      devLog('📊 Force fetching fresh data for project change');

      // Real API Data
      let totalTestCases = 0;
      let testCases: TestCase[] = [];
      let actualPassed = 0;
      let actualFailed = 0;
      let actualBlocked = 0;
      let actualRetest = 0;
      let actualSkipped = 0;
      let actualUntested = 0;
      let actualInProgress = 0;
      let actualUnknown = 0;
      let totalTestCasesInActiveRuns = 0;
      const closedTestRuns: Array<Record<string, unknown>> = [];
      let closedTestRunsRawData: Array<Record<string, unknown>> = [];
      let closedTestRunsLineData: Array<{ month: string; value: number }> = [];
      let closedTestRunsData: Array<{ month: string; total: number }> = [];
      let trendsData: Array<Record<string, unknown>> = [];

      if (selectedProject) {
        devLog(`📊 Fetching data for project: ${selectedProject.name}`);
        devLog(`📊 Project ID for API calls: "${selectedProject.id}"`);
        
        // Validate project ID before making API calls
        if (!selectedProject.id || selectedProject.id === '' || selectedProject.id === 'undefined' || selectedProject.id === 'null') {
          console.error('❌ Invalid project ID, cannot make API calls:', selectedProject.id);
          throw new Error(`Invalid project ID: ${selectedProject.id}`);
        }
        
        // OPTIMIZATION: Only fetch test runs data needed for dashboard
        devLog(`🚀 Fetching test runs for project: ${selectedProject.name}`);

        const testRunsResponse = await testRunsApiService.getTestRuns(selectedProject.id, 1, 1000);
        
        devLog(`🏃 Test runs data:`, testRunsResponse.data.map(tr => ({
          id: tr.attributes.id,
          name: tr.attributes.name,
          state: tr.attributes.state,
          status: tr.attributes.status,
          caseResults: tr.attributes.caseResults,
          hasValidCaseResults: !!(tr.attributes.caseResults && typeof tr.attributes.caseResults === 'object')
        })));
        
        devLog('🔍 DETAILED TEST RUNS ANALYSIS:');
        testRunsResponse.data.forEach((tr, index) => {
          devLog(`🏃 Test Run ${index + 1}:`);
          devLog(`   - ID: ${tr.attributes.id}`);
          devLog(`   - Name: ${tr.attributes.name}`);
          devLog(`   - State: ${tr.attributes.state} (1=New, 2=In Progress, 3=Under Review)`);
          devLog(`   - Status: ${tr.attributes.status}`);
          devLog(`   - caseResults type: ${typeof tr.attributes.caseResults}`);
          devLog(`   - caseResults value:`, tr.attributes.caseResults);
          devLog(`   - Is active test run: ${tr.attributes.state === 1 || tr.attributes.state === 2 || tr.attributes.state === 3}`);
          
          if (tr.attributes.caseResults && typeof tr.attributes.caseResults === 'object') {
            devLog(`   - caseResults keys:`, Object.keys(tr.attributes.caseResults));
            devLog(`   - caseResults values:`, Object.values(tr.attributes.caseResults));
            devLog(`   - passed: ${tr.attributes.caseResults.passed || 0}`);
            devLog(`   - failed: ${tr.attributes.caseResults.failed || 0}`);
            devLog(`   - blocked: ${tr.attributes.caseResults.blocked || 0}`);
          } else {
            devLog(`   - ❌ NO VALID caseResults data`);
          }
        });
        
        // Extract REAL execution data from ACTIVE test runs only
        // Group by test case ID + configuration ID + test run ID across ALL active test runs
        const globalLastExecutionPerTestCaseConfigRun = new Map<string, Record<string, unknown>>();

        testRunsResponse.data.forEach(apiTestRun => {
          // Active test runs are ALL test runs EXCEPT Closed (state 6)
          // Handle both string and number state values
          const state = apiTestRun.attributes.state;
          const isClosed = state === "6" || state === 6; // Closed
          const isActiveTestRun = !isClosed;

          devLog(`🏃 Processing test run: ${apiTestRun.attributes.name}`);
          devLog(`🏃 Test run state: ${state} (type: ${typeof state})`);
          devLog(`🏃 Is closed: ${isClosed}`);
          devLog(`🏃 Is active test run: ${isActiveTestRun}`);

          if (!isActiveTestRun) {
            devLog(`🏃 ⏭️ SKIPPING test run "${apiTestRun.attributes.name}" - it's closed (state: ${state})`);
            return;
          }

          devLog(`🏃 ✅ ACTIVE test run "${apiTestRun.attributes.name}" - processing executions...`);

          // Check if this test run has executions data (it's an array of individual results)
          if (apiTestRun.attributes.executions && Array.isArray(apiTestRun.attributes.executions)) {
            devLog(`🏃 ✅ VALID executions array found for "${apiTestRun.attributes.name}"`);
            devLog(`🏃 executions array length:`, apiTestRun.attributes.executions.length);

            apiTestRun.attributes.executions.forEach((execution: Record<string, unknown>) => {
              const testCaseId = execution.test_case_id.toString();
              const configId = execution.configuration_id ? execution.configuration_id.toString() : 'no-config';
              const testRunId = execution.test_run_id.toString();
              const key = `${testCaseId}-${configId}-${testRunId}`;
              const executionDate = new Date(execution.created_at);

              // Keep only the latest execution for each test case + configuration + test run combination
              const existing = globalLastExecutionPerTestCaseConfigRun.get(key);
              if (!existing || new Date(existing.created_at) < executionDate) {
                globalLastExecutionPerTestCaseConfigRun.set(key, execution);
              }
            });

            devLog(`🏃 Added executions from "${apiTestRun.attributes.name}" to global map`);
          } else {
            devLog(`🏃 ❌ Test run "${apiTestRun.attributes.name}" has NO VALID executions array`);
            devLog(`🏃    - executions value:`, apiTestRun.attributes.executions);
            devLog(`🏃    - executions type:`, typeof apiTestRun.attributes.executions);
            devLog(`🏃    - Is array:`, Array.isArray(apiTestRun.attributes.executions));
            devLog(`🏃 Skipping this test run - no executions to count`);
          }
        });

        devLog(`🏃 Found ${globalLastExecutionPerTestCaseConfigRun.size} unique test case + configuration + test run combinations globally`);
        totalTestCasesInActiveRuns = globalLastExecutionPerTestCaseConfigRun.size;

        // Now count each result type from ALL unique combinations
        Array.from(globalLastExecutionPerTestCaseConfigRun.values()).forEach((execution: Record<string, unknown>, index: number) => {
          devLog(`🏃   Global execution ${index + 1}:`, execution);
          devLog(`🏃     - test_case_id: ${execution.test_case_id}`);
          devLog(`🏃     - configuration_id: ${execution.configuration_id}`);
          devLog(`🏃     - test_run_id: ${execution.test_run_id}`);
          devLog(`🏃     - result: ${execution.result}`);
          devLog(`🏃     - result type: ${typeof execution.result}`);

          // Handle both numeric and string result values
          const rawResult = execution.result;
          let resultLabel: string;

          if (typeof rawResult === 'number') {
            // Convert numeric ID to string label
            resultLabel = TEST_RESULTS[rawResult as TestResultId]?.toLowerCase() || 'unknown';
            devLog(`🏃     - converted numeric ${rawResult} to: ${resultLabel}`);
          } else if (typeof rawResult === 'string') {
            // Handle string results - could be numeric string or label string
            const numericResult = parseInt(rawResult);
            if (!isNaN(numericResult) && TEST_RESULTS[numericResult as TestResultId]) {
              // String is a numeric ID
              resultLabel = TEST_RESULTS[numericResult as TestResultId]?.toLowerCase() || 'unknown';
              devLog(`🏃     - converted string numeric "${rawResult}" to: ${resultLabel}`);
            } else {
              // String is already a label
              resultLabel = rawResult.toLowerCase();
              devLog(`🏃     - using string label: ${resultLabel}`);
            }
          } else {
            resultLabel = 'unknown';
            devLog(`🏃     - unknown result type, defaulting to: unknown`);
          }

          devLog(`🏃     - processed result: ${resultLabel}`);

          switch (resultLabel) {
            case 'passed':
              actualPassed++;
              break;
            case 'failed':
              actualFailed++;
              break;
            case 'blocked':
              actualBlocked++;
              break;
            case 'retest':
              actualRetest++;
              break;
            case 'skipped':
              actualSkipped++;
              break;
            case 'untested':
              actualUntested++;
              break;
            case 'in progress':
              actualInProgress++;
              break;
            case 'unknown':
              actualUnknown++;
              break;
            default:
              devLog(`🏃     - Unknown result type: ${resultLabel}`);
              actualUnknown++;
          }
        });
        
        devLog('🏃 📊 FINAL AGGREGATED RESULTS:');
        devLog(`🏃 📊 Total test case instances in active runs: ${totalTestCasesInActiveRuns}`);
        devLog(`🏃 📊 Total passed: ${actualPassed}`);
        devLog(`🏃 📊 Total failed: ${actualFailed}`);
        devLog(`🏃 📊 Total blocked: ${actualBlocked}`);
        devLog(`🏃 📊 Total retest: ${actualRetest}`);
        devLog(`🏃 📊 Total skipped: ${actualSkipped}`);
        devLog(`🏃 📊 Total untested: ${actualUntested}`);
        devLog(`🏃 📊 Total in progress: ${actualInProgress}`);
        devLog(`🏃 📊 Total unknown: ${actualUnknown}`);
        devLog(`🏃 📊 Sum check: ${actualPassed + actualFailed + actualBlocked} should equal ${totalTestCasesInActiveRuns}`);
        
        // Process closed test runs from the same test runs response
        devLog(`📊 Processing closed test runs from test runs response...`);
        devLog(`📊 Total test runs in response:`, testRunsResponse.data.length);
        
        // Filter for closed test runs (state 6 = Closed) from the same response
        const closedTestRunsFromResponse = testRunsResponse.data.filter((apiTestRun) => {
          // Handle both string and number state values
          const state = apiTestRun.attributes.state;
          return state === "6" || state === 6;
        });
        
        closedTestRunsRawData = closedTestRunsFromResponse;
        
        closedTestRunsData = generateClosedTestRunsBarData(closedTestRunsFromResponse);
        
        // Generate line chart data using the helper function
        closedTestRunsLineData = generateClosedTestRunsLineData(closedTestRunsFromResponse.map(apiTestRun => ({
          id: apiTestRun.attributes.id,
          name: apiTestRun.attributes.name,
          closedAt: apiTestRun.attributes.closedAt ? new Date(apiTestRun.attributes.closedAt) : null
        })));
        
        const itemsPerPage = 100;
        const firstPageResponse = await testCasesApiService.getTestCases(1, itemsPerPage, selectedProject.id);
        const totalTestCasesFromAPI = firstPageResponse.meta.totalItems;
        const totalPages = Math.ceil(totalTestCasesFromAPI / itemsPerPage);

        let allTestCasesData = [...firstPageResponse.data];

        if (totalPages > 1) {
          const pagePromises = [];
          for (let page = 2; page <= totalPages; page++) {
            pagePromises.push(testCasesApiService.getTestCases(page, itemsPerPage, selectedProject.id));
          }

          const pageResponses = await Promise.all(pagePromises);
          pageResponses.forEach(response => {
            allTestCasesData = [...allTestCasesData, ...response.data];
          });
        }
        
        // Transform all test cases
        testCases = allTestCasesData.map(apiTestCase => 
          testCasesApiService.transformApiTestCase(apiTestCase, firstPageResponse.included)
        );
        
        // Use the actual count we fetched
        totalTestCases = allTestCasesData.length;
        devLog(`🧪 Final test cases count: ${totalTestCases}`);
        
        devLog(`✅ Test runs data fetched for project: ${selectedProject.name}`);

        devLog(`📊 REAL execution data from caseResults:`, {
          totalTestCaseInstances: totalTestCasesInActiveRuns,
          passed: actualPassed,
          failed: actualFailed,
          blocked: actualBlocked
        });
        devLog(`📊 FINAL VALUES being set in dashboard data:`, {
          actualPassed,
        });
        const generatedClosedTestRunsData = generateClosedTestRunsData(closedTestRuns);
        closedTestRunsData = generatedClosedTestRunsData;
        // Generate trends data using real test case creation dates
          trendsData = generateTrendData(testCases);
          
        } else {
        // For all projects view, use aggregated data from projects array
        devLog(`📊 All projects view - fetching data across all projects`);
        
        // Use aggregated data from projects array (much faster)
        totalTestCases = projects.reduce((sum, p) => sum + (p.testCasesCount || 0), 0);
        testCases = []; // No detailed analysis for all projects view
        
        // For all projects view, we'll use basic mock data for now since we'd need to fetch test runs for all projects
        if (totalTestCases > 0) {
          // Generate some basic execution data for all projects view
          actualPassed = Math.floor(totalTestCases * 0.7); // 70% passed
          actualFailed = Math.floor(totalTestCases * 0.2); // 20% failed
          actualBlocked = Math.floor(totalTestCases * 0.1); // 10% blocked
        }
      }

      // Analyze real test case data
      const automationDistribution = {
        notAutomated: testCases.filter(tc => tc.automationStatus === 1 || tc.automationStatus === "1").length,
        automated: testCases.filter(tc => tc.automationStatus === 2 || tc.automationStatus === "2").length,
        notRequired: testCases.filter(tc => tc.automationStatus === 3 || tc.automationStatus === "3").length,
        cannotAutomate: testCases.filter(tc => tc.automationStatus === 4 || tc.automationStatus === "4").length,
        obsolete: testCases.filter(tc => tc.automationStatus === 5 || tc.automationStatus === "5").length,
      };
      
      devLog(`🤖 Automation distribution:`, automationDistribution);
      devLog(`🤖 Sample test cases automation status:`, testCases.slice(0, 5).map(tc => ({ id: tc.id, automationStatus: tc.automationStatus, type: typeof tc.automationStatus })));
      devLog(`🤖 All test cases automation status:`, testCases.map(tc => ({ id: tc.id, title: tc.title, automationStatus: tc.automationStatus })));
      
      // Debug: Check what automation status values we actually have
      const uniqueAutomationStatuses = [...new Set(testCases.map(tc => tc.automationStatus))];
      devLog(`🤖 Unique automation status values found:`, uniqueAutomationStatuses);
      devLog(`🤖 Automation status types:`, uniqueAutomationStatuses.map(status => ({ value: status, type: typeof status })));

      // Calculate automation metrics based on real data
      const automatedTestCases = automationDistribution.automated; // ID 2 = "Automated"
      const manualTestCases = automationDistribution.notAutomated + 
                             automationDistribution.notRequired + 
                             automationDistribution.cannotAutomate + 
                             automationDistribution.obsolete; // All other IDs
      
      const totalTestCasesWithAutomationStatus = automatedTestCases + manualTestCases;
      const automationCoverage = totalTestCasesWithAutomationStatus > 0 ? 
        Math.round((automatedTestCases / totalTestCasesWithAutomationStatus) * 100) : 0;
      
      devLog(`🤖 Automation metrics calculation:`, {
        totalTestCases: testCases.length,
        automatedTestCases,
        manualTestCases,
        totalTestCasesWithAutomationStatus,
        automationCoverage: `${automationCoverage}%`
      });

      const testTypeDistribution = {
        1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0
      };
      
      // Count test cases by type
      testCases.forEach(tc => {
        // Map string types back to numeric IDs for counting
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
      
      devLog(`📊 Test type distribution:`, testTypeDistribution);
      devLog(`📊 Sample test cases types:`, testCases.slice(0, 10).map(tc => ({ id: tc.id, type: tc.type })));

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

      // Calculate execution rates
      const executionRate = totalTestCases > 0 ? Math.round((totalTestCasesInActiveRuns / totalTestCases) * 100) : 0;
      const passRate = totalTestCasesInActiveRuns > 0 ? Math.round((actualPassed / totalTestCasesInActiveRuns) * 100) : 0;
      const failRate = totalTestCasesInActiveRuns > 0 ? Math.round((actualFailed / totalTestCasesInActiveRuns) * 100) : 0;
      // const blockedRate = totalTestCasesInActiveRuns > 0 ? Math.round((actualBlocked / totalTestCasesInActiveRuns) * 100) : 0;
      
      // Generate REAL closed test runs data from actual API data
      closedTestRunsData = generateClosedTestRunsData(closedTestRuns);
      
      // Generate trends data for last 7 days using real test case creation dates
      trendsData = selectedProject ? generateTrendData(testCases) : [];
      
      const data: DashboardData = {
        // Real API Data
        totalProjects: projects.length,
        activeProjects: projects.filter(p => p.status === 'active').length,
        totalTestCases,
        totalTestCasesInActiveRuns,
        totalTestRuns: selectedProject?.testRunsCount || projects.reduce((sum, p) => sum + (p.testRunsCount || 0), 0),

        // Real API Analysis
        automationDistribution,
        automatedTestCases,
        manualTestCases,
        testTypeDistribution,
        statusDistribution,
        priorityDistribution,
        automationCoverage,

        // Real execution data from active test runs (only passed/failed for pie chart)
        passRate,
        failRate,
        executionRate,
        actualPassed,
        actualFailed,
        actualBlocked,
        actualRetest,
        actualSkipped,
        actualUntested,
        actualInProgress,
        actualUnknown,

        // Real historical data from closed test runs
        trendsData,
        recentExecutions: [], // Empty for now since we don't have execution history API
        closedTestRuns: [],
        closedTestRunsData,
        closedTestRunsLineData,
        closedTestRunsRawData
      };

      setDashboardData(data);

    } catch (err) {
      console.error('❌ CRITICAL ERROR in dashboard data generation:', err);
      devLog(`📊 REAL execution data from ACTIVE test runs caseResults:`, {
        message: err instanceof Error ? err.message : 'Unknown error',
        selectedProject: selectedProject?.name,
        projectId: selectedProject?.id,
        projectIdType: typeof selectedProject?.id
      });
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selectedProject is a complex object
  }, [selectedProject?.id, projects]);

  useEffect(() => {
    devLog('📊 Dashboard useEffect triggered for project:', selectedProject?.name || 'All projects', 'at:', new Date().toISOString());
    devLog('📊 Project ID changed to:', selectedProject?.id);
    devLog('📊 Project ID type:', typeof selectedProject?.id);
    
    if (selectedProject?.id) {
      devLog('📊 ✅ SPECIFIC PROJECT SELECTED - Will fetch data for:', selectedProject.name);
    } else {
      devLog('📊 ⚠️ NO PROJECT SELECTED - Will fetch aggregated data');
    }
    
    devLog('📊 Will trigger fetchDashboardData now...');
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selectedProject?.id and selectedProject.name are tracked separately
  }, [fetchDashboardData]);

  return { dashboardData, loading, error, refreshData: fetchDashboardData };
};

// Generate bar chart data from closed test runs with real caseResults
// Generate bar chart data from closed test runs with real executions
function generateClosedTestRunsBarData(closedTestRuns: Array<Record<string, unknown>>): Array<{
  month: string;
  passed: number;
  failed: number;
  blocked: number;
  retest: number;
  skipped: number;
  untested: number;
}> {
  const monthlyData: { [key: string]: { 
    month: string; 
    passed: number; 
    failed: number; 
    blocked: number; 
    retest: number; 
    skipped: number; 
    untested: number; 
  } } = {};
  
  devLog('🔍 BAR_CHART_DEBUG: generateClosedTestRunsBarData called with', closedTestRuns.length, 'closed test runs');
  
  // Process each closed test run
  closedTestRuns.forEach((apiTestRun, index) => {
    devLog(`🔍 BAR_CHART_DEBUG: Processing closed test run ${index + 1}:`, {
      id: apiTestRun.attributes.id,
      name: apiTestRun.attributes.name,
      state: apiTestRun.attributes.state,
      closedAt: apiTestRun.attributes.closedAt,
      executions: apiTestRun.attributes.executions,
      executionsIsArray: Array.isArray(apiTestRun.attributes.executions),
      executionsLength: Array.isArray(apiTestRun.attributes.executions) ? apiTestRun.attributes.executions.length : 'N/A'
    });
    
    const closedAt = apiTestRun.attributes.closedAt;
    
    if (!closedAt) {
      devLog('🔍 BAR_CHART_DEBUG: ⚠️ Test run has no closedAt date:', apiTestRun.attributes.name);
      return;
    }
    
    const closedDate = new Date(closedAt);
    devLog('🔍 BAR_CHART_DEBUG: Parsed closedDate:', closedDate);
    
    const monthKey = closedDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }); // "Dec 24"
    
    devLog(`🔍 BAR_CHART_DEBUG: Generated month key: ${monthKey} from closedAt: ${closedAt}`);
    
    // Initialize month if not exists
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = {
        month: monthKey,
        passed: 0,
        failed: 0,
        blocked: 0,
        retest: 0,
        skipped: 0,
        untested: 0
      };
      devLog(`🔍 BAR_CHART_DEBUG: Initialized month data for: ${monthKey}`);
    }
    
    // Process executions to count each result type
    if (apiTestRun.attributes.executions && Array.isArray(apiTestRun.attributes.executions)) {
      devLog(`🔍 BAR_CHART_DEBUG: ✅ VALID executions array found with ${apiTestRun.attributes.executions.length} results`);

      // Group by test case ID + configuration ID to get the latest execution per combination
      const lastExecutionPerTestCaseConfig = new Map<string, Record<string, unknown>>();

      apiTestRun.attributes.executions.forEach((execution: Record<string, unknown>) => {
        const testCaseId = execution.test_case_id.toString();
        const configId = execution.configuration_id ? execution.configuration_id.toString() : 'no-config';
        const key = `${testCaseId}-${configId}`;
        const executionDate = new Date(execution.created_at);

        const existing = lastExecutionPerTestCaseConfig.get(key);
        if (!existing || new Date(existing.created_at) < executionDate) {
          lastExecutionPerTestCaseConfig.set(key, execution);
        }
      });

      devLog(`🔍 BAR_CHART_DEBUG: Found ${lastExecutionPerTestCaseConfig.size} unique test case + configuration combinations`);

      // Now process only the latest execution per test case + configuration
      Array.from(lastExecutionPerTestCaseConfig.values()).forEach((execution: Record<string, unknown>, executionIndex: number) => {
        devLog(`🔍 BAR_CHART_DEBUG:   Execution ${executionIndex + 1}:`, execution);

        const rawResult = execution.result;
        devLog(`🔍 BAR_CHART_DEBUG:   Raw result value: ${rawResult} (type: ${typeof rawResult})`);

        let resultLabel: string;

        if (typeof rawResult === 'number') {
          // Use the TEST_RESULTS mapping and convert to lowercase
          resultLabel = (TEST_RESULTS[rawResult as TestResultId] || 'Unknown').toLowerCase();
          devLog(`🔍 BAR_CHART_DEBUG:   Converted numeric ${rawResult} to: ${resultLabel}`);
        } else if (typeof rawResult === 'string') {
          resultLabel = rawResult.toLowerCase();
          devLog(`🔍 BAR_CHART_DEBUG:   Using string result: ${resultLabel}`);
        } else {
          resultLabel = 'untested';
          devLog(`🔍 BAR_CHART_DEBUG:   Unknown result type, defaulting to: untested`);
        }

        devLog(`🔍 BAR_CHART_DEBUG:   BEFORE increment - ${monthKey} ${resultLabel}:`, monthlyData[monthKey][resultLabel as keyof typeof monthlyData[string]]);

        // Count each result type
        switch (resultLabel) {
          case 'passed':
            monthlyData[monthKey].passed++;
            devLog(`🔍 BAR_CHART_DEBUG:   ✅ Incremented passed for ${monthKey}: ${monthlyData[monthKey].passed}`);
            break;
          case 'failed':
            monthlyData[monthKey].failed++;
            devLog(`🔍 BAR_CHART_DEBUG:   ❌ Incremented failed for ${monthKey}: ${monthlyData[monthKey].failed}`);
            break;
          case 'blocked':
            monthlyData[monthKey].blocked++;
            devLog(`🔍 BAR_CHART_DEBUG:   🚫 Incremented blocked for ${monthKey}: ${monthlyData[monthKey].blocked}`);
            break;
          case 'retest':
            monthlyData[monthKey].retest++;
            devLog(`🔍 BAR_CHART_DEBUG:   🔄 Incremented retest for ${monthKey}: ${monthlyData[monthKey].retest}`);
            break;
          case 'skipped':
            monthlyData[monthKey].skipped++;
            devLog(`🔍 BAR_CHART_DEBUG:   ⏭️ Incremented skipped for ${monthKey}: ${monthlyData[monthKey].skipped}`);
            break;
          case 'untested':
          case 'in progress':
          case 'unknown':
            monthlyData[monthKey].untested++;
            devLog(`🔍 BAR_CHART_DEBUG:   ⚪ Incremented untested (${resultLabel}) for ${monthKey}: ${monthlyData[monthKey].untested}`);
            break;
          default:
            devLog(`🔍 BAR_CHART_DEBUG:   ❓ Unknown result type: ${resultLabel}, adding to untested`);
            monthlyData[monthKey].untested++;
        }

        devLog(`🔍 BAR_CHART_DEBUG:   AFTER increment - ${monthKey} ${resultLabel}:`, monthlyData[monthKey][resultLabel as keyof typeof monthlyData[string]]);
      });
      
      devLog(`🔍 BAR_CHART_DEBUG: Month data AFTER processing all caseResults for ${monthKey}:`, monthlyData[monthKey]);
      devLog(`🔍 BAR_CHART_DEBUG: Month data AFTER processing all executions for ${monthKey}:`, monthlyData[monthKey]);
    } else {
      devLog(`🔍 BAR_CHART_DEBUG: ❌ NO VALID executions for test run: ${apiTestRun.attributes.name}`);
      devLog('🔍 BAR_CHART_DEBUG:   executions value:', apiTestRun.attributes.executions);
      devLog('🔍 BAR_CHART_DEBUG:   executions type:', typeof apiTestRun.attributes.executions);
      devLog('🔍 BAR_CHART_DEBUG:   Is array:', Array.isArray(apiTestRun.attributes.executions));
    }
  });
  
  devLog('🔍 BAR_CHART_DEBUG: FINAL monthly data object before converting to array:', monthlyData);
  devLog('🔍 BAR_CHART_DEBUG: Monthly data keys:', Object.keys(monthlyData));
  devLog('🔍 BAR_CHART_DEBUG: Monthly data values:', Object.values(monthlyData));
  
  // Convert to array and sort by date
  const sortedData = Object.values(monthlyData).sort((a, b) => {
    // Parse month strings like "Dec 24" for sorting
    const dateA = new Date(`${a.month.split(' ')[0]} 1, 20${a.month.split(' ')[1]}`);
    const dateB = new Date(`${b.month.split(' ')[0]} 1, 20${b.month.split(' ')[1]}`);
    return dateA.getTime() - dateB.getTime();
  });
  
  devLog('🔍 BAR_CHART_DEBUG: FINAL SORTED bar chart data:', sortedData);
  devLog('🔍 BAR_CHART_DEBUG: Data length:', sortedData.length);
  devLog('🔍 BAR_CHART_DEBUG: Sample data point:', sortedData[0]);
  
  return sortedData;
}

// Generate closed test runs data for bar chart
function generateClosedTestRunsData(closedTestRuns: Array<Record<string, unknown>>): Array<{
  month: string;
  total: number;
}> {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Initialize monthly data
  const monthlyData: { [key: string]: {
    month: string;
    passed: number;
    failed: number;
    blocked: number;
    total: number;
  } } = {};
  
  months.forEach(month => {
    monthlyData[month] = {
      month,
      passed: 0,
      failed: 0,
      blocked: 0,
      total: 0
    };
  });
  
  devLog('📊 Processing', closedTestRuns.length, 'closed test runs for bar chart...');
  
  devLog('📊 Processing', closedTestRuns.length, 'closed test runs for monthly data');
  
  // Process real closed test runs data
  closedTestRuns.forEach(testRun => {
    devLog('📊 Processing closed test run for bar chart:', {
      name: testRun.name,
      closedAt: testRun.closedAt,
      passedCount: testRun.passedCount,
      failedCount: testRun.failedCount,
      blockedCount: testRun.blockedCount
    });
    
    const closedDate = testRun.closedAt || testRun.closedDate;
    
    if (closedDate) {
      const monthIndex = closedDate.getMonth();
      const monthKey = monthNames[monthIndex];
      
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].passed += testRun.passedCount || 0;
        monthlyData[monthKey].failed += testRun.failedCount || 0;
        monthlyData[monthKey].blocked += testRun.blockedCount || 0;
        monthlyData[monthKey].total += testRun.testCasesCount || 0;
        
        devLog(`📊 Updated ${monthKey} with:`, {
          passed: testRun.passedCount || 0,
          failed: testRun.failedCount || 0,
          blocked: testRun.blockedCount || 0,
          total: testRun.testCasesCount || 0
        });
        
        devLog(`📊 Added data for ${monthKey}:`, {
          passed: testRun.passedCount,
          failed: testRun.failedCount,
          blocked: testRun.blockedCount,
          total: testRun.testCasesCount
        });
      }
    }
  });
  
  devLog('📊 Final monthly data for bar chart:', monthlyData);
  
  // Return in the correct month order
  return months.map(month => ({
    month: monthlyData[month].month,
    total: monthlyData[month].total
  }));
}

// Generate line chart data for closed test runs count over time
export function generateClosedTestRunsLineData(closedTestRuns: Array<Record<string, unknown>>): Array<{
  month: string;
  value: number;
}> {
  devLog('📊 generateClosedTestRunsLineData called with:', closedTestRuns.length, 'closed test runs');

  // Create a map to count test runs by specific date
  const dateCounts = new Map<string, number>();

  // Process each closed test run
  closedTestRuns.forEach(testRun => {
    devLog('📊 Processing closed test run:', {
      name: testRun.name,
      id: testRun.id,
      closedAt: testRun.closedAt,
      closedDate: testRun.closedDate
    });

    // Use closedAt first, fallback to closedDate
    const closedDate = testRun.closedAt || testRun.closedDate;

    if (closedDate) {
      // Format as MM-DD (e.g., "08-15" for August 15th)
      const month = String(closedDate.getMonth() + 1).padStart(2, '0'); // getMonth() returns 0-11
      const day = String(closedDate.getDate()).padStart(2, '0');
      const dateKey = `${month}-${day}`;

      devLog(`📊 Test run "${testRun.name}" closed at:`, closedDate);
      devLog(`📊 Formatted date key: ${dateKey}`);

      // Increment count for this date
      const currentCount = dateCounts.get(dateKey) || 0;
      dateCounts.set(dateKey, currentCount + 1);

      devLog(`📊 Updated count for ${dateKey}: ${currentCount + 1}`);
    } else {
      console.warn('📊 Test run has no closedAt or closedDate:', testRun.name);
    }
  });

  // Convert to array and sort by date
  const sortedDates = Array.from(dateCounts.entries())
    .sort(([a], [b]) => {
      // Sort by month first, then by day
      const [monthA, dayA] = a.split('-').map(n => parseInt(n));
      const [monthB, dayB] = b.split('-').map(n => parseInt(n));

      if (monthA !== monthB) {
        return monthA - monthB;
      }
      return dayA - dayB;
    })
    .map(([dateKey, count]) => ({
      month: dateKey,
      value: count
    }));

  devLog('📊 Final sorted line chart data (by date):', sortedDates);

  return sortedDates;
}

// Seeded random number generator for consistent results
// class SeededRandom {
//   private seed: number;
//
//   constructor(seed: number) {
//     this.seed = seed;
//   }
//
//   next(): number {
//     this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
//     return this.seed / 4294967296;
//   }
//
//   nextInt(min: number, max: number): number {
//     return Math.floor(this.next() * (max - min + 1)) + min;
//   }
//
//   nextFloat(min: number, max: number): number {
//     return this.next() * (max - min) + min;
//   }
// }

// Hash function to convert string to number
// function hashString(str: string): number {
//   let hash = 0;
//   for (let i = 0; i < str.length; i++) {
//     const char = str.charCodeAt(i);
//     hash = ((hash << 5) - hash) + char;
//     hash = hash & hash; // Convert to 32-bit integer
//   }
//   return Math.abs(hash);
// }

// Generate trend data based on real test case creation dates
function generateTrendData(testCases: TestCase[]) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentDate = new Date();
  
  // Initialize last 12 months with zero values
  const trendData = [];
  
  devLog('📈 Generating trend data from', testCases.length, 'test cases');
  devLog('📈 Test case types found:', testCases.map(tc => tc.type));
  
  // Get all unique test case types from the actual data
  const uniqueTypes = [...new Set(testCases.map(tc => tc.type))];
  devLog('📈 Unique test case types found:', uniqueTypes);
  
  // Map test case types to TEST_CASE_TYPES labels
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
  
  // Initialize last 12 months
  for (let i = 11; i >= 0; i--) {
    const date = new Date(currentDate);
    date.setMonth(date.getMonth() - i);
    const monthKey = months[date.getMonth()];
    
    // Count test cases created IN this specific month by type
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const testCasesInThisMonth = testCases.filter(tc => 
      tc.createdAt >= monthStart && tc.createdAt <= monthEnd
    );
    
    // Build trend data object dynamically based on actual types
    const monthData: Record<string, unknown> = {
      month: monthKey,
      date: date.toISOString().split('T')[0]
    };
    
    // Count test cases by type for this month
    uniqueTypes.forEach(type => {
      const typeLabel = getTypeLabel(type);
      const countForType = testCasesInThisMonth.filter(tc => tc.type === type).length;
      monthData[typeLabel] = countForType;
    });
    
    // Always include total
    monthData.Total = testCasesInThisMonth.length;
    
    devLog(`📈 Month ${monthKey} (${monthStart.toDateString()} to ${monthEnd.toDateString()}):`, monthData);
    
    trendData.push(monthData);
  }
  
  devLog('📈 Generated monthly trend data (test cases created per month):', trendData);
  return trendData;
}