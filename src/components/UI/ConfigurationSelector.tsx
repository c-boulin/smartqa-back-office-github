import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Settings as ConfigIcon, Loader, Search, ChevronDown } from 'lucide-react';
import { Configuration } from '../../services/configurationsApi';
import { configurationsApiService } from '../../services/configurationsApi';

interface ConfigurationSelectorProps {
  selectedConfigurations: Configuration[];
  onConfigurationsChange: (configurations: Configuration[]) => void;
  onCreateConfiguration?: (label: string) => Promise<Configuration>;
  disabled?: boolean;
  placeholder?: string;
}

const ConfigurationSelector: React.FC<ConfigurationSelectorProps> = ({
  selectedConfigurations,
  onConfigurationsChange,
  onCreateConfiguration,
  disabled = false,
  placeholder = 'Select configurations...'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [configurations, setConfigurations] = useState<Configuration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hasLoadedRef = useRef(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        searchConfigurations(debouncedSearchTerm);
      } else {
        loadAllConfigurations();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- searchConfigurations is stable
  }, [debouncedSearchTerm, isOpen]);

  // Load all configurations efficiently when dropdown opens
  const loadAllConfigurations = async () => {
    if (hasLoadedRef.current) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('⚙️ Loading configurations - making first request...');
      
      // Make first request to get total count
      const firstPageResponse = await configurationsApiService.getConfigurations();
      
      // Check if we got any data
      if (!firstPageResponse.data || firstPageResponse.data.length === 0) {
        console.log('⚙️ No configurations found - stopping requests');
        setConfigurations([]);
        hasLoadedRef.current = true;
        return;
      }
      
      console.log('⚙️ Found configurations, checking for additional pages...');
      
      // Start with first page data
      let allConfigurations = firstPageResponse.data.map(apiConfig => 
        configurationsApiService.transformApiConfiguration(apiConfig)
      );
      
      // Check if there are more pages
      const totalItems = firstPageResponse.meta.totalItems;
      const itemsPerPage = firstPageResponse.meta.itemsPerPage;
      const totalPages = Math.ceil(totalItems / itemsPerPage);
      
      if (totalPages > 1) {
        console.log(`⚙️ Fetching remaining ${totalPages - 1} pages...`);
        
        // Fetch remaining pages in parallel
        const pagePromises = [];
        for (let page = 2; page <= totalPages; page++) {
          pagePromises.push(
            configurationsApiService.getConfigurations()
              .then(response => response.data.map(apiConfig => 
                configurationsApiService.transformApiConfiguration(apiConfig)
              ))
          );
        }
        
        const allPageResults = await Promise.all(pagePromises);
        
        // Combine all results
        for (const pageConfigurations of allPageResults) {
          allConfigurations = [...allConfigurations, ...pageConfigurations];
        }
      }
      
      setConfigurations(allConfigurations);
      hasLoadedRef.current = true;
      console.log('⚙️ Successfully loaded all configurations:', allConfigurations.length);
      
    } catch (err) {
      console.error('⚙️ Failed to load configurations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load configurations');
      setConfigurations([]);
      hasLoadedRef.current = true; // Mark as loaded to prevent infinite retries
    } finally {
      setLoading(false);
    }
  };

  const searchConfigurations = async (searchTerm: string) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Searching configurations:', searchTerm);
      
      // For now, filter from loaded configurations
      // In the future, this could be replaced with a search API endpoint
      const filtered = configurations.filter(config =>
        config.label.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      setConfigurations(filtered);
      
    } catch (err) {
      console.error('⚙️ Failed to search configurations:', err);
      setError(err instanceof Error ? err.message : 'Failed to search configurations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !hasLoadedRef.current) {
      loadAllConfigurations();
    }
  }, [isOpen]);

  // Filter configurations based on search term and exclude already selected
  const filteredConfigurations = (configurations || []).filter(config =>
    config && config.label && 
    !selectedConfigurations.some(selected => selected && selected.id === config.id)
  );

  // Check if search term would create a new configuration
  const canCreateNew = searchTerm.trim() && 
    !(configurations || []).some(config => config.label.toLowerCase() === searchTerm.toLowerCase()) &&
    !selectedConfigurations.some(config => config.label.toLowerCase() === searchTerm.toLowerCase()) &&
    onCreateConfiguration;

  const handleConfigurationSelect = (config: Configuration) => {
    if (!selectedConfigurations.some(selected => selected.id === config.id)) {
      onConfigurationsChange([...selectedConfigurations, config]);
    }
    setSearchTerm('');
    setIsOpen(false);
  };

  const handleConfigurationRemove = (configToRemove: Configuration) => {
    onConfigurationsChange(selectedConfigurations.filter(config => config.id !== configToRemove.id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (canCreateNew) {
        // Create a temporary configuration that will be created on form submission
        const tempConfig: Configuration = {
          id: `temp-${Date.now()}`,
          label: searchTerm.trim()
        };
        onConfigurationsChange([...selectedConfigurations, tempConfig]);
        setSearchTerm('');
        setIsOpen(false);
      } else if (filteredConfigurations.length > 0) {
        handleConfigurationSelect(filteredConfigurations[0]);
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
      {/* Selected Configurations */}
      {selectedConfigurations.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedConfigurations.map((config) => (
            <span
              key={config.id}
              className="inline-flex items-center px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-sm text-blue-400"
            >
              <ConfigIcon className="w-3 h-3 mr-1" />
              {config.label}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleConfigurationRemove(config)}
                  className="ml-2 text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Main Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 text-left flex items-center justify-between"
      >
        <div className="flex items-center flex-1 min-w-0">
          <ConfigIcon className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
          <span className="truncate">
            {selectedConfigurations.length > 0 
              ? `${selectedConfigurations.length} configuration${selectedConfigurations.length !== 1 ? 's' : ''} selected`
              : placeholder
            }
          </span>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
          {selectedConfigurations.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onConfigurationsChange([]);
              }}
              className="text-gray-400 hover:text-red-400 transition-colors"
              title="Clear all selections"
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
                placeholder="Search configurations..."
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
                <span className="text-gray-400 text-sm">Loading configurations...</span>
              </div>
            ) : error ? (
              <div className="px-4 py-3 text-red-400 text-sm">
                Failed to load configurations: {error}
              </div>
            ) : (
              <>
                {/* Clear selection option */}
                <button
                  type="button"
                  onClick={() => onConfigurationsChange([])}
                  className="w-full px-4 py-3 text-left hover:bg-slate-700 transition-colors text-gray-400 border-b border-slate-700"
                >
                  <div className="flex items-center">
                    <X className="w-4 h-4 mr-2" />
                    Clear all selections
                  </div>
                </button>

                {/* Configuration options */}
                {filteredConfigurations.length > 0 ? (
                  filteredConfigurations.map((config) => (
                    <button
                      key={config.id}
                      type="button"
                      onClick={() => handleConfigurationSelect(config)}
                      className={`w-full px-4 py-3 text-left hover:bg-slate-700 transition-colors ${
                        selectedConfigurations.some(selected => selected.id === config.id) ? 'bg-slate-700 text-cyan-400' : 'text-white'
                      }`}
                    >
                      <div className="flex items-center">
                        <ConfigIcon className="w-4 h-4 mr-2 text-gray-400" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{config.label}</div>
                          <div className="text-xs text-gray-400">ID: {config.id}</div>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-gray-400 text-sm">
                    {searchTerm ? `No configurations found matching "${searchTerm}"` : 'No configurations available'}
                  </div>
                )}

                {/* Create new configuration option */}
                {canCreateNew && (
                  <button
                    type="button"
                    onClick={() => {
                      // Create a temporary configuration that will be created on form submission
                      const tempConfig: Configuration = {
                        id: `temp-${Date.now()}`,
                        label: searchTerm.trim()
                      };
                      onConfigurationsChange([...selectedConfigurations, tempConfig]);
                      setSearchTerm('');
                      setIsOpen(false);
                    }}
                    className="w-full px-4 py-3 text-left text-cyan-400 hover:bg-slate-700 transition-colors flex items-center border-t border-slate-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create "{searchTerm}" (will be created on save)
                  </button>
                )}

              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfigurationSelector;