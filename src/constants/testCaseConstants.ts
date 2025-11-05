import { CheckCircle, Edit, Eye, Clock, XCircle, AlertTriangle, Target, Shield, Flame } from 'lucide-react';

// Mappings constants
export const TEMPLATES = {
  1: 'Test Case Steps',
  2: 'Test Case Bdd'
} as const;

export const STATES = {
  1: { label: 'Active', icon: CheckCircle, color: 'text-green-400' },
  2: { label: 'Draft', icon: Edit, color: 'text-orange-400' },
  3: { label: 'In Review', icon: Eye, color: 'text-blue-400' },
  4: { label: 'Outdated', icon: Clock, color: 'text-gray-400' },
  5: { label: 'Rejected', icon: XCircle, color: 'text-red-400' }
} as const;

export const PRIORITIES = {
  1: { label: 'Medium', icon: Target, color: 'text-yellow-400' },
  2: { label: 'Critical', icon: AlertTriangle, color: 'text-red-500' },
  3: { label: 'High', icon: Flame, color: 'text-orange-500' },
  4: { label: 'Low', icon: Shield, color: 'text-green-400' }
} as const;

export const TEST_CASE_TYPES = {
  1: 'Other',
  2: 'Acceptance',
  3: 'Accessibility',
  4: 'Compatibility',
  5: 'Destructive',
  6: 'Functional',
  7: 'Performance',
  8: 'Regression',
  9: 'Security',
  10: 'Smoke & Sanity',
  11: 'Usability'
} as const;

export const AUTOMATION_STATUS = {
  1: 'Not automated',
  2: 'Automated',
  3: 'Automation not required',
  4: 'Cannot be automated',
  5: 'Obsolete'
} as const;