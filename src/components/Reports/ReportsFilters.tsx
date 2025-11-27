import React from 'react';
import { Search, Filter, Calendar, X } from 'lucide-react';
import Card from '../UI/Card';

interface ReportsFiltersProps {
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  onSearchKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  currentSearchTerm: string;
  typeFilter: string;
  onTypeFilterChange: (type: string) => void;
  dateFilter: string;
  onDateFilterChange: (date: string) => void;
  onClearFilters: () => void;
}

const ReportsFilters: React.FC<ReportsFiltersProps> = ({
  searchTerm,
  onSearchTermChange,
  onSearchKeyPress,
  currentSearchTerm,
  typeFilter,
  onTypeFilterChange,
  dateFilter,
  onDateFilterChange,
  onClearFilters
}) => {
  const hasActiveFilters = currentSearchTerm || typeFilter !== 'all' || dateFilter !== 'all';

  return (
    <Card className="p-6">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search reports by name..."
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
              onKeyPress={onSearchKeyPress}
              className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400"
            />
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-400 dark:text-gray-400" />
            <select
              value={typeFilter}
              onChange={(e) => onTypeFilterChange(e.target.value)}
              className="px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400"
            >
              <option value="all">All Types</option>
              <option value="execution">Test Execution</option>
              <option value="project">Project Summary</option>
              <option value="dashboard">Dashboard</option>
              <option value="trend">Trend Analysis</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-slate-400 dark:text-gray-400" />
            <select
              value={dateFilter}
              onChange={(e) => onDateFilterChange(e.target.value)}
              className="px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
            </select>
          </div>
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
                onClick={() => onSearchTermChange('')}
                className="ml-2 text-cyan-400 hover:text-cyan-300 transition-colors"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {typeFilter !== 'all' && (
            <span className="inline-flex items-center px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-sm text-purple-400">
              Type: {typeFilter}
              <button
                onClick={() => onTypeFilterChange('all')}
                className="ml-2 text-purple-400 hover:text-purple-300 transition-colors"
                title="Clear type filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {dateFilter !== 'all' && (
            <span className="inline-flex items-center px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full text-sm text-green-700 dark:text-green-400">
              Date: {dateFilter}
              <button
                onClick={() => onDateFilterChange('all')}
                className="ml-2 text-green-400 hover:text-green-300 transition-colors"
                title="Clear date filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          <button
            onClick={onClearFilters}
            className="text-sm text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white underline"
          >
            Clear all filters
          </button>
        </div>
      )}
    </Card>
  );
};

export default ReportsFilters;