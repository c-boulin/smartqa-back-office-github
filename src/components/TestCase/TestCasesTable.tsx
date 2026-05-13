import React, { useMemo, useState } from 'react';
import { Search, ChevronLeft, ChevronRight, Loader, ChevronDown } from 'lucide-react';
import Button from '../UI/Button';
import DraggableTestCaseRow from './DraggableTestCaseRow';
import { TestCase } from '../../types';
import { usePermissions } from '../../hooks/usePermissions';
import { PERMISSIONS } from '../../utils/permissions';
import { ColumnVisibility } from '../UI/ColumnVisibilityDropdown';

const INITIAL_VISIBLE = 5;

interface TestCasesTableProps {
  testCases: TestCase[];
  loading: boolean;
  isApplyingNavigationFilter: boolean;
  currentSearchTerm: string;
  selectedFolder: { id: string; name: string } | null;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
  onTestCaseTitleClick: (testCase: TestCase) => void;
  onEditTestCase: (testCase: TestCase) => void;
  onPrefetchTestCase?: (testCase: TestCase) => void;
  onDeleteTestCase: (testCase: TestCase) => void;
  onDuplicateTestCase: (testCase: TestCase) => void;
  onRunTest: (testCase: TestCase) => void;
  onPageChange: (page: number) => void;
  isSubmitting: boolean;
  gitlabLinksByTestCaseId?: Record<string, string | null>;
  gitlabLinksFetched?: boolean;
  visibleColumns: ColumnVisibility;
  folderMap?: Record<string, string>;
}

interface FolderSection {
  folderId: string | null;
  folderName: string;
  testCases: TestCase[];
}

const TH = 'text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap';

