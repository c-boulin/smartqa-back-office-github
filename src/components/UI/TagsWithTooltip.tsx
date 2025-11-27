import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Tag as TagIcon } from 'lucide-react';

interface TagsWithTooltipProps {
  tags: string[];
  maxVisible?: number;
  className?: string;
}

const TagsWithTooltip: React.FC<TagsWithTooltipProps> = ({
  tags,
  maxVisible = 2,
  className = ''
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({
    top: 0,
    left: 0,
    arrowPosition: 'bottom' as 'top' | 'bottom',
    arrowLeft: '50%'
  });
  const triggerRef = useRef<HTMLSpanElement>(null);

  const calculateTooltipPosition = useCallback(() => {
    if (!triggerRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    
    const tooltipWidth = 260;
    const tooltipHeight = 100;
    // const arrowSize = 8;
    const spacing = 4; // Minimal distance from trigger element
    const viewportMargin = 8;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate horizontal position - align tooltip to trigger element
    const triggerCenterX = triggerRect.left + (triggerRect.width / 2);
    let left = triggerCenterX - (tooltipWidth / 2);
    let arrowLeft = '50%';

    // Keep tooltip within viewport bounds
    if (left < viewportMargin) {
      left = viewportMargin;
      const arrowPosition = ((triggerCenterX - left) / tooltipWidth) * 100;
      arrowLeft = `${Math.max(15, Math.min(85, arrowPosition))}%`;
    }

    if (left + tooltipWidth > viewportWidth - viewportMargin) {
      left = viewportWidth - tooltipWidth - viewportMargin;
      const arrowPosition = ((triggerCenterX - left) / tooltipWidth) * 100;
      arrowLeft = `${Math.max(15, Math.min(85, arrowPosition))}%`;
    }

    // Calculate vertical position - prefer below the trigger element for table context
    let top = triggerRect.bottom + spacing;
    let arrowPosition: 'top' | 'bottom' = 'top';

    // If not enough space below, position above the trigger
    if (top + tooltipHeight > viewportHeight - viewportMargin) {
      top = triggerRect.top - tooltipHeight - spacing;
      arrowPosition = 'bottom';
    }

    // Final boundary check to ensure tooltip stays in viewport
    if (top < viewportMargin) {
      top = viewportMargin;
    }
    if (top + tooltipHeight > viewportHeight - viewportMargin) {
      top = viewportHeight - tooltipHeight - viewportMargin;
    }


    setTooltipPosition({
      top,
      left,
      arrowPosition,
      arrowLeft
    });
  }, []);

  // Update tooltip position when it becomes visible
  useEffect(() => {
    if (showTooltip) {
      calculateTooltipPosition();
    }
  }, [showTooltip, calculateTooltipPosition]);

  // Recalculate position on window resize or scroll
  useEffect(() => {
    if (showTooltip) {
      const handleResize = () => calculateTooltipPosition();
      const handleScroll = () => calculateTooltipPosition();

      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll, true);

      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [showTooltip, calculateTooltipPosition]);

  if (!Array.isArray(tags) || tags.length === 0) {
    return (
      <span className="text-slate-500 dark:text-gray-500 text-xs">No tags</span>
    );
  }

  const visibleTags = tags.slice(0, maxVisible);
  const hiddenTags = tags.slice(maxVisible);
  const hasHiddenTags = hiddenTags.length > 0;

  const handleMouseEnter = () => {
    if (hasHiddenTags) {
      setShowTooltip(true);
    }
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  return (
    <div className={`flex flex-wrap gap-1 relative ${className}`}>
      {visibleTags.map((tag, index) => (
        <span
          key={index}
          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30"
        >
          <TagIcon className="w-3 h-3 mr-1" />
          {tag}
        </span>
      ))}

      {/* "+X more" indicator with tooltip */}
      {hasHiddenTags && (
        <div className="relative">
          <span
            ref={triggerRef}
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-slate-600 border border-gray-500/30 cursor-help hover:bg-gray-500/30 hover:text-slate-700 dark:text-gray-300 transition-colors relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            aria-label={`${hiddenTags.length} more tags: ${hiddenTags.join(', ')}`}
            title="" // Remove browser default tooltip
          >
            +{hiddenTags.length}
          </span>

          {/* Tooltip */}
          {showTooltip && (
            createPortal(
              <div
                className="bg-slate-800 border border-slate-600 rounded-lg shadow-2xl p-3 pointer-events-none"
                style={{
                  position: 'fixed',
                  top: tooltipPosition.top,
                  left: tooltipPosition.left,
                  zIndex: 99999,
                  width: '280px',
                  transform: 'translateZ(0)', // Force hardware acceleration
                  willChange: 'transform'
                }}
              >
                <div className="text-xs text-cyan-400 font-medium mb-1.5">
                  Additional Tags ({hiddenTags.length})
                </div>
                <div className="space-y-0.5">
                  {hiddenTags.map((tag, index) => (
                    <div key={index} className="flex items-center text-xs text-slate-700 dark:text-gray-300">
                      <TagIcon className="w-3 h-3 mr-2 text-slate-600 dark:text-gray-400 flex-shrink-0" />
                      <span className="truncate">{tag}</span>
                    </div>
                  ))}
                </div>
                {/* Tooltip arrow */}
                <div 
                  className={`absolute w-2 h-2 bg-slate-800 border-slate-600 ${
                    tooltipPosition.arrowPosition === 'bottom' 
                      ? '-bottom-1 border-r border-b transform rotate-45' 
                      : '-top-1 border-l border-t transform rotate-45'
                  }`}
                  style={{
                    left: tooltipPosition.arrowLeft,
                    transform: tooltipPosition.arrowPosition === 'bottom' 
                      ? 'translateX(-50%) rotate(45deg)' 
                      : 'translateX(-50%) rotate(45deg)'
                  }}
                />
              </div>,
              document.body
            )
          )}
        </div>
      )}
    </div>
  );
};

export default TagsWithTooltip;