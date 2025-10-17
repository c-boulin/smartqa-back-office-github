import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  delay?: number;
}

const Tooltip: React.FC<TooltipProps> = ({ content, children, delay = 300 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const timeoutRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();

      // Position below the element, centered
      const top = rect.bottom + 8;
      const left = rect.left + rect.width / 2;

      setPosition({ top, left });
    }
  };

  const handleMouseEnter = () => {
    updatePosition();
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    if (isVisible) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);

      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isVisible]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <div
        ref={containerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="w-full"
      >
        {children}
      </div>
      {isVisible && content && createPortal(
        <div
          className="fixed z-[9999] px-3 py-2 text-sm text-white bg-slate-800 border border-slate-700 rounded-lg shadow-xl pointer-events-none max-w-xs break-words animate-in fade-in duration-200"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform: 'translateX(-50%)',
            whiteSpace: 'pre-line',
          }}
        >
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[6px] border-transparent border-b-slate-700"></div>
          {content}
        </div>,
        document.body
      )}
    </>
  );
};

export default Tooltip;
