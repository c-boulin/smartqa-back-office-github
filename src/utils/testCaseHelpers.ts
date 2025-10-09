// Helper functions for test case data transformations

export const getPriorityString = (priority: number): 'low' | 'medium' | 'high' | 'critical' => {
  const priorityMap = { 1: 'low', 2: 'medium', 3: 'high', 4: 'critical' } as const;
  return priorityMap[priority as keyof typeof priorityMap] || 'medium';
};

export const getTestTypeString = (type: number): 'other' | 'acceptance' | 'accessibility' | 'compatibility' | 'destructive' | 'functional' | 'performance' | 'regression' | 'security' | 'smoke' | 'usability' => {
  const typeMap = {
    1: 'other',
    2: 'acceptance',
    3: 'accessibility',
    4: 'compatibility',
    5: 'destructive',
    6: 'functional',
    7: 'performance',
    8: 'regression',
    9: 'security',
    10: 'smoke',
    11: 'usability'
  } as const;
  return typeMap[type as keyof typeof typeMap] || 'other';
};

export const getStatusString = (state: number): 'draft' | 'active' | 'deprecated' => {
  const stateMap = { 1: 'active', 2: 'draft', 4: 'deprecated' } as const;
  return stateMap[state as keyof typeof stateMap] || 'draft';
};

export const getPriorityNumber = (priority: 'low' | 'medium' | 'high' | 'critical'): number => {
  const priorityMap = { 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };
  return priorityMap[priority];
};

export const getTestTypeNumber = (type: string): number => {
  const typeMap: Record<string, number> = {
    'other': 1,
    'acceptance': 2,
    'accessibility': 3,
    'compatibility': 4,
    'destructive': 5,
    'functional': 6,
    'performance': 7,
    'regression': 8,
    'security': 9,
    'smoke': 10,
    'usability': 11
  };
  return typeMap[type] || 6; // Default to functional
};