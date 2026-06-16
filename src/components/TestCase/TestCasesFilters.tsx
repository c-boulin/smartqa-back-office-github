import React from 'react';
import { Search, SlidersHorizontal, X, Plus } from 'lucide-react';
import ColumnVisibilityDropdown, { ColumnVisibility } from '../UI/ColumnVisibilityDropdown';
import PermissionGuard from '../PermissionGuard';
import { PERMISSIONS } from '../../utils/permissions';
import { AUTOMATION_STATUS_LABELS } from '../../types';
import { Tag } from '../../services/tagsApi';
import { useApp } from '../../context/AppContext';
import { usePermissions } from '../../hooks/usePermissions';

interface FiltersState {
  automationStatus: string;
  priority: string;
  type: string;
  state: string;
  tags: Tag[];
}

interface TestCasesFiltersProps {
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  onSearchKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  currentSearchTerm: string;
  filters: FiltersState;
  onFilterChange: (filterType: keyof FiltersState, value: string | string[]) => void;
  onApplyFilters: () => void;
  onClearAllFilters: () => void;
  onOpenFiltersSidebar: () => void;
  availableTags: Tag[];
  onCreateTag: (label: string) => Promise<Tag>;
  onClearIndividualFilter: (filterType: keyof FiltersState, value?: string) => void;
  visibleColumns: ColumnVisibility;
  onToggleColumn: (column: keyof ColumnVisibility) => void;
  onCreateTestCase?: () => void;
}

const TestCasesFilters: React.FC<TestCasesFiltersProps> = ({
  searchTerm,
  onSearchTermChange,
  onSearchKeyPress,
  currentSearchTerm,
  filters,
  onClearAllFilters,
  onOpenFiltersSidebar,
  onClearIndividualFilter,
  visibleColumns,
  onToggleColumn,
  onCreateTestCase
}) => {
  const { state: appState } = useApp();
  const { hasPermission } = usePermissions();
  const templateWriteAllowed = !appState.isTemplateMode || hasPermission(PERMISSIONS.TEMPLATE.UPDATE);
  const canCreateTestCase = templateWriteAllowed;
  const activeFilterCount = [
    filters.automationStatus !== 'all' ? 1 : 0,
    filters.priority !== 'all' ? 1 : 0,
    filters.type !== 'all' ? 1 : 0,
    filters.state !== 'all' ? 1 : 0,
    (filters.tags && filters.tags.length > 0) ? 1 : 0
  ].reduce((a, b) => a + b, 0);

  const hasActiveFilters = currentSearchTerm ||
    filters.automationStatus !== 'all' ||
    filters.priority !== 'all' ||
    filters.type !== 'all' ||
    filters.state !== 'all' ||
    (filters.tags && filters.tags.length > 0);

  const typeMap: Record<string, string> = {
    '1': 'Other', '2': 'Acceptance', '3': 'Accessibility', '4': 'Compatibility',
    '5': 'Destructive', '6': 'Functional', '7': 'Performance', '8': 'Regression',
    '9': 'Security', '10': 'Smoke & Sanity', '11': 'Usability'
  };

  return (
    <div className="space-y-3">
      {/* Search + View + Filters | spacer | Create row */}
      <div className="flex items-center gap-2">
        {/* Search — fixed width matching screenshot */}
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-400 w-4 h-4 pointer-events-none" />
          <input
            data-mipqa="testcases-search-input"
            type="text"
            placeholder="Search for project..."
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            onKeyPress={onSearchKeyPress}
            className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 focus:border-transparent transition-shadow"
          />
        </div>

        {/* View button (column visibility) */}
        <ColumnVisibilityDropdown
          visibleColumns={visibleColumns}
          onToggleColumn={onToggleColumn}
        />

        {/* Filters button */}
        <button
          data-mipqa="testcases-filter-btn"
          onClick={onOpenFiltersSidebar}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
            activeFilterCount > 0
              ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-600 dark:text-cyan-400'
              : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-cyan-500 text-white text-xs font-bold leading-none">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Create test case button — far right */}
        {onCreateTestCase && canCreateTestCase && (
          <PermissionGuard permission={PERMISSIONS.TEST_CASE.CREATE}>
            <button
              data-mipqa="create-testcase-button"
              onClick={onCreateTestCase}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white shadow-lg hover:shadow-cyan-500/25 transition-all duration-200 shrink-0"
            >
              <Plus className="w-4 h-4" />
              Create new test case
            </button>
          </PermissionGuard>
        )}
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {currentSearchTerm && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-full text-xs text-slate-700 dark:text-gray-300">
              Search: {currentSearchTerm}
              <button
                onClick={() => onClearIndividualFilter('search' as keyof FiltersState)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.automationStatus !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-xs text-blue-700 dark:text-blue-400">
              Automation: {AUTOMATION_STATUS_LABELS[parseInt(filters.automationStatus) as keyof typeof AUTOMATION_STATUS_LABELS]}
              <button onClick={() => onClearIndividualFilter('automationStatus')} className="hover:opacity-70 transition-opacity">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.priority !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-xs text-green-700 dark:text-green-400">
              Priority: {filters.priority}
              <button onClick={() => onClearIndividualFilter('priority')} className="hover:opacity-70 transition-opacity">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.type !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full text-xs text-orange-700 dark:text-orange-400">
              Type: {typeMap[filters.type] || filters.type}
              <button onClick={() => onClearIndividualFilter('type')} className="hover:opacity-70 transition-opacity">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.state !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-xs text-yellow-700 dark:text-yellow-400">
              State: {filters.state === '1' ? 'Active' : filters.state === '2' ? 'Draft' : filters.state === '3' ? 'In Review' : filters.state === '4' ? 'Outdated' : 'Rejected'}
              <button onClick={() => onClearIndividualFilter('state')} className="hover:opacity-70 transition-opacity">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.tags && filters.tags.length > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-xs text-cyan-700 dark:text-cyan-400">
              Tags: {filters.tags.length} selected
              <button onClick={() => onClearIndividualFilter('tags')} className="hover:opacity-70 transition-opacity">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          <button
            onClick={onClearAllFilters}
            className="text-xs text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-white underline transition-colors"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
};

export default TestCasesFilters;
