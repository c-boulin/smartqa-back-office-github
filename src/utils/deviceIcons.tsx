import React from 'react';

export const getDeviceIcon = (label: string): React.ReactElement => {
  const lowerLabel = label.toLowerCase();

  if (lowerLabel.includes('iphone') || lowerLabel.includes('ios') || lowerLabel.includes('ipad') || lowerLabel.includes('mac')) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
      </svg>
    );
  }

  if (lowerLabel.includes('android') || lowerLabel.includes('samsung') ||
      lowerLabel.includes('pixel') || lowerLabel.includes('galaxy')) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
        <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24a11.5 11.5 0 0 0-8.94 0L5.65 5.67c-.19-.28-.54-.37-.83-.22-.3.16-.42.54-.26.85l1.84 3.18C4.17 11.1 2.5 14.2 2.5 17.5h19c0-3.3-1.67-6.4-3.9-8.02zM7 15.25c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25zm10 0c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25z"/>
      </svg>
    );
  }

  if (lowerLabel.includes('windows') || lowerLabel.includes('pc')) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
        <path d="M3 5.45v6.1l6.95 1V5.45L3 5.45zm7.45 6.56v7.05l6.95.94v-8l-6.95.01zm-7.45.49v6.56l6.95.94v-7.5H3zm17.45-.49v8l-6.95-.94v-7.05l6.95-.01z"/>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  );
};

export const getDeviceColor = (label: string): string => {
  const lowerLabel = label.toLowerCase();

  if (lowerLabel.includes('iphone') || lowerLabel.includes('ios') || lowerLabel.includes('ipad')) {
    return 'text-gray-300';
  }

  if (lowerLabel.includes('mac')) {
    return 'text-gray-300';
  }

  if (lowerLabel.includes('android') || lowerLabel.includes('samsung') ||
      lowerLabel.includes('pixel') || lowerLabel.includes('galaxy')) {
    return 'text-green-400';
  }

  if (lowerLabel.includes('windows') || lowerLabel.includes('pc')) {
    return 'text-cyan-400';
  }

  return 'text-orange-400';
};
