interface ExecutionData {
  runNumber: number;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  defects: {
    productBug: number;
    autoBug: number;
    systemIssue: number;
    toInvestigate: number;
  };
  startTime: string;
  duration: string;
  user: string;
  browser: string;
  device: string;
}

interface TestCase {
  id: string;
  methodType: string;
  name: string;
  status: 'Passed' | 'Failed';
  startTime: string;
  defectType?: string;
  duration: string;
}

interface LogEntry {
  message: string;
  timestamp: string;
}

interface ExecutionStep {
  id: string;
  type: 'SETUP' | 'KEYWORD' | 'TEARDOWN';
  message: string;
  status: 'PASSED' | 'FAILED';
  duration: string;
  attachments?: number;
  logs: LogEntry[];
  isExpanded: boolean;
}

const seededRandom = (seed: string): number => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const x = Math.sin(Math.abs(hash)) * 10000;
  return x - Math.floor(x);
};

const seededRandomRange = (seed: string, min: number, max: number): number => {
  return Math.floor(seededRandom(seed) * (max - min + 1)) + min;
};

export const generateExecutionData = (projectId: string): ExecutionData => {
  const seed = `exec-${projectId}`;
  const runNumber = seededRandomRange(`${seed}-run`, 100, 1000);
  const total = seededRandomRange(`${seed}-total`, 3, 8);
  const passed = seededRandomRange(`${seed}-passed`, Math.floor(total * 0.6), total);
  const failed = total - passed;

  const defects = {
    productBug: seededRandom(`${seed}-pb`) > 0.7 ? seededRandomRange(`${seed}-pb-val`, 0, 3) : 0,
    autoBug: seededRandom(`${seed}-ab`) > 0.7 ? seededRandomRange(`${seed}-ab-val`, 0, 2) : 0,
    systemIssue: seededRandom(`${seed}-si`) > 0.8 ? seededRandomRange(`${seed}-si-val`, 0, 2) : 0,
    toInvestigate: seededRandom(`${seed}-ti`) > 0.8 ? seededRandomRange(`${seed}-ti-val`, 0, 2) : 0
  };

  const timeOptions = [
    '52 minutes ago',
    '1 hour ago',
    '2 hours ago',
    '3 hours ago',
    '5 hours ago'
  ];

  const timeIndex = seededRandomRange(`${seed}-time`, 0, timeOptions.length - 1);
  const minutes = seededRandomRange(`${seed}-min`, 1, 5);
  const seconds = seededRandomRange(`${seed}-sec`, 0, 59);

  return {
    runNumber,
    total,
    passed,
    failed,
    skipped: 0,
    defects,
    startTime: timeOptions[timeIndex],
    duration: `${minutes}m ${seconds}s`,
    user: 'qa_staff',
    browser: 'chrome',
    device: 'android10_galaxys9'
  };
};

