import { useState, useEffect } from 'react';
import { useCallback } from 'react';
import { Project, TestCase, TestExecution, SharedStep, TEST_CASE_TYPES, TEST_RESULTS } from '../types';
import { testCasesApiService } from '../services/testCasesApi';
import { sharedStepsApiService } from '../services/sharedStepsApi';
import { foldersApiService } from '../services/foldersApi';
import { testRunsApiService } from '../services/testRunsApi';

interface DashboardData {
  // Real API Data
  totalProjects: number;
  activeProjects: number;
  totalTestCases: number;
  totalTestCasesInActiveRuns: number;
  totalFolders: number;
  totalSharedSteps: number;
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
  closedTestRuns: any[];
  closedTestRunsData: Array<{
    month: string;
    total: number;
  }>;
  closedTestRunsLineData: Array<{
    month: string;
    value: number;
  }>;
}

// State mapping for test runs
const TEST_RUN_STATES = {
  1: 'New',
  2: 'In progress', 
  3: 'Under review',
  4: 'Rejected',
  5: 'Done',
  6: 'Closed'
} as const;

export const useDashboardData = (selectedProject: Project | null, projects: Project[]) => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper function to get test type number from string type
  const getTestTypeNumber = (type: 'functional' | 'regression' | 'smoke' | 'integration' | 'performance'): number => {
    const typeMap = { 'functional': 6, 'regression': 8, 'smoke': 10, 'integration': 4, 'performance': 7 };
    return typeMap[type];
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setDashboardData(null); // Clear existing data to show loading

      console.log('🔄 Dashboard data fetch triggered at:', new Date().toISOString());
      console.log('📊 Selected project:', selectedProject?.name || 'All projects');
      console.log('📊 Project ID:', selectedProject?.id || 'none');
      console.log('📊 Project ID type:', typeof selectedProject?.id);
      console.log('📊 Project ID value check:', selectedProject?.id ? 'HAS ID' : 'NO ID');
      console.log('📊 Force fetching fresh data for project change');

      // Real API Data
      let totalTestCases = 0;
      let totalFolders = 0;
      let totalSharedSteps = 0;
      let testCases: TestCase[] = [];
      let sharedSteps: SharedStep[] = [];
      let actualPassed = 0;
      let actualFailed = 0;
      let actualBlocked = 0;
      let actualRetest = 0;
      let actualSkipped = 0;
      let actualUntested = 0;
      let actualInProgress = 0;
      let actualUnknown = 0;
      let totalTestCasesInActiveRuns = 0;
      let closedTestRuns: any[] = [];
      let closedTestRunsLineData: Array<{ month: string; value: number }> = [];
      let closedTestRunsData: Array<{ month: string; total: number }> = [];
      let trendsData: Array<any> = [];

      if (selectedProject) {
        console.log(`📊 Fetching data for project: ${selectedProject.name}`);
        console.log(`📊 Project ID for API calls: "${selectedProject.id}"`);
        
        // Validate project ID before making API calls
        if (!selectedProject.id || selectedProject.id === '' || selectedProject.id === 'undefined' || selectedProject.id === 'null') {
          console.error('❌ Invalid project ID, cannot make API calls:', selectedProject.id);
          throw new Error(`Invalid project ID: ${selectedProject.id}`);
        }
        
        // OPTIMIZATION: Make all API calls in parallel instead of sequentially
        console.log(`🚀 Making parallel API calls for project: ${selectedProject.name}`);
        
        const [foldersResponse, sharedStepsResponse, testRunsResponse] = await Promise.all([
          foldersApiService.getFolders(selectedProject.id, 1, 1000),
          sharedStepsApiService.getSharedSteps(selectedProject.id, 1, 1000),
          testRunsApiService.getTestRuns(selectedProject.id, 1, 1000)
        ]);
        
        console.log(`🏃 Test runs data:`, testRunsResponse.data.map(tr => ({
          id: tr.attributes.id,
          name: tr.attributes.name,
          state: tr.attributes.state,
          status: tr.attributes.status,
          caseResults: tr.attributes.caseResults,
          hasValidCaseResults: !!(tr.attributes.caseResults && typeof tr.attributes.caseResults === 'object')
        })));
        
        console.log('🔍 DETAILED TEST RUNS ANALYSIS:');
        testRunsResponse.data.forEach((tr, index) => {
          console.log(`🏃 Test Run ${index + 1}:`);
          console.log(`   - ID: ${tr.attributes.id}`);
          console.log(`   - Name: ${tr.attributes.name}`);
          console.log(`   - State: ${tr.attributes.state} (1=New, 2=In Progress, 3=Under Review)`);
          console.log(`   - Status: ${tr.attributes.status}`);
          console.log(`   - caseResults type: ${typeof tr.attributes.caseResults}`);
          console.log(`   - caseResults value:`, tr.attributes.caseResults);
          console.log(`   - Is active test run: ${tr.attributes.state === 1 || tr.attributes.state === 2 || tr.attributes.state === 3}`);
          
          if (tr.attributes.caseResults && typeof tr.attributes.caseResults === 'object') {
            console.log(`   - caseResults keys:`, Object.keys(tr.attributes.caseResults));
            console.log(`   - caseResults values:`, Object.values(tr.attributes.caseResults));
            console.log(`   - passed: ${tr.attributes.caseResults.passed || 0}`);
            console.log(`   - failed: ${tr.attributes.caseResults.failed || 0}`);
            console.log(`   - blocked: ${tr.attributes.caseResults.blocked || 0}`);
          } else {
            console.log(`   - ❌ NO VALID caseResults data`);
          }
        });
        
        // Extract REAL execution data from caseResults in ACTIVE test runs only
        testRunsResponse.data.forEach(apiTestRun => {
          // Active test runs are those with state 1 (New), 2 (In Progress), or 3 (Under Review)
          // Handle both string and number state values
          const state = apiTestRun.attributes.state;
          const isActiveTestRun = state === "1" || state === 1 || // New
                                  state === "2" || state === 2 || // In progress  
                                  state === "3" || state === 3;   // Under review
          
          console.log(`🏃 Processing test run: ${apiTestRun.attributes.name}`);
          console.log(`🏃 Test run state: ${state} (type: ${typeof state}) (1=New, 2=In Progress, 3=Under Review)`);
          console.log(`🏃 Is active test run: ${isActiveTestRun}`);
          
          if (!isActiveTestRun) {
            console.log(`🏃 ⏭️ SKIPPING test run "${apiTestRun.attributes.name}" - not active (state: ${state})`);
            return;
          }
          
          console.log(`🏃 ✅ ACTIVE test run "${apiTestRun.attributes.name}" - processing caseResults...`);
          console.log(`🏃 caseResults:`, apiTestRun.attributes.caseResults);
          
          // Count ALL test cases in this active test run (from relationships)
          const testCasesInThisRun = apiTestRun.relationships.testCases?.data?.length || 0;
          totalTestCasesInActiveRuns += testCasesInThisRun;
          
          console.log(`🏃 Test cases in this run: ${testCasesInThisRun}`);
          console.log(`🏃 Running total test cases in active runs: ${totalTestCasesInActiveRuns}`);
          
          // Check if this test run has executions data (it's an array of individual results)
          if (apiTestRun.attributes.executions && Array.isArray(apiTestRun.attributes.executions)) {
            console.log(`🏃 ✅ VALID executions array found for "${apiTestRun.attributes.name}"`);
            console.log(`🏃 executions array length:`, apiTestRun.attributes.executions.length);
            
            // Group executions by test case ID and get the last execution per test case
            const lastExecutionPerTestCase = new Map<string, any>();
            
            apiTestRun.attributes.executions.forEach((execution: any) => {
              const testCaseId = execution.test_case_id.toString();
              const executionDate = new Date(execution.created_at);
              
              // Keep only the latest execution for each test case
              const existing = lastExecutionPerTestCase.get(testCaseId);
              if (!existing || new Date(existing.created_at) < executionDate) {
                lastExecutionPerTestCase.set(testCaseId, execution);
              }
            });
            
            console.log(`🏃 Found ${lastExecutionPerTestCase.size} unique test cases with executions`);
            
            // Count each result type from the last execution per test case
            let runPassed = 0;
            let runFailed = 0;
            let runBlocked = 0;
            let runRetest = 0;
            let runSkipped = 0;
            let runUntested = 0;
            let runInProgress = 0;
            let runUnknown = 0;
            
            Array.from(lastExecutionPerTestCase.values()).forEach((execution: any, index: number) => {
              console.log(`🏃   Test case ${index + 1}:`, execution);
              console.log(`🏃     - test_case_id: ${execution.test_case_id}`);
              console.log(`🏃     - result: ${execution.result}`);
              console.log(`🏃     - result type: ${typeof execution.result}`);
              
              // Handle both numeric and string result values
              const rawResult = execution.result;
              let resultLabel: string;
              
              if (typeof rawResult === 'number') {
                // Convert numeric ID to string label
                resultLabel = TEST_RESULTS[rawResult as TestResultId]?.toLowerCase() || 'unknown';
                console.log(`🏃     - converted numeric ${rawResult} to: ${resultLabel}`);
              } else if (typeof rawResult === 'string') {
                // Handle string results - could be numeric string or label string
                const numericResult = parseInt(rawResult);
                if (!isNaN(numericResult) && TEST_RESULTS[numericResult as TestResultId]) {
                  // String is a numeric ID
                  resultLabel = TEST_RESULTS[numericResult as TestResultId]?.toLowerCase() || 'unknown';
                  console.log(`🏃     - converted string numeric "${rawResult}" to: ${resultLabel}`);
                } else {
                  // String is already a label
                  resultLabel = rawResult.toLowerCase();
                  console.log(`🏃     - using string label: ${resultLabel}`);
                }
              } else {
                resultLabel = 'unknown';
                console.log(`🏃     - unknown result type, defaulting to: unknown`);
              }
              
              console.log(`🏃     - processed result: ${resultLabel}`);
              
              switch (resultLabel) {
                case 'passed':
                  runPassed++;
                  break;
                case 'failed':
                  runFailed++;
                  break;
                case 'blocked':
                  runBlocked++;
                  break;
                case 'retest':
                  runRetest++;
                  break;
                case 'skipped':
                  runSkipped++;
                  break;
                case 'untested':
                  runUntested++;
                  break;
                case 'in progress':
                  runInProgress++;
                  break;
                case 'unknown':
                  runUnknown++;
                  break;
                default:
                  console.log(`🏃     - Unknown result type: ${resultLabel}`);
                  runUnknown++;
              }
            });
            
            console.log(`🏃 Calculated counts for "${apiTestRun.attributes.name}":`, {
              passed: runPassed,
              failed: runFailed,
              blocked: runBlocked,
              retest: runRetest,
              skipped: runSkipped,
              untested: runUntested,
              inProgress: runInProgress,
              unknown: runUnknown
            });
            
            actualPassed += runPassed;
            actualFailed += runFailed;
            actualBlocked += runBlocked;
            actualRetest += runRetest;
            actualSkipped += runSkipped;
            actualUntested += runUntested;
            actualInProgress += runInProgress;
            actualUnknown += runUnknown;
            
            // For test cases without execution results, count them as "untested"
            const testCasesWithResults = lastExecutionPerTestCase.size;
            const testCasesWithoutResults = testCasesInThisRun - testCasesWithResults;
            if (testCasesWithoutResults > 0) {
              actualUntested += testCasesWithoutResults;
              console.log(`🏃 Added ${testCasesWithoutResults} test cases without results as "untested"`);
            }
            
            console.log(`🏃 Running totals after "${apiTestRun.attributes.name}":`, {
              totalTestCasesInActiveRuns,
              actualPassed,
              actualFailed,
              actualBlocked,
              actualRetest,
              actualSkipped,
              actualUntested,
              actualInProgress,
              actualUnknown
            });
          } else {
            console.log(`🏃 ❌ Test run "${apiTestRun.attributes.name}" has NO VALID executions array`);
            console.log(`🏃    - executions value:`, apiTestRun.attributes.executions);
            console.log(`🏃    - executions type:`, typeof apiTestRun.attributes.executions);
            console.log(`🏃    - Is array:`, Array.isArray(apiTestRun.attributes.executions));
            
            // If no executions, count all test cases in this run as "untested"
            actualUntested += testCasesInThisRun;
            console.log(`🏃 No executions - counted ${testCasesInThisRun} test cases as "untested"`);
          }
        });
        
        console.log('🏃 📊 FINAL AGGREGATED RESULTS:');
        console.log(`🏃 📊 Total test case instances in active runs: ${totalTestCasesInActiveRuns}`);
        console.log(`🏃 📊 Total passed: ${actualPassed}`);
        console.log(`🏃 📊 Total failed: ${actualFailed}`);
        console.log(`🏃 📊 Total blocked: ${actualBlocked}`);
        console.log(`🏃 📊 Total retest: ${actualRetest}`);
        console.log(`🏃 📊 Total skipped: ${actualSkipped}`);
        console.log(`🏃 📊 Total untested: ${actualUntested}`);
        console.log(`🏃 📊 Total in progress: ${actualInProgress}`);
        console.log(`🏃 📊 Total unknown: ${actualUnknown}`);
        console.log(`🏃 📊 Sum check: ${actualPassed + actualFailed + actualBlocked} should equal ${totalTestCasesInActiveRuns}`);
        
        // Process closed test runs from the same test runs response
        console.log(`📊 Processing closed test runs from test runs response...`);
        console.log(`📊 Total test runs in response:`, testRunsResponse.data.length);
        
        // Filter for closed test runs (state 6 = Closed) from the same response
        console.log('🔍 BAR_CHART_DEBUG: Starting to filter for closed test runs...');
        const closedTestRunsFromResponse = testRunsResponse.data.filter((apiTestRun, index) => {
          // Handle both string and number state values
          const state = apiTestRun.attributes.state;
          const isClosed = state === "6" || state === 6;
          console.log(`🔍 BAR_CHART_DEBUG: Test run ${index + 1}: "${apiTestRun.attributes.name}" - state: ${state} (type: ${typeof state}), is closed: ${isClosed}, closedAt: ${apiTestRun.attributes.closedAt}`);
          return isClosed;
        });
        
        console.log('🔍 BAR_CHART_DEBUG: Found', closedTestRunsFromResponse.length, 'closed test runs');
        console.log('🔍 BAR_CHART_DEBUG: Closed test runs details:', closedTestRunsFromResponse.map(tr => ({
          id: tr.attributes.id,
          name: tr.attributes.name,
          state: tr.attributes.state,
          closedAt: tr.attributes.closedAt,
          caseResults: tr.attributes.caseResults,
          caseResultsType: typeof tr.attributes.caseResults,
          caseResultsIsArray: Array.isArray(tr.attributes.caseResults),
          caseResultsLength: Array.isArray(tr.attributes.caseResults) ? tr.attributes.caseResults.length : 'not array',
          caseResultsContent: Array.isArray(tr.attributes.caseResults) ? tr.attributes.caseResults : 'not array'
        })));
        
        closedTestRunsFromResponse.forEach((apiTestRun, index) => {
          console.log(`🔍 BAR_CHART_DEBUG: DETAILED ANALYSIS ${index + 1}:`);
        
          console.log(`🔍 BAR_CHART_DEBUG:   Test Run: "${apiTestRun.attributes.name}"`);
          console.log(`🔍 BAR_CHART_DEBUG:   State: ${apiTestRun.attributes.state} (should be 6 for closed)`);
          console.log(`🔍 BAR_CHART_DEBUG:   closedAt: ${apiTestRun.attributes.closedAt}`);
          console.log(`🔍 BAR_CHART_DEBUG:   caseResults exists: ${!!apiTestRun.attributes.caseResults}`);
          console.log(`🔍 BAR_CHART_DEBUG:   caseResults type: ${typeof apiTestRun.attributes.caseResults}`);
          console.log(`🔍 BAR_CHART_DEBUG:   caseResults is array: ${Array.isArray(apiTestRun.attributes.caseResults)}`);
          
          if (apiTestRun.attributes.caseResults) {
            console.log(`🔍 BAR_CHART_DEBUG:   caseResults raw value:`, apiTestRun.attributes.caseResults);
            
            if (Array.isArray(apiTestRun.attributes.caseResults)) {
              console.log(`🔍 BAR_CHART_DEBUG:   caseResults array length: ${apiTestRun.attributes.caseResults.length}`);
              
              if (apiTestRun.attributes.caseResults.length > 0) {
                console.log(`🔍 BAR_CHART_DEBUG:   First caseResult sample:`, apiTestRun.attributes.caseResults[0]);
                console.log(`🔍 BAR_CHART_DEBUG:   All caseResults:`, apiTestRun.attributes.caseResults);
              } else {
                console.log(`🔍 BAR_CHART_DEBUG:   ❌ caseResults array is EMPTY`);
              }
            } else {
              console.log(`🔍 BAR_CHART_DEBUG:   ❌ caseResults is NOT an array`);
            }
          } else {
            console.log(`🔍 BAR_CHART_DEBUG:   ❌ caseResults is NULL/UNDEFINED`);
          }
        });
        
        // Generate bar chart data using the helper function
        closedTestRunsData = generateClosedTestRunsBarData(closedTestRunsFromResponse);
        
        console.log('🔍 BAR_CHART_DEBUG: Generated bar chart data:', closedTestRunsData);
        console.log('🔍 BAR_CHART_DEBUG: Bar chart data length:', closedTestRunsData.length);
        console.log('🔍 BAR_CHART_DEBUG: Sample bar chart data point:', closedTestRunsData[0]);
        
        // Generate line chart data using the helper function
        closedTestRunsLineData = generateClosedTestRunsLineData(closedTestRunsFromResponse.map(apiTestRun => ({
          id: apiTestRun.attributes.id,
          name: apiTestRun.attributes.name,
          closedAt: apiTestRun.attributes.closedAt ? new Date(apiTestRun.attributes.closedAt) : null
        })));
        
        // Fetch test cases - GET ALL PAGES to ensure complete data
        console.log(`🧪 Fetching ALL test cases for project: ${selectedProject.name}`);
        
        // Fetch first page to get total count
        const firstPageResponse = await testCasesApiService.getTestCases(1, 30, selectedProject.id);
        const totalTestCasesFromAPI = firstPageResponse.meta.totalItems;
        const itemsPerPage = firstPageResponse.meta.itemsPerPage;
        const totalPages = Math.ceil(totalTestCasesFromAPI / itemsPerPage);
        
        console.log(`🧪 Total test cases: ${totalTestCasesFromAPI}, Total pages: ${totalPages}`);
        
        // Start with first page data
        let allTestCasesData = [...firstPageResponse.data];
        
        // Fetch remaining pages in parallel if there are more
        if (totalPages > 1) {
          console.log(`🚀 Fetching remaining ${totalPages - 1} pages in parallel...`);
          
          const pagePromises = [];
          for (let page = 2; page <= totalPages; page++) {
            pagePromises.push(testCasesApiService.getTestCases(page, 30, selectedProject.id));
          }
          
          const pageResponses = await Promise.all(pagePromises);
          
          // Combine all page data
          pageResponses.forEach(response => {
            allTestCasesData = [...allTestCasesData, ...response.data];
          });
          
          console.log(`🧪 ✅ Fetched ALL ${allTestCasesData.length} test cases from ${totalPages} pages`);
          console.log(`🧪 Expected: ${totalTestCasesFromAPI}, Got: ${allTestCasesData.length}`);
        }
        
        // Transform all test cases
        testCases = allTestCasesData.map(apiTestCase => 
          testCasesApiService.transformApiTestCase(apiTestCase, firstPageResponse.included)
        );
        
        // Use the actual count we fetched
        totalTestCases = allTestCasesData.length;
        console.log(`🧪 Final test cases count: ${totalTestCases}`);
        
        console.log(`✅ All API calls completed for project: ${selectedProject.name}`);
        
        // Process folders
        totalFolders = foldersResponse.data.length;
        console.log(`📁 Folders: ${totalFolders}`);
        
        // Process shared steps
        sharedSteps = sharedStepsResponse.data.map(apiSharedStep => 
          sharedStepsApiService.transformApiSharedStep(apiSharedStep, sharedStepsResponse.included)
        );
        totalSharedSteps = sharedSteps.length;
        console.log(`🔗 Shared steps: ${totalSharedSteps}`);
        
        console.log(`📊 REAL execution data from caseResults:`, {
          totalTestCaseInstances: totalTestCasesInActiveRuns,
          passed: actualPassed,
          failed: actualFailed,
          blocked: actualBlocked
        });
        console.log(`📊 FINAL VALUES being set in dashboard data:`, {
          actualPassed,
        });
        const generatedClosedTestRunsData = generateClosedTestRunsData(closedTestRuns);
        closedTestRunsData = generatedClosedTestRunsData;
        // Generate trends data using real test case creation dates
        trendsData = generateTrendData(testCases, totalTestCases);
        
      } else {
        // For all projects view, use aggregated data from projects array
        console.log(`📊 All projects view - fetching data across all projects`);
        
        // Use aggregated data from projects array (much faster)
        totalTestCases = projects.reduce((sum, p) => sum + (p.testCasesCount || 0), 0);
        totalFolders = projects.length * 2; // Estimate
        totalSharedSteps = 0; // Not available for all projects view
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
      
      console.log(`🤖 Automation distribution:`, automationDistribution);
      console.log(`🤖 Sample test cases automation status:`, testCases.slice(0, 5).map(tc => ({ id: tc.id, automationStatus: tc.automationStatus, type: typeof tc.automationStatus })));
      console.log(`🤖 All test cases automation status:`, testCases.map(tc => ({ id: tc.id, title: tc.title, automationStatus: tc.automationStatus })));
      
      // Debug: Check what automation status values we actually have
      const uniqueAutomationStatuses = [...new Set(testCases.map(tc => tc.automationStatus))];
      console.log(`🤖 Unique automation status values found:`, uniqueAutomationStatuses);
      console.log(`🤖 Automation status types:`, uniqueAutomationStatuses.map(status => ({ value: status, type: typeof status })));

      // Calculate automation metrics based on real data
      const automatedTestCases = automationDistribution.automated; // ID 2 = "Automated"
      const manualTestCases = automationDistribution.notAutomated + 
                             automationDistribution.notRequired + 
                             automationDistribution.cannotAutomate + 
                             automationDistribution.obsolete; // All other IDs
      
      const totalTestCasesWithAutomationStatus = automatedTestCases + manualTestCases;
      const automationCoverage = totalTestCasesWithAutomationStatus > 0 ? 
        Math.round((automatedTestCases / totalTestCasesWithAutomationStatus) * 100) : 0;
      
      console.log(`🤖 Automation metrics calculation:`, {
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
      
      console.log(`📊 Test type distribution:`, testTypeDistribution);
      console.log(`📊 Sample test cases types:`, testCases.slice(0, 10).map(tc => ({ id: tc.id, type: tc.type })));

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
      const blockedRate = totalTestCasesInActiveRuns > 0 ? Math.round((actualBlocked / totalTestCasesInActiveRuns) * 100) : 0;
      
      // Generate REAL closed test runs data from actual API data
      closedTestRunsData = generateClosedTestRunsData(closedTestRuns);
      
      // Generate trends data for last 7 days using real test case creation dates
      trendsData = selectedProject ? generateTrendData(testCases, totalTestCases) : [];
      
      const data: DashboardData = {
        // Real API Data
        totalProjects: projects.length,
        activeProjects: projects.filter(p => p.status === 'active').length,
        totalTestCases,
        totalTestCasesInActiveRuns,
        totalTestRuns: selectedProject?.testRunsCount || projects.reduce((sum, p) => sum + (p.testRunsCount || 0), 0),
        totalFolders,
        totalSharedSteps,
        
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
        closedTestRunsLineData
      };

      setDashboardData(data);

    } catch (err) {
      console.error('❌ CRITICAL ERROR in dashboard data generation:', err);
      console.log(`📊 REAL execution data from ACTIVE test runs caseResults:`, {
        message: err instanceof Error ? err.message : 'Unknown error',
        selectedProject: selectedProject?.name,
        projectId: selectedProject?.id,
        projectIdType: typeof selectedProject?.id
      });
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [selectedProject?.id, projects]);

  useEffect(() => {
    console.log('📊 Dashboard useEffect triggered for project:', selectedProject?.name || 'All projects', 'at:', new Date().toISOString());
    console.log('📊 Project ID changed to:', selectedProject?.id);
    console.log('📊 Project ID type:', typeof selectedProject?.id);
    
    if (selectedProject?.id) {
      console.log('📊 ✅ SPECIFIC PROJECT SELECTED - Will fetch data for:', selectedProject.name);
    } else {
      console.log('📊 ⚠️ NO PROJECT SELECTED - Will fetch aggregated data');
    }
    
    console.log('📊 Will trigger fetchDashboardData now...');
    fetchDashboardData();
  }, [fetchDashboardData]);

  return { dashboardData, loading, error, refreshData: fetchDashboardData };
};

// Generate bar chart data from closed test runs with real caseResults
// Generate bar chart data from closed test runs with real executions
function generateClosedTestRunsBarData(closedTestRuns: any[]): Array<{
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
  
  console.log('🔍 BAR_CHART_DEBUG: generateClosedTestRunsBarData called with', closedTestRuns.length, 'closed test runs');
  
  // Process each closed test run
  closedTestRuns.forEach((apiTestRun, index) => {
    console.log(`🔍 BAR_CHART_DEBUG: Processing closed test run ${index + 1}:`, {
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
      console.log('🔍 BAR_CHART_DEBUG: ⚠️ Test run has no closedAt date:', apiTestRun.attributes.name);
      return;
    }
    
    const closedDate = new Date(closedAt);
    console.log('🔍 BAR_CHART_DEBUG: Parsed closedDate:', closedDate);
    
    const monthKey = closedDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }); // "Dec 24"
    
    console.log(`🔍 BAR_CHART_DEBUG: Generated month key: ${monthKey} from closedAt: ${closedAt}`);
    
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
      console.log(`🔍 BAR_CHART_DEBUG: Initialized month data for: ${monthKey}`);
    }
    
    // Process executions to count each result type
    if (apiTestRun.attributes.executions && Array.isArray(apiTestRun.attributes.executions)) {
      console.log(`🔍 BAR_CHART_DEBUG: ✅ VALID executions array found with ${apiTestRun.attributes.executions.length} results`);
      
      apiTestRun.attributes.executions.forEach((execution: any, executionIndex: number) => {
        console.log(`🔍 BAR_CHART_DEBUG:   Execution ${executionIndex + 1}:`, execution);
        
        const rawResult = execution.result;
        console.log(`🔍 BAR_CHART_DEBUG:   Raw result value: ${rawResult} (type: ${typeof rawResult})`);
        
        let resultLabel: string;
        
        if (typeof rawResult === 'number') {
          // Use the TEST_RESULTS mapping and convert to lowercase
          resultLabel = (TEST_RESULTS[rawResult as TestResultId] || 'Unknown').toLowerCase();
          console.log(`🔍 BAR_CHART_DEBUG:   Converted numeric ${rawResult} to: ${resultLabel}`);
        } else if (typeof rawResult === 'string') {
          resultLabel = rawResult.toLowerCase();
          console.log(`🔍 BAR_CHART_DEBUG:   Using string result: ${resultLabel}`);
        } else {
          resultLabel = 'untested';
          console.log(`🔍 BAR_CHART_DEBUG:   Unknown result type, defaulting to: untested`);
        }
        
        console.log(`🔍 BAR_CHART_DEBUG:   BEFORE increment - ${monthKey} ${resultLabel}:`, monthlyData[monthKey][resultLabel as keyof typeof monthlyData[string]]);
        
        // Count each result type
        switch (resultLabel) {
          case 'passed':
            monthlyData[monthKey].passed++;
            console.log(`🔍 BAR_CHART_DEBUG:   ✅ Incremented passed for ${monthKey}: ${monthlyData[monthKey].passed}`);
            break;
          case 'failed':
            monthlyData[monthKey].failed++;
            console.log(`🔍 BAR_CHART_DEBUG:   ❌ Incremented failed for ${monthKey}: ${monthlyData[monthKey].failed}`);
            break;
          case 'blocked':
            monthlyData[monthKey].blocked++;
            console.log(`🔍 BAR_CHART_DEBUG:   🚫 Incremented blocked for ${monthKey}: ${monthlyData[monthKey].blocked}`);
            break;
          case 'retest':
            monthlyData[monthKey].retest++;
            console.log(`🔍 BAR_CHART_DEBUG:   🔄 Incremented retest for ${monthKey}: ${monthlyData[monthKey].retest}`);
            break;
          case 'skipped':
            monthlyData[monthKey].skipped++;
            console.log(`🔍 BAR_CHART_DEBUG:   ⏭️ Incremented skipped for ${monthKey}: ${monthlyData[monthKey].skipped}`);
            break;
          case 'untested':
          case 'in progress':
          case 'unknown':
            monthlyData[monthKey].untested++;
            console.log(`🔍 BAR_CHART_DEBUG:   ⚪ Incremented untested (${resultLabel}) for ${monthKey}: ${monthlyData[monthKey].untested}`);
            break;
          default:
            console.log(`🔍 BAR_CHART_DEBUG:   ❓ Unknown result type: ${resultLabel}, adding to untested`);
            monthlyData[monthKey].untested++;
        }
        
        console.log(`🔍 BAR_CHART_DEBUG:   AFTER increment - ${monthKey} ${resultLabel}:`, monthlyData[monthKey][resultLabel as keyof typeof monthlyData[string]]);
      });
      
      console.log(`🔍 BAR_CHART_DEBUG: Month data AFTER processing all caseResults for ${monthKey}:`, monthlyData[monthKey]);
      console.log(`🔍 BAR_CHART_DEBUG: Month data AFTER processing all executions for ${monthKey}:`, monthlyData[monthKey]);
    } else {
      console.log(`🔍 BAR_CHART_DEBUG: ❌ NO VALID executions for test run: ${apiTestRun.attributes.name}`);
      console.log('🔍 BAR_CHART_DEBUG:   executions value:', apiTestRun.attributes.executions);
      console.log('🔍 BAR_CHART_DEBUG:   executions type:', typeof apiTestRun.attributes.executions);
      console.log('🔍 BAR_CHART_DEBUG:   Is array:', Array.isArray(apiTestRun.attributes.executions));
    }
  });
  
  console.log('🔍 BAR_CHART_DEBUG: FINAL monthly data object before converting to array:', monthlyData);
  console.log('🔍 BAR_CHART_DEBUG: Monthly data keys:', Object.keys(monthlyData));
  console.log('🔍 BAR_CHART_DEBUG: Monthly data values:', Object.values(monthlyData));
  
  // Convert to array and sort by date
  const sortedData = Object.values(monthlyData).sort((a, b) => {
    // Parse month strings like "Dec 24" for sorting
    const dateA = new Date(`${a.month.split(' ')[0]} 1, 20${a.month.split(' ')[1]}`);
    const dateB = new Date(`${b.month.split(' ')[0]} 1, 20${b.month.split(' ')[1]}`);
    return dateA.getTime() - dateB.getTime();
  });
  
  console.log('🔍 BAR_CHART_DEBUG: FINAL SORTED bar chart data:', sortedData);
  console.log('🔍 BAR_CHART_DEBUG: Data length:', sortedData.length);
  console.log('🔍 BAR_CHART_DEBUG: Sample data point:', sortedData[0]);
  
  return sortedData;
}

