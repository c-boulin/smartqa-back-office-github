import React from 'react';

interface SectionToolbarProps {
  children: React.ReactNode;
  /** When true, spreads toolbar items to both ends (e.g. meta label on the right). */
  split?: boolean;
}

/**
 * Horizontal toolbar row under a section heading (filters, view hints, etc.).
 */
export const SectionToolbar: React.FC<SectionToolbarProps> = ({ children, split }) => {
  return (
    <div
      className={`flex flex-wrap items-center gap-4 ${split ? 'justify-between' : ''}`}
      role="toolbar"
    >
      {children}
    </div>
  );
};
