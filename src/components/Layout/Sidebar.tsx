import React, { useState, useEffect, useCallback } from 'react';
import { useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  TestTube,
  Play,
  Calendar,
  BarChart3,
  Layers,
  ChevronDown,
  Loader,
  Search,
  X,
  FolderOpen
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { projectsApiService } from '../../services/projectsApi';
import { usePermissions } from '../../hooks/usePermissions';
import { PERMISSIONS } from '../../utils/permissions';
import { Project } from '../../types';

const TEMPLATE_NAV_ITEMS = [
  { path: '/test-cases',    icon: TestTube, label: 'Test Cases' },
  { path: '/shared-steps',  icon: Layers,   label: 'Shared Steps' },
];

const Sidebar: React.FC = () => {
  const { state, dispatch, getSelectedProject, loadProjects } = useApp();
  const { state: authState } = useAuth();
  const { hasAnyPermission } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProjects, setTotalProjects] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreProjects, setHasMoreProjects] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Template dropdown state
  const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');
  const [allTemplates, setAllTemplates] = useState<Project[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const templateDropdownRef = useRef<HTMLDivElement | null>(null);
  const templateSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const allNavItems = [
    {
      path: '/dashboard',
      icon: LayoutDashboard,
      label: 'Dashboard',
      permissions: [PERMISSIONS.TEST_CASE.READ, PERMISSIONS.TEST_RUN.READ]
    },
    {
      path: '/test-cases',
      icon: TestTube,
      label: 'Test Cases',
      permissions: [PERMISSIONS.TEST_CASE.READ]
    },
    {
      path: '/shared-steps',
      icon: Layers,
      label: 'Shared Steps',
      permissions: [PERMISSIONS.SHARED_STEP.READ]
    },
    {
      path: '/test-runs',
      icon: Play,
      label: 'Test Runs',
      permissions: [PERMISSIONS.TEST_RUN.READ]
    },
    {
      path: '/test-plans',
      icon: Calendar,
      label: 'Test Plans',
      permissions: [PERMISSIONS.TEST_PLAN.READ]
    },
    {
      path: '/reports',
      icon: BarChart3,
      label: 'Reports',
      permissions: [PERMISSIONS.TEST_RUN.READ]
    },
  ];

  const navItems = allNavItems.filter(item => {
    const hasAccess = item.permissions.length === 0 || hasAnyPermission(item.permissions);
    return hasAccess;
  });

  // Use allProjects for search results, fallback to state.projects for display
  const projectsToShow = allProjects.length > 0 ? allProjects : state.projects;

  // Filter projects based on search term (client-side filtering)
  const filteredProjects = projectsToShow
    .filter(project =>
      project.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // Sort by creation date (newest first)

  // Search projects - use client-side filtering for already-loaded projects
  // Only make API call if needed for more comprehensive search
  const searchProjects = useCallback(async (term: string) => {
    if (!term.trim()) {
      // If search is cleared, reset to show state.projects
      setAllProjects([]);
      return;
    }

    // For short searches or if we already have enough projects loaded,
    // just use client-side filtering (much faster)
    if (term.length < 3 || state.projects.length < 100) {
      // Client-side filtering is handled by filteredProjects
      return;
    }

    try {
      setIsSearching(true);

      // For longer searches with many projects, do API search
      const firstPageResponse = await projectsApiService.getProjectsForSidebarPage(1, term);
      const totalItems = firstPageResponse.meta.totalItems;

      // If no search results, set empty state
      if (totalItems === 0) {
        setAllProjects([]);
        return;
      }

      // Just use the first page of results (30 items) - enough for search results
      const searchResults = firstPageResponse.data.map(project =>
        projectsApiService.transformApiProject(project)
      );

      setAllProjects(searchResults);
      
    } catch (error) {
      console.error('❌ Failed to search projects:', error);
      // On search error, set empty results to prevent infinite loading
      setAllProjects([]);
    } finally {
      setIsSearching(false);
    }
  }, [state.projects.length]);

  const loadMoreProjects = useCallback(async () => {
    if (isLoadingMore || !hasMoreProjects || searchTerm) {
      return;
    }

    try {
      setIsLoadingMore(true);
      const nextPage = currentPage + 1;

      const response = await projectsApiService.getProjectsForSidebarPage(nextPage);
      const newProjects = response.data.map(project =>
        projectsApiService.transformApiProject(project)
      );

      setAllProjects(prev => [...prev, ...newProjects]);
      setCurrentPage(nextPage);
      setHasMoreProjects(newProjects.length === response.meta.itemsPerPage);
    } catch (error) {
      console.error('Failed to load more projects:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMoreProjects, currentPage, searchTerm]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const bottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;

    if (bottom && hasMoreProjects && !isLoadingMore && !searchTerm) {
      loadMoreProjects();
    }
  }, [hasMoreProjects, isLoadingMore, searchTerm, loadMoreProjects]);

  const handleProjectSelect = (value: string) => {

    setIsDropdownOpen(false);
    setSearchTerm('');

    if (value === 'all') {
      dispatch({ type: 'SET_SELECTED_PROJECT_ID', payload: null });
      navigate('/projects');
    } else {
      dispatch({ type: 'SET_SELECTED_PROJECT_ID', payload: value });

      const selectedProject = allProjects.find(p => p.id === value);
      if (selectedProject) {
        dispatch({ type: 'UPDATE_PROJECT', payload: selectedProject });
      }

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
    // Reset allProjects to show state.projects
    setAllProjects([]);
  };

  const handleDropdownClose = () => {
    setIsDropdownOpen(false);
    setSearchTerm('');
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }
    // Reset dropdown state
    setAllProjects([]);
    setCurrentPage(1);
    setHasMoreProjects(false);
    setIsLoadingMore(false);
  };
  
  const getSelectedProjectName = () => {
    if (location.pathname === '/projects') {
      return 'All Projects';
    }

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


  // Refresh projects when component mounts or when needed
  useEffect(() => {
    // Only load projects if we don't have any AND we're not currently loading
    // Skip if we're on the projects page (it loads its own data)
    if (state.projects.length === 0 && !state.isLoadingProjects && authState.isAuthenticated && location.pathname !== '/projects') {
      loadProjects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.projects.length, state.isLoadingProjects, authState.isAuthenticated, location.pathname]);

  // Reset local search results when AppContext projects count changes significantly
  useEffect(() => {
    // When projects count changes (added/deleted), clear search results
    // Don't clear just because a project was updated
    if (state.projects.length > 0 && allProjects.length > 0 && state.projects.length !== allProjects.length) {
      setAllProjects([]);
    }
  }, [state.projects.length, allProjects.length]);

  // Initialize dropdown with metadata when opened
  useEffect(() => {
    const initializeDropdown = async () => {
      if (!isDropdownOpen || searchTerm || allProjects.length > 0) {
        return;
      }

      try {
        const { projects, meta } = await projectsApiService.getProjectsForSidebar();
        setAllProjects(projects);
        setTotalProjects(meta.totalItems);
        setCurrentPage(meta.currentPage);
        setHasMoreProjects(projects.length < meta.totalItems);
      } catch (error) {
        console.error('Failed to initialize dropdown:', error);
      }
    };

    initializeDropdown();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDropdownOpen, searchTerm]);

  // Load templates when template dropdown opens
  useEffect(() => {
    if (!isTemplateDropdownOpen) return;

    const load = async () => {
      try {
        setIsLoadingTemplates(true);
        const response = await projectsApiService.getTemplatesList(1, 50);
        const list = (response?.data ?? []).map(t => projectsApiService.transformApiProject(t));
        setAllTemplates(list);
      } catch {
        setAllTemplates([]);
      } finally {
        setIsLoadingTemplates(false);
      }
    };

    load();
  }, [isTemplateDropdownOpen]);

  // Close template dropdown on outside click
  useEffect(() => {
    if (!isTemplateDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (templateDropdownRef.current && !templateDropdownRef.current.contains(e.target as Node)) {
        setIsTemplateDropdownOpen(false);
        setTemplateSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isTemplateDropdownOpen]);

  const filteredTemplates = allTemplates.filter(t =>
    t.name.toLowerCase().includes(templateSearch.toLowerCase())
  );

  const handleTemplateSelect = (template: Project) => {
    setIsTemplateDropdownOpen(false);
    setTemplateSearch('');
    dispatch({ type: 'SET_NAVIGATING_TO_PROJECT', payload: true });
    dispatch({ type: 'SET_TEMPLATE_MODE', payload: true });
    dispatch({ type: 'UPDATE_PROJECT', payload: template });
    dispatch({ type: 'SET_SELECTED_PROJECT_ID', payload: template.id });
    navigate('/test-cases');
  };

  // Clear template mode when navigating to non-template pages via top nav
  useEffect(() => {
    const templateAllowedPaths = ['/test-cases', '/shared-steps'];
    if (state.isTemplateMode && !templateAllowedPaths.includes(location.pathname)) {
      dispatch({ type: 'SET_TEMPLATE_MODE', payload: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, state.isTemplateMode]);

  // ---- Template mode sidebar ----
  if (state.isTemplateMode) {
    const selectedTemplate = getSelectedProject();
    return (
      <aside className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 shadow-2xl min-h-[calc(100vh-3.5rem)] sticky top-14">
        <nav className="p-4 space-y-2">
          {/* Templates label + dropdown */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-500 dark:text-gray-400 mb-2 px-4">
              Templates
            </label>
            <div className="relative" ref={templateDropdownRef}>
              <button
                onClick={() => setIsTemplateDropdownOpen(prev => !prev)}
                className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-left flex items-center justify-between hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <span className="flex items-center gap-2 truncate">
                  <span className="text-cyan-600 dark:text-cyan-400">📁 </span>
                  <span className="text-sm text-slate-900 dark:text-white truncate">
                    {selectedTemplate?.name ?? 'Template'}
                  </span>
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isTemplateDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isTemplateDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg z-50 max-h-64 flex flex-col">
                  {/* Search */}
                  <div className="p-2 border-b border-slate-200 dark:border-slate-700 shrink-0">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search templates..."
                        value={templateSearch}
                        onChange={e => setTemplateSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        autoFocus
                      />
                      {templateSearch && (
                        <button onClick={() => setTemplateSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* List */}
                  <div className="overflow-y-auto flex-1">
                    {isLoadingTemplates ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader className="w-5 h-5 text-cyan-500 animate-spin" />
                      </div>
                    ) : filteredTemplates.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">No templates found</div>
                    ) : (
                      filteredTemplates.map(template => (
                        <button
                          key={template.id}
                          onClick={() => handleTemplateSelect(template)}
                          className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${
                            template.id === selectedTemplate?.id
                              ? 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          <FolderOpen className="w-4 h-4 shrink-0 text-cyan-500" />
                          <span className="truncate">{template.name}</span>
                        </button>
                      ))
                    )}
                  </div>

                  {/* Footer link to all templates */}
                  <div className="border-t border-slate-200 dark:border-slate-700 shrink-0">
                    <button
                      onClick={() => {
                        setIsTemplateDropdownOpen(false);
                        dispatch({ type: 'SET_TEMPLATE_MODE', payload: false });
                        dispatch({ type: 'SET_SELECTED_PROJECT_ID', payload: null });
                        navigate('/templates');
                      }}
                      className="w-full px-4 py-2.5 text-sm text-cyan-600 dark:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left"
                    >
                      View all templates →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <hr className="border-slate-200 dark:border-slate-700 my-0" />

          {/* Only Test Cases + Shared Steps */}
          <div className="pt-4 space-y-1">
            {TEMPLATE_NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={(e) => {
                  if (location.pathname === item.path) {
                    e.preventDefault();
                    navigate(item.path, { replace: false, state: { timestamp: Date.now() } });
                  }
                }}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 shadow-lg'
                      : 'text-slate-600 dark:text-gray-300 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
                <div className="ml-auto w-2 h-2 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </NavLink>
            ))}
          </div>
        </nav>
      </aside>
    );
  }

  return (
    <aside className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 shadow-2xl min-h-[calc(100vh-3.5rem)] sticky top-14">
      <nav className="p-4 space-y-2">
        {/* Projects Dropdown */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-500 dark:text-gray-400 mb-2 px-4">
            Projects
          </label>
          <div className="relative">
            {/* Custom Dropdown Button */}
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`w-full px-4 py-3 bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 focus:border-transparent hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors text-left flex items-center justify-between ${
                getSelectedProject() || location.pathname === '/projects' ? 'border-cyan-500 bg-slate-200 dark:border-cyan-500/50 dark:bg-slate-700/50' : ''
              }`}
              disabled={state.isLoadingProjects}
            >
              <span className="truncate">
                {getSelectedProject() || location.pathname === '/projects' ? (
                  <>
                    <span className="text-cyan-600 dark:text-cyan-400">📁 </span>
                    <span className="text-slate-900 dark:text-white">{getSelectedProjectName()}</span>
                  </>
                ) : (
                  <span className="text-slate-500 dark:text-gray-400">{getSelectedProjectName()}</span>
                )}
              </span>
              {state.isLoadingProjects ? (
                <Loader className="w-4 h-4 text-slate-400 dark:text-gray-400 animate-spin" />
              ) : (
                <ChevronDown className={`w-4 h-4 text-slate-400 dark:text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              )}
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div
                ref={dropdownRef}
                onScroll={handleScroll}
                className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                {/* Search Bar */}
                <div className="p-3 border-b border-slate-200 dark:border-slate-700">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-gray-400 w-4 h-4" />
                    {isSearching && (
                      <Loader className="absolute right-8 top-1/2 transform -translate-y-1/2 text-cyan-600 dark:text-cyan-400 w-4 h-4 animate-spin" />
                    )}
                    <input
                      type="text"
                      placeholder="Search all projects..."
                      value={searchTerm}
                      onChange={handleSearchChange}
                      className="w-full pl-10 pr-8 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm placeholder-slate-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 focus:border-transparent"
                      autoFocus
                    />
                    {searchTerm && (
                      <button
                        onClick={clearSearch}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Dropdown Items */}
                <div>
                  {/* View All Projects - Always on top */}
                  <button
                    onClick={() => handleProjectSelect('all')}
                    className={`w-full px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border-b border-slate-200 dark:border-slate-700 ${
                      location.pathname === '/projects'
                        ? 'bg-slate-200 dark:bg-slate-700 text-cyan-600 dark:text-cyan-400'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {location.pathname === '/projects' ? '✓ ' : '🌐 '}View all projects
                  </button>

                  {filteredProjects.length > 0 && (
                    <>
                      {searchTerm && (
                        <div className="px-4 py-2 text-xs text-cyan-600 dark:text-cyan-400 bg-slate-100 dark:bg-slate-700/50">
                          {isSearching ? 'Searching...' : `Found ${filteredProjects.length} project${filteredProjects.length !== 1 ? 's' : ''} (from ${allProjects.length} total)`}
                        </div>
                      )}
                      
                      {filteredProjects.map((project) => (
                        <button
                          key={project.id}
                          onClick={() => {
                            // Set the selected project and navigate to dashboard
                            handleProjectSelect(project.id);
                          }}
                          className={`w-full px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors truncate ${
                            state.selectedProjectId === project.id
                              ? 'bg-slate-200 dark:bg-slate-700 text-cyan-600 dark:text-cyan-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                          title={project.name} // Tooltip for long names
                        >
                          {state.selectedProjectId === project.id ? '✓ ' : '📁 '}{project.name}
                        </button>
                      ))}
                    </>
                  )}
                  
                  {allProjects.length === 0 && !searchTerm && !isSearching && (
                    <div className="px-4 py-3 text-slate-500 dark:text-gray-400 text-sm">
                      No projects available
                    </div>
                  )}
                  
                  {filteredProjects.length === 0 && searchTerm && !isSearching && (
                    <div className="px-4 py-3 text-slate-500 dark:text-gray-400 text-sm">
                      No projects found matching "{searchTerm}"
                    </div>
                  )}
                  
                  {isSearching && (
                    <div className="px-4 py-3 text-slate-500 dark:text-gray-400 text-sm flex items-center">
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Searching projects...
                    </div>
                  )}
                  
                  {/* Show loading more indicator */}
                  {isLoadingMore && !searchTerm && (
                    <div className="px-4 py-3 text-slate-500 dark:text-gray-400 text-sm flex items-center justify-center border-t border-slate-200 dark:border-slate-700">
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Loading more projects...
                    </div>
                  )}

                  {/* Show project count and status */}
                  {!searchTerm && !isSearching && !isLoadingMore && allProjects.length > 0 && (
                    <div className="px-4 py-2 text-xs text-slate-400 dark:text-gray-500 text-center border-t border-slate-200 dark:border-slate-700">
                      {hasMoreProjects ? (
                        <>Showing {allProjects.length} of {totalProjects} projects • Scroll for more</>
                      ) : (
                        <>All {allProjects.length} projects loaded</>
                      )}
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
                  handleDropdownClose();
                }}
              />
            )}
          </div>
        </div>

        {/* Other Navigation Items */}
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            data-mipqa={`sidebar-${item.label.toLowerCase().replace(/\s+/g, '-')}-link`}
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
                  ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 shadow-lg'
                  : 'text-slate-600 dark:text-gray-300 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
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