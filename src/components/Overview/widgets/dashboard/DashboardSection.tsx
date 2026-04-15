import React from 'react';
import { Bug, FileBarChart, Layers } from 'lucide-react';
import WidgetShell from '../WidgetShell';

const SECTION_ICONS = {
  report: FileBarChart,
  service: Layers,
  bug: Bug,
} as const;

export type DashboardSectionIcon = keyof typeof SECTION_ICONS;

interface DashboardSectionProps {
  title: string;
  description: string;
  icon: DashboardSectionIcon;
  /** Passed through to the shell title bar (e.g. navy for service execution). */
  titleBarClassName?: string;
  children: React.ReactNode;
}

/**
 * One widget block: dark stats tile (title + description), then children should use
 * {@link WidgetContentHeader} (grey strip) and {@link WidgetContentBody} (white area).
 */
export const DashboardSection: React.FC<DashboardSectionProps> = ({
  title,
  description,
  icon,
  titleBarClassName,
  children,
}) => {
  const Icon = SECTION_ICONS[icon];

  return (
    <WidgetShell
      title={title}
      subtitle={description}
      titleBarClassName={titleBarClassName}
      icon={<Icon className="w-5 h-5 shrink-0 text-cyan-400" aria-hidden />}
    >
      {children}
    </WidgetShell>
  );
};