// Generate closed test runs data for bar chart
function generateClosedTestRunsData(closedTestRuns: any[]): Array<{
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
  
  console.log('📊 Processing', closedTestRuns.length, 'closed test runs for bar chart...');
  
  console.log('📊 Processing', closedTestRuns.length, 'closed test runs for monthly data');
  
  // Process real closed test runs data
  closedTestRuns.forEach(testRun => {
    console.log('📊 Processing closed test run for bar chart:', {
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
        
        console.log(`📊 Updated ${monthKey} with:`, {
          passed: testRun.passedCount || 0,
          failed: testRun.failedCount || 0,
          blocked: testRun.blockedCount || 0,
          total: testRun.testCasesCount || 0
        });
        
        console.log(`📊 Added data for ${monthKey}:`, {
          passed: testRun.passedCount,
          failed: testRun.failedCount,
          blocked: testRun.blockedCount,
          total: testRun.testCasesCount
        });
      }
    }
  });
  
  console.log('📊 Final monthly data for bar chart:', monthlyData);
  
  // Return in the correct month order
  return months.map(month => ({
    month: monthlyData[month].month,
    total: monthlyData[month].total
  }));
}

// Generate line chart data for closed test runs count over time
export function generateClosedTestRunsLineData(closedTestRuns: any[]): Array<{
  month: string;
  value: number;
}> {
  console.log('📊 generateClosedTestRunsLineData called with:', closedTestRuns.length, 'closed test runs');

  // Create a map to count test runs by specific date
  const dateCounts = new Map<string, number>();

  // Process each closed test run
  closedTestRuns.forEach(testRun => {
    console.log('📊 Processing closed test run:', {
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

      console.log(`📊 Test run "${testRun.name}" closed at:`, closedDate);
      console.log(`📊 Formatted date key: ${dateKey}`);

      // Increment count for this date
      const currentCount = dateCounts.get(dateKey) || 0;
      dateCounts.set(dateKey, currentCount + 1);

      console.log(`📊 Updated count for ${dateKey}: ${currentCount + 1}`);
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

  console.log('📊 Final sorted line chart data (by date):', sortedDates);

  return sortedDates;
}

// Seeded random number generator for consistent results
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }
}

// Hash function to convert string to number
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Generate trend data based on real test case creation dates
function generateTrendData(testCases: TestCase[], totalTestCases: number) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentDate = new Date();
  
  // Initialize last 12 months with zero values
  const trendData = [];
  
  console.log('📈 Generating trend data from', testCases.length, 'test cases');
  console.log('📈 Test case types found:', testCases.map(tc => tc.type));
  
  // Get all unique test case types from the actual data
  const uniqueTypes = [...new Set(testCases.map(tc => tc.type))];
  console.log('📈 Unique test case types found:', uniqueTypes);
  
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
    const monthData: any = {
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
    
    console.log(`📈 Month ${monthKey} (${monthStart.toDateString()} to ${monthEnd.toDateString()}):`, monthData);
    
    trendData.push(monthData);
  }
  
  console.log('📈 Generated monthly trend data (test cases created per month):', trendData);
  return trendData;
}