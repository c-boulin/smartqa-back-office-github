import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Loader } from 'lucide-react';
import { apiService } from '../../services/api';

interface TestCaseInfo {
  id: string;
  title: string;
  projectRelativeId?: number;
}

interface UsedInTestCasesTooltipProps {
  sharedStepId: string;
  usedInCount: number;
}

interface ModalPosition {
  top?: number;
  bottom?: number;
  left: number;
}

const UsedInTestCasesTooltip: React.FC<UsedInTestCasesTooltipProps> = ({
  sharedStepId,
  usedInCount
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [testCases, setTestCases] = useState<TestCaseInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalPosition, setModalPosition] = useState<ModalPosition | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && testCases.length === 0 && !error) {
      fetchTestCases();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleScroll = (e: Event) => {
      if (isOpen && modalRef.current) {
        const target = e.target as Node;
        if (!modalRef.current.contains(target)) {
          setIsOpen(false);
          setModalPosition(null);
        }
      }
    };

    if (isOpen) {
      window.addEventListener('scroll', handleScroll, true);
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [isOpen]);

  const fetchTestCases = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiService.authenticatedRequest(
        `/shared_steps/${sharedStepId}?include=testCases`
      );

      if (response?.data?.relationships?.testCases?.data) {
        const testCaseIds = response.data.relationships.testCases.data.map(
          (tc: { id: string }) => tc.id.split('/').pop()
        );

        // Deduplicate test case IDs (in case the same test case uses the shared step multiple times)
        const uniqueTestCaseIds = [...new Set(testCaseIds)];

        const testCaseDetails: TestCaseInfo[] = [];

        if (response.included) {
          response.included.forEach((item: { type: string; attributes: { id: number; title: string; projectRelativeId?: number } }) => {
            if (item.type === 'TestCase' && uniqueTestCaseIds.includes(item.attributes.id.toString())) {
              testCaseDetails.push({
                id: item.attributes.id.toString(),
                title: item.attributes.title,
                projectRelativeId: item.attributes.projectRelativeId
              });
            }
          });
        }

        setTestCases(testCaseDetails);
      } else {
        setTestCases([]);
      }
    } catch (err) {
      console.error('Failed to fetch test cases:', err);
      setError('Failed to load test cases');
    } finally {
      setLoading(false);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isOpen) {
      setIsOpen(false);
      setModalPosition(null);
      return;
    }

    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const modalHeight = 300;
      const modalWidth = 320;

      let leftPosition = rect.left;
      if (leftPosition + modalWidth > window.innerWidth) {
        leftPosition = window.innerWidth - modalWidth - 16;
      }
      if (leftPosition < 16) {
        leftPosition = 16;
      }

      const position: ModalPosition = spaceBelow < modalHeight && spaceAbove > spaceBelow
        ? { bottom: window.innerHeight - rect.top + 8, left: leftPosition }
        : { top: rect.bottom + 8, left: leftPosition };

      setModalPosition(position);
      setIsOpen(true);
    }
  };

  const renderModal = () => {
    if (!isOpen || !modalPosition) return null;

    return createPortal(
      <>
        <div
          className="fixed inset-0 z-[9998]"
          onClick={() => {
            setIsOpen(false);
            setModalPosition(null);
          }}
        />
        <div
          ref={modalRef}
          className="fixed z-[9999] w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xl"
          style={{
            top: modalPosition.top !== undefined ? `${modalPosition.top}px` : 'auto',
            bottom: modalPosition.bottom !== undefined ? `${modalPosition.bottom}px` : 'auto',
            left: `${modalPosition.left}px`
          }}
        >
          <div className="px-4 py-3 bg-slate-100 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Used in {usedInCount} test case{usedInCount !== 1 ? 's' : ''}
            </h4>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader className="w-5 h-5 text-cyan-400 animate-spin" />
              </div>
            )}

            {error && (
              <div className="px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {!loading && !error && testCases.length === 0 && (
              <div className="px-4 py-3 text-sm text-slate-600 dark:text-gray-400">
                No test cases found
              </div>
            )}

            {!loading && !error && testCases.length > 0 && (
              <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                {testCases.map((testCase) => (
                  <li
                    key={testCase.id}
                    className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-start space-x-2">
                      <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400">
                        TC-{testCase.projectRelativeId ?? testCase.id}
                      </span>
                      <span className="text-sm text-slate-700 dark:text-gray-200 flex-1">
                        {testCase.title}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </>,
      document.body
    );
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleClick}
        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/50 hover:bg-purple-500/30 transition-colors cursor-pointer"
      >
        {usedInCount} test case{usedInCount !== 1 ? 's' : ''}
      </button>
      {renderModal()}
    </>
  );
};

export default UsedInTestCasesTooltip;
