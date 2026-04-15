import React from 'react';

interface StatusBoardProps {
  children: React.ReactNode;
}

/**
 * Vertical stack of failed/passed groups.
 */
export const StatusBoard: React.FC<StatusBoardProps> = ({ children }) => {
  return <div className="space-y-10">{children}</div>;
};