const TableHeader: React.FC<{ visibleColumns: ColumnVisibility; hasAnyAction: boolean }> = ({
  visibleColumns,
  hasAnyAction,
}) => (
  <>
    <colgroup>
      {visibleColumns.id        && <col style={{ width: '72px' }} />}
      {visibleColumns.title     && <col style={{ width: '260px' }} />}
      {visibleColumns.type      && <col style={{ width: '130px' }} />}
      {visibleColumns.state     && <col style={{ width: '110px' }} />}
      {visibleColumns.priority  && <col style={{ width: '100px' }} />}
      {visibleColumns.tags      && <col style={{ width: '140px' }} />}
      {visibleColumns.autoStatus && <col style={{ width: '130px' }} />}
      {hasAnyAction             && <col style={{ width: '100px' }} />}
    </colgroup>
    <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
      <tr>
        {visibleColumns.id        && <th className={TH}>ID</th>}
        {visibleColumns.title     && <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wide">Title</th>}
        {visibleColumns.type      && <th className={TH}>Type</th>}
        {visibleColumns.state     && <th className={TH}>State</th>}
        {visibleColumns.priority  && <th className={TH}>Priority</th>}
        {visibleColumns.tags      && <th className={TH}>Tags</th>}
        {visibleColumns.autoStatus && <th className={TH}>Auto Status</th>}
        {hasAnyAction             && <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">Actions</th>}
      </tr>
    </thead>
  </>
);

interface FolderSectionBlockProps {
  section: FolderSection;
  visibleColumns: ColumnVisibility;
  hasAnyAction: boolean;
  onTestCaseTitleClick: (tc: TestCase) => void;
  onEditTestCase: (tc: TestCase) => void;
  onPrefetchTestCase?: (tc: TestCase) => void;
  onDeleteTestCase: (tc: TestCase) => void;
  onDuplicateTestCase: (tc: TestCase) => void;
  onRunTest: (tc: TestCase) => void;
  isSubmitting: boolean;
  gitlabLinksByTestCaseId: Record<string, string | null>;
  gitlabLinksFetched: boolean;
  folderMap: Record<string, string>;
  folderSelected: boolean;
}

const FolderSectionBlock: React.FC<FolderSectionBlockProps> = ({
  section,
  visibleColumns,
  hasAnyAction,
  onTestCaseTitleClick,
  onEditTestCase,
  onPrefetchTestCase,
  onDeleteTestCase,
  onDuplicateTestCase,
  onRunTest,
  isSubmitting,
  gitlabLinksByTestCaseId,
  gitlabLinksFetched,
  folderMap,
  folderSelected,
}) => {
  const [showAll, setShowAll] = useState(false);
  const total = section.testCases.length;
  const visible = (folderSelected || showAll) ? total : Math.min(INITIAL_VISIBLE, total);
  const hidden = total - visible;

  return (
    <div className="mb-4">
      {/* Folder heading */}
      <div className="px-1 mb-2">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
          {section.folderName}
        </h3>
      </div>

      <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <TableHeader visibleColumns={visibleColumns} hasAnyAction={hasAnyAction} />
            <tbody>
              {section.testCases.slice(0, visible).map((tc) => (
                <DraggableTestCaseRow
                  key={tc.id}
                  testCase={tc}
                  onTestCaseTitleClick={onTestCaseTitleClick}
                  onEditTestCase={onEditTestCase}
                  onPrefetchTestCase={onPrefetchTestCase}
                  onDeleteTestCase={onDeleteTestCase}
                  onDuplicateTestCase={onDuplicateTestCase}
                  onRunTest={onRunTest}
                  isSubmitting={isSubmitting}
                  gitlabLinkName={gitlabLinksByTestCaseId[tc.id] ?? undefined}
                  showGitlabLinkIndicator={gitlabLinksFetched}
                  folderName={tc.folderId ? folderMap[tc.folderId] || 'Unknown' : 'No folder'}
                  visibleColumns={visibleColumns}
                />
              ))}
            </tbody>
          </table>
        </div>

        {total > INITIAL_VISIBLE && !folderSelected && (
          <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-2.5 flex justify-start">
            <button
              onClick={() => setShowAll(!showAll)}
              className="flex items-center gap-1.5 text-xs text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 font-medium transition-colors"
            >
              {showAll ? (
                <>Hide <ChevronDown className="w-3.5 h-3.5 rotate-180" /></>
              ) : (
                <>Show {hidden} more <ChevronDown className="w-3.5 h-3.5" /></>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const TestCasesTable: React.FC<TestCasesTableProps> = ({
  testCases,
  loading,
  isApplyingNavigationFilter,
  currentSearchTerm,
  selectedFolder,
  pagination,
  onTestCaseTitleClick,
  onEditTestCase,
  onPrefetchTestCase,
  onDeleteTestCase,
  onDuplicateTestCase,
  onRunTest,
  onPageChange,
  isSubmitting,
  gitlabLinksByTestCaseId = {},
  gitlabLinksFetched = false,
  visibleColumns,
  folderMap = {},
}) => {
  const { hasPermission } = usePermissions();

  const hasAnyAction =
    hasPermission(PERMISSIONS.TEST_CASE.UPDATE) ||
    hasPermission(PERMISSIONS.TEST_CASE.DELETE) ||
    hasPermission(PERMISSIONS.TEST_CASE.CREATE) ||
    hasPermission(PERMISSIONS.TEST_CASE_EXECUTION.CREATE);

  const sections = useMemo<FolderSection[]>(() => {
    if (testCases.length === 0) return [];

    const map = new Map<string, TestCase[]>();
    for (const tc of testCases) {
      const key = tc.folderId || '__none__';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(tc);
    }

    const result: FolderSection[] = [];
    map.forEach((cases, key) => {
      const folderId = key === '__none__' ? null : key;
      const folderName = folderId ? folderMap[folderId] || 'Unknown Folder' : 'Unfolder';
      result.push({ folderId, folderName, testCases: cases });
    });

    result.sort((a, b) => {
      if (a.folderId === null) return -1;
      if (b.folderId === null) return 1;
      return a.folderName.localeCompare(b.folderName);
    });

    return result;
  }, [testCases, folderMap]);

  return (
    <div className="relative">
      {/* Loading overlay */}
      {(loading || isApplyingNavigationFilter) && (
        <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-start justify-center z-20 pt-8 rounded-xl">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg p-4 shadow-xl">
            <div className="flex items-center gap-3">
              <Loader className="w-5 h-5 text-cyan-400 animate-spin" />
              <span className="text-slate-900 dark:text-white font-medium text-sm">
                {isApplyingNavigationFilter ? 'Applying filters...' : 'Loading test cases...'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {testCases.length === 0 && !loading && (
        <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl py-16 text-center">
          <Search className="w-10 h-10 mx-auto mb-4 text-slate-300 dark:text-gray-600" />
          <p className="text-base font-medium text-slate-700 dark:text-white mb-1">No test cases found</p>
          <p className="text-sm text-slate-500 dark:text-gray-400">
            {currentSearchTerm
              ? `No test cases matching "${currentSearchTerm}"`
              : `No test cases found${selectedFolder ? ` in ${selectedFolder.name}` : ''}`}
          </p>
        </div>
      )}

      {/* Folder section boxes */}
      {sections.map((section) => (
        <FolderSectionBlock
          key={section.folderId ?? '__none__'}
          section={section}
          visibleColumns={visibleColumns}
          hasAnyAction={hasAnyAction}
          onTestCaseTitleClick={onTestCaseTitleClick}
          onEditTestCase={onEditTestCase}
          onPrefetchTestCase={onPrefetchTestCase}
          onDeleteTestCase={onDeleteTestCase}
          onDuplicateTestCase={onDuplicateTestCase}
          onRunTest={onRunTest}
          isSubmitting={isSubmitting}
          gitlabLinksByTestCaseId={gitlabLinksByTestCaseId}
          gitlabLinksFetched={gitlabLinksFetched}
          folderMap={folderMap}
          folderSelected={!!selectedFolder}
        />
      ))}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl px-6 py-4 flex flex-col lg:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500 dark:text-gray-400">
            Showing {(pagination.currentPage - 1) * pagination.itemsPerPage + 1}–
            {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
            {pagination.totalItems} test cases
          </p>
          <div className="flex items-center gap-2">
            <Button
              data-mipqa="testcases-pagination-prev"
              variant="secondary"
              size="sm"
              onClick={() => onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1 || loading}
              icon={ChevronLeft}
            >
              Previous
            </Button>
            <span className="text-sm text-slate-600 dark:text-gray-400 px-2">
              {pagination.currentPage} / {pagination.totalPages}
            </span>
            <Button
              data-mipqa="testcases-pagination-next"
              variant="secondary"
              size="sm"
              onClick={() => onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages || loading}
              icon={ChevronRight}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestCasesTable;
