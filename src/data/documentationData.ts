import {
  FolderOpen,
  TestTube,
  Play,
  BarChart2,
  Download,
  Cpu,
  Tag,
  LayoutDashboard,
  Lightbulb,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface DocSection {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: LucideIcon;
  color: string;
}

export const DOC_SECTIONS: DocSection[] = [
  {
    id: 'projects-management',
    title: 'Projects Management',
    subtitle: 'Organize and Control Your Testing Initiatives',
    description: 'Create, organize, and manage all your testing projects in one place.',
    icon: FolderOpen,
    color: 'cyan',
  },
  {
    id: 'test-cases',
    title: 'Test Cases',
    subtitle: 'Define What Needs to Be Tested',
    description: 'Define, document, and organize the scenarios that need to be tested.',
    icon: TestTube,
    color: 'blue',
  },
  {
    id: 'test-execution',
    title: 'Test Execution',
    subtitle: 'Turn Test Cases into Real Results',
    description: 'Run your test cases and capture execution results in a clear, trackable way.',
    icon: Play,
    color: 'green',
  },
  {
    id: 'reports-analytics',
    title: 'Reports & Analytics',
    subtitle: 'Transform Testing into Insight',
    description: 'Transform execution data into meaningful insights and shareable summaries.',
    icon: BarChart2,
    color: 'amber',
  },
  {
    id: 'downloading-reports',
    title: 'Downloading Reports',
    subtitle: 'Share Results with the Right Format',
    description: 'Export your testing results in the format that best fits your audience and workflow.',
    icon: Download,
    color: 'orange',
  },
  {
    id: 'automated-configuration',
    title: 'Automated Configuration',
    subtitle: 'Define Your Testing Environment',
    description: 'Set up environments and parameters needed for automated testing.',
    icon: Cpu,
    color: 'rose',
  },
  {
    id: 'tags-organization',
    title: 'Tags & Organization',
    subtitle: 'Improve Searchability & Reporting',
    description: 'Use tags to classify, group, and filter testing content more effectively.',
    icon: Tag,
    color: 'violet',
  },
  {
    id: 'dashboard-overview',
    title: 'Dashboard Overview',
    subtitle: 'Real-Time Project Health',
    description: 'Get a high-level view of your testing activity through key metrics and visual summaries.',
    icon: LayoutDashboard,
    color: 'teal',
  },
  {
    id: 'best-practices',
    title: 'Best Practices',
    subtitle: 'Build Structured and Reliable QA Workflows',
    description: 'Discover practical recommendations for building a more efficient and reliable QA workflow.',
    icon: Lightbulb,
    color: 'sky',
  },
];

export const COLOR_MAP: Record<string, { bg: string; text: string; border: string; iconBg: string }> = {
  cyan:   { bg: 'bg-cyan-500/10',    text: 'text-cyan-600 dark:text-cyan-400',    border: 'border-cyan-500/20',   iconBg: 'bg-cyan-500/15 dark:bg-cyan-500/20' },
  blue:   { bg: 'bg-blue-500/10',    text: 'text-blue-600 dark:text-blue-400',    border: 'border-blue-500/20',   iconBg: 'bg-blue-500/15 dark:bg-blue-500/20' },
  green:  { bg: 'bg-green-500/10',   text: 'text-green-600 dark:text-green-400',  border: 'border-green-500/20',  iconBg: 'bg-green-500/15 dark:bg-green-500/20' },
  amber:  { bg: 'bg-amber-500/10',   text: 'text-amber-600 dark:text-amber-400',  border: 'border-amber-500/20',  iconBg: 'bg-amber-500/15 dark:bg-amber-500/20' },
  orange: { bg: 'bg-orange-500/10',  text: 'text-orange-600 dark:text-orange-400',border: 'border-orange-500/20', iconBg: 'bg-orange-500/15 dark:bg-orange-500/20' },
  rose:   { bg: 'bg-rose-500/10',    text: 'text-rose-600 dark:text-rose-400',    border: 'border-rose-500/20',   iconBg: 'bg-rose-500/15 dark:bg-rose-500/20' },
  violet: { bg: 'bg-violet-500/10',  text: 'text-violet-600 dark:text-violet-400',border: 'border-violet-500/20', iconBg: 'bg-violet-500/15 dark:bg-violet-500/20' },
  teal:   { bg: 'bg-teal-500/10',    text: 'text-teal-600 dark:text-teal-400',    border: 'border-teal-500/20',   iconBg: 'bg-teal-500/15 dark:bg-teal-500/20' },
  sky:    { bg: 'bg-sky-500/10',     text: 'text-sky-600 dark:text-sky-400',      border: 'border-sky-500/20',    iconBg: 'bg-sky-500/15 dark:bg-sky-500/20' },
};
