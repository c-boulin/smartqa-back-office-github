import React, { useState } from 'react';
import { X, Search, ChevronDown, ChevronUp } from 'lucide-react';
import Button from '../UI/Button';
import { Tag } from '../../services/tagsApi';

interface FiltersState {
  automationStatus: string;
  priority: string;
  type: string;
  state: string;
  tags: Tag[];
}

interface TestCasesFiltersSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FiltersState;
  onFilterChange: (filterType: keyof FiltersState, value: string | string[]) => void;
  onApplyFilters: () => void;
  onClearAllFilters: () => void;
  availableTags: Tag[];
  onCreateTag: (label: string) => Promise<Tag>;
}

interface FilterGroupProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const FilterGroup: React.FC<FilterGroupProps> = ({ title, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-200 dark:border-slate-700 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-3 px-1 text-sm font-semibold text-slate-700 dark:text-white hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        {title}
        {open
          ? <ChevronUp className="w-4 h-4 text-slate-400 dark:text-gray-500" />
          : <ChevronDown className="w-4 h-4 text-slate-400 dark:text-gray-500" />
        }
      </button>
      {open && (
        <div className="pb-3 space-y-1.5 px-1">
          {children}
        </div>
      )}
    </div>
  );
};

interface CheckItemProps {
  label: string;
  checked: boolean;
  onChange: () => void;
}

const CheckItem: React.FC<CheckItemProps> = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-3 py-1 cursor-pointer group">
    <div
      className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
        checked
          ? 'bg-cyan-500 border-cyan-500'
          : 'border-slate-300 dark:border-slate-600 group-hover:border-cyan-400 dark:group-hover:border-cyan-500'
      }`}
      onClick={onChange}
    >
      {checked && (
        <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
          <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
    <span className="text-sm text-slate-700 dark:text-gray-300">{label}</span>
  </label>
);

const TestCasesFiltersSidebar: React.FC<TestCasesFiltersSidebarProps> = ({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  onApplyFilters,
  onClearAllFilters,
  availableTags,
}) => {
  const [tagSearch, setTagSearch] = useState('');

  if (!isOpen) return null;

  const filteredTags = availableTags.filter(t =>
    t.label.toLowerCase().includes(tagSearch.toLowerCase())
  );

  const toggleAutomation = (val: string) => {
    onFilterChange('automationStatus', filters.automationStatus === val ? 'all' : val);
  };

  const togglePriority = (val: string) => {
    onFilterChange('priority', filters.priority === val ? 'all' : val);
  };

  const toggleType = (val: string) => {
    onFilterChange('type', filters.type === val ? 'all' : val);
  };

  const toggleState = (val: string) => {
    onFilterChange('state', filters.state === val ? 'all' : val);
  };

  const toggleTag = (tag: Tag) => {
    const exists = filters.tags.some(t => t.id === tag.id);
    const next = exists
      ? filters.tags.filter(t => t.id !== tag.id)
      : [...filters.tags, tag];
    onFilterChange('tags', next);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Filters</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter groups */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-0">
          <FilterGroup title="Execution">
            <CheckItem label="Not automated" checked={filters.automationStatus === '1'} onChange={() => toggleAutomation('1')} />
            <CheckItem label="Automation not required" checked={filters.automationStatus === '5'} onChange={() => toggleAutomation('5')} />
            <CheckItem label="Automated" checked={filters.automationStatus === '2'} onChange={() => toggleAutomation('2')} />
            <CheckItem label="Cannot be automated" checked={filters.automationStatus === '4'} onChange={() => toggleAutomation('4')} />
          </FilterGroup>

          <FilterGroup title="Priority">
            <CheckItem label="Low" checked={filters.priority === 'low'} onChange={() => togglePriority('low')} />
            <CheckItem label="Medium" checked={filters.priority === 'medium'} onChange={() => togglePriority('medium')} />
            <CheckItem label="High" checked={filters.priority === 'high'} onChange={() => togglePriority('high')} />
            <CheckItem label="Critical" checked={filters.priority === 'critical'} onChange={() => togglePriority('critical')} />
          </FilterGroup>

          <FilterGroup title="Test type">
            <CheckItem label="Compatibility" checked={filters.type === '4'} onChange={() => toggleType('4')} />
            <CheckItem label="Functional" checked={filters.type === '6'} onChange={() => toggleType('6')} />
            <CheckItem label="Regression" checked={filters.type === '8'} onChange={() => toggleType('8')} />
            <CheckItem label="Accessibility" checked={filters.type === '3'} onChange={() => toggleType('3')} />
            <CheckItem label="Performance" checked={filters.type === '7'} onChange={() => toggleType('7')} />
            <CheckItem label="Security" checked={filters.type === '9'} onChange={() => toggleType('9')} />
            <CheckItem label="Smoke & Sanity" checked={filters.type === '10'} onChange={() => toggleType('10')} />
            <CheckItem label="Usability" checked={filters.type === '11'} onChange={() => toggleType('11')} />
            <CheckItem label="Other" checked={filters.type === '1'} onChange={() => toggleType('1')} />
          </FilterGroup>

          <FilterGroup title="Tags" defaultOpen={false}>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search tags..."
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {filteredTags.map(tag => (
                <CheckItem
                  key={tag.id}
                  label={tag.label}
                  checked={filters.tags.some(t => t.id === tag.id)}
                  onChange={() => toggleTag(tag)}
                />
              ))}
              {filteredTags.length === 0 && (
                <p className="text-xs text-slate-400 dark:text-gray-500 py-2">No tags found</p>
              )}
            </div>
          </FilterGroup>

          <FilterGroup title="State">
            <CheckItem label="Active" checked={filters.state === '1'} onChange={() => toggleState('1')} />
            <CheckItem label="Draft" checked={filters.state === '2'} onChange={() => toggleState('2')} />
            <CheckItem label="In Review" checked={filters.state === '3'} onChange={() => toggleState('3')} />
            <CheckItem label="Outdated" checked={filters.state === '4'} onChange={() => toggleState('4')} />
            <CheckItem label="Rejected" checked={filters.state === '5'} onChange={() => toggleState('5')} />
          </FilterGroup>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-slate-700 px-6 py-4 flex gap-3">
          <Button
            variant="secondary"
            onClick={() => { onClearAllFilters(); }}
            className="flex-1"
          >
            Clear All
          </Button>
          <Button
            onClick={() => { onApplyFilters(); onClose(); }}
            className="flex-1"
          >
            Apply Filters
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TestCasesFiltersSidebar;
