export const getTestTypeString = (typeNumber: number): string => {
  const typeMap: { [key: number]: string } = {
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
  };

  return typeMap[typeNumber] || 'functional';
};

export const getPriorityNumber = (priority: string): number => {
  const priorityMap = { 'low': 4, 'medium': 1, 'high': 3, 'critical': 2 };
  return priorityMap[priority as keyof typeof priorityMap] || 1;
};
