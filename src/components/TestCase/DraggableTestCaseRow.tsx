import React, { useState, useRef, useCallback } from 'react';
import { SquarePen, Trash2, GripVertical, Copy, Link, Unlink } from 'lucide-react';
import StatusBadge from '../UI/StatusBadge';
import TagsWithTooltip from '../UI/TagsWithTooltip';
import RunTestButton from '../UI/RunTestButton';
import { TestCase, TEST_CASE_TYPES } from '../../types';
import { usePermissions } from '../../hooks/usePermissions';
import { PERMISSIONS } from '../../utils/permissions';

const HOVER_PREFETCH_DELAY_MS = 150;
const AUTOMATION_STATUS_AUTOMATED = 2;

interface DraggableTestCaseRowProps {
  testCase: TestCase;
  onTestCaseTitleClick: (testCase: TestCase) => void;
  onEditTestCase: (testCase: TestCase) => void;
  onDeleteTestCase: (testCase: TestCase) => void;
  onDuplicateTestCase: (testCase: TestCase) => void;
  onRunTest: (testCase: TestCase) => void;
  onPrefetchTestCase?: (testCase: TestCase) => void;
  isSubmitting: boolean;
  isDragging?: boolean;
  /** When true and test case is automated, show GitLab link indicator */
  showGitlabLinkIndicator?: boolean;
  /** GitLab test name if linked; null/undefined = not linked */
  gitlabLinkName?: string | null;
  folderName?: string;
  visibleColumns?: {
    id: boolean;
    title: boolean;
    folder: boolean;
    type: boolean;
    state: boolean;
    priority: boolean;
    tags: boolean;
    autoStatus: boolean;
  };
}

