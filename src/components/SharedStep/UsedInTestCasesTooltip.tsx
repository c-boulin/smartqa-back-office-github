import React, { useState, useEffect, useRef } from 'react';
import { Loader } from 'lucide-react';
import { sharedStepsApiService } from '../../services/sharedStepsApi';
import { apiService } from '../../services/api';

interface TestCaseInfo {
  id: string;
  title: string;
}

interface UsedInTestCasesTooltipProps {
  sharedStepId: string;
  usedInCount: number;
}

const UsedInTestCasesTooltip: React.FC<UsedInTestCasesTooltipProps> = ({
  sharedStepId,
  usedInCount
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [testCases, setTestCases] = useState<TestCaseInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openUpwards, setOpenUpwards] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen && testCases.length === 0 && !error) {
      fetchTestCases();
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

        const testCaseDetails: TestCaseInfo[] = [];

        if (response.included) {
          response.included.forEach((item: { type: string; attributes: { id: number; title: string } }) => {
            if (item.type === 'TestCase') {
              testCaseDetails.push({
                id: item.attributes.id.toString(),
                title: item.attributes.title
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

    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      setOpenUpwards(spaceBelow < 300 && spaceAbove > spaceBelow);
    }

    setIsOpen(!isOpen);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleClick}
        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/50 hover:bg-purple-500/30 transition-colors cursor-pointer"
      >
        {usedInCount} test case{usedInCount !== 1 ? 's' : ''}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className={`absolute left-0 z-50 w-80 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl overflow-hidden ${
            openUpwards ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}>
            <div className="px-4 py-3 bg-slate-900/50 border-b border-slate-700">
              <h4 className="text-sm font-semibold text-white">
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
                <div className="px-4 py-3 text-sm text-gray-400">
                  No test cases found
                </div>
              )}

              {!loading && !error && testCases.length > 0 && (
                <ul className="divide-y divide-slate-700">
                  {testCases.map((testCase) => (
                    <li
                      key={testCase.id}
                      className="px-4 py-3 hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="flex items-start space-x-2">
                        <span className="text-xs font-mono text-cyan-400">
                          #{testCase.id}
                        </span>
                        <span className="text-sm text-gray-200 flex-1">
                          {testCase.title}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default UsedInTestCasesTooltip;
