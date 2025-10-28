import { useState, useCallback } from 'react';
import { Tag } from '../services/tagsApi';

interface FiltersState {
  automationStatus: string;
  priority: string;
  type: string;
  state: string;
  tags: Tag[];
}

export const useTestCasesFilters = () => {
  const [filters, setFilters] = useState<FiltersState>({
    automationStatus: 'all',
    priority: 'all',
    type: 'all',
    state: 'all',
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
      tags: []
    });
  }, []);

  const hasActiveFilters = useCallback(() => {
    return filters.automationStatus !== 'all' || 
           filters.priority !== 'all' || 
           filters.type !== 'all' || 
           filters.state !== 'all' ||
           (filters.tags && filters.tags.length > 0);
  }, [filters]);

  const getPriorityNumber = (priority: 'low' | 'medium' | 'high' | 'critical'): number => {
    const priorityMap = { 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };
    return priorityMap[priority];
  };

  const buildMultipleFilters = useCallback(() => {
    const multipleFilters: Record<string, string | string[]> = {};
    
    if (filters.automationStatus !== 'all') {
      multipleFilters.automationStatus = parseInt(filters.automationStatus) as 1 | 2 | 3 | 4 | 5;
    }
    
    if (filters.priority !== 'all') {
      const priorityValue = getPriorityNumber(filters.priority as 'low' | 'medium' | 'high' | 'critical');
      multipleFilters.priority = priorityValue;
    }
    
    if (filters.type !== 'all') {
      multipleFilters.type = parseInt(filters.type);
    }
    
    if (filters.state !== 'all') {
      multipleFilters.state = parseInt(filters.state);
    }
    
    if (filters.tags && filters.tags.length > 0) {
      multipleFilters.tagIds = filters.tags.map(tag => tag.id);
    }
    
    return multipleFilters;
  }, [filters]);

  return {
    filters,
    updateFilter,
    clearAllFilters,
    hasActiveFilters,
    buildMultipleFilters
  };
};