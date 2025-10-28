import React, { useState, useRef, useEffect } from 'react';
import { Search, Calendar, X, Loader, ChevronDown } from 'lucide-react';
import { useTestPlans } from '../../hooks/useTestPlans';

export interface TestPlan {
  id: string;
  title: string;
}

interface TestPlanSelectorProps {
  selectedTestPlanId: string;
  onTestPlanChange: (testPlanId: string) => void;
  disabled?: boolean;
  placeholder?: string;
  projectId?: string;
}

const TestPlanSelector: React.FC<TestPlanSelectorProps> = ({
  selectedTestPlanId,
  onTestPlanChange,
  disabled = false,
  placeholder = 'Select test plan...',
  projectId
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasLoadedRef = useRef(false);
  const isLoadingRef = useRef(false);

  const { 
    testPlans, 
    loading, 
    error, 
    searchTestPlans,
    fetchTestPlans 
  } = useTestPlans(projectId);

  // Debounce search term
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  // Perform search when debounced term changes
  useEffect(() => {
    if (isOpen) {
      if (debouncedSearchTerm.trim()) {
        searchTestPlans(debouncedSearchTerm);
      } else {
        loadAllTestPlans();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadAllTestPlans is stable
  }, [debouncedSearchTerm, isOpen, searchTestPlans, fetchTestPlans]);

  // Load all test plans efficiently when dropdown opens
  const loadAllTestPlans = async () => {
    if (hasLoadedRef.current || isLoadingRef.current) {
      return;
    }

    try {
      isLoadingRef.current = true;
      console.log('📋 Loading test plans - making first request...');
      
      // Make first request to get total count
      await fetchTestPlans(1);
      
      // Check if we got any data
      if (testPlans.length === 0) {
        console.log('📋 No test plans found - stopping requests');
        hasLoadedRef.current = true;
        return;
      }
      
      console.log('📋 Found test plans, checking for additional pages...');
      // If there are more pages, load them
      // This will be handled by the useTestPlans hook pagination logic
      
      hasLoadedRef.current = true;
    } catch (error) {
      console.error('📋 Failed to load test plans:', error);
      hasLoadedRef.current = true; // Mark as loaded to prevent infinite retries
    } finally {
      isLoadingRef.current = false;
    }
  };

  useEffect(() => {
    if (isOpen && !hasLoadedRef.current && !isLoadingRef.current) {
      loadAllTestPlans();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadAllTestPlans is stable
  }, [isOpen]);

  // Filter test plans based on search term (client-side filtering for better UX)
  const filteredTestPlans = testPlans.filter(testPlan =>
    testPlan.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Find selected test plan
  const selectedTestPlan = testPlans.find(tp => tp.id === selectedTestPlanId);

  const handleTestPlanSelect = (testPlan: TestPlan) => {
    onTestPlanChange(testPlan.id);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClearSelection = () => {
    onTestPlanChange('');
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredTestPlans.length > 0) {
        handleTestPlanSelect(filteredTestPlans[0]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Main Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 text-left flex items-center justify-between"
      >
        <div className="flex items-center flex-1 min-w-0">
          <Calendar className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
          <span className="truncate">
            {selectedTestPlan ? selectedTestPlan.title : placeholder}
          </span>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
          {selectedTestPlan && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClearSelection();
              }}
              className="text-gray-400 hover:text-red-400 transition-colors"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg z-50 max-h-80 overflow-hidden">
          {/* Search Bar */}
          <div className="p-3 border-b border-slate-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search test plans..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full pl-10 pr-8 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 text-sm"
                autoFocus
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Options */}
          <div className="max-h-60 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
                <span className="text-gray-400 text-sm">Loading test plans...</span>
              </div>
            ) : error ? (
              <div className="px-4 py-3 text-red-400 text-sm">
                Failed to load test plans: {error}
              </div>
            ) : (
              <>
                {/* Clear selection option */}
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="w-full px-4 py-3 text-left hover:bg-slate-700 transition-colors text-gray-400 border-b border-slate-700"
                >
                  <div className="flex items-center">
                    <X className="w-4 h-4 mr-2" />
                    No test plan
                  </div>
                </button>

                {/* Test plan options */}
                {filteredTestPlans.length > 0 ? (
                  filteredTestPlans.map((testPlan) => (
                    <button
                      key={testPlan.id}
                      type="button"
                      onClick={() => handleTestPlanSelect(testPlan)}
                      className={`w-full px-4 py-3 text-left hover:bg-slate-700 transition-colors ${
                        selectedTestPlanId === testPlan.id ? 'bg-slate-700 text-cyan-400' : 'text-white'
                      }`}
                    >
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{testPlan.title}</div>
                          <div className="text-xs text-gray-400">ID: {testPlan.id}</div>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-gray-400 text-sm">
                    {searchTerm ? `No test plans found matching "${searchTerm}"` : 'No test plans available'}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TestPlanSelector;