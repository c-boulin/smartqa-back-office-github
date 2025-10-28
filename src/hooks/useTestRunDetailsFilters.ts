import { useState, useCallback } from 'react';
import { Tag } from '../services/tagsApi';

interface FiltersState {
  automationStatus: string;
  priority: string;
  type: string;
  state: string;
  result: string;
  tags: Tag[];
}

export const useTestRunDetailsFilters = () => {
  const [filters, setFilters] = useState<FiltersState>({
    automationStatus: 'all',
    priority: 'all',
    type: 'all',
    state: 'all',
    result: 'all',
    tags: []
  });

  const updateFilter = useCallback((filterType: keyof FiltersState, value: string | string[]) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilters({
      automationStatus: 'all',
      priority: 'all',
      type: 'all',
      state: 'all',
      result: 'all',
      tags: []
    });
  }, []);

  const hasActiveFilters = useCallback(() => {
    return filters.automationStatus !== 'all' || 
           filters.priority !== 'all' || 
           filters.type !== 'all' || 
           filters.state !== 'all' ||
           filters.result !== 'all' ||
           (filters.tags && filters.tags.length > 0);
  }, [filters]);

  const buildFilterCriteria = useCallback(() => {
    return {
      automationStatus: filters.automationStatus !== 'all' ? filters.automationStatus : undefined,
      priority: filters.priority !== 'all' ? filters.priority : undefined,
      type: filters.type !== 'all' ? filters.type : undefined,
      state: filters.state !== 'all' ? filters.state : undefined,
      result: filters.result !== 'all' ? filters.result : undefined,
      tags: filters.tags && filters.tags.length > 0 ? filters.tags : undefined
    };
  }, [filters]);

  return {
    filters,
    updateFilter,
    clearAllFilters,
    hasActiveFilters,
    buildFilterCriteria
  };
};