import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const useTestCasesNavigation = (
  selectedProject: { id: string } | null,
  fetchAllTestCasesAndExtractFolders: (projectId: string, filters?: Record<string, unknown>) => Promise<void>,
  updateFilter: (filterType: string, value: string | string[]) => void
) => {
  const location = useLocation();
  const [hasPendingNavigationFilter, setHasPendingNavigationFilter] = useState(false);
  const [isApplyingNavigationFilter, setIsApplyingNavigationFilter] = useState(false);

  // Handle navigation from dashboard with filters
  useEffect(() => {
    const navigationState = location.state as { applyFilter?: { type: string; value: string; label: string } } | undefined;
    if (navigationState?.applyFilter && selectedProject) {
      const { type: filterType, value, label } = navigationState.applyFilter;
      
      console.log('🎯 Applying filter from dashboard navigation:', filterType, value, label);
      
      if (filterType === 'type') {
        // Mark that we have a pending navigation filter
        setHasPendingNavigationFilter(true);
        
        // Set loading state for navigation filter
        setIsApplyingNavigationFilter(true);
        
        // Apply the filter to the filters state so it displays in the UI
        updateFilter('type', value.toString());
        
        // Apply the filter immediately during initial load
        const initialFilters = { type: value };
        
        // Trigger initial load with filters
        fetchAllTestCasesAndExtractFolders(selectedProject.id, initialFilters).finally(() => {
          setIsApplyingNavigationFilter(false);
          setHasPendingNavigationFilter(false); // Reset the flag after loading
        });
      }
      
      // Clear the navigation state to prevent re-applying on subsequent renders
      window.history.replaceState({}, document.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- updateFilter changes too often, would cause infinite loops
  }, [location.state, selectedProject, fetchAllTestCasesAndExtractFolders]);

  return {
    hasPendingNavigationFilter,
    isApplyingNavigationFilter
  };
};