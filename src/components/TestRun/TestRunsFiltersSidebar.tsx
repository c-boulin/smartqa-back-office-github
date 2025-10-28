import React from 'react';
import { X, Search } from 'lucide-react';
import Button from '../UI/Button';
import { User } from '../../services/usersApi';

interface FiltersState {
  assignee: string;
  state: string;
}

interface TestRunsFiltersSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FiltersState;
  onFilterChange: (filterType: keyof FiltersState, value: string) => void;
  onApplyFilters: () => void;
  onClearAllFilters: () => void;
  availableUsers: User[];
}

const TestRunsFiltersSidebar: React.FC<TestRunsFiltersSidebarProps> = ({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  onApplyFilters,
  onClearAllFilters,
  availableUsers
}) => {
  const [userSearchTerm, setUserSearchTerm] = React.useState('');
  const [isAssigneeDropdownOpen, setIsAssigneeDropdownOpen] = React.useState(false);

  // Filter users based on search term
  const filteredUsers = availableUsers.filter(user =>
    user.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

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
            {/* Assignee Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Assignee
              </label>
              
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsAssigneeDropdownOpen(!isAssigneeDropdownOpen)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 text-left flex items-center justify-between"
                >
                  <span>
                    {filters.assignee === 'all' 
                      ? 'All Assignees' 
                      : availableUsers.find(u => u.id === filters.assignee)?.name || 'Unknown User'
                    }
                  </span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isAssigneeDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setIsAssigneeDropdownOpen(false)}
                    />
                    <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg z-20 max-h-60 overflow-y-auto">
                      {/* Search bar inside dropdown */}
                      <div className="p-3 border-b border-slate-700">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <input
                            type="text"
                            placeholder="Search users..."
                            value={userSearchTerm}
                            onChange={(e) => setUserSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-8 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm"
                            autoFocus
                          />
                          {userSearchTerm && (
                            <button
                              onClick={() => setUserSearchTerm('')}
                              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Dropdown options */}
                      <div>
                        <button
                          type="button"
                          onClick={() => {
                            onFilterChange('assignee', 'all');
                            setIsAssigneeDropdownOpen(false);
                          }}
                          className={`w-full px-4 py-2 text-left hover:bg-slate-700 transition-colors ${
                            filters.assignee === 'all' ? 'bg-slate-700 text-cyan-400' : 'text-white'
                          }`}
                        >
                          All Assignees
                        </button>
                        
                        {filteredUsers.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => {
                              onFilterChange('assignee', user.id);
                              setIsAssigneeDropdownOpen(false);
                            }}
                            className={`w-full px-4 py-2 text-left hover:bg-slate-700 transition-colors ${
                              filters.assignee === user.id ? 'bg-slate-700 text-cyan-400' : 'text-white'
                            }`}
                          >
                            <div>
                              <div className="font-medium">{user.name}</div>
                              <div className="text-xs text-gray-400">{user.email}</div>
                            </div>
                          </button>
                        ))}
                        
                        {/* Show search results info */}
                        {userSearchTerm && filteredUsers.length === 0 && (
                          <div className="px-4 py-2 text-xs text-gray-400">
                            No users found matching "{userSearchTerm}"
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
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
                <option value="1">New</option>
                <option value="2">In progress</option>
                <option value="3">Under review</option>
                <option value="4">Rejected</option>
                <option value="5">Done</option>
                <option value="6">Closed</option>
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

export default TestRunsFiltersSidebar;