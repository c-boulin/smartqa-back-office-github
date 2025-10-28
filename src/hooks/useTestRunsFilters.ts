import { useState, useCallback } from 'react';

interface FiltersState {
  assignee: string;
  state: string;
}

export const useTestRunsFilters = () => {
  const [filters, setFilters] = useState<FiltersState>({
    assignee: 'all',
    state: 'all'
  });

  const [appliedFilters, setAppliedFilters] = useState<FiltersState>({
    assignee: 'all',
    state: 'all'
  });
  const updateFilter = useCallback((filterType: keyof FiltersState, value: string) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
  }, []);

  const applyFilters = useCallback(() => {
    setAppliedFilters({ ...filters });
  }, [filters]);
  const clearAllFilters = useCallback(() => {
    setFilters({
      assignee: 'all',
      state: 'all'
    });
    setAppliedFilters({
      assignee: 'all',
      state: 'all'
    });
  }, []);

  const hasActiveFilters = useCallback(() => {
    return appliedFilters.assignee !== 'all' || appliedFilters.state !== 'all';
  }, [appliedFilters]);

  const buildMultipleFilters = useCallback(() => {
    const multipleFilters: Record<string, string> = {};
    
    if (appliedFilters.assignee !== 'all') {
      multipleFilters.assignee = appliedFilters.assignee;
    }
    
    if (appliedFilters.state !== 'all') {
      multipleFilters.state = appliedFilters.state;
    }
    
    return multipleFilters;
  }, [appliedFilters]);

  return {
    filters,
    appliedFilters,
    updateFilter,
    applyFilters,
    clearAllFilters,
    hasActiveFilters,
    buildMultipleFilters
  };
};