export const generateTestCases = (projectId: string): TestCase[] => {
  const testNames = [
    'Sign In Page Unlogged',
    'Sign In Page Logged',
    'Check Account Page No Subscribe',
    'Home page Navigation',
    'Check Included Content User As Subscribed',
    'TEARDOWN TestPlayvod.Close All ()'
  ];

  const methodTypes = ['Test', 'Test', 'Test', 'Test', 'Test', 'After suite'];

  const executionData = generateExecutionData(projectId);
  const count = executionData.total;

  return testNames.slice(0, count).map((name, index) => {
    const seed = `tc-${projectId}-${index}`;
    const isPassed = index < executionData.passed;
    const minutes = seededRandomRange(`${seed}-min`, 0, 1);
    const seconds = seededRandomRange(`${seed}-sec`, 10, 59);

    return {
      id: `tc-${index}`,
      methodType: methodTypes[index] || 'Test',
      name,
      status: isPassed ? 'Passed' : 'Failed',
      startTime: `${52 - index} minutes ago`,
      duration: minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`
    };
  });
};

const generateMockLogs = (stepType: string, testCaseId: string, stepId: string): LogEntry[] => {
  const baseTime = new Date();
  baseTime.setHours(8, 44, 11);

  const seed = `${testCaseId}-${stepId}`;
  const baseSeconds = seededRandomRange(seed, 0, 30);

  const logTemplates = {
    SETUP: [
      'Opening url https://www.playvod.com/',
      'Element xpath //*[@id="didomi-notice-agree-button"] found. Click using javascript',
      'Element xpath //*[@id="onesignal-slidedown-cancel-button"] found. Click using javascript'
    ],
    KEYWORD: [
      'Wait until element "//*[@data-mipqa="link-useraccess-button"]" is located',
      'scroll into view the xpath: //*[@data-mipqa="link-useraccess-button"]',
      'Click element xpath //*[@data-mipqa="link-useraccess-button"] using javascript',
      'Check sign in elements',
      'Page contains element xpath //*[@data-mipqa="signin-title"]',
      'Page contains element xpath //*[@data-mipqa="back-arrow-button"]',
      'Page contains element xpath //*[@data-mipqa="login-user-input"]',
      'Page contains element xpath //*[@data-mipqa="login-pwd-input"]',
      'Page contains element xpath //*[@data-mipqa="login-confirm-button"]',
      'Page contains element xpath //*[@data-mipqa="login-sub-btn-button"]'
    ],
    TEARDOWN: [
      'Closing browser session',
      'Cleanup completed successfully'
    ]
  };

  const logs = logTemplates[stepType] || logTemplates.KEYWORD;

  return logs.map((message, index) => {
    const timestamp = new Date(baseTime);
    timestamp.setSeconds(timestamp.getSeconds() + baseSeconds + (index * 2));
    return {
      message,
      timestamp: timestamp.toISOString().replace('T', ' ').substring(0, 19)
    };
  });
};

export const generateExecutionSteps = (projectId: string, testCaseId: string): ExecutionStep[] => {
  const testCases = generateTestCases(projectId);
  const testCase = testCases.find(tc => tc.id === testCaseId);
  const testCaseIndex = parseInt(testCaseId.split('-')[1]);

  const stepDefinitions = [
    {
      type: 'SETUP' as const,
      message: 'TestPlayvod.Page Setup ()',
      baseDuration: 10
    },
    {
      type: 'KEYWORD' as const,
      message: 'TestPlayvod.Check Sign In Page ()',
      baseDuration: 1
    },
    {
      type: 'KEYWORD' as const,
      message: 'TestPlayvod.Check Error Email Txt ()',
      baseDuration: 1
    },
    {
      type: 'KEYWORD' as const,
      message: 'TestPlayvod.Check Forgot Pwd Page ()',
      baseDuration: 0.92
    },
    {
      type: 'KEYWORD' as const,
      message: 'TestPlayvod.Check Signup Page ()',
      baseDuration: 1
    },
    {
      type: 'TEARDOWN' as const,
      message: 'TestPlayvod.Finish Test ()',
      baseDuration: 1,
      hasAttachments: true
    }
  ];

  return stepDefinitions.map((stepDef, index) => {
    const stepId = `step-${testCaseIndex}-${index}`;
    const seed = `${projectId}-${testCaseId}-${stepId}`;

    const status = testCase?.status === 'Failed' && index === 3 ? 'FAILED' : 'PASSED';
    const duration = stepDef.baseDuration >= 1
      ? `${Math.floor(stepDef.baseDuration)}s`
      : `${stepDef.baseDuration}s`;

    return {
      id: stepId,
      type: stepDef.type,
      message: stepDef.message,
      status: status as 'PASSED' | 'FAILED',
      duration,
      attachments: stepDef.hasAttachments ? 1 : undefined,
      logs: generateMockLogs(stepDef.type, testCaseId, stepId),
      isExpanded: false
    };
  });
};

export const automatedExecutionMockService = {
  generateExecutionData,
  generateTestCases,
  generateExecutionSteps
};