const DraggableTestCaseRow: React.FC<DraggableTestCaseRowProps> = ({
  testCase,
  onTestCaseTitleClick,
  onEditTestCase,
  onDeleteTestCase,
  onDuplicateTestCase,
  onRunTest,
  onPrefetchTestCase,
  isSubmitting,
  showGitlabLinkIndicator = false,
  gitlabLinkName = null,
  folderName = 'No folder',
  visibleColumns = {
    id: true,
    title: true,
    folder: true,
    type: true,
    state: true,
    priority: true,
    tags: true,
    autoStatus: true,
  }
}) => {
  const [dragStarted, setDragStarted] = useState(false);
  const prefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { hasPermission } = usePermissions();

  const handleMouseEnter = useCallback(() => {
    if (!onPrefetchTestCase) return;
    prefetchTimerRef.current = setTimeout(() => {
      onPrefetchTestCase(testCase);
      prefetchTimerRef.current = null;
    }, HOVER_PREFETCH_DELAY_MS);
  }, [onPrefetchTestCase, testCase]);

  const handleMouseLeave = useCallback(() => {
    if (prefetchTimerRef.current) {
      clearTimeout(prefetchTimerRef.current);
      prefetchTimerRef.current = null;
    }
  }, []);

  const hasAnyAction = hasPermission(PERMISSIONS.TEST_CASE.UPDATE) ||
                       hasPermission(PERMISSIONS.TEST_CASE.DELETE) ||
                       hasPermission(PERMISSIONS.TEST_CASE.CREATE) ||
                       hasPermission(PERMISSIONS.TEST_CASE_EXECUTION.CREATE);

  const handleDragStart = (e: React.DragEvent) => {
    setDragStarted(true);
    
    // Set drag data
    e.dataTransfer.setData('application/json', JSON.stringify({
      testCaseId: testCase.id,
      testCaseTitle: testCase.title,
      currentFolderId: testCase.folderId || null
    }));
    
    e.dataTransfer.effectAllowed = 'move';
    
    // Add visual feedback
    e.currentTarget.style.opacity = '0.5';

  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDragStarted(false);
    
    // Reset visual feedback
    e.currentTarget.style.opacity = '1';

  };

  return (
    <tr
      className={`border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:bg-slate-800/30 transition-colors ${
        dragStarted ? 'bg-cyan-500/10 border-cyan-500/30' : ''
      }`}
      draggable={!isSubmitting}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {visibleColumns.id && (
        <td className="py-3 px-3 text-xs text-slate-700 dark:text-gray-300 font-mono whitespace-nowrap">
          <div className="flex items-center">
            <div className="cursor-grab active:cursor-grabbing p-0.5 text-slate-600 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors mr-1.5">
              <GripVertical className="w-3.5 h-3.5" />
            </div>
            TC{testCase.projectRelativeId ?? testCase.id}
          </div>
        </td>
      )}
      {visibleColumns.title && (
        <td className="py-3 px-3 whitespace-nowrap max-w-xs">
          <button
            onClick={() => onTestCaseTitleClick(testCase)}
            className="text-left w-full group"
          >
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap block">
              {testCase.title}
            </h3>
          </button>
        </td>
      )}
      {visibleColumns.folder && (
        <td className="py-3 px-3 whitespace-nowrap">
          <span className="text-sm text-slate-600 dark:text-gray-400">
            {folderName}
          </span>
        </td>
      )}
      {visibleColumns.type && (
        <td className="py-3 px-3 whitespace-nowrap">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/50">
            {(() => {
              const typeMapping = {
                'other': 1,
                'acceptance': 2,
                'accessibility': 3,
                'compatibility': 4,
                'destructive': 5,
                'functional': 6,
                'performance': 7,
                'regression': 8,
                'security': 9,
                'smoke': 10,
                'usability': 11
              };
              const typeKey = typeMapping[testCase.type as keyof typeof typeMapping] || 6;
              return TEST_CASE_TYPES[typeKey as keyof typeof TEST_CASE_TYPES] || testCase.type;
            })()}
          </span>
        </td>
      )}
      {visibleColumns.state && (
        <td className="py-3 px-3 whitespace-nowrap">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
            testCase.status === 'active' ? 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/50' :
            testCase.status === 'draft' ? 'bg-orange-500/20 text-orange-400 border-orange-500/50' :
            testCase.status === 'in_review' ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' :
            testCase.status === 'outdated' ? 'bg-gray-500/20 text-slate-600 dark:text-gray-400 border-gray-500/50' :
            testCase.status === 'rejected' ? 'bg-red-500/20 text-red-400 border-red-500/50' :
            testCase.status === 'deprecated' ? 'bg-gray-500/20 text-slate-600 dark:text-gray-400 border-gray-500/50' :
            'bg-gray-500/20 text-slate-600 dark:text-gray-400 border-gray-500/50'
          }`}>
            {testCase.status === 'active' ? 'Active' :
             testCase.status === 'draft' ? 'Draft' :
             testCase.status === 'in_review' ? 'In Review' :
             testCase.status === 'outdated' ? 'Outdated' :
             testCase.status === 'rejected' ? 'Rejected' :
             testCase.status === 'deprecated' ? 'Deprecated' :
             testCase.status}
          </span>
        </td>
      )}
      {visibleColumns.priority && (
        <td className="py-3 px-3 whitespace-nowrap">
          <StatusBadge status={testCase.priority} type="priority" />
        </td>
      )}
      {visibleColumns.tags && (
        <td className="py-3 px-3 whitespace-nowrap">
          <TagsWithTooltip
            tags={Array.isArray(testCase.tags) ? testCase.tags : []}
            maxVisible={2}
          />
        </td>
      )}
      {visibleColumns.autoStatus && (
        <td className="py-3 px-3 whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            <StatusBadge status={testCase.automationStatus} type="automation" />
            {showGitlabLinkIndicator && testCase.automationStatus === AUTOMATION_STATUS_AUTOMATED && (
              <span
                className="inline-flex shrink-0"
                title={gitlabLinkName ? `Linked to GitLab: ${gitlabLinkName}` : 'Not linked to GitLab'}
              >
                {gitlabLinkName ? (
                  <Link className="w-3.5 h-3.5 text-green-500 dark:text-green-400" aria-hidden />
                ) : (
                  <Unlink className="w-3.5 h-3.5 text-slate-400 dark:text-gray-500" aria-hidden />
                )}
              </span>
            )}
          </div>
        </td>
      )}
      {hasPermission(PERMISSIONS.TEST_CASE_EXECUTION.CREATE) && (
        <td className="py-3 px-3 whitespace-nowrap">
          <RunTestButton
            onClick={() => onRunTest(testCase)}
            disabled={isSubmitting}
            size="sm"
          />
        </td>
      )}
      {hasAnyAction && (
        <td className="py-3 px-3 whitespace-nowrap">
          <div className="flex items-center space-x-1">
            {hasPermission(PERMISSIONS.TEST_CASE.UPDATE) && (
              <button
                onClick={() => onEditTestCase(testCase)}
                className="p-1.5 text-slate-600 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:bg-slate-700 rounded-lg transition-colors"
                title="Edit"
                disabled={isSubmitting}
              >
                <SquarePen className="w-3.5 h-3.5" />
              </button>
            )}
            {hasPermission(PERMISSIONS.TEST_CASE.CREATE) && (
              <button
                onClick={() => onDuplicateTestCase(testCase)}
                className="p-1.5 text-slate-600 dark:text-gray-400 hover:text-green-400 hover:bg-slate-100 dark:bg-slate-700 rounded-lg transition-colors"
                title="Duplicate"
                disabled={isSubmitting}
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            )}
            {hasPermission(PERMISSIONS.TEST_CASE.DELETE) && (
              <button
                onClick={() => onDeleteTestCase(testCase)}
                className="p-1.5 text-slate-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:bg-slate-700 rounded-lg transition-colors"
                title="Delete"
                disabled={isSubmitting}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </td>
      )}
    </tr>
  );
};

export default DraggableTestCaseRow;