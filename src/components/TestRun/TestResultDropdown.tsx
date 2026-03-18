import React, { useState, useEffect, useRef } from 'react';
import { Loader, MessageSquare } from 'lucide-react';
import { TEST_RESULTS, TestResultId } from '../../types';
import Tooltip from '../UI/Tooltip';

interface TestResultDropdownProps {
  value: TestResultId;
  onChange: (value: TestResultId, comment?: string) => void;
  disabled?: boolean;
  isUpdating?: boolean;
  testCaseTitle?: string;
  onOpenCommentModal: (selectedResultId: TestResultId) => void;
}

const getResultColor = (resultId: TestResultId): string => {
  switch (resultId) {
    case 1: return 'bg-green-400';
    case 2: return 'bg-red-400';
    case 3: return 'bg-yellow-400';
    case 4: return 'bg-orange-400';
    case 5: return 'bg-purple-400';
    case 6: return 'bg-gray-400';
    case 7: return 'bg-blue-400';
    case 8: return 'bg-gray-500';
    default: return 'bg-gray-400';
  }
};

const TestResultDropdown: React.FC<TestResultDropdownProps> = ({
  value,
  onChange,
  disabled = false,
  isUpdating = false,
  onOpenCommentModal
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState<TestResultId>(value);
  const [dropdownPosition, setDropdownPosition] = useState<{ vertical: 'bottom' | 'top'; horizontal: 'left' | 'right' }>({ vertical: 'bottom', horizontal: 'left' });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const currentResultLabel = TEST_RESULTS[value];

  const calculatePosition = () => {
    if (buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const modalHeight = 400;
      const modalWidth = 320;

      const spaceBelow = viewportHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;
      const spaceRight = viewportWidth - buttonRect.left;
      const spaceLeft = buttonRect.right;

      const vertical = (spaceBelow < modalHeight && spaceAbove > modalHeight) ? 'top' : 'bottom';
      const horizontal = (spaceRight < modalWidth && spaceLeft > modalWidth) ? 'right' : 'left';

      setDropdownPosition({ vertical, horizontal });
    }
  };

  const handleToggle = () => {
    if (!disabled && !isUpdating) {
      if (!isOpen) {
        calculatePosition();
      }
      setIsOpen(!isOpen);
    }
  };

  const getStatusColor = () => {
    return 'text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600';
  };

  const handleResultChange = (newResultId: TestResultId) => {
    setSelectedResult(newResultId);
  };

  const handleQuickUpdate = () => {
    onChange(selectedResult, undefined);
    setIsOpen(false);
  };

  const handleOpenCommentModal = () => {
    setIsOpen(false);
    onOpenCommentModal(selectedResult);
  };

  useEffect(() => {
    setSelectedResult(value);
  }, [value]);

  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => {
      calculatePosition();
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  const resultButton = (
    <button
      ref={buttonRef}
      type="button"
      onClick={handleToggle}
      disabled={disabled || isUpdating}
      className={`w-full px-3 py-1.5 text-xs font-medium rounded-full border focus:outline-none focus:ring-2 focus:ring-cyan-400 text-left flex items-center justify-between ${getStatusColor()} ${
        disabled || isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'
      }`}
    >
      <div className="flex items-center">
        <div className={`w-2 h-2 rounded-full mr-2 ${getResultColor(value)}`}></div>
        <span>{currentResultLabel}</span>
      </div>
      {isUpdating ? (
        <Loader className="w-3 h-3 animate-spin text-slate-600 dark:text-gray-400" />
      ) : (
        <svg className="w-3 h-3 text-slate-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      )}
    </button>
  );

  return (
    <div className="relative">
      {value === 8 ? (
        <Tooltip content="Retry the run">
          {resultButton}
        </Tooltip>
      ) : (
        resultButton
      )}

      {isOpen && !disabled && !isUpdating && (
        <>
          <div
            className="fixed inset-0 z-[100]"
            onClick={() => setIsOpen(false)}
          />
          <div
            ref={dropdownRef}
            className={`absolute bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-2xl z-[101] w-80 max-h-96 ${
              dropdownPosition.vertical === 'bottom' ? 'top-full mt-1' : 'bottom-full mb-1'
            } ${
              dropdownPosition.horizontal === 'left' ? 'left-0' : 'right-0'
            }`}
          >
            <div className="p-3 border-b border-slate-300 dark:border-slate-600">
              <h4 className="text-sm font-medium text-slate-900 dark:text-white mb-3">Select Result</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
              {Object.entries(TEST_RESULTS).map(([resultId, label]) => (
                <button
                  key={resultId}
                  type="button"
                  onClick={() => handleResultChange(parseInt(resultId) as TestResultId)}
                  className={`w-full px-4 py-2 text-left hover:bg-slate-100 dark:bg-slate-700 transition-colors flex items-center text-sm ${
                    selectedResult === parseInt(resultId)
                      ? 'bg-cyan-600/30 border-l-4 border-cyan-400'
                      : ''
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full mr-3 flex-shrink-0 ${getResultColor(parseInt(resultId) as TestResultId)}`}></div>
                  <span className={`${selectedResult === parseInt(resultId) ? 'text-cyan-300 font-medium' : 'text-slate-900 dark:text-white'}`}>
                    {label}
                  </span>
                  {selectedResult === parseInt(resultId) && (
                    <span className="ml-auto text-cyan-400">&#10003;</span>
                  )}
                </button>
              ))}
            </div>
            </div>

            <div className="border-t border-slate-300 dark:border-slate-600 p-3">
              <div className="flex flex-col space-y-2">
                <button
                  type="button"
                  onClick={handleOpenCommentModal}
                  className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-600 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-sm rounded transition-colors flex items-center justify-center"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Add Comment
                </button>
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleQuickUpdate}
                    className="px-3 py-1.5 text-xs bg-cyan-600 hover:bg-cyan-700 text-slate-900 dark:text-white rounded transition-colors"
                  >
                    Update
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TestResultDropdown;
