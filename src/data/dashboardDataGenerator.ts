import { Project, TestExecution, TrendData, TestRun, ClosedTestRunsData } from '../types';

export interface ProjectDashboardMetrics {
  totalProjects: number;
  activeProjects: number;
  totalTestCases: number;
  executionRate: number;
  passRate: number;
  failRate: number;
  blockedRate: number;
  trendsData: TrendData[];
  recentExecutions: TestExecution[];
  closedTestRuns: TestRun[];
  closedTestRunsData: ClosedTestRunsData[];
  // New fields for consistent data
  actualPassed: number;
  actualFailed: number;
  actualBlocked: number;
  automationDistribution: {
    notAutomated: number;
    automated: number;
    notRequired: number;
    cannotAutomate: number;
    obsolete: number;
  };
  testTypeDistribution: {
    functional: number;
    other: number;
  };
}

// Seeded random number generator for consistent results per project
class SeededRandom {
  private seed: number;
  private originalSeed: number;

  constructor(seed: string) {
    this.originalSeed = this.hashCode(seed);
    this.seed = this.originalSeed;
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Reset to original seed for consistent generation
  reset(): void {
    this.seed = this.originalSeed;
  }

  next(): number {
    // Linear congruential generator with better parameters
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

const sampleExecutors = [
  'Alice Johnson', 'Bob Smith', 'Carol Davis', 'David Wilson', 
  'Emma Brown', 'Frank Miller', 'Grace Lee', 'Henry Taylor'
];

const sampleEnvironments = ['staging', 'production', 'development', 'testing'];
const sampleBrowsers = ['Chrome', 'Firefox', 'Safari', 'Edge'];

const sampleTestRunNames = [
  'Sprint 24.12 Regression',
  'Release 2.4.0 Testing',
  'Critical Bug Fixes',
  'User Acceptance Testing',
  'Performance Testing Round',
  'Security Testing Suite',
  'Mobile App Testing',
  'API Integration Tests'
];

function generateClosedTestRuns(
  projectId: string,
  rng: SeededRandom,
  totalTestCases: number,
  actualPassed: number,
  actualFailed: number,
  actualBlocked: number
): TestRun[] {
  // Only generate closed test runs if ALL tests are passed (no failed or blocked tests)
  if (actualFailed > 0 || actualBlocked > 0) {
    console.log(`🚫 Project ${projectId}: Not generating closed test runs - has ${actualFailed} failed and ${actualBlocked} blocked tests`);
    return [];
  }
  
  console.log(`✅ Project ${projectId}: All tests passed, generating closed test runs`);
  
  const closedRuns: TestRun[] = [];
  const runCount = rng.nextInt(2, 6); // 2-6 closed test runs
  
  for (let i = 0; i < runCount; i++) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - rng.nextInt(1, 12)); // Last 12 months
    startDate.setDate(rng.nextInt(1, 28));
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + rng.nextInt(3, 14)); // 3-14 days duration
    
    const closedDate = new Date(endDate);
    closedDate.setHours(closedDate.getHours() + rng.nextInt(1, 24));
    
    const runTestCases = Math.min(totalTestCases, rng.nextInt(5, Math.max(5, totalTestCases)));
    const passedTests = runTestCases; // All tests must pass for closed runs
    const failedTests = 0; // No failed tests in closed runs
    const blockedTests = 0; // No blocked tests in closed runs
    
    closedRuns.push({
      id: `run-${projectId}-${i + 1}`,
      projectId,
      name: sampleTestRunNames[rng.nextInt(0, sampleTestRunNames.length - 1)],
      description: `Closed test run with ${runTestCases} test cases`,
      status: 'closed',
      testCases: Array.from({ length: runTestCases }, (_, idx) => `tc-${idx + 1}`),
      startDate,
      endDate,
      closedDate,
      createdBy: sampleExecutors[rng.nextInt(0, sampleExecutors.length - 1)],
      createdAt: startDate,
      totalTests: runTestCases,
      passedTests,
      failedTests,
      blockedTests,
      progress: 100,
      passRate: 100 // Always 100% for closed runs
    });
  }
  
  return closedRuns.sort((a, b) => b.closedDate!.getTime() - a.closedDate!.getTime());
}

