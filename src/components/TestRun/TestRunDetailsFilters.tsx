import React from 'react';
import { Search, Filter, X } from 'lucide-react';
import Card from '../UI/Card';
import Button from '../UI/Button';
import { AUTOMATION_STATUS_LABELS } from '../../types';
import { Tag } from '../../services/tagsApi';

interface FiltersState {
  automationStatus: string;
  priority: string;
  type: string;
  state: string;
  result: string;
  tags: Tag[];
}

interface TestRunDetailsFiltersProps {
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
}

const TestRunDetailsFilters: React.FC<TestRunDetailsFiltersProps> = ({
  searchTerm,
  onSearchTermChange,
  onSearchKeyPress,
  currentSearchTerm,
  filters,
  // onApplyFilters,
  onClearAllFilters,
  onOpenFiltersSidebar,
  onClearIndividualFilter
}) => {
  const hasActiveFilters = currentSearchTerm || 
    filters.automationStatus !== 'all' || 
    filters.priority !== 'all' || 
    filters.type !== 'all' || 
    filters.state !== 'all' ||
    filters.result !== 'all' ||
    (filters.tags && filters.tags.length > 0);

  return (
    <Card className="p-6">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-gray-400 w-4 h-4 z-10" />
            <input
              type="text"
              placeholder="Search test cases by title..."
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
              onKeyPress={onSearchKeyPress}
              className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400"
            />
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            variant="secondary"
            icon={Filter}
            onClick={onOpenFiltersSidebar}
            className="px-4 py-2"
          >
            Filters
            {(filters.automationStatus !== 'all' || filters.priority !== 'all' || filters.type !== 'all' || filters.result !== 'all' || (filters.tags && filters.tags.length > 0)) && (
              <span className="ml-2 px-2 py-0.5 bg-cyan-500 text-slate-900 dark:text-white text-xs rounded-full">
                {[
                  filters.automationStatus !== 'all' ? 1 : 0,
                  filters.priority !== 'all' ? 1 : 0,
                  filters.type !== 'all' ? 1 : 0,
                  filters.result !== 'all' ? 1 : 0,
                  (filters.tags && filters.tags.length > 0) ? 1 : 0
                ].reduce((a, b) => a + b, 0)}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Active filters display */}
      {hasActiveFilters && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-600 dark:text-gray-400">Active filters:</span>
          {currentSearchTerm && (
            <span className="inline-flex items-center px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded-full text-sm text-cyan-700 dark:text-cyan-400">
              Search: "{currentSearchTerm}"
              <button
                onClick={() => onClearIndividualFilter('search')}
                className="ml-2 text-cyan-400 hover:text-cyan-300 transition-colors"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.automationStatus !== 'all' && (
            <span className="inline-flex items-center px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-sm text-purple-400">
              Automation: {AUTOMATION_STATUS_LABELS[parseInt(filters.automationStatus) as keyof typeof AUTOMATION_STATUS_LABELS]}
              <button
                onClick={() => onClearIndividualFilter('automationStatus')}
                className="ml-2 text-purple-400 hover:text-purple-300 transition-colors"
                title="Clear automation filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.priority !== 'all' && (
            <span className="inline-flex items-center px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full text-sm text-green-700 dark:text-green-400">
              Priority: {filters.priority}
              <button
                onClick={() => onClearIndividualFilter('priority')}
                className="ml-2 text-green-400 hover:text-green-300 transition-colors"
                title="Clear priority filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.type !== 'all' && (
            <span className="inline-flex items-center px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-sm text-blue-400">
              Type: {(() => {
                const typeMap = {
                  '1': 'Other',
                  '2': 'Acceptance',
                  '3': 'Accessibility',
                  '4': 'Compatibility',
                  '5': 'Destructive',
                  '6': 'Functional',
                  '7': 'Performance',
                  '8': 'Regression',
                  '9': 'Security',
                  '10': 'Smoke & Sanity',
                  '11': 'Usability'
                };
                return typeMap[filters.type as keyof typeof typeMap] || filters.type;
              })()}
              <button
                onClick={() => onClearIndividualFilter('type')}
                className="ml-2 text-blue-400 hover:text-blue-300 transition-colors"
                title="Clear type filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.state !== 'all' && (
            <span className="inline-flex items-center px-3 py-1 bg-orange-500/20 border border-orange-500/30 rounded-full text-sm text-orange-400">
              State: {filters.state === '1' ? 'Active' : filters.state === '2' ? 'Draft' : filters.state === '3' ? 'In Review' : filters.state === '4' ? 'Outdated' : filters.state === '5' ? 'Rejected' : filters.state}
              <button
                onClick={() => onClearIndividualFilter('state')}
                className="ml-2 text-orange-400 hover:text-orange-300 transition-colors"
                title="Clear state filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.result !== 'all' && (
            <span className="inline-flex items-center px-3 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded-full text-sm text-yellow-400">
              Result: {(() => {
                const resultLabels: Record<string, string> = {
                  'passed': 'Passed',
                  'failed': 'Failed',
                  'blocked': 'Blocked',
                  'retest': 'Retest',
                  'skipped': 'Skipped',
                  'untested': 'Untested',
                  'in_progress': 'In Progress',
                  'unknown': 'Unknown'
                };
                return resultLabels[filters.result] || filters.result;
              })()}
              <button
                onClick={() => onClearIndividualFilter('result')}
                className="ml-2 text-yellow-400 hover:text-yellow-300 transition-colors"
                title="Clear result filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.tags && filters.tags.length > 0 && (
            <span className="inline-flex items-center px-3 py-1 bg-pink-500/20 border border-pink-500/30 rounded-full text-sm text-pink-400">
              Tags: {filters.tags?.length || 0} selected
              <button
                onClick={() => onClearIndividualFilter('tags')}
                className="ml-2 text-pink-400 hover:text-pink-300 transition-colors"
                title="Clear tags filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          <button
            onClick={onClearAllFilters}
            className="text-sm text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white underline"
          >
            Clear all filters
          </button>
        </div>
      )}
    </Card>
  );
};

export default TestRunDetailsFilters;