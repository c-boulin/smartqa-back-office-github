import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { SquarePen, GripVertical, Copy, Link, Unlink, MoreHorizontal, PlayCircle, Trash2 } from 'lucide-react';
import StatusBadge from '../UI/StatusBadge';
import TagsWithTooltip from '../UI/TagsWithTooltip';
import { TestCase, TEST_CASE_TYPES } from '../../types';
import { usePermissions } from '../../hooks/usePermissions';
import { PERMISSIONS } from '../../utils/permissions';
import { useApp } from '../../context/AppContext';

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
  showGitlabLinkIndicator?: boolean;
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const prefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { hasPermission } = usePermissions();
  const { state: appState } = useApp();

  const templateWriteAllowed = !appState.isTemplateMode || hasPermission(PERMISSIONS.TEMPLATE.UPDATE);
  const canEdit = hasPermission(PERMISSIONS.TEST_CASE.UPDATE) && templateWriteAllowed;
  const canDelete = hasPermission(PERMISSIONS.TEST_CASE.DELETE) && templateWriteAllowed;
  const canCreate = hasPermission(PERMISSIONS.TEST_CASE.CREATE) && templateWriteAllowed;
  const canRun = hasPermission(PERMISSIONS.TEST_CASE_EXECUTION.CREATE) && !appState.isTemplateMode;
  const hasAnyAction = canEdit || canDelete || canCreate || canRun;

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

  const handleDragStart = (e: React.DragEvent) => {
    setDragStarted(true);
    e.dataTransfer.setData('application/json', JSON.stringify({
      testCaseId: testCase.id,
      testCaseTitle: testCase.title,
      currentFolderId: testCase.folderId || null
    }));
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDragStarted(false);
    e.currentTarget.style.opacity = '1';
  };

  const openMenu = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!menuButtonRef.current) return;
    const rect = menuButtonRef.current.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
    });
    setMenuOpen(true);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current && !menuRef.current.contains(target) &&
        menuButtonRef.current && !menuButtonRef.current.contains(target)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [menuOpen]);

  const typeMapping: Record<string, number> = {
    'other': 1, 'acceptance': 2, 'accessibility': 3, 'compatibility': 4,
    'destructive': 5, 'functional': 6, 'performance': 7, 'regression': 8,
    'security': 9, 'smoke': 10, 'usability': 11
  };
  const typeKey = typeMapping[testCase.type as keyof typeof typeMapping] || 6;
  const typeLabel = TEST_CASE_TYPES[typeKey as keyof typeof TEST_CASE_TYPES] || testCase.type;

  return (
    <>
      <tr
        data-mipqa={`testcase-row-${testCase.id}`}
        className={`border-b border-slate-100 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${
          dragStarted ? 'opacity-50' : ''
        }`}
        draggable={!isSubmitting}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {visibleColumns.id && (
          <td className="py-3 px-4 text-xs text-slate-500 dark:text-gray-400 font-mono whitespace-nowrap">
            <div className="flex items-center gap-1.5">
              <div className="cursor-grab active:cursor-grabbing text-slate-300 dark:text-gray-600 hover:text-slate-400 dark:hover:text-gray-500 transition-colors">
                <GripVertical className="w-3.5 h-3.5" />
              </div>
              TC{testCase.projectRelativeId ?? testCase.id}
            </div>
          </td>
        )}
        {visibleColumns.title && (
          <td className="py-3 px-4 max-w-xs">
            <button
              data-mipqa={`testcase-title-btn-${testCase.id}`}
              onClick={() => onTestCaseTitleClick(testCase)}
              className="text-left w-full group"
            >
              <span className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors truncate block">
                {testCase.title}
              </span>
            </button>
          </td>
        )}
        {visibleColumns.type && (
          <td className="py-3 px-4 whitespace-nowrap">
            <span className="text-sm text-slate-600 dark:text-gray-300">
              {typeLabel}
            </span>
          </td>
        )}
        {visibleColumns.state && (
          <td className="py-3 px-4 whitespace-nowrap">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
              testCase.status === 'active' ? 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30' :
              testCase.status === 'draft' ? 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30' :
              testCase.status === 'in_review' ? 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30' :
              testCase.status === 'outdated' ? 'bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/30' :
              testCase.status === 'rejected' ? 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30' :
              'bg-gray-500/15 text-gray-600 dark:text-gray-400 border-gray-500/30'
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
          <td className="py-3 px-4 whitespace-nowrap">
            <StatusBadge status={testCase.priority} type="priority" />
          </td>
        )}
        {visibleColumns.tags && (
          <td className="py-3 px-4 whitespace-nowrap">
            <TagsWithTooltip
              tags={Array.isArray(testCase.tags) ? testCase.tags : []}
              maxVisible={2}
            />
          </td>
        )}
        {visibleColumns.autoStatus && (
          <td className="py-3 px-4 whitespace-nowrap">
            <div className="flex items-center gap-1.5">
              <StatusBadge status={testCase.automationStatus} type="automation" />
              {showGitlabLinkIndicator && testCase.automationStatus === AUTOMATION_STATUS_AUTOMATED && (
                <span
                  className="inline-flex shrink-0"
                  title={gitlabLinkName ? `Linked to GitLab: ${gitlabLinkName}` : 'Not linked to GitLab'}
                >
                  {gitlabLinkName ? (
                    <Link className="w-3.5 h-3.5 text-green-500 dark:text-green-400" />
                  ) : (
                    <Unlink className="w-3.5 h-3.5 text-slate-400 dark:text-gray-500" />
                  )}
                </span>
              )}
            </div>
          </td>
        )}
        {hasAnyAction && (
          <td className="py-3 px-4 whitespace-nowrap">
            <div className="flex items-center justify-end gap-1">
              {canEdit && (
                <button
                  data-mipqa={`testcase-edit-btn-${testCase.id}`}
                  onClick={() => onEditTestCase(testCase)}
                  className="p-1.5 text-slate-400 dark:text-gray-500 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  title="Edit test case"
                  disabled={isSubmitting}
                >
                  <SquarePen className="w-3.5 h-3.5" />
                </button>
              )}
              {(canCreate || canRun || canDelete) && (
                <button
                  ref={menuButtonRef}
                  onClick={openMenu}
                  className="p-1.5 text-slate-400 dark:text-gray-500 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  title="More actions"
                  disabled={isSubmitting}
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </td>
        )}
      </tr>

      {/* 3-dot dropdown menu via portal */}
      {menuOpen && menuPos && createPortal(
        <div
          ref={menuRef}
          className="fixed bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-[99999] min-w-[160px] py-1 overflow-hidden"
          style={{ top: `${menuPos.top}px`, right: `${menuPos.right}px` }}
        >
          {canCreate && (
            <button
              onClick={() => { setMenuOpen(false); onDuplicateTestCase(testCase); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <Copy className="w-4 h-4 text-slate-500 dark:text-gray-400" />
              Duplicate test
            </button>
          )}
          {canRun && (
            <button
              onClick={() => { setMenuOpen(false); onRunTest(testCase); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <PlayCircle className="w-4 h-4 text-slate-500 dark:text-gray-400" />
              Run test
            </button>
          )}
          {canDelete && (
            <>
              {(canCreate || canRun) && <div className="border-t border-slate-200 dark:border-slate-700 my-1" />}
              <button
                data-mipqa={`testcase-delete-btn-${testCase.id}`}
                onClick={() => { setMenuOpen(false); onDeleteTestCase(testCase); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete test
              </button>
            </>
          )}
        </div>,
        document.body
      )}
    </>
  );
};

export default DraggableTestCaseRow;
