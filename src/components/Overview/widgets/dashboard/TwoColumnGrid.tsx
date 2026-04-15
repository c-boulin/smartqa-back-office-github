import React from 'react';

interface TwoColumnGridProps {
  children: React.ReactNode;
}

/**
 * Responsive two-column layout for paired charts or cards.
 */
export const TwoColumnGrid: React.FC<TwoColumnGridProps> = ({ children }) => {
  return <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-6">{children}</div>;
};
