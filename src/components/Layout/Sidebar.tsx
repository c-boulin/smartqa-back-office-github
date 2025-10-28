import React, { useState, useEffect, useCallback } from 'react';
import { useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  TestTube, 
  Play, 
  Calendar, 
  BarChart3, 
  Settings,
  Layers,
  ChevronDown,
  Loader,
  Search,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { projectsApiService } from '../../services/projectsApi';

const Sidebar: React.FC = () => {
  const { state, dispatch, getSelectedProject, loadProjects } = useApp();
  const { state: authState } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [isLoadingDropdown, setIsLoadingDropdown] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasLoadedAllProjects = useRef(false);
  const isLoadingAllProjects = useRef(false);

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/test-cases', icon: TestTube, label: 'Test Cases' },
    { path: '/shared-steps', icon: Layers, label: 'Shared Steps' },
    { path: '/test-runs', icon: Play, label: 'Test Runs' },
    { path: '/test-plans', icon: Calendar, label: 'Test Plans' },
    { path: '/reports', icon: BarChart3, label: 'Reports' },
    { path: '/settings', icon: Settings, label: 'Settings' }
  ];

  // Use allProjects for search, fallback to state.projects for display
  const projectsToShow = allProjects.length > 0 ? allProjects : state.projects;
  
  // Filter projects based on search term
  const filteredProjects = projectsToShow
    .filter(project =>
      project.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // Sort by creation date (newest first)

  // Load ALL projects by fetching all pages in parallel
  const loadAllProjects = useCallback(async () => {
    if (hasLoadedAllProjects.current || isLoadingAllProjects.current) {
      console.log('✅ All projects already loaded, count:', allProjects.length);
      return; // Already loaded and not searching
    }
    
    try {
      isLoadingAllProjects.current = true;
      setIsLoadingDropdown(true);
      console.log('🔍 Loading ALL projects for sidebar...');
      
      // First, get the first page to know total count
      const firstPageResponse = await projectsApiService.getProjectsForSidebarPage(1, searchTerm);
      const totalItems = firstPageResponse.meta.totalItems;
      const itemsPerPage = firstPageResponse.meta.itemsPerPage;
      const totalPages = Math.ceil(totalItems / itemsPerPage);
      
      console.log(`📊 Total projects: ${totalItems}, Pages: ${totalPages}`);
      
      // If no projects exist, set empty state and mark as loaded
      if (totalItems === 0) {
        console.log('📊 No projects found, setting empty state');
        setAllProjects([]);
        hasLoadedAllProjects.current = true;
        isLoadingAllProjects.current = false;
        return;
      }
      
      // Start with first page data
      let allFetchedProjects = firstPageResponse.data.map(project => 
        projectsApiService.transformApiProject(project)
      );
      
      // If there are more pages, fetch them all in parallel
      if (totalPages > 1) {
        console.log(`🚀 Fetching remaining ${totalPages - 1} pages in parallel...`);
        
        const pagePromises = [];
        for (let page = 2; page <= Math.min(totalPages, 50); page++) { // Safety limit of 50 pages
          pagePromises.push(
            projectsApiService.getProjectsForSidebarPage(page, searchTerm)
              .then(response => response.data.map(project => 
                projectsApiService.transformApiProject(project)
              ))
          );
        }
        
        // Wait for all pages to complete
        const allPageResults = await Promise.all(pagePromises);
        
        // Combine all results
        for (const pageProjects of allPageResults) {
          allFetchedProjects = [...allFetchedProjects, ...pageProjects];
        }
      }
      
      setAllProjects(allFetchedProjects);
      hasLoadedAllProjects.current = true;
      isLoadingAllProjects.current = false;
      console.log('🎉 Successfully loaded ALL projects for sidebar:', allFetchedProjects.length, 'total');
      
    } catch (error) {
      console.error('❌ Failed to load all projects:', error);
      // On error, also mark as loaded to prevent infinite retries
      hasLoadedAllProjects.current = true;
      isLoadingAllProjects.current = false;
      setAllProjects([]);
    } finally {
      setIsLoadingDropdown(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- allProjects.length is not stable
  }, [searchTerm]);

  // Search projects with API call
  const searchProjects = useCallback(async (term: string) => {
    if (!term.trim()) {
      // If search is cleared, just filter the already loaded projects
      return;
    }
    
    try {
      setIsSearching(true);
      console.log('🔍 Searching projects:', term);
      
      // First, get the first page to know total count
      const firstPageResponse = await projectsApiService.getProjectsForSidebarPage(1, term);
      const totalItems = firstPageResponse.meta.totalItems;
      const itemsPerPage = firstPageResponse.meta.itemsPerPage;
      const totalPages = Math.ceil(totalItems / itemsPerPage);
      
      // If no search results, set empty state
      if (totalItems === 0) {
        console.log('🔍 No search results found for:', term);
        setAllProjects([]);
        return;
      }
      
      // Start with first page data
      let allSearchResults = firstPageResponse.data.map(project => 
        projectsApiService.transformApiProject(project)
      );
      
      // If there are more pages, fetch them all in parallel
      if (totalPages > 1) {
        const pagePromises = [];
        for (let page = 2; page <= Math.min(totalPages, 20); page++) { // Limit search to 20 pages max
          pagePromises.push(
            projectsApiService.getProjectsForSidebarPage(page, term)
              .then(response => response.data.map(project => 
                projectsApiService.transformApiProject(project)
              ))
          );
        }
        
        const allPageResults = await Promise.all(pagePromises);
        for (const pageProjects of allPageResults) {
          allSearchResults = [...allSearchResults, ...pageProjects];
        }
      }
      
      setAllProjects(allSearchResults);
      console.log('✅ Found', allSearchResults.length, 'projects matching:', term);
      
    } catch (error) {
      console.error('❌ Failed to search projects:', error);
      // On search error, set empty results to prevent infinite loading
      setAllProjects([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleProjectSelect = (value: string) => {
    console.log('Project selected:', value); // Debug log
    
    setIsDropdownOpen(false);
    setSearchTerm(''); // Clear search when selecting
    
    if (value === 'all') {
      console.log('Navigating to /projects'); // Debug log
      // Don't change the selected project when viewing all projects
      navigate('/projects');
    } else {
      console.log('Setting selected project ID:', value); // Debug log
      dispatch({ type: 'SET_SELECTED_PROJECT_ID', payload: value });
      
      // Ensure the selected project exists in App context
      const selectedProject = allProjects.find(p => p.id === value);
      if (selectedProject) {
        dispatch({ type: 'UPDATE_PROJECT', payload: selectedProject });
      }
      
      // Navigate to dashboard with the selected project
      console.log('Navigating to dashboard with project:', value);
      navigate('/dashboard');
    }
  };

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Clear previous timeout if it exists
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Debounce search API calls
    searchTimeoutRef.current = setTimeout(() => {
      searchProjects(value);
    }, 300);
  }, [searchProjects]);

  const clearSearch = () => {
    setSearchTerm('');
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
  };

  const handleDropdownClose = () => {
    setIsDropdownOpen(false);
    setSearchTerm(''); // Clear search when closing dropdown
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
  };
  
  const getSelectedProjectName = () => {
    const selectedProject = getSelectedProject();
    if (selectedProject) {
      return selectedProject.name;
    }
    
    if (state.isLoadingProjects) {
      return '🔄 Loading projects...';
    }
    
    if (state.projects.length === 0) {
      return '❌ No projects available';
    }
    
    return '🔍 Select Project';
  };

  const getProjectFilterInfo = () => {
    const selectedProject = getSelectedProject();
    if (selectedProject) {
      if (location.pathname === '/projects') {
        return (
          <div className="px-4 py-2 mb-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="text-xs text-blue-400 font-medium">Selected project:</div>
            <div className="text-sm text-white truncate">{selectedProject.name}</div>
            <div className="text-xs text-gray-400 mt-1">On projects page</div>
          </div>
        );
      } else {
        return (
          <div className="px-4 py-2 mb-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
            <div className="text-xs text-cyan-400 font-medium">Filtered by:</div>
            <div className="text-sm text-white truncate">{selectedProject.name}</div>
          </div>
        );
      }
    }
    return null;
  };

  // Refresh projects when component mounts or when needed
  useEffect(() => {
    // Only load projects if we don't have any AND we're not currently loading
    if (state.projects.length === 0 && !state.isLoadingProjects && authState.isAuthenticated) {
      loadProjects();
    }
  }, [state.projects.length, state.isLoadingProjects, authState.isAuthenticated, loadProjects]);

  return (
    <aside className="w-64 bg-gradient-to-b from-slate-900 to-slate-800 border-r border-purple-500/20 shadow-2xl">
      <nav className="p-4 space-y-2">
        {/* Projects Dropdown */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-400 mb-2 px-4">
            Projects
          </label>
          <div className="relative">
            {/* Custom Dropdown Button */}
            <button
              onClick={() => {
                console.log('Dropdown button clicked'); // Debug log
                if (!isDropdownOpen) {
                  loadAllProjects(); // Load all projects when opening
                }
                setIsDropdownOpen(!isDropdownOpen);
              }}
              className={`w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent hover:bg-slate-700/50 transition-colors text-left flex items-center justify-between ${
                getSelectedProject() ? 'border-cyan-500/50 bg-slate-700/50' : ''
              }`}
              disabled={state.isLoadingProjects}
            >
              <span className="truncate">
                {getSelectedProject() ? (
                  <>
                    <span className="text-cyan-400">📁 </span>
                    <span className="text-white">{getSelectedProjectName()}</span>
                  </>
                ) : (
                  <span className="text-gray-400">{getSelectedProjectName()}</span>
                )}
              </span>
              {state.isLoadingProjects || isLoadingDropdown ? (
                <Loader className="w-4 h-4 text-gray-400 animate-spin" />
              ) : (
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              )}
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                {/* Search Bar */}
                <div className="p-3 border-b border-slate-700">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    {isSearching && (
                      <Loader className="absolute right-8 top-1/2 transform -translate-y-1/2 text-cyan-400 w-4 h-4 animate-spin" />
                    )}
                    <input
                      type="text"
                      placeholder="Search all projects..."
                      value={searchTerm}
                      onChange={handleSearchChange}
                      className="w-full pl-10 pr-8 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                      autoFocus
                    />
                    {searchTerm && (
                      <button
                        onClick={clearSearch}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Dropdown Items */}
                {isLoadingDropdown && (
                  <div className="px-4 py-3 text-gray-400 text-sm flex items-center justify-center">
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Loading all projects...
                  </div>
                )}
                
                <div>
                  <button
                    onClick={() => {
                      console.log('View All Projects clicked'); // Debug log
                      handleProjectSelect('all');
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-slate-700 transition-colors ${
                      location.pathname === '/projects' ? 'bg-slate-700 text-cyan-400' : 'text-white'
                    }`}
                  >
                    📋 View All Projects
                  </button>
                  
                  {!isLoadingDropdown && filteredProjects.length > 0 && (
                    <>
                      <div className="border-t border-slate-700 my-1"></div>
                      
                      {searchTerm && (
                        <div className="px-4 py-2 text-xs text-cyan-400 bg-slate-700/50">
                          {isSearching ? 'Searching...' : `Found ${filteredProjects.length} project${filteredProjects.length !== 1 ? 's' : ''} (from ${allProjects.length} total)`}
                        </div>
                      )}
                      
                      {filteredProjects.map((project) => (
                        <button
                          key={project.id}
                          onClick={() => {
                            console.log('Project clicked:', project.name, 'Current page:', location.pathname);
                            // Set the selected project and navigate to dashboard
                            handleProjectSelect(project.id);
                          }}
                          className={`w-full px-4 py-3 text-left hover:bg-slate-700 transition-colors truncate ${
                            state.selectedProjectId === project.id 
                              ? 'bg-slate-700 text-cyan-400' 
                              : 'text-white'
                          }`}
                          title={project.name} // Tooltip for long names
                        >
                          {state.selectedProjectId === project.id ? '✓ ' : '📁 '}{project.name}
                        </button>
                      ))}
                    </>
                  )}
                  
                  {!isLoadingDropdown && allProjects.length === 0 && !searchTerm && !isSearching && (
                    <div className="px-4 py-3 text-gray-400 text-sm">
                      No projects available
                    </div>
                  )}
                  
                  {filteredProjects.length === 0 && searchTerm && !isSearching && (
                    <div className="px-4 py-3 text-gray-400 text-sm">
                      No projects found matching "{searchTerm}"
                    </div>
                  )}
                  
                  {isSearching && (
                    <div className="px-4 py-3 text-gray-400 text-sm flex items-center">
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Searching projects...
                    </div>
                  )}
                  
                  {/* Show total count when all projects are loaded */}
                  {!isLoadingDropdown && allProjects.length > 0 && !searchTerm && !isSearching && (
                    <div className="px-4 py-2 text-xs text-gray-500 text-center border-t border-slate-700">
                      All {allProjects.length} projects loaded
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Click outside to close dropdown */}
            {isDropdownOpen && (
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => {
                  console.log('Clicking outside dropdown'); // Debug log
                  handleDropdownClose();
                }}
              />
            )}
          </div>
        </div>

        {/* Project Filter Info */}
        {getProjectFilterInfo()}

        {/* Other Navigation Items */}
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={(e) => {
              // If clicking on the current page, force re-navigation to trigger route change
              if (location.pathname === item.path) {
                e.preventDefault();
                navigate(item.path, { replace: false, state: { timestamp: Date.now() } });
              }
            }}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-400 border border-cyan-500/30 shadow-lg'
                  : 'text-gray-300 hover:text-cyan-400 hover:bg-slate-800/50'
              }`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
            <div className="ml-auto w-2 h-2 bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;