function generateClosedTestRunsData(closedRuns: TestRun[]): ClosedTestRunsData[] {
  const monthlyData: { [key: string]: ClosedTestRunsData } = {};
  
  // Initialize last 12 months
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentDate = new Date();
  
  for (let i = 11; i >= 0; i--) {
    const date = new Date(currentDate);
    date.setMonth(date.getMonth() - i);
    const monthKey = months[date.getMonth()];
    
    monthlyData[monthKey] = {
      month: monthKey,
      passed: 0,
      failed: 0,
      blocked: 0,
      total: 0
    };
  }
  
  // Aggregate data from closed test runs
  closedRuns.forEach(run => {
    if (run.closedDate) {
      const monthKey = months[run.closedDate.getMonth()];
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].passed += run.passedTests;
        monthlyData[monthKey].failed += run.failedTests;
        monthlyData[monthKey].blocked += run.blockedTests;
        monthlyData[monthKey].total += run.totalTests;
      }
    }
  });
  
  return Object.values(monthlyData);
}

export function generateProjectDashboardData(
  selectedProject: Project | null,
  allProjects: Project[]
): ProjectDashboardMetrics {
  console.log('🔍 Dashboard data generation:', { selectedProject, allProjects: allProjects.length });
  
  // Default fallback data
  const defaultData: ProjectDashboardMetrics = {
    totalProjects: allProjects.length || 3,
    activeProjects: allProjects.filter(p => p.status === 'active').length || 2,
    totalTestCases: 45,
    executionRate: 87,
    passRate: 84,
    failRate: 16,
    blockedRate: 0,
    actualPassed: 38,
    actualFailed: 7,
    actualBlocked: 0,
    trendsData: [
      { date: '2024-12-04', passed: 45, failed: 8, blocked: 2, total: 55 },
      { date: '2024-12-05', passed: 52, failed: 6, blocked: 1, total: 59 },
      { date: '2024-12-06', passed: 48, failed: 9, blocked: 3, total: 60 },
      { date: '2024-12-07', passed: 58, failed: 5, blocked: 2, total: 65 },
      { date: '2024-12-08', passed: 62, failed: 4, blocked: 1, total: 67 },
      { date: '2024-12-09', passed: 55, failed: 7, blocked: 2, total: 64 },
      { date: '2024-12-10', passed: 61, failed: 3, blocked: 1, total: 65 }
    ],
    recentExecutions: [],
    closedTestRuns: [],
    closedTestRunsData: [],
    automationDistribution: {
      notAutomated: 30,
      automated: 15,
      notRequired: 0,
      cannotAutomate: 0,
      obsolete: 0,
    },
    testTypeDistribution: {
      functional: 27,
      other: 18
    }
  };

  // If no projects at all, return default data
  if (!allProjects || allProjects.length === 0) {
    console.log('⚠️ No projects found, using default data');
    return defaultData;
  }

  // Use aggregated data from all projects if no specific project is selected
  if (!selectedProject) {
    console.log('📊 No project selected, aggregating all projects');
    const totalTestCases = allProjects.reduce((sum, project) => sum + (project.testCasesCount || 0), 0);
    const totalPassed = allProjects.reduce((sum, project) => sum + (project.testsPassedCount || 0), 0);
    const totalFailed = allProjects.reduce((sum, project) => sum + (project.testsFailedCount || 0), 0);
    
    const executionRate = totalTestCases > 0 ? Math.round(((totalPassed + totalFailed) / totalTestCases) * 100) : 0;
    const passRate = (totalPassed + totalFailed) > 0 ? Math.round((totalPassed / (totalPassed + totalFailed)) * 100) : 0;
    const failRate = 100 - passRate;
    
    return {
      ...defaultData,
      totalProjects: allProjects.length,
      activeProjects: allProjects.filter(project => project.status === 'active').length,
      totalTestCases: totalTestCases || defaultData.totalTestCases,
      actualPassed: totalPassed,
      actualFailed: totalFailed,
      actualBlocked: 0,
      executionRate: executionRate || defaultData.executionRate,
      passRate: passRate || defaultData.passRate,
      failRate: failRate || defaultData.failRate,
      blockedRate: 0,
      automationDistribution: {
        notAutomated: Math.floor(totalTestCases * 0.67),
        automated: Math.floor(totalTestCases * 0.33),
        notRequired: 0,
        cannotAutomate: 0,
        obsolete: 0,
      },
      testTypeDistribution: {
        functional: Math.floor(totalTestCases * 0.6),
        other: Math.floor(totalTestCases * 0.4)
      }
    };
  }
  
  console.log('🎯 Selected project data:', {
    id: selectedProject.id,
    name: selectedProject.name,
    testCasesCount: selectedProject.testCasesCount,
    testsPassedCount: selectedProject.testsPassedCount,
    testsFailedCount: selectedProject.testsFailedCount
  });

  // Generate seeded random data based on project characteristics
  const rng = new SeededRandom(`${selectedProject.id}-${selectedProject.name}`);
  
  // Use real project data as base, with fallbacks
  const totalTestCases = selectedProject.testCasesCount || 0;
  
  // CONSISTENCY FIX: Ensure all mocked data is based on REAL totalTestCases
  if (totalTestCases === 0) {
    // No test cases = no executions possible
    return {
      totalProjects: allProjects.length,
      activeProjects: allProjects.filter(project => project.status === 'active').length,
      totalTestCases: 0,
      actualPassed: 0,
      actualFailed: 0,
      actualBlocked: 0,
      executionRate: 0,
      passRate: 0,
      failRate: 0,
      blockedRate: 0,
      trendsData: [],
      recentExecutions: [],
      closedTestRuns: [],
      closedTestRunsData: [],
      automationDistribution: {
        notAutomated: 0,
        automated: 0,
        notRequired: 0,
        cannotAutomate: 0,
        obsolete: 0,
      },
      testTypeDistribution: {
        functional: 0,
        other: 0
      }
    };
  }

  // CONSISTENCY: Generate execution data that NEVER exceeds totalTestCases
  const maxExecutable = totalTestCases;
  const executedCount = Math.min(maxExecutable, Math.floor(totalTestCases * rng.nextFloat(0.6, 0.9))); // 60-90% executed
  const realPassed = Math.floor(executedCount * rng.nextFloat(0.7, 0.85)); // 70-85% pass rate
  const realFailed = Math.floor((executedCount - realPassed) * rng.nextFloat(0.6, 0.9)); // Some failures
  const realBlocked = Math.max(0, executedCount - realPassed - realFailed); // Rest blocked

  // CONSISTENCY: Ensure totals never exceed limits
  const finalPassed = Math.min(realPassed, totalTestCases);
  const finalFailed = Math.min(realFailed, totalTestCases - finalPassed);
  const finalBlocked = Math.min(realBlocked, totalTestCases - finalPassed - finalFailed);
  const finalExecuted = finalPassed + finalFailed + finalBlocked;

  // Calculate rates based on CONSISTENT data
  const executionRate = totalTestCases > 0 ? Math.round((finalExecuted / totalTestCases) * 100) : 0;
  const passRate = finalExecuted > 0 ? Math.round((finalPassed / finalExecuted) * 100) : 0;
  const failRate = finalExecuted > 0 ? Math.round((finalFailed / finalExecuted) * 100) : 0;
  const blockedRate = finalExecuted > 0 ? Math.round((finalBlocked / finalExecuted) * 100) : 0;

  console.log('📈 CONSISTENT execution data:', {
    totalTestCases,
    executed: finalExecuted,
    passed: finalPassed,
    failed: finalFailed,
    blocked: finalBlocked,
    passRate,
    failRate,
    blockedRate,
    executionRate
  });

  // CONSISTENCY: Automation distribution based on REAL totalTestCases
  const automatedCount = Math.floor(totalTestCases * rng.nextFloat(0.2, 0.4)); // 20-40% automated
  const notAutomatedCount = totalTestCases - automatedCount;

  // CONSISTENCY: Test type distribution based on REAL totalTestCases  
  const functionalCount = Math.floor(totalTestCases * rng.nextFloat(0.55, 0.65)); // 55-65% functional
  // const otherCount = Math.max(0, totalTestCases - functionalCount); // Remainder to ensure exact total
  
  // Ensure non-negative values
  const actualFunctionalCount = Math.max(0, Math.min(functionalCount, totalTestCases));
  const actualOtherCount = totalTestCases - actualFunctionalCount; // Force exact total
  
  console.log('🧮 FIXED Test type distribution:', {
    totalTestCases,
    functional: actualFunctionalCount,
    other: actualOtherCount,
    sum: actualFunctionalCount + actualOtherCount,
    shouldEqual: totalTestCases,
    isConsistent: (actualFunctionalCount + actualOtherCount) === totalTestCases
  });

  // Generate trends data (7 days) - CONSISTENT with actual execution counts
  const trendsData: TrendData[] = [];
  const today = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Distribute ACTUAL counts across days
    const basePassedPerDay = Math.floor(finalPassed / 7);
    const baseFailedPerDay = Math.floor(finalFailed / 7);
    const baseBlockedPerDay = Math.floor(finalBlocked / 7);
    
    // Add remainder to first few days
    const passedRemainder = finalPassed % 7;
    const failedRemainder = finalFailed % 7;
    const blockedRemainder = finalBlocked % 7;
    
    const dailyPassed = basePassedPerDay + (i < passedRemainder ? 1 : 0);
    const dailyFailed = baseFailedPerDay + (i < failedRemainder ? 1 : 0);
    const dailyBlocked = baseBlockedPerDay + (i < blockedRemainder ? 1 : 0);
    const dailyTotal = dailyPassed + dailyFailed + dailyBlocked;
    
    trendsData.push({
      date: date.toISOString().split('T')[0],
      passed: dailyPassed,
      failed: dailyFailed,
      blocked: dailyBlocked,
      total: dailyTotal
    });
  }
  
  // Generate recent executions - CONSISTENT with execution counts
  const recentExecutions: TestExecution[] = [];
  const executionCount = Math.min(finalExecuted, rng.nextInt(5, 12));
  
  for (let i = 0; i < executionCount; i++) {
    const weights = [passRate, failRate, blockedRate];
    
    // Weighted random selection
    const randomValue = rng.nextFloat(0, 100);
    let selectedStatus: 'passed' | 'failed' | 'blocked' = 'passed';
    
    if (randomValue < weights[0]) {
      selectedStatus = 'passed';
    } else if (randomValue < weights[0] + weights[1]) {
      selectedStatus = 'failed';
    } else {
      selectedStatus = 'blocked';
    }
    
    const executedAt = new Date();
    executedAt.setHours(executedAt.getHours() - rng.nextInt(1, 72)); // Last 3 days
    
    recentExecutions.push({
      id: `exec-${i + 1}`,
      projectId: selectedProject.id,
      testCaseId: `${rng.nextInt(1, totalTestCases)}`,
      status: selectedStatus,
      executedBy: sampleExecutors[rng.nextInt(0, sampleExecutors.length - 1)],
      executedAt,
      duration: rng.nextInt(2, 15),
      notes: selectedStatus === 'failed' ? 'Test failed due to timeout' : undefined,
      environment: sampleEnvironments[rng.nextInt(0, sampleEnvironments.length - 1)],
      browser: sampleBrowsers[rng.nextInt(0, sampleBrowsers.length - 1)],
      version: `${rng.nextInt(100, 130)}.0`
    });
  }
  
  // Sort recent executions by date (most recent first)
  recentExecutions.sort((a, b) => 
    (b.executedAt?.getTime() || 0) - (a.executedAt?.getTime() || 0)
  );
  
  // Generate closed test runs - CONSISTENT with execution data
  const closedTestRuns = generateClosedTestRuns(selectedProject.id, rng, totalTestCases, finalPassed, finalFailed, finalBlocked);
  const closedTestRunsData = generateClosedTestRunsData(closedTestRuns);
  
  const result = {
    totalProjects: allProjects.length,
    activeProjects: allProjects.filter(project => project.status === 'active').length,
    totalTestCases,
    actualPassed: finalPassed,
    actualFailed: finalFailed,
    actualBlocked: finalBlocked,
    executionRate,
    passRate,
    failRate,
    blockedRate,
    trendsData,
    recentExecutions,
    closedTestRuns,
    closedTestRunsData,
    automationDistribution: {
      notAutomated: notAutomatedCount,
      automated: automatedCount,
      notRequired: 0,
      cannotAutomate: 0,
      obsolete: 0,
    },
    testTypeDistribution: {
      functional: actualFunctionalCount,
      other: actualOtherCount
    }
  };

  console.log('✅ CONSISTENT dashboard data:', result);
  return result;
}