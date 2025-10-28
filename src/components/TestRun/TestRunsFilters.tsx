import React from 'react';
import { Search, Filter, X } from 'lucide-react';
import Card from '../UI/Card';
import Button from '../UI/Button';
import { User } from '../../services/usersApi';

interface FiltersState {
  assignee: string;
  state: string;
}

interface TestRunsFiltersProps {
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  onSearchKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  currentSearchTerm: string;
  filters: FiltersState;
  appliedFilters: FiltersState;
  onFilterChange: (filterType: keyof FiltersState, value: string) => void;
  onApplyFilters: () => void;
  onClearAllFilters: () => void;
  onOpenFiltersSidebar: () => void;
  availableUsers: User[];
  onClearIndividualFilter: (filterType: keyof FiltersState, value?: string) => void;
}

const TestRunsFilters: React.FC<TestRunsFiltersProps> = ({
  searchTerm,
  onSearchTermChange,
  onSearchKeyPress,
  currentSearchTerm,
  appliedFilters,
  // onApplyFilters,
  onClearAllFilters,
  onOpenFiltersSidebar,
  availableUsers,
  onClearIndividualFilter
}) => {
  const hasActiveFilters = currentSearchTerm || 
    appliedFilters.assignee !== 'all' ||
    appliedFilters.state !== 'all';

  const getAssigneeName = (assigneeId: string): string => {
    const user = availableUsers.find(u => u.id === assigneeId);
    return user ? user.name : `User ${assigneeId}`;
  };

  const getStateName = (stateId: string): string => {
    const stateLabels = {
      '1': 'New',
      '2': 'In progress',
      '3': 'Under review',
      '4': 'Rejected',
      '5': 'Done',
      '6': 'Closed'
    };
    return stateLabels[stateId as keyof typeof stateLabels] || `State ${stateId}`;
  };

  return (
    <Card className="p-6">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
            <input
              type="text"
              placeholder="Search test runs by name..."
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
              onKeyPress={onSearchKeyPress}
              className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
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
            {appliedFilters.assignee !== 'all' && (
              <span className="ml-2 px-2 py-0.5 bg-cyan-500 text-white text-xs rounded-full">
                1
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Active filters display */}
      {hasActiveFilters && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-400">Active filters:</span>
          {currentSearchTerm && (
            <span className="inline-flex items-center px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded-full text-sm text-cyan-400">
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
          {appliedFilters.assignee !== 'all' && (
            <span className="inline-flex items-center px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-sm text-purple-400">
              Assignee: {getAssigneeName(appliedFilters.assignee)}
              <button
                onClick={() => onClearIndividualFilter('assignee')}
                className="ml-2 text-purple-400 hover:text-purple-300 transition-colors"
                title="Clear assignee filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {appliedFilters.state !== 'all' && (
            <span className="inline-flex items-center px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full text-sm text-green-400">
              State: {getStateName(appliedFilters.state)}
              <button
                onClick={() => onClearIndividualFilter('state')}
                className="ml-2 text-green-400 hover:text-green-300 transition-colors"
                title="Clear state filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          <button
            onClick={onClearAllFilters}
            className="text-sm text-gray-400 hover:text-white underline"
          >
            Clear all filters
          </button>
        </div>
      )}
    </Card>
  );
};

export default TestRunsFilters;