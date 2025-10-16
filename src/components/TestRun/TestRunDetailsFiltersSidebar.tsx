import React from 'react';
import { X } from 'lucide-react';
import Button from '../UI/Button';
import TagSelector from '../UI/TagSelector';
import { AUTOMATION_STATUS_LABELS, TEST_CASE_TYPES } from '../../types';
import { Tag } from '../../services/tagsApi';

interface FiltersState {
  automationStatus: string;
  priority: string;
  type: string;
  state: string;
  result: string;
  tags: Tag[];
}

interface TestRunDetailsFiltersSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FiltersState;
  onFilterChange: (filterType: keyof FiltersState, value: any) => void;
  onApplyFilters: () => void;
  onClearAllFilters: () => void;
  availableTags: Tag[];
  onCreateTag: (label: string) => Promise<Tag>;
}

const TestRunDetailsFiltersSidebar: React.FC<TestRunDetailsFiltersSidebarProps> = ({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  onApplyFilters,
  onClearAllFilters,
  availableTags,
  onCreateTag
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="absolute right-0 top-0 h-full w-96 bg-gradient-to-b from-slate-800 to-slate-900 border-l border-purple-500/30 shadow-2xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700">
            <h3 className="text-xl font-semibold text-white">Filters</h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Filters Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Execution Result Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Execution Result
              </label>
              <select
                value={filters.result}
                onChange={(e) => onFilterChange('result', e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                <option value="all">All Results</option>
                <option value="passed">Passed</option>
                <option value="failed">Failed</option>
                <option value="blocked">Blocked</option>
                <option value="retest">Retest</option>
                <option value="skipped">Skipped</option>
                <option value="untested">Untested</option>
                <option value="in_progress">In Progress</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>

            {/* Automation Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Automation Status
              </label>
              <select
                value={filters.automationStatus}
                onChange={(e) => onFilterChange('automationStatus', e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                <option value="all">All Automation Status</option>
                <option value="1">{AUTOMATION_STATUS_LABELS[1]}</option>
                <option value="2">{AUTOMATION_STATUS_LABELS[2]}</option>
                <option value="3">{AUTOMATION_STATUS_LABELS[3]}</option>
                <option value="4">{AUTOMATION_STATUS_LABELS[4]}</option>
                <option value="5">{AUTOMATION_STATUS_LABELS[5]}</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Priority
              </label>
              <select
                value={filters.priority}
                onChange={(e) => onFilterChange('priority', e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                <option value="all">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Test Type
              </label>
              <select
                value={filters.type}
                onChange={(e) => onFilterChange('type', e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                <option value="all">All Types</option>
                {Object.entries(TEST_CASE_TYPES).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Tags Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Tags
              </label>
              <TagSelector
                availableTags={availableTags}
                selectedTags={filters.tags}
                onTagsChange={(selectedTags) => onFilterChange('tags', selectedTags)}
                onCreateTag={onCreateTag}
                placeholder="Search or create tags..."
              />
            </div>

            {/* State Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                State
              </label>
              <select
                value={filters.state}
                onChange={(e) => onFilterChange('state', e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                <option value="all">All States</option>
                <option value="1">Active</option>
                <option value="2">Draft</option>
                <option value="3">In Review</option>
                <option value="4">Outdated</option>
                <option value="5">Rejected</option>
              </select>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-700 p-6">
            <div className="flex space-x-3">
              <Button
                variant="secondary"
                onClick={onClearAllFilters}
                className="flex-1"
              >
                Clear All
              </Button>
              <Button
                onClick={() => {
                  onApplyFilters();
                  onClose();
                }}
                className="flex-1"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestRunDetailsFiltersSidebar;